"use client";

import { BetRowActions } from "@/components/bets/BetRowActions";
import { LeagueLogo } from "@/components/bets/LeagueLogo";
import { SheetLockIcon } from "@/components/bets/LoggedBeforeKickoff";
import { BookmakerPlate } from "@/components/bets/SheetBetsTable";
import { SheetMatchCell } from "@/components/bets/SheetMatchCell";
import { SheetSettleControls } from "@/components/bets/SheetSettleControls";
import { useAmount } from "@/components/DisplayPrefsProvider";
import { formatKickoffTime } from "@/lib/live-fixture";
import { betDisplayDate, betLeagueLogo } from "@/lib/logos";
import { formatPick } from "@/lib/picks";
import type { SheetDensity } from "@/lib/sheet-filters";
import type { Bet } from "@/lib/types";
import {
  betNetto,
  betPossibleWin,
  cn,
  formatOdds,
  nettoColor,
} from "@/lib/utils";

/** Kortvy: huvudrad → match → spel → insats/odds → utfall → rättning. */
export function SheetBetCards({
  bets,
  canEdit,
  canRygga,
  onRygga,
  onRemove,
  density,
  highlightBetId,
}: {
  bets: Bet[];
  canEdit: boolean;
  canRygga: boolean;
  onRygga?: (bet: Bet) => void;
  onRemove?: (bet: Bet) => void;
  density: SheetDensity;
  highlightBetId?: string | null;
}) {
  const amount = useAmount();

  if (!bets.length) {
    return (
      <div className="rounded-[14px] border border-line bg-panel px-4 py-12 text-center text-muted">
        Inga spel i urvalet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sheet:grid-cols-4">
      {bets.map((bet) => {
        const kickoffIso = betDisplayDate(bet);
        const kickoff = new Date(kickoffIso);
        const time = formatKickoffTime(kickoffIso);
        const pick = formatPick(bet.pick);
        const settled = bet.result !== "open";
        const netto = betNetto(bet);
        const possibleWin = betPossibleWin(bet);
        const outcomeValue = settled ? netto : possibleWin;
        const outcomeLabel = settled ? "Resultat" : "Möjlig vinst";
        const note = bet.note?.trim() || "";
        const meta = [
          bet.league,
          [
            kickoff.toLocaleDateString("sv-SE"),
            time,
          ]
            .filter(Boolean)
            .join(" "),
        ]
          .filter(Boolean)
          .join(" · ");

        return (
          <article
            key={bet.id}
            className={cn(
              "group/row flex flex-col rounded-[14px] border border-line bg-panel p-3.5",
              bet.id === highlightBetId && "animate-sbrowpulse"
            )}
          >
            {/* 1. Huvudrad */}
            <div className="flex min-w-0 items-center gap-2.5">
              {bet.league ? (
                <span className="inline-flex size-[26px] shrink-0 items-center justify-center rounded-full bg-[rgba(230,234,242,0.07)] p-[3px]">
                  <LeagueLogo
                    src={betLeagueLogo(bet)}
                    leagueId={bet.league_id ?? bet.fixtures?.league_id}
                    sport={bet.sport ?? bet.fixtures?.sport}
                    name={bet.league}
                    size={20}
                  />
                </span>
              ) : null}
              <span className="min-w-0 flex-auto truncate text-[12.5px] text-[#8A94AB]">
                {meta}
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                <BetRowActions
                  bet={bet}
                  canEdit={canEdit}
                  canRygga={canRygga}
                  size="card"
                  onRygga={onRygga ? () => onRygga(bet) : undefined}
                  onRemove={onRemove ? () => onRemove(bet) : undefined}
                  hoverReveal={false}
                />
                {note ? (
                  <span
                    title={note}
                    aria-label={note}
                    className="inline-flex size-[22px] shrink-0 cursor-help items-center justify-center rounded-full border border-line-strong font-mono-num text-[11px] font-semibold text-[#5D6883]"
                  >
                    i
                  </span>
                ) : null}
                <SheetLockIcon
                  value={bet.logged_before_kickoff}
                  className="mr-0"
                />
              </span>
            </div>

            {/* 2. Matchblocket */}
            <div className="mt-2.5">
              <SheetMatchCell bet={bet} density={density} variant="card" />
            </div>

            {/* 3. Spel i full bredd, insats och odds under */}
            <div className="mt-3 rounded-[11px] border border-line-soft bg-bg-soft px-[13px] py-2.5">
              <div className="mb-1 text-[10px] uppercase tracking-[0.13em] text-[#5D6883]">
                Spel
              </div>
              <div className="break-words text-[16px] font-bold leading-snug">
                {pick}
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded-[11px] border border-line-soft bg-bg-soft px-[13px] py-2">
                <div className="mb-0.5 text-[10px] uppercase tracking-[0.13em] text-[#5D6883]">
                  Insats
                </div>
                <div className="whitespace-nowrap font-mono-num text-[14px] font-semibold tabular-nums">
                  {amount(Number(bet.stake), { sign: false })}
                </div>
              </div>
              <div className="rounded-[11px] border border-line-soft bg-bg-soft px-[13px] py-2 text-right">
                <div className="mb-0.5 text-[10px] uppercase tracking-[0.13em] text-[#5D6883]">
                  Odds
                </div>
                <div className="font-mono-num text-[14px] font-semibold tabular-nums">
                  {formatOdds(Number(bet.odds))}
                </div>
              </div>
            </div>

            {/* 4. Utfallsrad */}
            <div className="mt-3.5 flex items-end gap-3 border-t border-line-soft pt-3.5">
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 text-[10px] uppercase tracking-[0.13em] text-[#5D6883]">
                  {outcomeLabel}
                </div>
                <span
                  className={cn(
                    "whitespace-nowrap font-mono-num text-[19px] font-semibold tabular-nums",
                    settled ? nettoColor(outcomeValue) : "text-[#C3CBDB]"
                  )}
                >
                  {amount(outcomeValue)}
                </span>
              </div>
              <BookmakerPlate bet={bet} width={80} height={34} branded />
            </div>

            {/* 5. Rättningsknappar */}
            <div className="mt-3">
              <SheetSettleControls bet={bet} canEdit={canEdit} size="card" />
            </div>
          </article>
        );
      })}
    </div>
  );
}
