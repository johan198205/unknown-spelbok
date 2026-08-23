/**
 * SPELBOK — regelmotorn bakom "Dagens matcher för dig".
 *
 * Helt deterministisk och fri från I/O: samma fixture + samma profil ger
 * alltid samma poäng och samma skäl. Ingen AI, ingen slump, inga anrop.
 * Edge Functionen generate-daily-suggestions hämtar datan och kallar hit.
 *
 * Poängtaket är 100 (30 + 40 + 10 + 5 + 15) och tröskeln 40. Utan ett
 * etablerat ligasegment kan en match som mest nå 30 — dvs. förslag ges
 * bara i ligor användaren faktiskt har historik i.
 */

export const WEIGHTS = {
  league: 30,
  betTypeStrong: 40,
  betTypeOk: 15,
  sport: 10,
  kickoff: 5,
  team: 15,
} as const;

export const MIN_MATCH_SCORE = 40;
export const MAX_SUGGESTIONS_PER_USER = 5;
/** Under 5 rättade spel är segmentet för tunt för att säga något. */
export const MIN_SEGMENT_BETS = 5;
/** Minst så många rättade spel totalt innan användaren får förslag alls. */
export const MIN_TOTAL_SETTLED_BETS = 10;

const HITRATE_STRONG = 55;
const HITRATE_OK = 45;
const KICKOFF_FROM_HOUR = 12;
const KICKOFF_TO_HOUR = 23;
const TIMEZONE = "Europe/Stockholm";

/** En rad ur get_user_betting_profile(). */
export type ProfileSegment = {
  sport: string;
  league_id: number | null;
  league_name: string;
  bet_type: string;
  bets: number;
  weighted_bets: number | string | null;
  hitrate: number | string | null;
  roi: number | string | null;
  avg_odds: number | string | null;
  last_bet_at: string | null;
  established: boolean;
};

/** Kolumnerna vi läser ur fixtures-cachen. */
export type CandidateFixture = {
  fixture_id: number;
  kickoff: string;
  sport: string;
  league_id: number | null;
  league_name: string | null;
  league_logo: string | null;
  home_team_id: number | null;
  home_name: string | null;
  home_logo: string | null;
  away_team_id: number | null;
  away_name: string | null;
  away_logo: string | null;
};

export type Reason = {
  type: "league" | "bet_type" | "sport" | "kickoff" | "team";
  label: string;
  weight: number;
};

export type UserProfile = {
  userId: string;
  dominantSport: string;
  segments: ProfileSegment[];
  /** Lag-id ur matcher användaren tidigare spelat på. */
  teamIds: Set<number>;
};

export type ScoredSuggestion = {
  fixture: CandidateFixture;
  matchScore: number;
  reasons: Reason[];
  suggestedBetType: string | null;
};

/**
 * Sänkta trösklar för dry-run. Finns för att kunna se vad motorn *skulle*
 * föreslå innan en användare hunnit bygga upp fem rättade spel i ett
 * segment. Den skarpa körningen skickar aldrig in dem.
 */
export type Thresholds = {
  minSegmentBets?: number;
  minMatchScore?: number;
};

function num(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** fixtures.sport lagras som svensk UI-etikett, profilen normaliseras likadant. */
export function normalizeSport(raw: string | null | undefined): string {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "football" || v === "fotboll") return "Fotboll";
  if (v === "hockey" || v === "ishockey") return "Ishockey";
  return (raw ?? "").trim() || "Okänt";
}

/** Sport-slug som lagras på daily_suggestions.sport. */
export function sportSlugOf(raw: string | null | undefined): string {
  return normalizeSport(raw) === "Ishockey" ? "hockey" : "football";
}

function sameLeague(segment: ProfileSegment, fixture: CandidateFixture) {
  if (segment.league_id != null && fixture.league_id != null) {
    return Number(segment.league_id) === Number(fixture.league_id);
  }
  const a = (segment.league_name || "").trim().toLowerCase();
  const b = (fixture.league_name || "").trim().toLowerCase();
  return a.length > 0 && a === b;
}

/** Timme i svensk lokaltid — avsparkspoängen är definierad i lokal tid. */
export function stockholmHourMinute(iso: string): { hour: number; label: string } {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return { hour, label: `${String(hour).padStart(2, "0")}:${minute}` };
}

function plural(n: number, one: string, many: string) {
  return n === 1 ? one : many;
}

/**
 * Poängsätter en match mot en profil. Returnerar null när matchen inte
 * når tröskeln — anroparen behöver inte filtrera själv.
 */
