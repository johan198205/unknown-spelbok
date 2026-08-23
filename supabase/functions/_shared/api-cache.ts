/**
 * SPELBOK — cachelager för api-sports-svar (tabell api_cache).
 *
 * Ett lag som spelar idag och imorgon ska kosta ett anrop, inte två, och en
 * omkörning samma dag ska kosta noll. Nyckeln bär därför datumet.
 *
 * Cachen är avsiktligt dum: ingen invalidering, bara TTL. Lagstatistik
 * ändras när laget spelat en match, och då byter datumet ändå nyckel.
 */

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

export type CacheStats = {
  hits: number;
  misses: number;
  writes: number;
};

export function newCacheStats(): CacheStats {
  return { hits: 0, misses: 0, writes: 0 };
}

/**
 * Hämtar ur cachen, annars via `load()` och skriver tillbaka.
 *
 * Cachefel sväljs medvetet: kan vi inte läsa cachen hämtar vi från API:et,
 * och kan vi inte skriva den tappar vi bara framtida träffar. Ingetdera är
 * skäl att avbryta en cron-körning.
 */
export async function cached<T>(
  supabase: SupabaseClient,
  key: string,
  load: () => Promise<T>,
  stats?: CacheStats,
  ttlMs = DEFAULT_TTL_MS
): Promise<T> {
  try {
    const { data } = await supabase
      .from("api_cache")
      .select("payload, expires_at")
      .eq("cache_key", key)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (data?.payload !== undefined && data.payload !== null) {
      if (stats) stats.hits += 1;
      return data.payload as T;
    }
  } catch {
    /* cachen är en optimering, aldrig ett krav */
  }

  if (stats) stats.misses += 1;
  const value = await load();

  try {
    await supabase.from("api_cache").upsert(
      {
        cache_key: key,
        payload: value as unknown as Record<string, unknown>,
        expires_at: new Date(Date.now() + ttlMs).toISOString(),
      },
      { onConflict: "cache_key" }
    );
    if (stats) stats.writes += 1;
  } catch {
    /* se ovan */
  }

  return value;
}

/** Rensar utgångna rader. Billigt, och håller tabellen från att växa fritt. */
export async function pruneCache(supabase: SupabaseClient) {
  try {
    await supabase
      .from("api_cache")
      .delete()
      .lt("expires_at", new Date().toISOString());
  } catch {
    /* städning får misslyckas */
  }
}

export function teamStatsKey(
  sport: string,
  leagueId: number,
  season: number,
  teamId: number,
  ymd: string
) {
  return `teamstats:${sport}:${leagueId}:${season}:${teamId}:${ymd}`;
}

export function h2hKey(
  sport: string,
  homeId: number,
  awayId: number,
  ymd: string
) {
  // Sortera id:na: mötet är detsamma oavsett vem som står hemma idag.
  const [a, b] = homeId <= awayId ? [homeId, awayId] : [awayId, homeId];
  return `h2h:${sport}:${a}-${b}:${ymd}`;
}
