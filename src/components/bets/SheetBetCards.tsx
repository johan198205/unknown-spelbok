"use client";

import { BetRowActions } from "@/components/bets/BetRowActions";
import { LeagueLogo } from "@/components/bets/LeagueLogo";
import { LoggedBeforeKickoffIcon } from "@/components/bets/LoggedBeforeKickoff";
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
import { useAmount } from "@/components/DisplayPrefsProvider";
import { betNetto, cn, formatOdds, nettoColor } from "@/lib/utils";

/** Samma information som tabellen, staplad — inte en nedbantad variant. */
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
  /** Kortet en notis pekade ut. Pulsar i två sekunder, sedan null. */
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
            className={cn(
              "group/row flex flex-col rounded-[14px] border border-line bg-panel",
              bet.id === highlightBetId && "animate-sbrowpulse"
            )}
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
                  {bet.result === "open" ? "—" : amount(netto)}
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
              <span className="inline-flex w-3.5 shrink-0 translate-y-[2px] justify-center">
                <LoggedBeforeKickoffIcon value={bet.logged_before_kickoff} />
              </span>
              <span className="min-w-0 text-[15px] font-bold">
                {formatPick(bet.pick)}
              </span>
              <span className="shrink-0 font-mono-num text-[13px] text-muted">
                @ {formatOdds(Number(bet.odds))}
              </span>
            </div>

            {/*
              Allt på EN rad, i tre block med samma höjd (32px): rättningen
              tar plats som blir över, ikonerna och bolagsloggan står fast.
            */}
            <div className="flex items-center gap-2 border-t border-line-soft px-3.5 py-2.5">
              <SheetSettleControls bet={bet} canEdit={canEdit} size="card" />
              <BetRowActions
                bet={bet}
                canEdit={canEdit}
                canRygga={canRygga}
                size="card"
                onRygga={onRygga ? () => onRygga(bet) : undefined}
                onRemove={onRemove ? () => onRemove(bet) : undefined}
                hoverReveal={false}
              />
              <span className="shrink-0">
                <BookmakerPlate bet={bet} width={54} height={26} />
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
}
