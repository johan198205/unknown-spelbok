import { isFinishedStatus } from "@/lib/live-fixture";
import { resolvePick, type Settlement } from "@/lib/settle-pick";
import { stockholmDayBounds, stockholmYmd } from "@/lib/stockholm";
import { payoutForResult } from "@/lib/utils";
import type { BetResult } from "@/lib/types";

export type NewBetSettlement = {
  result: BetResult;
  payout: number;
  settled_at: string | null;
  settled_by: "auto" | "user" | null;
};

/**
 * Avgör 1X2 och över/under mot slutresultat. Andra spelformer och
 * framtida matcher lämnas öppna.
 */
export function settlementForFinishedPick(args: {
  pick: string;
  stake: number;
  odds: number;
  status?: string | null;
  kickoff?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
}): NewBetSettlement {
  const open: NewBetSettlement = {
    result: "open",
    payout: 0,
    settled_at: null,
    settled_by: null,
  };

  if (!isFinishedStatus(args.status)) return open;
  if (args.kickoff && new Date(args.kickoff).getTime() > Date.now()) return open;
  if (args.homeScore == null || args.awayScore == null) return open;

  const outcome: Settlement | null = resolvePick(
    args.pick,
    args.homeScore,
    args.awayScore
  );
  if (!outcome) return open;

  return {
    result: outcome,
    payout: payoutForResult(outcome, args.stake, args.odds),
    settled_at: new Date().toISOString(),
    settled_by: "auto",
  };
}

/** Bakåtdatera placed_at för passerade matcher, annars DB-default (nu). */
export function placedAtForPastBet(ymd: string, kickoff?: string | null) {
  if (ymd >= stockholmYmd()) return undefined;
  return kickoff || stockholmDayBounds(ymd).from;
}
