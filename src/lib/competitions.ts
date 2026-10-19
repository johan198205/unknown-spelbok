import { createT, type TFunction } from "./texts";
import type { Competition, LeaderboardRow } from "./types";

/** Standardtexterna, för anrop som inte skickar med t. */
const DEFAULT_T = createT({});

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
  now = Date.now(),
  t: TFunction = DEFAULT_T
) {
  const status = competitionStatus(competition, now);
  if (status === "done") return t("tavlingar.countdown.done");
  if (status === "upcoming") {
    const days = daysUntil(competition.starts_at, now);
    return days <= 1
      ? t("tavlingar.countdown.startsTomorrow")
      : t("tavlingar.countdown.startsIn", { days });
  }
  const days = daysLeft(competition.ends_at, now);
  if (days === 0) return t("tavlingar.countdown.endsToday");
  return days === 1
    ? t("tavlingar.countdown.endsTomorrow")
    : t("tavlingar.countdown.endsIn", { days });
}

export function formatStake(value: number, t: TFunction = DEFAULT_T) {
  return `${Math.round(value).toLocaleString("sv-SE")} ${t("tavlingar.unit.kr")}`;
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
export function rulesSummary(rules: CompetitionRules, t: TFunction = DEFAULT_T) {
  const parts: string[] = [];
  if (Number(rules.min_bets) > 0) {
    parts.push(t("tavlingar.rules.minBets", { count: Number(rules.min_bets) }));
  }
  if (Number(rules.min_total_stake) > 0) {
    parts.push(
      t("tavlingar.rules.minStake", {
        stake: formatStake(Number(rules.min_total_stake), t),
      })
    );
  }
  return parts.length ? t("tavlingar.rules.summary", { rules: parts.join(" · ") }) : null;
}

/** Missing what the rules ask for, phrased for the entrant. */
export function missingSummary(
  entry: Pick<BoardEntry, "bets_count" | "total_stake">,
  rules: CompetitionRules,
  t: TFunction = DEFAULT_T
) {
  const parts: string[] = [];
  const bets = Number(rules.min_bets) - entry.bets_count;
  const stake = Number(rules.min_total_stake) - entry.total_stake;
  if (bets > 0) parts.push(t("tavlingar.missing.bets", { count: bets }));
  if (stake > 0) parts.push(t("tavlingar.missing.stake", { stake: formatStake(stake, t) }));
  return parts.join(" · ");
}

/**
 * Entrants who clear min_bets and min_total_stake rank on ROI; the rest keep
 * their numbers but sink to the bottom without a placement.
 */
export function rankBoard(
  rows: LeaderboardRow[],
  rules: CompetitionRules,
  t: TFunction = DEFAULT_T
): BoardEntry[] {
  const entries = rows
    .filter((row) => row.user_id)
    .map((row) => {
      const entry = {
        user_id: row.user_id as string,
        username: row.username ?? t("tavlingar.unknownUser"),
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
