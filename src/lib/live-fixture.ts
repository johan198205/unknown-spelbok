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
  /** Tilläggstid. API stannar elapsed på 45/90 och räknar upp den här. */
  extra?: number | null;
  home_score: number | null;
  away_score: number | null;
  receivedAt?: number;
};

export type MatchFixture = {
  fixture_id: number;
  kickoff: string;
  status: string;
  elapsed?: number | null;
  extra?: number | null;
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

/** Sista ordinarie minut per halvlek — därefter är vi i tilläggstid. */
const REGULATION_END: Record<string, number> = {
  "1H": 45,
  "2H": 90,
  LIVE: 90,
  ET: 120,
};

/** Taket för lokalt påtickad tilläggstid. Ingen halvlek får 20 minuter. */
const MAX_EXTRA = 20;

export type MatchClock = {
  /** Ordinarie minut: 45 respektive 90 så snart tilläggstiden börjat. */
  minute: number | null;
  /** Minuter utöver ordinarie tid, eller null när matchen ligger inom den. */
  extra: number | null;
};

/** Klockan står still i paus, vid straffar och när matchen är avbruten. */
export function isTickingStatus(status: string | null | undefined) {
  if (!status || !isInPlayStatus(status)) return false;
  return !["HT", "BT", "P", "INT", "SUSP"].includes(status);
}

/**
 * Spelminuten mellan API-uppdateringar: senast kända minut plus minuterna
 * som gått sedan svaret kom in.
 *
 * API-Football stannar `elapsed` på 45 respektive 90 under tilläggstid och
 * räknar i stället upp `extra` — 45+9 kommer alltså som (45, 9), inte som 54.
 * Tickandet läggs därför på `extra` så fort tilläggstiden börjat, och rullar
 * över dit av sig självt om vi hinner passera 45/90 innan API:t svarat igen.
 */
export function liveClock(
  status: string,
  elapsed: number | null | undefined,
  extra: number | null | undefined,
  receivedAt?: number | null,
  now = Date.now(),
  kickoff?: string
): MatchClock {
  let minute = elapsed ?? null;
  if (minute == null && kickoff && isInPlayStatus(status)) {
    const start = new Date(kickoff).getTime();
    const mins = Math.floor((now - start) / 60_000);
    if (Number.isFinite(mins) && mins >= 0 && mins <= 130) {
      if (status === "1H") minute = Math.min(mins, 45);
      else if (status === "2H") minute = Math.min(Math.max(mins - 15, 46), 90);
      else if (status === "LIVE") {
        // Generisk livestatus: halvleken är okänd, så paus dras bort först
        // när klockan hunnit förbi den.
        minute = mins <= 45 ? mins : Math.min(Math.max(mins - 15, 46), 90);
      } else if (status === "ET") minute = Math.min(Math.max(mins - 15, 91), 120);
    }
  }
  if (minute == null) return { minute: null, extra: null };

  const known: MatchClock = { minute, extra: extra ?? null };
  if (!isTickingStatus(status) || !receivedAt) return known;

  const ticked = Math.floor((now - receivedAt) / 60_000);
  if (ticked <= 0) return known;

  // Redan i tilläggstid: API:ts minut är rätt boundary, bara extra växer.
  if (known.extra != null && known.extra > 0) {
    return { minute, extra: Math.min(known.extra + ticked, MAX_EXTRA) };
  }

  const end = REGULATION_END[status];
  if (end == null) return { minute: minute + ticked, extra: null };
  const total = minute + ticked;
  if (total <= end) return { minute: total, extra: null };
  return { minute: end, extra: Math.min(total - end, MAX_EXTRA) };
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
 * Klocktexten: löpande minut under spel, HT i paus, FT när matchen är slut
 * och 45+2 / 90+1 i tilläggstid. Före avspark visas starttiden.
 */
export function formatMatchClock(
  status: string,
  elapsed: number | null | undefined,
  kickoff: string,
  extra?: number | null
) {
  if (isFinishedStatus(status)) return "FT";
  if (status === "HT") return "HT";
  if (status === "BT") return "ET";
  if (status === "P") return "PEN";
  if (status === "NS" || status === "TBD" || status === "PST") {
    return formatKickoffTime(kickoff);
  }
  if (elapsed != null) {
    if (extra != null && extra > 0) return `${elapsed}+${extra}'`;
    // Skydd för minuter som aldrig gått genom liveClock: räkna om en minut
    // bortom halvlekens slut till tilläggstid i stället för att visa "92'".
    const end = REGULATION_END[status];
    if (end != null && elapsed > end) return `${end}+${elapsed - end}'`;
    return `${elapsed}'`;
  }
  if (status === "ET") return "ET";
  if (isInPlayStatus(status)) return status;
  return formatKickoffTime(kickoff);
}

/** Klocktexten för en match, med lokal tickning sedan senaste API-svaret. */
export function fixtureClock(
  fixture: Pick<
    MatchFixture,
    "status" | "elapsed" | "extra" | "kickoff" | "receivedAt"
  >,
  now = Date.now()
) {
  const clock = liveClock(
    fixture.status,
    fixture.elapsed,
    fixture.extra,
    fixture.receivedAt,
    now,
    fixture.kickoff
  );
  return formatMatchClock(
    fixture.status,
    clock.minute,
    fixture.kickoff,
    clock.extra
  );
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
    extra: f.extra ?? null,
    // Utan stämpeln står klockan stilla mellan pollningarna.
    receivedAt: f.receivedAt,
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
