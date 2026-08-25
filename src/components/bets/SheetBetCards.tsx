"use client";

import { BetRowActions } from "@/components/bets/BetRowActions";
import { LeagueLogo } from "@/components/bets/LeagueLogo";
import { BookmakerPlate } from "@/components/bets/SheetBetsTable";
import { SheetMatchCell } from "@/components/bets/SheetMatchCell";
import {
  SettleSourceIcon,
  SheetSettleControls,
} from "@/components/bets/SheetSettleControls";
import { fixtureFromBet, isInPlayStatus } from "@/lib/live-fixture";
import { betLeagueLogo } from "@/lib/logos";
import { formatPick } from "@/lib/picks";
import type { SheetDensity } from "@/lib/sheet-filters";
import type { Bet } from "@/lib/types";
import { betNetto, cn, formatMoney, formatOdds, nettoColor } from "@/lib/utils";

/** Samma information som tabellen, staplad — inte en nedbantad variant. */
export function SheetBetCards({
  bets,
  canEdit,
  canRygga,
  onRygga,
  onRemove,
  density,
}: {
  bets: Bet[];
  canEdit: boolean;
  canRygga: boolean;
  onRygga?: (bet: Bet) => void;
  onRemove?: (bet: Bet) => void;
  density: SheetDensity;
}) {
  if (!bets.length) {
    return (
      <div className="rounded-[14px] border border-line bg-panel px-4 py-12 text-center text-muted">
        Inga spel i urvalet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sheet:grid-cols-4">
      {bets.map((bet) => {
        const netto = betNetto(bet);
        const placed = new Date(bet.placed_at);
        const live =
          bet.result === "open" &&
          isInPlayStatus(fixtureFromBet(bet)?.status);
        return (
          <article
            key={bet.id}
            className="group/row flex flex-col rounded-[14px] border border-line bg-panel"
          >
            <div className="flex items-start gap-2 p-3.5 pb-2.5">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  {bet.league ? (
                    <LeagueLogo
                      src={betLeagueLogo(bet)}
                      leagueId={bet.league_id ?? bet.fixtures?.league_id}
                      sport={bet.sport ?? bet.fixtures?.sport}
                      name={bet.league}
                      size={26}
                    />
                  ) : null}
                  <span className="min-w-0 truncate text-[12.5px] text-muted">
                    {bet.league ? `${bet.league} · ` : ""}
                    {placed.toLocaleDateString("sv-SE")}{" "}
                    {placed.toLocaleTimeString("sv-SE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <SettleSourceIcon bet={bet} />
                  {live ? (
                    <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-cyan">
                      <span className="size-1.5 animate-sbpulse rounded-full bg-cyan" />
                      Live
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div
                  className={cn(
                    "font-display text-[22px] font-semibold leading-none",
                    bet.result === "open" ? "text-muted" : nettoColor(netto)
                  )}
                >
                  {bet.result === "open" ? "—" : formatMoney(netto)}
                </div>
                <div className="mt-1 font-mono-num text-[12px] text-muted">
                  {Number(bet.stake).toLocaleString("sv-SE")} kr
                </div>
              </div>
            </div>

            <div className="px-3.5">
              <SheetMatchCell bet={bet} density={density} variant="card" />
            </div>

            <div className="flex flex-1 items-baseline gap-2 px-3.5 py-2.5">
              <span className="min-w-0 text-[15px] font-bold">
                {formatPick(bet.pick)}
              </span>
              <span className="shrink-0 font-mono-num text-[13px] text-muted">
                @ {formatOdds(Number(bet.odds))}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-line-soft px-3.5 py-2.5">
              <SheetSettleControls bet={bet} canEdit={canEdit} size="card" />
              <div className="flex shrink-0 items-center gap-2">
                <BetRowActions
                  bet={bet}
                  canEdit={canEdit}
                  canRygga={canRygga}
                  onRygga={onRygga ? () => onRygga(bet) : undefined}
                  onRemove={onRemove ? () => onRemove(bet) : undefined}
                  hoverReveal={false}
                />
                <BookmakerPlate bet={bet} width={62} height={28} />
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
