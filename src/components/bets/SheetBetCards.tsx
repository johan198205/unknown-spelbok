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
import { betDisplayDate, betLeagueLogo } from "@/lib/logos";
import { formatPick } from "@/lib/picks";
import type { SheetDensity } from "@/lib/sheet-filters";
import type { Bet } from "@/lib/types";
import { useAmount } from "@/components/DisplayPrefsProvider";
import { betNetto, cn, formatOdds, nettoColor } from "@/lib/utils";

/** Kortvy: lag → avlång spelval-box → tre boxar (resultat/insats, odds, bolag). */
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sheet:grid-cols-3">
      {bets.map((bet) => {
        const netto = betNetto(bet);
        const kickoff = new Date(betDisplayDate(bet));
        const live =
          bet.result === "open" &&
          isInPlayStatus(fixtureFromBet(bet)?.status);
        return (
          <article
            key={bet.id}
            className={cn(
              "group/row flex flex-col gap-2.5 rounded-[14px] border border-line bg-panel p-3.5",
              bet.id === highlightBetId && "animate-sbrowpulse"
            )}
          >
            <div className="flex min-w-0 items-center gap-1.5">
              {bet.league ? (
                <LeagueLogo
                  src={betLeagueLogo(bet)}
                  leagueId={bet.league_id ?? bet.fixtures?.league_id}
                  sport={bet.sport ?? bet.fixtures?.sport}
                  name={bet.league}
                  size={22}
                />
              ) : null}
              <span className="min-w-0 truncate text-[12.5px] text-muted">
                {bet.league ? `${bet.league} · ` : ""}
                {kickoff.toLocaleDateString("sv-SE")}{" "}
                {kickoff.toLocaleTimeString("sv-SE", {
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
              <span className="ml-auto shrink-0">
                <BetRowActions
                  bet={bet}
                  canEdit={canEdit}
                  canRygga={canRygga}
                  size="card"
                  onRygga={onRygga ? () => onRygga(bet) : undefined}
                  onRemove={onRemove ? () => onRemove(bet) : undefined}
                  hoverReveal={false}
                />
              </span>
            </div>

            <SheetMatchCell bet={bet} density={density} variant="card" />

            <div className="flex min-w-0 items-center gap-2 rounded-[11px] border border-line-soft bg-bg-soft px-3 py-2.5">
              <span className="inline-flex w-3.5 shrink-0 justify-center">
                <LoggedBeforeKickoffIcon value={bet.logged_before_kickoff} />
              </span>
              <span className="min-w-0 flex-1 truncate text-[15px] font-bold">
                {formatPick(bet.pick)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-[11px] border border-line-soft bg-bg-soft px-2.5 py-2">
                <div className="text-[10px] uppercase tracking-[0.08em] text-faint">
                  Resultat
                </div>
                <div
                  className={cn(
                    "mt-1 font-display text-[16px] font-semibold leading-none",
                    bet.result === "open" ? "text-muted" : nettoColor(netto)
                  )}
                >
                  {bet.result === "open" ? "—" : amount(netto)}
                </div>
                <div className="mt-1 font-mono-num text-[11px] text-muted">
                  {Number(bet.stake).toLocaleString("sv-SE")} kr
                </div>
                <div className="mt-1.5">
                  <SheetSettleControls bet={bet} canEdit={canEdit} size="card" />
                </div>
              </div>
              <div className="rounded-[11px] border border-line-soft bg-bg-soft px-2.5 py-2">
                <div className="text-[10px] uppercase tracking-[0.08em] text-faint">
                  Odds
                </div>
                <div className="mt-1 font-mono-num text-[16px] font-semibold">
                  {formatOdds(Number(bet.odds))}
                </div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-[11px] border border-line-soft bg-bg-soft px-2 py-2">
                <div className="mb-1 text-[10px] uppercase tracking-[0.08em] text-faint">
                  Bolag
                </div>
                <BookmakerPlate bet={bet} width={54} height={26} />
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
