/**
 * SPELBOK — beräknar och lagrar fixture_signals för dagens matcher.
 *
 * Körs som ett steg i generate-daily-suggestions, före poängsättningen.
 *
 * Kostnadsdisciplin: signaler beräknas BARA för matcher i ligor där minst
 * en användare har ett etablerat segment. Att räkna på alla 668 av dagens
 * matcher hade kostat drygt tusen API-anrop för data ingen tittar på.
 *
 * Felhantering: en fixture som inte går att hämta hoppas över och loggas.
 * Cron-körningen får aldrig dö på en enskild match.
 */

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { clientForSport, type SportSlug } from "./apisports.ts";
import { cached, h2hKey, newCacheStats, teamStatsKey } from "./api-cache.ts";
import {
  buildMetrics,
  goalDistributionMetrics,
  h2hMetrics,
  teamStatsMetrics,
  type FinishedFixture,
  type H2hFixture,
  type TeamStatsResponse,
} from "./signal-metrics.ts";
import type { SignalMetrics } from "./signals.ts";
import type { CandidateFixture } from "./suggest.ts";

/** Tak per körning så en dålig dag inte bränner hela kvoten. */
const MAX_FIXTURES_PER_RUN = 60;
/**
 * Väggklocka för signalsteget. Tre anrop per match mot en klient som
 * rate-limitar till 8–30/min betyder att 60 matcher aldrig hinner klart
 * innan Edge Functions timeout. Vi tar så många vi hinner och lämnar resten
 * till nästa körning — raderna som blev klara sparas ändå.
 */
const SIGNAL_BUDGET_MS = 60_000;
/** Paus mellan externa anrop — klienten har egen rate limit, det här är bälte. */
const CALL_DELAY_MS = 120;

export type FixtureSignal = {
  metrics: SignalMetrics;
  homeMatchesPlayed: number;
  awayMatchesPlayed: number;
};

export type SignalComputeSummary = {
  considered: number;
  computed: number;
  reused: number;
  failed: number;
  /** Varför de föll — "failed: 7" utan orsak är omöjligt att felsöka utifrån. */
  failedReasons: Record<string, number>;
  /** Antal matcher som inte hanns med innan tidsbudgeten tog slut. */
  skippedForTime: number;
  /**
   * Bara i dry-run: de faktiskt beräknade värdena för ett par matcher.
   * Utan dem går det inte att se OM ett fält saknas — och saknade fält är
   * den vanligaste orsaken till att en regel aldrig träffar.
   */
  sample?: {
    fixture_id: number;
    match: string;
    home_matches_played: number;
    away_matches_played: number;
    metrics: SignalMetrics;
  }[];
  apiCalls: number;
  cacheHits: number;
};

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function envGet(key: string) {
  return Deno.env.get(key);
}

/**
 * Färdigspelade matcher för de aktuella lagen, ur vår egen fixtures-cache.
 * Underlaget för over/under och BTTS — se signal-metrics.ts för varför de
 * inte kommer från /teams/statistics.
 */
async function loadFinishedFixtures(
  supabase: SupabaseClient,
  teamIds: number[]
): Promise<FinishedFixture[]> {
  if (!teamIds.length) return [];
  const ids = `(${teamIds.join(",")})`;
  const { data, error } = await supabase
    .from("fixtures")
    .select("home_team_id, away_team_id, home_score, away_score, kickoff")
    .or(`home_team_id.in.${ids},away_team_id.in.${ids}`)
    .not("home_score", "is", null)
    .not("away_score", "is", null)
    .order("kickoff", { ascending: false })
    .limit(4000);

  if (error) {
    console.warn(`signal-compute: slutresultat kunde inte läsas — ${error.message}`);
    return [];
  }
  return (data ?? []) as FinishedFixture[];
}

/**
 * Beräknar signaler för de fixtures som saknar rad för dagen och
 * returnerar allt (nytt + återanvänt) per fixture_id.
 */
