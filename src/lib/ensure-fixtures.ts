import { logApiSportsCacheHit } from "@/lib/api-sports/logRequest";
import {
  chunk,
  DEFAULT_TIMEZONE,
  clientForSport,
  footballClientFromEnv,
  MAX_API_PAGES,
  MAX_REQUESTS_PER_MINUTE,
  PAID_REQUESTS_PER_MINUTE,
  type ApiFixtureItem,
} from "@/lib/apisports";
import { mapFixtureRow } from "@/lib/map-fixture";
import { fetchGamesByDate } from "@/lib/sport-games";
import { sportDef, type SportSlug } from "@/lib/sports";
import { addStockholmDays, stockholmYmd } from "@/lib/stockholm";
import { createAdminClient } from "@/lib/supabase/admin";

const FILL_JOB = "fill-day";
const filling = new Map<string, Promise<number>>();
const emptyUntil = new Map<string, number>();
const completedAt = new Map<string, number>();
const nextPageAt = new Map<string, number>();
const EMPTY_TTL_MS = 10 * 60 * 1000;
const TODAY_REFRESH_MS = 6 * 60 * 60 * 1000;
const FILL_BUDGET_MS = 45_000;

export type FixtureDateCoverage = {
  from: string;
  to: string;
};

const COVERAGE_TTL_MS = 60 * 1000;

let coveragePromise: Promise<FixtureDateCoverage | null> | null = null;
let coverage: FixtureDateCoverage | null | undefined;
let coverageAt = 0;

function hasApiKey() {
  return !!(process.env.APISPORTS_KEY || process.env.APIFOOTBALL_KEY);
}

function parsePlanWindow(message: string): FixtureDateCoverage | null {
  const match = message.match(
    /from (\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2})/i
  );
  if (match) return { from: match[1], to: match[2] };
  if (/free plans do not have access to this date/i.test(message)) {
    const today = stockholmYmd();
    return { from: addStockholmDays(today, -1), to: addStockholmDays(today, 1) };
  }
  return null;
}

function rememberCoverage(next: FixtureDateCoverage) {
  coverage = next;
  coverageAt = Date.now();
}

function isPlanLimit(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return /plan:|free plans do not have access/i.test(message);
}

function outsideCoverage(ymd: string, window: FixtureDateCoverage | null) {
  if (!window) return false;
  return ymd < window.from || ymd > window.to;
}

/**
 * Gratisplanen hos API-Sports täcker bara ungefär igår–imorgon.
 * Betalda planer returnerar null (= alla datum).
 */
export async function resolveFixtureCoverage(): Promise<FixtureDateCoverage | null> {
  if (coveragePromise) return coveragePromise;
  if (
    coverage !== undefined &&
    Date.now() - coverageAt < COVERAGE_TTL_MS
  ) {
    return coverage;
  }

  if (!hasApiKey()) {
    coverage = null;
    coverageAt = Date.now();
    return null;
  }

  coveragePromise = (async () => {
    try {
      const api = footballClientFromEnv({
        get: (key) => process.env[key],
      });
      const status = await api.getResponse<{
        subscription?: { plan?: string };
      }>("/status");
      const plan = status?.subscription?.plan ?? "";
      coverageAt = Date.now();
      if (/^free$/i.test(plan)) {
        const today = stockholmYmd();
        const window = {
          from: addStockholmDays(today, -1),
          to: addStockholmDays(today, 1),
        };
        rememberCoverage(window);
        return window;
      }
      emptyUntil.clear();
      coverage = null;
      return null;
    } catch {
      coverageAt = Date.now();
      coverage = null;
      return null;
    } finally {
      coveragePromise = null;
    }
  })();

  return coveragePromise;
}

export function getFixtureCoverage() {
  return coverage ?? null;
}

function markComplete(ymd: string) {
  completedAt.set(ymd, Date.now());
}

function recentlyComplete(ymd: string) {
  const at = completedAt.get(ymd);
  if (!at) return false;
  if (ymd !== stockholmYmd()) return true;
  return Date.now() - at < TODAY_REFRESH_MS;
}

async function hasCompleteLog(ymd: string) {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("sync_log")
      .select("id, started_at")
      .eq("job", FILL_JOB)
      .eq("ok", true)
      .contains("meta", { ymd, complete: true })
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data?.started_at) return false;
    if (ymd !== stockholmYmd()) return true;
    return Date.now() - new Date(data.started_at).getTime() < TODAY_REFRESH_MS;
  } catch {
    return false;
  }
}

