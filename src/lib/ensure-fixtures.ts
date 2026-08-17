import {
  chunk,
  DEFAULT_TIMEZONE,
  footballClientFromEnv,
  type ApiFixtureItem,
} from "@/lib/apisports";
import { mapFixtureRow } from "@/lib/map-fixture";
import { createAdminClient } from "@/lib/supabase/admin";

const filling = new Map<string, Promise<number>>();
const emptyUntil = new Map<string, number>();
const EMPTY_TTL_MS = 10 * 60 * 1000;

function hasApiKey() {
  return !!(process.env.APISPORTS_KEY || process.env.APIFOOTBALL_KEY);
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
      if (error && /season|raw/i.test(error.message)) {
        const slim = group.map(({ raw: _raw, season: _season, ...rest }) => rest);
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

  const markedEmpty = emptyUntil.get(ymd);
  if (markedEmpty && markedEmpty > Date.now()) return 0;

  let pending = filling.get(ymd);
  if (!pending) {
    pending = fillDay(ymd)
      .then((count) => {
        if (count === 0) emptyUntil.set(ymd, Date.now() + EMPTY_TTL_MS);
        return count;
      })
      .finally(() => filling.delete(ymd));
    filling.set(ymd, pending);
  }
  return pending;
}
