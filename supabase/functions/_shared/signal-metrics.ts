/**
 * SPELBOK — beräknar fältbiblioteket för en fixture.
 *
 * AVSTEG FRÅN PROMPTBOARDEN, medvetet:
 *
 * Promptboarden anger /teams/statistics som källa för over_X_5_pct. Det
 * endpointet ger `goals.for.under_over`, vilket är hur ofta laget SJÄLVT
 * gjort över N mål — inte hur ofta matchen slutat över N totalt. Det är
 * marknaden "över 2.5" handlar om, och skillnaden är stor: ett lag som gör
 * 3+ mål i 60 % av matcherna finns knappt, medan matcher över 2.5 mål är
 * vardagsmat. Seed-regeln "Målrik matchbild" hade aldrig kunnat träffa.
 *
 * Over/under och BTTS räknas därför ur vår egen fixtures-cache, där vi har
 * faktiska slutresultat. Har vi för få spelade matcher för ett lag utelämnas
 * fälten ur metrics, vilket gör att villkor som refererar dem faller — regeln
 * träffar inte i stället för att träffa på fel underlag.
 *
 * Övriga fält kommer från /teams/statistics, som ger dem korrekt.
 */

import type { SignalMetrics } from "./signals.ts";

/** Minsta antal färdigspelade matcher innan en fördelning betyder något. */
export const MIN_GOAL_SAMPLE = 5;

/** Delmängden av /teams/statistics vi faktiskt läser. */
export type TeamStatsResponse = {
  form?: string | null;
  fixtures?: {
    played?: { home?: number | null; away?: number | null; total?: number | null };
  };
  goals?: {
    for?: {
      average?: { home?: string | null; away?: string | null; total?: string | null };
    };
    against?: {
      average?: { total?: string | null };
    };
  };
  clean_sheet?: { total?: number | null };
  failed_to_score?: { total?: number | null };
};

/** Färdigspelad match ur fixtures-cachen. */
export type FinishedFixture = {
  home_team_id: number | null;
  away_team_id: number | null;
  home_score: number | null;
  away_score: number | null;
  kickoff: string;
};

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pct(part: number, whole: number): number | null {
  if (!whole) return null;
  return (part / whole) * 100;
}

/** "WWDLW" → poäng för de fem senaste (W=3, D=1, L=0). */
export function formPoints(form: string | null | undefined): number | null {
  if (!form) return null;
  const last5 = form.replace(/[^WDL]/gi, "").toUpperCase().slice(-5);
  if (!last5) return null;
  let points = 0;
  for (const char of last5) {
    if (char === "W") points += 3;
    else if (char === "D") points += 1;
  }
  return points;
}

/**
 * Fält som /teams/statistics ger korrekt. Prefixas med "home."/"away.".
 * Fält som saknas i svaret utelämnas helt — aldrig noll som gissning, för
 * 0 % hållna nollor är ett påstående och saknad data är det inte.
 */
export function teamStatsMetrics(
  stats: TeamStatsResponse | null,
  side: "home" | "away"
): { metrics: SignalMetrics; matchesPlayed: number } {
  const metrics: SignalMetrics = {};
  if (!stats) return { metrics, matchesPlayed: 0 };

  const played = num(stats.fixtures?.played?.total) ?? 0;
  const venuePlayed =
    side === "home"
      ? num(stats.fixtures?.played?.home)
      : num(stats.fixtures?.played?.away);

  const avgFor = num(stats.goals?.for?.average?.total);
  const avgAgainst = num(stats.goals?.against?.average?.total);
  const avgForVenue =
    side === "home"
      ? num(stats.goals?.for?.average?.home)
      : num(stats.goals?.for?.average?.away);

  if (avgFor !== null) metrics[`${side}.avg_goals_for`] = avgFor;
  if (avgAgainst !== null) metrics[`${side}.avg_goals_against`] = avgAgainst;
  // avg_goals_for_home respektive avg_goals_for_away — nyckeln följer sidan.
  if (avgForVenue !== null && venuePlayed) {
    metrics[`${side}.avg_goals_for_${side}`] = avgForVenue;
  }

  const cleanSheets = num(stats.clean_sheet?.total);
  const failedToScore = num(stats.failed_to_score?.total);
  if (cleanSheets !== null) {
    const value = pct(cleanSheets, played);
    if (value !== null) metrics[`${side}.clean_sheet_pct`] = value;
  }
  if (failedToScore !== null) {
    const value = pct(failedToScore, played);
    if (value !== null) metrics[`${side}.failed_to_score_pct`] = value;
  }

  const points = formPoints(stats.form);
  if (points !== null) metrics[`${side}.form_points_last_5`] = points;

  return { metrics, matchesPlayed: played };
}

