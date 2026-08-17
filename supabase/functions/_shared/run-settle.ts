/**
 * Settling-körning. Importeras av settle-results och (bakåtkompatibelt)
 * settle-bets. Anropa inte Deno.serve här.
 */

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import {
  clientForSport,
  chunk,
  DEFAULT_TIMEZONE,
  FIXTURE_IDS_PER_CALL,
  regulationScore,
  sportSlug,
  statusBucket,
  TERMINAL_STATUSES,
  type ApiFixtureItem,
  type SportSlug,
} from "./apisports.ts";
import { mapFixtureRow } from "./map.ts";
import { resolvePick, type Settlement } from "./settle.ts";
import {
  createServiceClient,
  finishSyncLog,
  startSyncLog,
} from "./supabase.ts";

const FIXTURE_BATCH = 200;

type PendingFixture = {
  fixture_id: number;
  kickoff: string;
  status: string;
  sport: string;
};

type BetRow = {
  id: string;
  fixture_id: number | null;
  pick: string;
  match: string;
};

function envGet(key: string) {
  return Deno.env.get(key);
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

function groupBySport(fixtures: PendingFixture[]) {
  const groups = new Map<SportSlug, PendingFixture[]>();
  for (const fixture of fixtures) {
    const slug = sportSlug(fixture.sport);
    const list = groups.get(slug) ?? [];
    list.push(fixture);
    groups.set(slug, list);
  }
  return groups;
}

async function queueBets(
  supabase: SupabaseClient,
  rows: { bet_id: string; reason: string }[]
) {
  if (!rows.length) return;
  const { error } = await supabase.from("settle_queue").insert(rows);
  if (error && !/duplicate|unique/i.test(error.message)) {
    console.error("settle_queue insert", error.message);
  }
}

export async function handleSettleResults(req: Request) {
  const startedAt = Date.now();
  const dryRun = new URL(req.url).searchParams.get("dry") === "1";

  const supabase = createServiceClient();
  const nowIso = new Date().toISOString();
  const terminalList = `("${TERMINAL_STATUSES.join('","')}")`;

  const { data: pending, error: pendingError } = await supabase
    .from("fixtures")
    .select("fixture_id, kickoff, status, sport")
    .lt("kickoff", nowIso)
    .not("status", "in", terminalList)
    .order("kickoff", { ascending: false })
    .limit(FIXTURE_BATCH);

  if (pendingError) {
    return json({ error: pendingError.message }, 500);
  }

  const fixtures = (pending ?? []) as PendingFixture[];
  const summary = {
    checked: fixtures.length,
    updated: 0,
    settled: 0,
    voided: 0,
    queued: 0,
    awarded: 0,
    requests: 0,
    dryRun,
  };

  if (!fixtures.length) {
    return json({ ...summary, skipped: true, ms: Date.now() - startedAt });
  }

  const sports = [...groupBySport(fixtures).keys()];
  const logSport = sports.length === 1 ? sports[0] : "mixed";
  let logId: string | null = null;
  if (!dryRun) {
    logId = await startSyncLog(supabase, "settle-results", logSport);
  }

  try {
    const results = new Map<number, { item: ApiFixtureItem; sport: SportSlug }>();

    for (const [sport, group] of groupBySport(fixtures)) {
      const api = clientForSport(sport, { get: envGet });
      for (const ids of chunk(
        group.map((f) => f.fixture_id),
        FIXTURE_IDS_PER_CALL
      )) {
        const items = await api.get<ApiFixtureItem>("/fixtures", {
          ids: ids.join("-"),
          timezone: DEFAULT_TIMEZONE,
        });
        for (const item of items) results.set(item.fixture.id, { item, sport });
      }
      summary.requests += api.requestCount();
    }

    const finalById = new Map<number, { home: number; away: number }>();
    const awardedIds: number[] = [];
    const voidIds: number[] = [];
    const postponedIds: number[] = [];
    const missingIds: number[] = [];
    const updates: ReturnType<typeof mapFixtureRow>[] = [];
    const now = new Date().toISOString();

    for (const fixture of fixtures) {
      const hit = results.get(fixture.fixture_id);
      if (!hit) {
        missingIds.push(fixture.fixture_id);
        continue;
      }

      const row = mapFixtureRow(hit.item, hit.sport, now);
      updates.push(row);

      const bucket = statusBucket(row.status);
      const score = regulationScore(hit.item);

      if (bucket === "final" && score) {
        finalById.set(fixture.fixture_id, score);
      } else if (bucket === "awarded") {
        awardedIds.push(fixture.fixture_id);
        if (score) finalById.set(fixture.fixture_id, score);
      } else if (bucket === "voided") {
        voidIds.push(fixture.fixture_id);
      } else if (bucket === "postponed") {
        postponedIds.push(fixture.fixture_id);
      }
    }

    if (updates.length && !dryRun) {
      const { error } = await supabase
        .from("fixtures")
        .upsert(updates, { onConflict: "fixture_id" });
      if (error) throw new Error(`fixtures upsert: ${error.message}`);
      summary.updated = updates.length;
    } else {
      summary.updated = updates.length;
    }

    const touchedIds = [...finalById.keys(), ...voidIds, ...missingIds];

    if (!touchedIds.length) {
      if (logId) {
        await finishSyncLog(supabase, logId, {
          ok: true,
          requests: summary.requests,
          upserted: summary.updated,
          meta: { postponed: postponedIds, skippedBets: true },
        });
      }
      return json({
        ...summary,
        postponed: postponedIds.length,
        ms: Date.now() - startedAt,
      });
    }

    const { data: openBets, error: betsError } = await supabase
      .from("bets")
      .select("id, fixture_id, pick, match")
      .eq("result", "open")
      .in("fixture_id", touchedIds);

    if (betsError) throw new Error(betsError.message);

    const bets = (openBets ?? []) as BetRow[];
    const { data: queued } = bets.length
      ? await supabase
          .from("settle_queue")
          .select("bet_id")
          .eq("resolved", false)
          .in(
            "bet_id",
            bets.map((b) => b.id)
          )
      : { data: [] };

    const alreadyQueued = new Set(
      ((queued ?? []) as { bet_id: string }[]).map((q) => q.bet_id)
    );

    const settledAt = new Date().toISOString();
    const byResult: Record<Settlement, string[]> = {
      win: [],
      loss: [],
      void: [],
    };
    const queueRows: { bet_id: string; reason: string }[] = [];

    for (const bet of bets) {
      const id = bet.fixture_id!;

      if (missingIds.includes(id)) {
        if (!alreadyQueued.has(bet.id)) {
          queueRows.push({ bet_id: bet.id, reason: "fixture_missing" });
        }
        continue;
      }

      if (voidIds.includes(id)) {
        byResult.void.push(bet.id);
        continue;
      }

      const score = finalById.get(id);
      if (!score) {
        if (!alreadyQueued.has(bet.id)) {
          queueRows.push({
            bet_id: bet.id,
            reason: awardedIds.includes(id) ? "awarded" : "unclear",
          });
        }
        continue;
      }

      const outcome = resolvePick(bet.pick, score.home, score.away);
      if (!outcome) {
        if (!alreadyQueued.has(bet.id)) {
          queueRows.push({
            bet_id: bet.id,
            reason: awardedIds.includes(id) ? "awarded" : "unclear",
          });
        }
        continue;
      }

      byResult[outcome].push(bet.id);
    }

    for (const [result, ids] of Object.entries(byResult) as [
      Settlement,
      string[],
    ][]) {
      if (!ids.length) continue;
      if (result === "void") summary.voided += ids.length;
      else summary.settled += ids.length;
      if (dryRun) continue;

      const { error } = await supabase
        .from("bets")
        .update({ result, settled_at: settledAt, settled_by: "auto" })
        .in("id", ids)
        .eq("result", "open");
      if (error) console.error(`kunde inte rätta ${result}`, error.message);
    }

    if (queueRows.length) {
      summary.queued = queueRows.length;
      if (!dryRun) await queueBets(supabase, queueRows);
    }

    summary.awarded = awardedIds.length;

    if (logId) {
      await finishSyncLog(supabase, logId, {
        ok: true,
        requests: summary.requests,
        upserted: summary.updated,
        settled: summary.settled + summary.voided,
        meta: {
          awarded: awardedIds,
          voided: voidIds,
          postponed: postponedIds,
          missing: missingIds,
          queued: summary.queued,
        },
      });
    }

    return json({ ...summary, ms: Date.now() - startedAt });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("settle-results", message);
    if (logId) {
      await finishSyncLog(supabase, logId, {
        ok: false,
        requests: summary.requests,
        upserted: summary.updated,
        settled: summary.settled,
        error: message,
      });
    }
    return json({ ok: false, error: message, ...summary }, 500);
  }
}
