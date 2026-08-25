import type { BetStats } from "@/lib/types";
import {
  MIN_ROI_BETS,
  cn,
  formatMoney,
  formatNumber,
  formatPercent,
  formatRoiOrDash,
  nettoColor,
} from "@/lib/utils";

/**
 * Nyckeltalen som ETT sammanhängande fält i stället för sju lösa kort.
 *
 * Siffrorna räknas på det filtrerade urvalet — fältet ska följa filterraden,
 * annars läser man ROI för hela spelboken bredvid en tabell som visar maj.
 */
export function SheetKpiStrip({
  stats,
  betCount,
}: {
  stats: BetStats;
  betCount: number;
}) {
  const cells: Array<{
    label: string;
    value: string;
    basis: number;
    big?: boolean;
    color?: string;
  }> = [
    {
      label: "Netto",
      value: formatMoney(stats.netto),
      basis: 200,
      big: true,
      color: nettoColor(stats.netto),
    },
    {
      label: "ROI",
      value: formatRoiOrDash(stats.roi, stats.bets),
      basis: 126,
      color:
        stats.bets >= MIN_ROI_BETS ? nettoColor(stats.roi) : "text-faint",
    },
    { label: "Hitrate", value: formatPercent(stats.hitrate), basis: 126 },
    { label: "Spel", value: String(betCount), basis: 96 },
    {
      label: "Omsättning",
      value: formatMoney(stats.stake).replace("+", ""),
      basis: 158,
    },
    { label: "Snittodds", value: formatNumber(stats.avgOdds, 2), basis: 126 },
    {
      label: "Snittinsats",
      value: formatMoney(Math.round(stats.avgStake)).replace("+", ""),
      basis: 148,
    },
  ];

  return (
    <section className="rounded-[14px] border border-line bg-panel">
      <div className="flex flex-wrap">
        {cells.map((cell, i) => (
          <div
            key={cell.label}
            style={{ flexBasis: cell.basis }}
            className={cn(
              "grow px-[18px] py-[17px]",
              i > 0 && "border-l border-line-soft"
            )}
          >
            <div className="mb-1.5 text-[11px] uppercase tracking-[0.13em] text-muted">
              {cell.label}
            </div>
            <div
              className={cn(
                "whitespace-nowrap font-mono-num font-semibold",
                cell.big ? "text-[32px] leading-none" : "text-[24px] leading-none",
                cell.color || "text-text"
              )}
            >
              {cell.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