async function isFootballDayReady(ymd: string) {
  if (!hasApiKey()) return true;
  return recentlyComplete(ymd) || (await hasCompleteLog(ymd));
}

async function logProgress(
  ymd: string,
  count: number,
  requests: number,
  complete: boolean,
  nextPage: number
) {
  try {
    const admin = createAdminClient();
    await admin.from("sync_log").insert({
      job: FILL_JOB,
      sport: "football",
      ok: true,
      requests,
      upserted: count,
      finished_at: new Date().toISOString(),
      meta: { ymd, complete, nextPage },
    });
  } catch {
    /* sync_log saknas eller RLS — minnet räcker i den här instansen */
  }
}

async function loadNextPage(ymd: string) {
  const mem = nextPageAt.get(ymd);
  if (mem) return mem;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("sync_log")
      .select("meta")
      .eq("job", FILL_JOB)
      .contains("meta", { ymd })
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const meta = data?.meta as { complete?: boolean; nextPage?: number } | null;
    if (meta?.complete) return 1;
    return meta?.nextPage ?? 1;
  } catch {
    return 1;
  }
}

async function upsertFixtureRows(
  rows: ReturnType<typeof mapFixtureRow>[]
) {
  if (!rows.length) return;
  const admin = createAdminClient();
  for (const group of chunk(rows, 150)) {
    const { error } = await admin.from("fixtures").upsert(group, {
      onConflict: "fixture_id",
    });
    if (error && /season|raw|elapsed|extra/i.test(error.message)) {
      const slim = group.map(
        ({
          raw: _raw,
          season: _season,
          elapsed: _elapsed,
          extra: _extra,
          ...rest
        }) => rest
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

async function fillDay(ymd: string) {
  const startPage = await loadNextPage(ymd);
  if (startPage < 1) {
    markComplete(ymd);
    return 0;
  }

  const paid = !getFixtureCoverage();
  const api = footballClientFromEnv(
    { get: (key) => process.env[key] },
    { maxPerMinute: paid ? PAID_REQUESTS_PER_MINUTE : MAX_REQUESTS_PER_MINUTE }
  );
  const now = new Date().toISOString();
  const deadline = Date.now() + FILL_BUDGET_MS;
  let page = startPage;
  let total = Math.max(1, startPage);
  let upserted = 0;

  while (page <= total && page <= MAX_API_PAGES && Date.now() < deadline) {
    const result = await api.getPage<ApiFixtureItem>("/fixtures", {
      date: ymd,
      timezone: DEFAULT_TIMEZONE,
      page,
    });
    const rows = result.items.map((item) => mapFixtureRow(item, "football", now));
    await upsertFixtureRows(rows);
    upserted += rows.length;
    total = Math.max(total, result.total);
    if (!result.items.length) {
      page = total + 1;
      break;
    }
    page += 1;
  }

  const complete = page > total || page > MAX_API_PAGES;
  if (complete) {
    nextPageAt.delete(ymd);
    markComplete(ymd);
  } else {
    nextPageAt.set(ymd, page);
  }
  await logProgress(ymd, upserted, api.requestCount(), complete, page);
  return upserted;
}

/**
 * Fyller cachen för ett kalenderdygn tills alla API-sidor är hämtade.
 * Hoppar över om dagen redan fyllts klart (idag max 6 h).
 */
async function ensureFootballForDate(ymd: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd) || !hasApiKey()) return 0;

  const window = await resolveFixtureCoverage();
  if (outsideCoverage(ymd, window)) return 0;

  // Varje retur nedan är ett API-anrop vi slapp göra — logga det som
  // cacheträff så /admin/api-usage kan visa vad cachen sparar.
  const markedEmpty = emptyUntil.get(ymd);
  if (markedEmpty && markedEmpty > Date.now()) {
    logApiSportsCacheHit("api-football", "/fixtures", { date: ymd });
    return 0;
  }
  if (recentlyComplete(ymd)) {
    logApiSportsCacheHit("api-football", "/fixtures", { date: ymd });
    return 0;
  }

  let pending = filling.get(ymd);
  if (pending) return pending;
  if (await hasCompleteLog(ymd)) {
    logApiSportsCacheHit("api-football", "/fixtures", { date: ymd });
    return 0;
  }

  pending = filling.get(ymd);
  if (!pending) {
    pending = fillDay(ymd)
      .then((count) => {
        if (count === 0) emptyUntil.set(ymd, Date.now() + EMPTY_TTL_MS);
        return count;
      })
      .catch((err) => {
        const parsed = parsePlanWindow(
          err instanceof Error ? err.message : String(err)
        );
        if (parsed) rememberCoverage(parsed);
        if (isPlanLimit(err)) return 0;
        throw err;
      })
      .finally(() => filling.delete(ymd));
    filling.set(ymd, pending);
  }
  return pending;
}

// -------------------------------------------------------------
// Övriga sporter: hela dygnet i ett /games?date=-anrop.
// Egen sync_log-jobbnyckel per sport ("fill-day:hockey" …) så att en
// ifylld hockeydag aldrig misstas för en ifylld fotbollsdag.
// -------------------------------------------------------------

const sportFilling = new Map<string, Promise<number>>();
const sportCompletedAt = new Map<string, number>();

function sportJob(sport: SportSlug) {
  return `${FILL_JOB}:${sport}`;
}

function sportDayFresh(sport: SportSlug, ymd: string, at: number) {
  // Passerade dygn ändras inte längre; idag och framåt fylls om var 6:e timme.
  if (ymd < stockholmYmd()) return true;
  return Date.now() - at < TODAY_REFRESH_MS;
}

async function sportDayReady(sport: SportSlug, ymd: string) {
  const key = `${sport}:${ymd}`;
  const at = sportCompletedAt.get(key);
  if (at && sportDayFresh(sport, ymd, at)) return true;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("sync_log")
      .select("started_at")
      .eq("job", sportJob(sport))
      .eq("ok", true)
      .contains("meta", { ymd })
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data?.started_at) return false;
    const loggedAt = new Date(data.started_at).getTime();
    if (!sportDayFresh(sport, ymd, loggedAt)) return false;
    sportCompletedAt.set(key, loggedAt);
    return true;
  } catch {
    return false;
  }
}