export function scoreFixture(
  fixture: CandidateFixture,
  profile: UserProfile,
  thresholds: Thresholds = {}
): ScoredSuggestion | null {
  const minSegmentBets = thresholds.minSegmentBets ?? MIN_SEGMENT_BETS;
  const minMatchScore = thresholds.minMatchScore ?? MIN_MATCH_SCORE;
  const fixtureSport = normalizeSport(fixture.sport);
  const reasons: Reason[] = [];
  let score = 0;
  let suggestedBetType: string | null = null;

  // `established` speglar standardtröskeln och kan inte sänkas i efterhand,
  // så vid override är antalet spel det som gäller.
  const leagueSegments = profile.segments.filter(
    (s) =>
      (s.established || minSegmentBets < MIN_SEGMENT_BETS) &&
      s.bets >= minSegmentBets &&
      normalizeSport(s.sport) === fixtureSport &&
      sameLeague(s, fixture)
  );

  if (leagueSegments.length) {
    const leagueBets = leagueSegments.reduce((sum, s) => sum + s.bets, 0);
    const leagueName =
      fixture.league_name || leagueSegments[0].league_name || "ligan";
    score += WEIGHTS.league;
    reasons.push({
      type: "league",
      label: `Du har ${plural(leagueBets, "spelat 1 spel", `spelat ${leagueBets} spel`)} i ${leagueName}`,
      weight: WEIGHTS.league,
    });

    // Bästa spelformen i ligan: högst hitrate, fler spel bryter lika.
    const best = [...leagueSegments].sort((a, b) => {
      const diff = (num(b.hitrate) ?? 0) - (num(a.hitrate) ?? 0);
      return diff !== 0 ? diff : b.bets - a.bets;
    })[0];
    const hitrate = num(best.hitrate);

    if (hitrate != null && hitrate >= HITRATE_STRONG) {
      score += WEIGHTS.betTypeStrong;
      suggestedBetType = best.bet_type;
      reasons.push({
        type: "bet_type",
        label: `${hitrate.toFixed(0)} % hitrate på ${best.bet_type.toLowerCase()} i ${leagueName}`,
        weight: WEIGHTS.betTypeStrong,
      });
    } else if (hitrate != null && hitrate >= HITRATE_OK) {
      score += WEIGHTS.betTypeOk;
      suggestedBetType = best.bet_type;
      reasons.push({
        type: "bet_type",
        label: `${hitrate.toFixed(0)} % hitrate på ${best.bet_type.toLowerCase()} i ${leagueName}`,
        weight: WEIGHTS.betTypeOk,
      });
    }
  }

  if (fixtureSport === normalizeSport(profile.dominantSport)) {
    score += WEIGHTS.sport;
    reasons.push({
      type: "sport",
      label: `${fixtureSport} är din mest spelade sport`,
      weight: WEIGHTS.sport,
    });
  }

  const { hour, label } = stockholmHourMinute(fixture.kickoff);
  if (hour >= KICKOFF_FROM_HOUR && hour <= KICKOFF_TO_HOUR) {
    score += WEIGHTS.kickoff;
    reasons.push({
      type: "kickoff",
      label: `Avspark ${label}`,
      weight: WEIGHTS.kickoff,
    });
  }

  // Vilket lag användaren backade går inte att läsa ur ett fritext-pick,
  // så skälet formuleras som "matcher med", inte "spelat på laget".
  const knownTeams = [
    { id: fixture.home_team_id, name: fixture.home_name },
    { id: fixture.away_team_id, name: fixture.away_name },
  ].filter((t) => t.id != null && profile.teamIds.has(Number(t.id)));

  if (knownTeams.length) {
    score += WEIGHTS.team;
    reasons.push({
      type: "team",
      label:
        knownTeams.length > 1
          ? "Du har spelat på båda lagen tidigare"
          : `Du har spelat på matcher med ${knownTeams[0].name ?? "laget"}`,
      weight: WEIGHTS.team,
    });
  }

  if (score < minMatchScore) return null;

  return {
    fixture,
    matchScore: Math.min(100, score),
    reasons: reasons.sort((a, b) => b.weight - a.weight),
    suggestedBetType,
  };
}

/** Poängsätter hela dagen och returnerar de bästa matcherna för en användare. */
export function suggestionsForUser(
  fixtures: CandidateFixture[],
  profile: UserProfile,
  limit = MAX_SUGGESTIONS_PER_USER,
  thresholds: Thresholds = {}
): ScoredSuggestion[] {
  const scored: ScoredSuggestion[] = [];
  for (const fixture of fixtures) {
    const hit = scoreFixture(fixture, profile, thresholds);
    if (hit) scored.push(hit);
  }
  return scored
    .sort(
      (a, b) =>
        b.matchScore - a.matchScore ||
        Date.parse(a.fixture.kickoff) - Date.parse(b.fixture.kickoff)
    )
    .slice(0, limit);
}

/** Rad redo för upsert mot daily_suggestions. */
export function toSuggestionRow(
  userId: string,
  suggestionDate: string,
  hit: ScoredSuggestion
) {
  const f = hit.fixture;
  return {
    user_id: userId,
    suggestion_date: suggestionDate,
    fixture_id: f.fixture_id,
    sport: sportSlugOf(f.sport),
    league_id: f.league_id ?? 0,
    league_name: f.league_name ?? "Okänd liga",
    league_logo: f.league_logo,
    home_team: f.home_name ?? "Hemma",
    home_team_id: f.home_team_id,
    home_logo: f.home_logo,
    away_team: f.away_name ?? "Borta",
    away_team_id: f.away_team_id,
    away_logo: f.away_logo,
    kickoff: f.kickoff,
    suggested_bet_type: hit.suggestedBetType,
    match_score: hit.matchScore,
    reasons: hit.reasons,
  };
}

export function pushBody(count: number) {
  return count === 1
    ? "1 match matchar din spelstil idag"
    : `${count} matcher matchar din spelstil idag`;
}
