/**
 * Sätter öppna spel utifrån färdiga fixtures.
 * Används av settle-results och poll-live.
 */

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { resolvePick, type Settlement } from "./settle.ts";
import { notifySite } from "./site-notify.ts";

type BetRow = {
  id: string;
  fixture_id: number | null;
  pick: string;
  match: string;
};

export type FinishedScore = { home: number; away: number };

async function queueBets(
  supabase: SupabaseClient,
  rows: { bet_id: string; reason: string }[]
) {
  if (!rows.length) return;
  const { error } = await supabase.from("settle_queue").insert(rows);
  if (error && !/duplicate|unique/i.test(error.message)) {
    console.error("settle_queue insert", error.message);
  }
}

export async function settleOpenBets(
  supabase: SupabaseClient,
  args: {
    finalById: Map<number, FinishedScore>;
    awardedIds?: number[];
    voidIds?: number[];
    missingIds?: number[];
    dryRun?: boolean;
  }
): Promise<{ settled: number; voided: number; queued: number }> {
  const awardedIds = args.awardedIds ?? [];
  const voidIds = args.voidIds ?? [];
  const missingIds = args.missingIds ?? [];
  const touchedIds = [...args.finalById.keys(), ...voidIds, ...missingIds];
  const summary = { settled: 0, voided: 0, queued: 0 };

  if (!touchedIds.length) return summary;

  const { data: openBets, error: betsError } = await supabase
    .from("bets")
    .select("id, fixture_id, pick, match")
    .eq("result", "open")
    .in("fixture_id", touchedIds);

  if (betsError) throw new Error(betsError.message);

  const bets = (openBets ?? []) as BetRow[];
  const { data: queued } = bets.length
    ? await supabase
        .from("settle_queue")
        .select("bet_id")
        .eq("resolved", false)
        .in(
          "bet_id",
          bets.map((b) => b.id)
        )
    : { data: [] };

  const alreadyQueued = new Set(
    ((queued ?? []) as { bet_id: string }[]).map((q) => q.bet_id)
  );

  const settledAt = new Date().toISOString();
  const byResult: Record<Settlement, string[]> = {
    win: [],
    loss: [],
    void: [],
  };
  const queueRows: { bet_id: string; reason: string }[] = [];

  for (const bet of bets) {
    const id = bet.fixture_id!;

    if (missingIds.includes(id)) {
      if (!alreadyQueued.has(bet.id)) {
        queueRows.push({ bet_id: bet.id, reason: "fixture_missing" });
      }
      continue;
    }

    if (voidIds.includes(id)) {
      byResult.void.push(bet.id);
      continue;
    }

    const score = args.finalById.get(id);
    if (!score) {
      if (!alreadyQueued.has(bet.id)) {
        queueRows.push({
          bet_id: bet.id,
          reason: awardedIds.includes(id) ? "awarded" : "unclear",
        });
      }
      continue;
    }

    const outcome = resolvePick(bet.pick, score.home, score.away);
    if (!outcome) {
      if (!alreadyQueued.has(bet.id)) {
        queueRows.push({
          bet_id: bet.id,
          reason: awardedIds.includes(id) ? "awarded" : "unclear",
        });
      }
      continue;
    }

    byResult[outcome].push(bet.id);
  }

  for (const [result, ids] of Object.entries(byResult) as [
    Settlement,
    string[],
  ][]) {
    if (!ids.length) continue;
    if (result === "void") summary.voided += ids.length;
    else summary.settled += ids.length;
    if (args.dryRun) continue;

    const { error } = await supabase
      .from("bets")
      .update({ result, settled_at: settledAt, settled_by: "auto" })
      .in("id", ids)
      .eq("result", "open");
    if (error) console.error(`kunde inte rätta ${result}`, error.message);
  }

  const settledIds = [
    ...byResult.win,
    ...byResult.loss,
    ...byResult.void,
  ];
  if (settledIds.length && !args.dryRun) {
    notifySite({ betIds: settledIds });
  }

  if (queueRows.length) {
    summary.queued = queueRows.length;
    if (!args.dryRun) await queueBets(supabase, queueRows);
  }

  return summary;
}
