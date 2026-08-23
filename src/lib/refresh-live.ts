import { logApiSportsCacheHit } from "@/lib/api-sports/logRequest";
import {
  chunk,
  clientForSport,
  currentScore,
  DEFAULT_TIMEZONE,
  FIXTURE_IDS_PER_CALL,
  regulationScore,
  sportSlug,
  statusBucket,
  type ApiFixtureItem,
  type SportSlug,
} from "@/lib/apisports";
import { mapFixtureRow } from "@/lib/map-fixture";
import { isInPlayStatus, type LiveFixturePatch } from "@/lib/live-fixture";
import { notifyGoals } from "@/lib/send-push";
import { settleOpenBets } from "@/lib/settle-open";
import { createAdminClient } from "@/lib/supabase/admin";

const STALE_MS = 20_000;
const filling = new Map<string, Promise<RefreshLiveResult>>();

export type LiveFixtureRow = LiveFixturePatch & {
  fixture_id: number;
};

export type RefreshLiveResult = {
  fixtures: LiveFixtureRow[];
  settled: number;
  skipped?: boolean;
};

function hasApiKey() {
  return !!(process.env.APISPORTS_KEY || process.env.APIFOOTBALL_KEY);
}

function uniqueIds(ids: number[]) {
  return [...new Set(ids.filter((id) => Number.isFinite(id) && id > 0))].slice(
    0,
    40
  );
}

async function upsertRows(
  admin: ReturnType<typeof createAdminClient>,
  rows: ReturnType<typeof mapFixtureRow>[]
) {
  if (!rows.length) return;
  for (const group of chunk(rows, 80)) {
    const { error } = await admin.from("fixtures").upsert(group, {
      onConflict: "fixture_id",
    });
    if (error && /season|raw|elapsed/i.test(error.message)) {
      const slim = group.map(
        ({ raw: _raw, season: _season, elapsed: _elapsed, ...rest }) => rest
      );
      const retry = await admin.from("fixtures").upsert(slim, {
        onConflict: "fixture_id",
      });
      if (retry.error) throw retry.error;
    } else if (error) {
      throw error;
    }
  }
}

async function loadCached(
  admin: ReturnType<typeof createAdminClient>,
  ids: number[]
): Promise<LiveFixtureRow[]> {
  const full = await admin
    .from("fixtures")
    .select("fixture_id, status, elapsed, home_score, away_score")
    .in("fixture_id", ids);
  const data =
    full.error && /elapsed/i.test(full.error.message)
      ? (
          await admin
            .from("fixtures")
            .select("fixture_id, status, home_score, away_score")
            .in("fixture_id", ids)
        ).data
      : full.data;
  return (data ?? []).map((row) => ({
    fixture_id: row.fixture_id as number,
    status: (row.status as string) || "NS",
    elapsed:
      "elapsed" in row && typeof row.elapsed === "number" ? row.elapsed : null,
    home_score: typeof row.home_score === "number" ? row.home_score : null,
    away_score: typeof row.away_score === "number" ? row.away_score : null,
  }));
}

function patchFromApi(
  id: number,
  hit: { item: ApiFixtureItem }
): LiveFixtureRow {
  const score = currentScore(hit.item);
  return {
    fixture_id: id,
    status: hit.item.fixture.status.short,
    elapsed: hit.item.fixture.status.elapsed ?? null,
    home_score: score.home,
    away_score: score.away,
  };
}