/**
 * Over/under och BTTS ur faktiska slutresultat.
 *
 * Returnerar tomt objekt vid för litet underlag — se filhuvudet.
 */
export function goalDistributionMetrics(
  finished: FinishedFixture[],
  teamId: number,
  side: "home" | "away"
): SignalMetrics {
  const played = finished.filter(
    (f) =>
      (f.home_team_id === teamId || f.away_team_id === teamId) &&
      f.home_score !== null &&
      f.away_score !== null
  );

  if (played.length < MIN_GOAL_SAMPLE) return {};

  let over15 = 0;
  let over25 = 0;
  let over35 = 0;
  let btts = 0;

  for (const f of played) {
    const total = (f.home_score ?? 0) + (f.away_score ?? 0);
    if (total > 1.5) over15 += 1;
    if (total > 2.5) over25 += 1;
    if (total > 3.5) over35 += 1;
    if ((f.home_score ?? 0) > 0 && (f.away_score ?? 0) > 0) btts += 1;
  }

  const n = played.length;
  return {
    [`${side}.over_1_5_pct`]: (over15 / n) * 100,
    [`${side}.over_2_5_pct`]: (over25 / n) * 100,
    [`${side}.over_3_5_pct`]: (over35 / n) * 100,
    [`${side}.btts_pct`]: (btts / n) * 100,
  };
}

/** En rad ur /fixtures/headtohead. */
export type H2hFixture = {
  teams?: { home?: { id?: number }; away?: { id?: number } };
  goals?: { home?: number | null; away?: number | null };
  fixture?: { status?: { short?: string } };
};

const FINISHED = ["FT", "AET", "PEN"];

/**
 * Inbördes möten. Bara färdigspelade räknas; ett inställt möte säger
 * ingenting om matchbilden.
 */
export function h2hMetrics(
  items: H2hFixture[],
  homeTeamId: number
): SignalMetrics {
  const played = items.filter(
    (item) =>
      FINISHED.includes(item.fixture?.status?.short ?? "") &&
      item.goals?.home !== null &&
      item.goals?.home !== undefined &&
      item.goals?.away !== null &&
      item.goals?.away !== undefined
  );

  if (!played.length) return {};

  let goals = 0;
  let btts = 0;
  let homeWins = 0;

  for (const item of played) {
    const h = item.goals?.home ?? 0;
    const a = item.goals?.away ?? 0;
    goals += h + a;
    if (h > 0 && a > 0) btts += 1;
    // Vinsten räknas för det lag som är hemma i DAGENS match, oavsett
    // vem som stod hemma i det historiska mötet.
    const wasHome = item.teams?.home?.id === homeTeamId;
    const scoredForToday = wasHome ? h : a;
    const scoredAgainstToday = wasHome ? a : h;
    if (scoredForToday > scoredAgainstToday) homeWins += 1;
  }

  const n = played.length;
  return {
    "h2h.avg_goals_last_5": goals / n,
    "h2h.btts_pct_last_5": (btts / n) * 100,
    "h2h.home_wins_last_5": homeWins,
    "h2h.matches_count": n,
  };
}

/** Slår ihop delarna och lägger på de härledda kombinationsfälten. */
export function buildMetrics(parts: SignalMetrics[]): SignalMetrics {
  const metrics: SignalMetrics = Object.assign({}, ...parts);

  const homeFor = metrics["home.avg_goals_for"];
  const awayFor = metrics["away.avg_goals_for"];
  if (typeof homeFor === "number" && typeof awayFor === "number") {
    metrics["combined.avg_goals"] = homeFor + awayFor;
  }

  const homeAgainst = metrics["home.avg_goals_against"];
  const awayAgainst = metrics["away.avg_goals_against"];
  if (
    typeof homeFor === "number" &&
    typeof awayFor === "number" &&
    typeof homeAgainst === "number" &&
    typeof awayAgainst === "number"
  ) {
    // Vad båda lagens siffror tillsammans pekar mot: lagets anfall vägt mot
    // motståndarens försvar, för båda hållen.
    metrics["combined.avg_total_goals"] =
      (homeFor + awayAgainst) / 2 + (awayFor + homeAgainst) / 2;
  }

  return metrics;
}
