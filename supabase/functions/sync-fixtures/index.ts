/**
 * SPELBOK — Edge Function: sync-fixtures
 *
 * Körs 1 gång/dygn (se db/cron.sql). Två lägen:
 *
 *   ?sport=football (standard)
 *     Säsongens matcher (+ lag om de saknas) för varje aktiv liga i
 *     active_leagues.
 *
 *   ?sport=hockey|basketball|… (övriga sporter i sports.ts)
 *     Alla matcher i sporten för idag och de närmaste dagarna
 *     (?days=, standard 7). Ett /games?date=-anrop per dygn — så att
 *     matchsöket hittar kommande matcher utan att någon först öppnat dagen.
 *
 * Deploy:
 *   supabase secrets set APISPORTS_KEY=... APISPORTS_FOOTBALL_URL=https://v3.football.api-sports.io
 *   supabase functions deploy sync-fixtures
 */

import {
  clientForSport,
  DEFAULT_TIMEZONE,
  type ApiFixtureItem,
  type ApiLeagueItem,
  type ApiTeamItem,
  type SportSlug,
} from "../_shared/apisports.ts";
import { mapFixtureRow, mapTeamRow } from "../_shared/map.ts";
import { fetchGamesByDate } from "../_shared/sport-games.ts";
import { isSportSlug } from "../_shared/sports.ts";
import {
  createServiceClient,
  finishSyncLog,
  startSyncLog,
} from "../_shared/supabase.ts";

type ActiveLeague = {
  sport: SportSlug;
  league_id: number;
  season: number;
  name: string;
  verified: boolean;
};