async function runRefresh(ids: number[]): Promise<RefreshLiveResult> {
  const admin = createAdminClient();
  const cachedSelect = await admin
    .from("fixtures")
    .select(
      "fixture_id, sport, status, elapsed, home_score, away_score, updated_at"
    )
    .in("fixture_id", ids);
  const rows =
    cachedSelect.error && /elapsed/i.test(cachedSelect.error.message)
      ? (
          await admin
            .from("fixtures")
            .select("fixture_id, sport, status, home_score, away_score, updated_at")
            .in("fixture_id", ids)
        ).data ?? []
      : cachedSelect.data ?? [];
  const freshCutoff = Date.now() - STALE_MS;
  const staleIds = ids.filter((id) => {
    const row = rows.find((r) => r.fixture_id === id);
    if (!row) return true;
    const at = row.updated_at ? new Date(row.updated_at as string).getTime() : 0;
    return !Number.isFinite(at) || at < freshCutoff;
  });

  if (!staleIds.length || !hasApiKey()) {
    // Alla matcher uppdaterades för mindre än STALE_MS sedan: cachen svarar
    // och API-anropet uteblir. Logga per sport, precis som anropet hade gjorts.
    if (staleIds.length === 0) {
      const cachedBySport = new Map<SportSlug, number>();
      for (const id of ids) {
        const row = rows.find((r) => r.fixture_id === id);
        const slug = sportSlug((row?.sport as string) || "football");
        cachedBySport.set(slug, (cachedBySport.get(slug) ?? 0) + 1);
      }
      for (const [slug, count] of cachedBySport) {
        logApiSportsCacheHit(
          slug === "hockey" ? "api-hockey" : "api-football",
          "/fixtures",
          { ids: count }
        );
      }
    }
    return { fixtures: await loadCached(admin, ids), settled: 0, skipped: true };
  }

  const bySport = new Map<SportSlug, number[]>();
  for (const id of staleIds) {
    const row = rows.find((r) => r.fixture_id === id);
    const slug = sportSlug((row?.sport as string) || "football");
    const list = bySport.get(slug) ?? [];
    list.push(id);
    bySport.set(slug, list);
  }
  if (!bySport.size) {
    bySport.set("football", staleIds);
  }

  const results = new Map<number, { item: ApiFixtureItem; sport: SportSlug }>();
  const env = { get: (key: string) => process.env[key] };

  for (const [sport, group] of bySport) {
    const api = clientForSport(sport, env);
    for (const batch of chunk(group, FIXTURE_IDS_PER_CALL)) {
      const items = await api.get<ApiFixtureItem>("/fixtures", {
        ids: batch.join("-"),
        timezone: DEFAULT_TIMEZONE,
      });
      for (const item of items) results.set(item.fixture.id, { item, sport });
    }
  }

  const now = new Date().toISOString();
  const updates = [...results.values()].map((hit) =>
    mapFixtureRow(hit.item, hit.sport, now)
  );
  await upsertRows(admin, updates);

  const goalNotices: Promise<unknown>[] = [];
  for (const [id, hit] of results) {
    const prev = rows.find((r) => r.fixture_id === id);
    const next = currentScore(hit.item);
    const status = hit.item.fixture.status.short;
    if (!isInPlayStatus(status)) continue;
    const prevHome = typeof prev?.home_score === "number" ? prev.home_score : 0;
    const prevAway = typeof prev?.away_score === "number" ? prev.away_score : 0;
    const nextHome = next.home ?? 0;
    const nextAway = next.away ?? 0;
    if (nextHome + nextAway <= prevHome + prevAway) continue;
    goalNotices.push(
      notifyGoals({
        fixtureId: id,
        homeName: hit.item.teams.home.name,
        awayName: hit.item.teams.away.name,
        homeScore: nextHome,
        awayScore: nextAway,
      })
    );
  }
  // Måste await:as: Vercel fryser funktionen så fort svaret gått ut, en
  // fire-and-forget push hinner då aldrig i väg.
  if (goalNotices.length) {
    await Promise.all(goalNotices).catch((err) =>
      console.error("push vid mål", err)
    );
  }

  const finalById = new Map<number, { home: number; away: number }>();
  const awardedIds: number[] = [];
  const voidIds: number[] = [];

  for (const [id, hit] of results) {
    const status = hit.item.fixture.status.short;
    const bucket = statusBucket(status);
    const score = regulationScore(hit.item) ?? currentScore(hit.item);
    if (bucket === "final" && score.home != null && score.away != null) {
      finalById.set(id, { home: score.home, away: score.away });
    } else if (bucket === "awarded") {
      awardedIds.push(id);
      if (score.home != null && score.away != null) {
        finalById.set(id, { home: score.home, away: score.away });
      }
    } else if (bucket === "voided") {
      voidIds.push(id);
    }
  }

  let settled = 0;
  if (finalById.size || voidIds.length || awardedIds.length) {
    const outcome = await settleOpenBets(admin, {
      finalById,
      awardedIds,
      voidIds,
    });
    settled = outcome.settled + outcome.voided;
  }

  const cachedRows = await loadCached(admin, ids);
  const byId = new Map(cachedRows.map((row) => [row.fixture_id, row]));
  for (const [id, hit] of results) {
    byId.set(id, patchFromApi(id, hit));
  }
  return { fixtures: [...byId.values()], settled };
}

export async function refreshLiveFixtures(
  ids: number[]
): Promise<RefreshLiveResult> {
  const unique = uniqueIds(ids).sort((a, b) => a - b);
  if (!unique.length) return { fixtures: [], settled: 0 };

  const key = unique.join(",");
  let pending = filling.get(key);
  if (!pending) {
    pending = runRefresh(unique).finally(() => filling.delete(key));
    filling.set(key, pending);
  }
  return pending;
}
