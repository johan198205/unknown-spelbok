import {
  chunk,
  DEFAULT_TIMEZONE,
  footballClientFromEnv,
  type ApiFixtureItem,
} from "@/lib/apisports";
import { mapFixtureRow } from "@/lib/map-fixture";
import { addStockholmDays, stockholmYmd } from "@/lib/stockholm";
import { createAdminClient } from "@/lib/supabase/admin";

const filling = new Map<string, Promise<number>>();
const emptyUntil = new Map<string, number>();
const EMPTY_TTL_MS = 10 * 60 * 1000;

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

async function fillDay(ymd: string) {
  const api = footballClientFromEnv({
    get: (key) => process.env[key],
  });
  const items = await api.get<ApiFixtureItem>("/fixtures", {
    date: ymd,
    timezone: DEFAULT_TIMEZONE,
  });
  const now = new Date().toISOString();
  const rows = items.map((item) => mapFixtureRow(item, "football", now));

  if (rows.length) {
    const admin = createAdminClient();
    for (const group of chunk(rows, 150)) {
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

  return rows.length;
}

/**
 * Fyller cachen för ett kalenderdygn om den är tom.
 * Ett API-anrop (plus paging) per dag, delas av alla användare.
 */
export async function ensureFixturesForDate(ymd: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd) || !hasApiKey()) return 0;

  const window = await resolveFixtureCoverage();
  if (outsideCoverage(ymd, window)) return 0;

  const markedEmpty = emptyUntil.get(ymd);
  if (markedEmpty && markedEmpty > Date.now()) return 0;

  let pending = filling.get(ymd);
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
