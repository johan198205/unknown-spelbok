/**
 * Livescore-hjälpare: status, spelminut och kickoff-tid.
 * Speglar API-Football fixture.status.short / elapsed.
 */

export const IN_PLAY_STATUSES = [
  "1H",
  "HT",
  "2H",
  "ET",
  "BT",
  "P",
  "LIVE",
  "INT",
  "SUSP",
] as const;

export const FINISHED_STATUSES = ["FT", "AET", "PEN"] as const;

export type LiveFixturePatch = {
  status: string;
  elapsed: number | null;
  home_score: number | null;
  away_score: number | null;
};

export type MatchFixture = {
  fixture_id: number;
  kickoff: string;
  status: string;
  elapsed?: number | null;
  home_name?: string | null;
  away_name?: string | null;
  home_logo?: string | null;
  away_logo?: string | null;
  home_team_id?: number | null;
  away_team_id?: number | null;
  home_score?: number | null;
  away_score?: number | null;
  sport?: string | null;
};

export function isInPlayStatus(status: string | null | undefined) {
  if (!status) return false;
  return (IN_PLAY_STATUSES as readonly string[]).includes(status);
}

export function isFinishedStatus(status: string | null | undefined) {
  if (!status) return false;
  return (FINISHED_STATUSES as readonly string[]).includes(status);
}

export function formatKickoffTime(iso: string) {
  return new Date(iso).toLocaleTimeString("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Stockholm",
  });
}

/**
 * Spelminut för livekortet.
 * HT → HT, FT/AET/PEN → FT, förlängning → 90+X' eller ET.
 */
export function formatMatchClock(
  status: string,
  elapsed: number | null | undefined,
  kickoff: string
) {
  if (isFinishedStatus(status)) return "FT";
  if (status === "HT") return "HT";
  if (status === "BT") return "ET";
  if (status === "P") return "PEN";
  if (status === "ET") {
    if (elapsed != null && elapsed > 90) return `90+${elapsed - 90}'`;
    return "ET";
  }
  if (status === "NS" || status === "TBD" || status === "PST") {
    return formatKickoffTime(kickoff);
  }
  if (elapsed != null) {
    if (status === "2H" && elapsed > 90) return `90+${elapsed - 90}'`;
    if (status === "1H" && elapsed > 45) return `45+${elapsed - 45}'`;
    return `${elapsed}'`;
  }
  if (isInPlayStatus(status)) return status;
  return formatKickoffTime(kickoff);
}

export function mergeLivePatch<T extends LiveFixturePatch>(
  fixture: T,
  patch: LiveFixturePatch | undefined
): T {
  if (!patch) return fixture;
  return { ...fixture, ...patch };
}

export function fixtureFromBet(bet: {
  fixture_id?: number | null;
  match: string;
  placed_at: string;
  sport?: string | null;
  fixtures?: Partial<MatchFixture> | null;
}): MatchFixture | null {
  const f = bet.fixtures;
  if (!f?.home_team_id && !f?.home_logo && !f?.home_name) return null;
  return {
    fixture_id: f.fixture_id ?? bet.fixture_id ?? 0,
    kickoff: f.kickoff || bet.placed_at,
    status: f.status || "NS",
    elapsed: f.elapsed ?? null,
    home_name: f.home_name || bet.match,
    away_name: f.away_name || "",
    home_logo: f.home_logo,
    away_logo: f.away_logo,
    home_team_id: f.home_team_id,
    away_team_id: f.away_team_id,
    home_score: f.home_score ?? null,
    away_score: f.away_score ?? null,
    sport: f.sport ?? bet.sport,
  };
}

export function applyLiveToBet<T extends { fixture_id?: number | null; fixtures?: Partial<LiveFixturePatch> | null }>(
  bet: T,
  patches: Record<number, LiveFixturePatch>
): T {
  const id = bet.fixture_id;
  if (!id || !patches[id] || !bet.fixtures) return bet;
  return { ...bet, fixtures: { ...bet.fixtures, ...patches[id] } };
}
