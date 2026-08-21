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
  receivedAt?: number;
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
  venue?: string | null;
  receivedAt?: number;
};

export function isInPlayStatus(status: string | null | undefined) {
  if (!status) return false;
  return (IN_PLAY_STATUSES as readonly string[]).includes(status);
}

export function isFinishedStatus(status: string | null | undefined) {
  if (!status) return false;
  return (FINISHED_STATUSES as readonly string[]).includes(status);
}

export function needsLiveRefresh(
  status: string | null | undefined,
  kickoff?: string | null
) {
  if (isFinishedStatus(status)) return false;
  if (isInPlayStatus(status)) return true;
  if ((status === "NS" || status === "TBD") && kickoff) {
    const start = new Date(kickoff).getTime();
    if (Number.isNaN(start)) return false;
    return Date.now() >= start - 2 * 60_000;
  }
  return false;
}

/**
 * Tickar spelminuten lokalt mellan API-uppdateringar.
 * HT/paus står still. 1H/2H räknas upp max till tilläggstid.
 */
export function displayElapsed(
  status: string,
  elapsed: number | null | undefined,
  receivedAt?: number | null,
  now = Date.now(),
  kickoff?: string
) {
  let minute = elapsed ?? null;
  if (minute == null && kickoff && isInPlayStatus(status)) {
    const start = new Date(kickoff).getTime();
    const mins = Math.floor((now - start) / 60_000);
    if (Number.isFinite(mins) && mins >= 0 && mins <= 130) {
      if (status === "1H") minute = Math.min(mins, 59);
      else if (status === "2H" || status === "LIVE") {
        minute = Math.min(Math.max(mins - 15, 46), 105);
      } else if (status === "ET") minute = Math.min(Math.max(mins - 15, 91), 125);
    }
  }
  if (minute == null) return null;
  if (
    !isInPlayStatus(status) ||
    status === "HT" ||
    status === "BT" ||
    status === "P" ||
    status === "INT" ||
    status === "SUSP"
  ) {
    return minute;
  }
  if (!receivedAt) return minute;
  const extra = Math.floor((now - receivedAt) / 60_000);
  if (extra <= 0) return minute;
  const next = minute + extra;
  if (status === "1H") return Math.min(next, 59);
  if (status === "2H" || status === "LIVE") return Math.min(next, 105);
  if (status === "ET") return Math.min(next, 125);
  return next;
}

export function formatKickoffTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Stockholm",
  });
}

export function formatKickoffDay(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Stockholm",
  });
}

/** Meta för färdiga matcher i pickern: score + "2 maj 20:00, Stamford Bridge". */
export function finishedPickerMeta(
  fixture: Pick<
    MatchFixture,
    "home_name" | "away_name" | "home_score" | "away_score" | "kickoff" | "status"
  > & { venue?: string | null }
) {
  if (
    !isFinishedStatus(fixture.status) ||
    fixture.home_score == null ||
    fixture.away_score == null
  ) {
    return null;
  }
  const day = formatKickoffDay(fixture.kickoff);
  const time = formatKickoffTime(fixture.kickoff);
  const when = time ? `${day} ${time}` : day;
  const venue = fixture.venue?.trim();
  return {
    home: fixture.home_name || "Hemma",
    away: fixture.away_name || "Borta",
    score: `${fixture.home_score}–${fixture.away_score}`,
    meta: venue ? `${when}, ${venue}` : when,
  };
}

/** Enradigt val för färdiga matcher: "Chelsea – Tottenham 2–0 · 2 maj 20:00, Stamford Bridge" */
export function formatFinishedPickerLine(
  fixture: Pick<
    MatchFixture,
    "home_name" | "away_name" | "home_score" | "away_score" | "kickoff" | "status"
  > & { venue?: string | null }
) {
  const row = finishedPickerMeta(fixture);
  if (!row) return null;
  return `${row.home} – ${row.away} ${row.score} · ${row.meta}`;
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
