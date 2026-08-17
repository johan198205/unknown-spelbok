/**
 * SPELBOK — Edge Function: sync-fixtures
 *
 * Körs 1 gång/dygn (05:00 Europe/Stockholm, se db/cron.sql).
 * Hämtar säsongens matcher (+ lag om de saknas) för varje aktiv liga
 * och upsertar till fixtures/teams. Inga anrop sker från Next.js.
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

export async function handleSyncFixtures(req: Request) {
  const startedAt = Date.now();
  const url = new URL(req.url);
  const sportFilter = (url.searchParams.get("sport") || "football") as SportSlug;
  const forceTeams = url.searchParams.get("teams") === "1";

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