async function fillSportDay(sport: SportSlug, ymd: string) {
  const api = clientForSport(
    sport,
    { get: (key) => process.env[key] },
    { maxPerMinute: PAID_REQUESTS_PER_MINUTE }
  );
  const now = new Date().toISOString();
  const games = await fetchGamesByDate(api, sport, ymd);
  const rows = games.map((g) => mapFixtureRow(g, sport, now));
  await upsertFixtureRows(rows);
  sportCompletedAt.set(`${sport}:${ymd}`, Date.now());
  try {
    const admin = createAdminClient();
    await admin.from("sync_log").insert({
      job: sportJob(sport),
      sport,
      ok: true,
      requests: api.requestCount(),
      upserted: rows.length,
      finished_at: new Date().toISOString(),
      meta: { ymd, complete: true },
    });
  } catch {
    /* minnet räcker i den här instansen */
  }
  return rows.length;
}

async function ensureSportForDate(sport: SportSlug, ymd: string) {
  if (await sportDayReady(sport, ymd)) {
    logApiSportsCacheHit(sportDef(sport).provider, sportDef(sport).gamesPath, {
      date: ymd,
    });
    return 0;
  }
  const key = `${sport}:${ymd}`;
  let pending = sportFilling.get(key);
  if (!pending) {
    pending = fillSportDay(sport, ymd).finally(() => sportFilling.delete(key));
    sportFilling.set(key, pending);
  }
  return pending;
}

/**
 * Ser till att ett kalenderdygn finns i fixtures-cachen för en sport.
 * Returnerar antalet nyss hämtade matcher (0 = cachen räckte).
 */
export async function ensureFixturesForDate(
  ymd: string,
  sport: SportSlug = "football"
) {
  if (sport === "football") return ensureFootballForDate(ymd);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd) || !hasApiKey()) return 0;
  return ensureSportForDate(sport, ymd);
}

export async function isFixtureDayReady(
  ymd: string,
  sport: SportSlug = "football"
) {
  if (sport === "football") return isFootballDayReady(ymd);
  if (!hasApiKey()) return true;
  return sportDayReady(sport, ymd);
}