function envGet(key: string) {
  return Deno.env.get(key);
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

const DEFAULT_DAYS_AHEAD = 7;
const MAX_DAYS_AHEAD = 14;

function addDays(ymd: string, days: number) {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function stockholmToday() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: DEFAULT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Kommande dygn för en sport utan active_leagues (allt i sporten). */
async function syncUpcoming(sport: SportSlug, days: number) {
  const startedAt = Date.now();
  const supabase = createServiceClient();
  const logId = await startSyncLog(supabase, "sync-fixtures", sport);
  const api = clientForSport(sport, { get: envGet });
  const perDay: Record<string, number> = {};
  let upserted = 0;

  try {
    const today = stockholmToday();
    for (let i = 0; i <= days; i++) {
      const ymd = addDays(today, i);
      const games = await fetchGamesByDate(api, sport, ymd);
      const now = new Date().toISOString();
      const rows = games.map((g) => mapFixtureRow(g, sport, now));
      for (let j = 0; j < rows.length; j += 200) {
        const { error } = await supabase
          .from("fixtures")
          .upsert(rows.slice(j, j + 200), { onConflict: "fixture_id" });
        if (error) throw new Error(`fixtures upsert: ${error.message}`);
      }
      perDay[ymd] = rows.length;
      upserted += rows.length;
    }

    await finishSyncLog(supabase, logId, {
      ok: true,
      requests: api.requestCount(),
      upserted,
      meta: { days: perDay },
    });
    return json({
      ok: true,
      sport,
      upserted,
      requests: api.requestCount(),
      days: perDay,
      ms: Date.now() - startedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("sync-fixtures", sport, message);
    await finishSyncLog(supabase, logId, {
      ok: false,
      requests: api.requestCount(),
      upserted,
      error: message,
      meta: { days: perDay },
    }).catch(() => {});
    return json({ ok: false, sport, error: message, upserted }, 500);
  }
}

export async function handleSyncFixtures(req: Request) {
  const startedAt = Date.now();
  const url = new URL(req.url);
  const sportParam = (url.searchParams.get("sport") || "football").toLowerCase();
  if (!isSportSlug(sportParam)) {
    return json({ ok: false, error: `Okänd sport: ${sportParam}` }, 400);
  }
  const sportFilter = sportParam as SportSlug;
  const forceTeams = url.searchParams.get("teams") === "1";

  if (sportFilter !== "football") {
    const days = Math.min(
      MAX_DAYS_AHEAD,
      Math.max(0, Number(url.searchParams.get("days") ?? DEFAULT_DAYS_AHEAD) || 0)
    );
    return syncUpcoming(sportFilter, days);
  }

  let logId: string | null = null;
  let requests = 0;
  let upserted = 0;
  const meta: Record<string, unknown> = { leagues: [] as unknown[] };

  try {
    const supabase = createServiceClient();
    logId = await startSyncLog(supabase, "sync-fixtures", sportFilter);
    const api = clientForSport(sportFilter, { get: envGet });

    const { data: leagues, error: leagueError } = await supabase
      .from("active_leagues")
      .select("sport, league_id, season, name, verified")
      .eq("active", true)
      .eq("sport", sportFilter);

    if (leagueError) throw new Error(leagueError.message);

    const active = (leagues ?? []) as ActiveLeague[];
    if (!active.length) {
      await finishSyncLog(supabase, logId, {
        ok: true,
        requests: 0,
        meta: { skipped: "no_active_leagues" },
      });
      return json({ ok: true, upserted: 0, requests: 0, ms: Date.now() - startedAt });
    }

    for (const league of active) {
      const leagueMeta: Record<string, unknown> = {
        league_id: league.league_id,
        season: league.season,
        name: league.name,
      };

      if (!league.verified) {
        const found = await api.get<ApiLeagueItem>("/leagues", {
          id: league.league_id,
        });
        const match = found[0];
        const apiName = match?.league?.name ?? "";
        const ok =
          apiName.toLowerCase() === league.name.toLowerCase() ||
          apiName.toLowerCase().includes(league.name.toLowerCase()) ||
          league.name.toLowerCase().includes(apiName.toLowerCase());
        if (!match || !ok) {
          throw new Error(
            `Liga ${league.league_id} verifierades inte som "${league.name}" (API: "${apiName || "saknas"}")`
          );
        }
        await supabase
          .from("active_leagues")
          .update({
            verified: true,
            name: match.league.name,
            country: match.country?.name ?? null,
            logo_url: match.league.logo ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("sport", league.sport)
          .eq("league_id", league.league_id)
          .eq("season", league.season);
        leagueMeta.verified = true;
      }

      const { count: teamCount } = await supabase
        .from("team_leagues")
        .select("*", { count: "exact", head: true })
        .eq("sport", league.sport)
        .eq("league_id", league.league_id)
        .eq("season", league.season);

      if (forceTeams || !teamCount) {
        const teams = await api.get<ApiTeamItem>("/teams", {
          league: league.league_id,
          season: league.season,
        });
        const now = new Date().toISOString();
        const teamRows = teams.map((t) => mapTeamRow(t, league.sport, now));
        const membership = teams.map((t) => ({
          team_id: t.team.id,
          sport: league.sport,
          league_id: league.league_id,
          season: league.season,
        }));

        if (teamRows.length) {
          const { error } = await supabase
            .from("teams")
            .upsert(teamRows, { onConflict: "id,sport" });
          if (error) throw new Error(`teams upsert: ${error.message}`);
        }
        if (membership.length) {
          const { error } = await supabase
            .from("team_leagues")
            .upsert(membership, {
              onConflict: "team_id,sport,league_id,season",
            });
          if (error) throw new Error(`team_leagues upsert: ${error.message}`);
        }
        leagueMeta.teams = teamRows.length;
      }

      const fixtures = await api.get<ApiFixtureItem>("/fixtures", {
        league: league.league_id,
        season: league.season,
        timezone: DEFAULT_TIMEZONE,
      });
      const now = new Date().toISOString();
      const rows = fixtures.map((item) => mapFixtureRow(item, league.sport, now));

      if (rows.length) {
        const { error } = await supabase
          .from("fixtures")
          .upsert(rows, { onConflict: "fixture_id" });
        if (error) throw new Error(`fixtures upsert: ${error.message}`);
      }

      upserted += rows.length;
      leagueMeta.fixtures = rows.length;
      (meta.leagues as unknown[]).push(leagueMeta);
    }

    requests = api.requestCount();
    await finishSyncLog(supabase, logId, {
      ok: true,
      requests,
      upserted,
      meta,
    });

    return json({
      ok: true,
      upserted,
      requests,
      leagues: meta.leagues,
      ms: Date.now() - startedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("sync-fixtures", message);
    if (logId) {
      try {
        const supabase = createServiceClient();
        await finishSyncLog(supabase, logId, {
          ok: false,
          requests,
          upserted,
          error: message,
          meta,
        });
      } catch (logErr) {
        console.error("kunde inte skriva sync_log", logErr);
      }
    }
    return json({ ok: false, error: message, requests, upserted }, 500);
  }
}

Deno.serve(handleSyncFixtures);
