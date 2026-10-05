import { unstable_cache } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { logApiSportsCacheHit } from "@/lib/api-sports/logRequest";
import {
  clientForSport,
  type ApiLeagueItem,
  type SportSlug,
} from "@/lib/apisports";
import { priorityRank } from "@/lib/league-priority";
import { isSportSlug, SPORT_SLUGS, sportDef } from "@/lib/sports";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 86400;

export type LeagueOption = {
  id: number;
  name: string;
  country: string | null;
  logo: string | null;
  priority: boolean;
};

function isCurrentLeague(item: ApiLeagueItem) {
  const seasons = item.seasons;
  if (!Array.isArray(seasons) || !seasons.length) return true;
  if (seasons.some((s) => s.current)) return true;
  // Basket anger inget `current` alls — räkna ligan som aktiv om den har
  // en säsong som började i år eller i fjol.
  if (seasons.every((s) => s.current === undefined)) {
    const year = new Date().getFullYear();
    return seasons.some((s) => s.year >= year - 1);
  }
  return false;
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

/**
 * v1-API:erna svarar platt ({id, name, logo, country, seasons[{season}]})
 * medan API-Football nästlar under `league`. Gör om till fotbollsformen.
 */
function toLeagueItem(raw: unknown): ApiLeagueItem {
  const item = (raw ?? {}) as Record<string, unknown>;
  if (item.league && typeof item.league === "object") return item as ApiLeagueItem;
  const country = item.country as { name?: string } | null | undefined;
  // AFL: en rad per liga och säsong, med season/current på toppnivå.
  const flatSeason =
    item.season != null
      ? [
          {
            year: Number(String(item.season).slice(0, 4)) || 0,
            current: item.current as boolean | undefined,
          },
        ]
      : undefined;
  const seasons = Array.isArray(item.seasons)
    ? (item.seasons as { season?: unknown; current?: boolean }[]).map((s) => ({
        year: Number(String(s.season ?? "").slice(0, 4)) || 0,
        current: s.current,
      }))
    : flatSeason;
  return {
    league: {
      id: Number(item.id) || 0,
      name: String(item.name ?? ""),
      logo: (item.logo as string | null) ?? null,
    },
    country: { name: country?.name },
    seasons,
  };
}

async function fetchLeaguesFromApi(sport: SportSlug): Promise<LeagueOption[]> {
  if (!sportDef(sport).hasLeagues) return [];
  apiFetches += 1;
  const api = clientForSport(sport, {
    get: (key) => process.env[key],
  });
  let items: unknown[];
  if (sport === "football") {
    try {
      items = await api.get<unknown>("/leagues", { current: true });
    } catch {
      items = await api.get<unknown>("/leagues");
    }
  } else {
    // v1-API:erna saknar current-filtret; sortLeagues sållar på seasons.
    items = await api.get<unknown>("/leagues");
  }
  return sortLeagues(sport, items.map(toLeagueItem));
}

const cachedLeagues = unstable_cache(
  async (sport: SportSlug) => fetchLeaguesFromApi(sport),
  ["api-leagues-v2"],
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
 * Query: sport=football|hockey|basketball|… (se sports.ts)
 */
export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const raw = (request.nextUrl.searchParams.get("sport") || "").toLowerCase();
  if (!isSportSlug(raw)) {
    return NextResponse.json(
      { error: `Parametern sport måste vara en av: ${SPORT_SLUGS.join(", ")}` },
      { status: 400 }
    );
  }
  const sport = raw as SportSlug;

  try {
    const before = apiFetches;
    const leagues = await cachedLeagues(sport);
    if (apiFetches === before) {
      logApiSportsCacheHit(
        sportDef(sport).provider,
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
