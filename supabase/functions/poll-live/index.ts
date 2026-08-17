/**
 * SPELBOK — Edge Function: poll-live
 *
 * Körs var 3:e minut (se db/cron.sql). Håller fixtures.status/elapsed/mål
 * uppdaterade under pågående matcher. Tom lista → noll API-anrop.
 *
 * Max 20 fixture-id:n per /fixtures?ids=…-anrop. När en match blir
 * FT/AET/PEN körs samma sättling som settle-results.
 *
 * Deploy:
 *   supabase functions deploy poll-live
 */

import {
  clientForSport,
  chunk,
  currentScore,
  DEFAULT_TIMEZONE,
  FIXTURE_IDS_PER_CALL,
  POLL_LIVE_SKIP_STATUSES,
  regulationScore,
  sportSlug,
  statusBucket,
  type ApiFixtureItem,
  type SportSlug,
} from "../_shared/apisports.ts";
import { settleOpenBets } from "../_shared/settle-open.ts";
import {
  createServiceClient,
  finishSyncLog,
  startSyncLog,
} from "../_shared/supabase.ts";

const LIVE_BATCH = 60;

type LiveFixture = {
  fixture_id: number;
  sport: string;
};

function envGet(key: string) {
  return Deno.env.get(key);
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

function groupBySport(fixtures: LiveFixture[]) {
  const groups = new Map<SportSlug, LiveFixture[]>();
  for (const fixture of fixtures) {
    const slug = sportSlug(fixture.sport);
    const list = groups.get(slug) ?? [];
    list.push(fixture);
    groups.set(slug, list);
  }
  return groups;
}

export async function handlePollLive(req: Request) {
  const startedAt = Date.now();
  const dryRun = new URL(req.url).searchParams.get("dry") === "1";

  const supabase = createServiceClient();
  const nowIso = new Date().toISOString();
  const skipList = `("${POLL_LIVE_SKIP_STATUSES.join('","')}")`;

  const { data: pending, error: pendingError } = await supabase
    .from("fixtures")
    .select("fixture_id, sport")
    .lt("kickoff", nowIso)
    .not("status", "in", skipList)
    .order("kickoff", { ascending: false })
    .limit(LIVE_BATCH);

  if (pendingError) {
    return json({ error: pendingError.message }, 500);
  }

  const fixtures = (pending ?? []) as LiveFixture[];
  const summary = {
    checked: fixtures.length,
    updated: 0,
    settled: 0,
    voided: 0,
    queued: 0,
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
    logId = await startSyncLog(supabase, "poll-live", logSport);
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

    const now = new Date().toISOString();
    const updates: {
      fixture_id: number;
      status: string;
      elapsed: number | null;
      home_score: number | null;
      away_score: number | null;
      updated_at: string;
    }[] = [];
    const finalById = new Map<number, { home: number; away: number }>();

    for (const fixture of fixtures) {
      const hit = results.get(fixture.fixture_id);
      if (!hit) continue;

      const status = hit.item.fixture.status.short;
      const score = currentScore(hit.item);
      updates.push({
        fixture_id: fixture.fixture_id,
        status,
        elapsed: hit.item.fixture.status.elapsed ?? null,
        home_score: score.home,
        away_score: score.away,
        updated_at: now,
      });

      if (statusBucket(status) === "final") {
        const regulation = regulationScore(hit.item);
        if (regulation) finalById.set(fixture.fixture_id, regulation);
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

    if (finalById.size) {
      const settled = await settleOpenBets(supabase, {
        finalById,
        dryRun,
      });
      summary.settled = settled.settled;
      summary.voided = settled.voided;
      summary.queued = settled.queued;
    }

    if (logId) {
      await finishSyncLog(supabase, logId, {
        ok: true,
        requests: summary.requests,
        upserted: summary.updated,
        settled: summary.settled + summary.voided,
        meta: { finished: [...finalById.keys()], queued: summary.queued },
      });
    }

    return json({ ...summary, ms: Date.now() - startedAt });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("poll-live", message);
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

Deno.serve(handlePollLive);
