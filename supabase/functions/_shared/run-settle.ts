/**
 * Settling-körning. Importeras av settle-results och (bakåtkompatibelt)
 * settle-bets. Anropa inte Deno.serve här.
 */

import {
  clientForSport,
  chunk,
  DEFAULT_TIMEZONE,
  FIXTURE_IDS_PER_CALL,
  isInPlay,
  regulationScore,
  sportSlug,
  statusBucket,
  TERMINAL_STATUSES,
  type ApiFixtureItem,
  type SportSlug,
} from "./apisports.ts";
import { mapFixtureRow } from "./map.ts";
import { settleOpenBets } from "./settle-open.ts";
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
      // Pågående matcher ägs av poll-live. Skulle vi skriva den nya
      // ställningen här ser poll-live ingen förändring nästa körning och
      // målnotisen uteblir — settle-results skickar själv inga målnotiser.
      // Vi har ändå inget att göra med raden förrän matchen är slut.
      if (!isInPlay(row.status)) updates.push(row);

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

    const settled = await settleOpenBets(supabase, {
      finalById,
      awardedIds,
      voidIds,
      missingIds,
      dryRun,
    });
    summary.settled = settled.settled;
    summary.voided = settled.voided;
    summary.queued = settled.queued;
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