export async function computeFixtureSignals(
  supabase: SupabaseClient,
  fixtures: CandidateFixture[],
  ymd: string,
  dryRun: boolean
): Promise<{ signals: Map<number, FixtureSignal>; summary: SignalComputeSummary }> {
  const signals = new Map<number, FixtureSignal>();
  const stats = newCacheStats();
  const summary: SignalComputeSummary = {
    considered: fixtures.length,
    computed: 0,
    reused: 0,
    failed: 0,
    failedReasons: {},
    skippedForTime: 0,
    apiCalls: 0,
    cacheHits: 0,
  };

  const fail = (reason: string) => {
    summary.failed += 1;
    summary.failedReasons[reason] = (summary.failedReasons[reason] ?? 0) + 1;
  };

  if (!fixtures.length) return { signals, summary };

  // Redan beräknade idag återanvänds rakt av.
  const { data: existing } = await supabase
    .from("fixture_signals")
    .select("fixture_id, metrics, home_matches_played, away_matches_played")
    .eq("signal_date", ymd)
    .in("fixture_id", fixtures.map((f) => f.fixture_id));

  for (const row of (existing ?? []) as {
    fixture_id: number;
    metrics: SignalMetrics;
    home_matches_played: number;
    away_matches_played: number;
  }[]) {
    signals.set(Number(row.fixture_id), {
      metrics: row.metrics ?? {},
      homeMatchesPlayed: row.home_matches_played,
      awayMatchesPlayed: row.away_matches_played,
    });
    summary.reused += 1;
  }

  const pending = fixtures
    .filter((f) => !signals.has(f.fixture_id))
    .slice(0, MAX_FIXTURES_PER_RUN);

  if (pending.length < fixtures.length - summary.reused) {
    console.warn(
      `signal-compute: ${fixtures.length - summary.reused} matcher saknar signaler, beräknar ${pending.length} denna körning`
    );
  }
  if (!pending.length) return { signals, summary };

  const teamIds = [
    ...new Set(
      pending.flatMap((f) => [f.home_team_id, f.away_team_id]).filter(
        (id): id is number => id != null
      )
    ),
  ];
  const finished = await loadFinishedFixtures(supabase, teamIds);

  // fixtures.season är inte alltid ifylld — rader kan ha skrivits innan
  // kolumnen fanns, och ensure-fixtures droppar den vid vissa fel.
  // active_leagues bär säsongen per liga och är den auktoritativa källan.
  const seasonByLeague = new Map<number, number>();
  {
    const { data } = await supabase
      .from("active_leagues")
      .select("league_id, season");
    for (const row of (data ?? []) as { league_id: number; season: number }[]) {
      seasonByLeague.set(Number(row.league_id), Number(row.season));
    }
  }

  const rows: Record<string, unknown>[] = [];
  const deadline = Date.now() + SIGNAL_BUDGET_MS;

  for (const fixture of pending) {
    if (Date.now() > deadline) {
      // Inte ett fel: nästa körning tar vid, och redan beräknade rader
      // återanvänds då via fixture_signals.
      summary.skippedForTime += 1;
      continue;
    }
    const sport: SportSlug =
      (fixture.sport ?? "").toLowerCase().includes("hockey") ||
      (fixture.sport ?? "").toLowerCase() === "ishockey"
        ? "hockey"
        : "football";
    const leagueId = fixture.league_id;
    const homeId = fixture.home_team_id;
    const awayId = fixture.away_team_id;
    const season =
      fixture.season ?? (leagueId != null ? seasonByLeague.get(leagueId) : null);

    if (leagueId == null) {
      fail("missing_league_id");
      continue;
    }
    if (homeId == null || awayId == null) {
      fail("missing_team_id");
      continue;
    }
    if (season == null) {
      fail("missing_season");
      continue;
    }

    try {
      const api = clientForSport(sport, { get: envGet });

      const homeStats = await cached<TeamStatsResponse | null>(
        supabase,
        teamStatsKey(sport, leagueId, season, homeId, ymd),
        async () => {
          await sleep(CALL_DELAY_MS);
          return await api.getResponse<TeamStatsResponse>("/teams/statistics", {
            league: leagueId,
            season,
            team: homeId,
          });
        },
        stats
      );

      const awayStats = await cached<TeamStatsResponse | null>(
        supabase,
        teamStatsKey(sport, leagueId, season, awayId, ymd),
        async () => {
          await sleep(CALL_DELAY_MS);
          return await api.getResponse<TeamStatsResponse>("/teams/statistics", {
            league: leagueId,
            season,
            team: awayId,
          });
        },
        stats
      );

      const h2h = await cached<H2hFixture[]>(
        supabase,
        h2hKey(sport, homeId, awayId, ymd),
        async () => {
          await sleep(CALL_DELAY_MS);
          return await api.get<H2hFixture>("/fixtures/headtohead", {
            h2h: `${homeId}-${awayId}`,
            last: 5,
          });
        },
        stats
      );

      summary.apiCalls += api.requestCount();

      const home = teamStatsMetrics(homeStats, "home");
      const away = teamStatsMetrics(awayStats, "away");

      const metrics = buildMetrics([
        home.metrics,
        away.metrics,
        goalDistributionMetrics(finished, homeId, "home"),
        goalDistributionMetrics(finished, awayId, "away"),
        h2hMetrics(h2h ?? [], homeId),
      ]);

      signals.set(fixture.fixture_id, {
        metrics,
        homeMatchesPlayed: home.matchesPlayed,
        awayMatchesPlayed: away.matchesPlayed,
      });
      summary.computed += 1;

      rows.push({
        fixture_id: fixture.fixture_id,
        signal_date: ymd,
        sport,
        league_id: leagueId,
        season,
        metrics,
        home_matches_played: home.matchesPlayed,
        away_matches_played: away.matchesPlayed,
      });
    } catch (err) {
      // En match som inte går att hämta ska inte stoppa de andra.
      // Meddelandet blir del av nyckeln: "api_error: 7" utan text tvingar
      // fram en rundtur till funktionsloggen för att komma vidare.
      const message = err instanceof Error ? err.message : String(err);
      fail(`api_error: ${message.slice(0, 120)}`);
      console.warn(
        `signal-compute: fixture ${fixture.fixture_id} hoppas över — ${message}`
      );
    }
  }

  summary.cacheHits = stats.hits;

  if (dryRun) {
    summary.sample = rows.slice(0, 2).map((row) => {
      const fixture = pending.find((f) => f.fixture_id === row.fixture_id);
      return {
        fixture_id: row.fixture_id as number,
        match: `${fixture?.home_name ?? "?"} – ${fixture?.away_name ?? "?"}`,
        home_matches_played: row.home_matches_played as number,
        away_matches_played: row.away_matches_played as number,
        metrics: row.metrics as SignalMetrics,
      };
    });
  }

  if (rows.length && !dryRun) {
    const { error } = await supabase
      .from("fixture_signals")
      .upsert(rows, { onConflict: "fixture_id,signal_date" });
    if (error) {
      console.warn(`signal-compute: kunde inte spara signaler — ${error.message}`);
    }
  }

  return { signals, summary };
}
