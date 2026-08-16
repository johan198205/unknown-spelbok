import type { Competition, LeaderboardRow } from "./types";

export type CompetitionVisibility = "public" | "invite";
export type CompetitionStatus = "live" | "upcoming" | "done";

export type CompetitionRules = Pick<
  Competition,
  "min_bets" | "min_total_stake"
>;

export type BoardEntry = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  bets_count: number;
  total_stake: number;
  netto: number;
  roi: number;
  qualified: boolean;
  /** Placement among qualified entrants, null below the bar. */
  rank: number | null;
};

const DAY = 86_400_000;

export function competitionStatus(
  competition: Pick<Competition, "starts_at" | "ends_at">,
  now = Date.now()
): CompetitionStatus {
  if (+new Date(competition.starts_at) > now) return "upcoming";
  if (+new Date(competition.ends_at) < now) return "done";
  return "live";
}

export function daysLeft(endsAt: string, now = Date.now()) {
  return Math.max(0, Math.ceil((+new Date(endsAt) - now) / DAY));
}

export function daysUntil(startsAt: string, now = Date.now()) {
  return Math.max(0, Math.ceil((+new Date(startsAt) - now) / DAY));
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("sv-SE");
}

export function formatPeriod(startsAt: string, endsAt: string) {
  return `${shortDate(startsAt)} → ${shortDate(endsAt)}`;
}

export function formatCountdown(
  competition: Pick<Competition, "starts_at" | "ends_at">,
  now = Date.now()
) {
  const status = competitionStatus(competition, now);
  if (status === "done") return "Avslutad";
  if (status === "upcoming") {
    const days = daysUntil(competition.starts_at, now);
    return days <= 1 ? "Startar i morgon" : `Startar om ${days} dagar`;
  }
  const days = daysLeft(competition.ends_at, now);
  if (days === 0) return "Slutar i dag";
  return days === 1 ? "Slutar i morgon" : `Slutar om ${days} dagar`;
}

export function formatStake(value: number) {
  return `${Math.round(value).toLocaleString("sv-SE")} kr`;
}

export function visibilityLabel(visibility: string) {
  return visibility === "invite" ? "Endast inbjudna" : "Publik";
}

export function isQualified(
  entry: Pick<BoardEntry, "bets_count" | "total_stake">,
  rules: CompetitionRules
) {
  return (
    entry.bets_count >= Number(rules.min_bets) &&
    entry.total_stake >= Number(rules.min_total_stake)
  );
}

/** Null when the competition has no entry bar at all. */
export function rulesSummary(rules: CompetitionRules) {
  const parts: string[] = [];
  if (Number(rules.min_bets) > 0) {
    parts.push(`minst ${Number(rules.min_bets)} spel`);
  }
  if (Number(rules.min_total_stake) > 0) {
    parts.push(`minst ${formatStake(Number(rules.min_total_stake))} i insats`);
  }
  return parts.length ? `Kvalificering: ${parts.join(" · ")}` : null;
}

/** Missing what the rules ask for, phrased for the entrant. */
export function missingSummary(
  entry: Pick<BoardEntry, "bets_count" | "total_stake">,
  rules: CompetitionRules
) {
  const parts: string[] = [];
  const bets = Number(rules.min_bets) - entry.bets_count;
  const stake = Number(rules.min_total_stake) - entry.total_stake;
  if (bets > 0) parts.push(`${bets} spel kvar`);
  if (stake > 0) parts.push(`${formatStake(stake)} kvar i insats`);
  return parts.join(" · ");
}

/**
 * Entrants who clear min_bets and min_total_stake rank on ROI; the rest keep
 * their numbers but sink to the bottom without a placement.
 */
export function rankBoard(
  rows: LeaderboardRow[],
  rules: CompetitionRules
): BoardEntry[] {
  const entries = rows
    .filter((row) => row.user_id)
    .map((row) => {
      const entry = {
        user_id: row.user_id as string,
        username: row.username ?? "Okänd",
        avatar_url: row.avatar_url ?? null,
        bets_count: Number(row.bets_count ?? 0),
        total_stake: Number(row.total_stake ?? 0),
        netto: Number(row.netto ?? 0),
        roi: Number(row.roi ?? 0),
      };
      return { ...entry, qualified: isQualified(entry, rules) };
    })
    .sort((a, b) => {
      if (a.qualified !== b.qualified) return a.qualified ? -1 : 1;
      if (b.roi !== a.roi) return b.roi - a.roi;
      return b.netto - a.netto;
    });

  let rank = 0;
  return entries.map((entry) => ({
    ...entry,
    rank: entry.qualified ? ++rank : null,
  }));
}

export function medalColor(rank: number | null) {
  if (rank === 1) return "text-yellow";
  if (rank === 2) return "text-text-soft";
  if (rank === 3) return "text-amber";
  return "text-muted";
}
