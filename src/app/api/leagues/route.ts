import { unstable_cache } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { logApiSportsCacheHit } from "@/lib/api-sports/logRequest";
import {
  clientForSport,
  type ApiLeagueItem,
  type SportSlug,
} from "@/lib/apisports";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 86400;

export type LeagueOption = {
  id: number;
  name: string;
  country: string | null;
  logo: string | null;
  priority: boolean;
};

const FOOTBALL_PRIORITY: { id: number; names: string[] }[] = [
  { id: 113, names: ["allsvenskan"] },
  { id: 39, names: ["premier league"] },
  { id: 140, names: ["la liga", "primera division"] },
  { id: 135, names: ["serie a"] },
  { id: 78, names: ["bundesliga"] },
  { id: 61, names: ["ligue 1"] },
  { id: 2, names: ["uefa champions league", "champions league"] },
];

const HOCKEY_PRIORITY: { id: number; names: string[] }[] = [
  { id: 57, names: ["shl", "swedish hockey league"] },
];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function priorityRank(sport: SportSlug, id: number, name: string): number {
  const list = sport === "hockey" ? HOCKEY_PRIORITY : FOOTBALL_PRIORITY;
  const needle = normalize(name);
  const byId = list.findIndex((item) => item.id === id);
  if (byId >= 0) return byId;
  const byName = list.findIndex((item) =>
    item.names.some((n) => needle === n || needle.includes(n))
  );
  return byName;
}

function isCurrentLeague(item: ApiLeagueItem) {
  const seasons = item.seasons;
  if (!Array.isArray(seasons) || !seasons.length) return true;
  return seasons.some((s) => s.current);
}

function sortLeagues(sport: SportSlug, items: ApiLeagueItem[]): LeagueOption[] {
  const byId = new Map<number, LeagueOption>();

  for (const item of items) {
    const id = item.league?.id;
    const name = item.league?.name?.trim();
    if (!id || !name) continue;
    if (!isCurrentLeague(item)) continue;

    const rank = priorityRank(sport, id, name);
    const next: LeagueOption = {
      id,
      name,
      country: item.country?.name?.trim() || null,
      logo: item.league.logo ?? null,
      priority: rank >= 0,
    };
    const prev = byId.get(id);
    if (!prev || (next.priority && !prev.priority)) {
      byId.set(id, next);
    }
  }

  const all = [...byId.values()];
  const priority = all
    .filter((l) => l.priority)
    .sort(
      (a, b) =>
        priorityRank(sport, a.id, a.name) - priorityRank(sport, b.id, b.name)
    );
  const other = all
    .filter((l) => !l.priority)
    .sort((a, b) => a.name.localeCompare(b.name, "sv"));

  return [...priority, ...other];
}

/**
 * Räknas upp varje gång vi faktiskt går ut mot API-Sports. GET jämför före
 * och efter — står den still serverades ligorna ur unstable_cache, och det
 * är en cacheträff värd att logga i förbrukningsstatistiken.
 */
let apiFetches = 0;

async function fetchLeaguesFromApi(sport: SportSlug): Promise<LeagueOption[]> {
  apiFetches += 1;
  const api = clientForSport(sport, {
    get: (key) => process.env[key],
  });
  let items: ApiLeagueItem[];
  try {
    items = await api.get<ApiLeagueItem>("/leagues", { current: true });
  } catch {
    items = await api.get<ApiLeagueItem>("/leagues");
  }
  return sortLeagues(sport, items);
}

const cachedLeagues = unstable_cache(
  async (sport: SportSlug) => fetchLeaguesFromApi(sport),
  ["api-leagues-v1"],
  { revalidate: 86400 }
);

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "Ej inloggad" }, { status: 401 }),
    };
  }
  return { supabase };
}

/**
 * Proxar API-Sports leagues. Cache 24h — ligor ändras sällan.
 * Query: sport=football|hockey
 */
export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const raw = (request.nextUrl.searchParams.get("sport") || "").toLowerCase();
  if (raw !== "football" && raw !== "hockey") {
    return NextResponse.json(
      { error: "Parametern sport måste vara football eller hockey" },
      { status: 400 }
    );
  }
  const sport = raw as SportSlug;

  try {
    const before = apiFetches;
    const leagues = await cachedLeagues(sport);
    if (apiFetches === before) {
      logApiSportsCacheHit(
        sport === "hockey" ? "api-hockey" : "api-football",
        "/leagues",
        { sport, current: true }
      );
    }
    return NextResponse.json(
      { leagues, sport },
      {
        headers: {
          "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Kunde inte hämta ligor";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
