"use client";

import { useState } from "react";
import {
  STATS_PERIODS,
  type BetStatsPayload,
  type StatsPeriod,
} from "@/lib/bet-stats";
import {
  cn,
  formatMoney,
  formatNumber,
  formatPercent,
  formatRoiOrDash,
  nettoColor,
} from "@/lib/utils";

type Row = { label: string; value: string; color?: string };

/**
 * Statistikpanelen ligger EFTER tabellen och räknas på hela spelboken.
 *
 * Perioden här är fristående från filterraden — det är hela poängen: man ska
 * kunna se helåret utan att röra tabellens urval.
 */
export function SheetStatsPanel({
  sheetId,
  initialStats,
}: {
  sheetId: string;
  initialStats: BetStatsPayload;
}) {
  // Hämtad period knyts till exakt det initialStats den bygger på. Kommer en
  // ny serverrendering (byte av spelbok, eller en rättning som refreshar)
  // faller panelen tillbaka till "Från start" i stället för att visa siffror
  // som inte längre hör ihop med spelboken.
  const [fetched, setFetched] = useState<{
    source: BetStatsPayload;
    period: StatsPeriod;
    stats: BetStatsPayload;
  } | null>(null);
  const [pending, setPending] = useState<StatsPeriod | null>(null);

  const active = fetched?.source === initialStats ? fetched : null;
  const period = pending ?? active?.period ?? "all";
  const stats = active?.stats ?? initialStats;
  const loading = pending != null;

  async function selectPeriod(next: StatsPeriod) {
    if (next === period || loading) return;
    setPending(next);
    try {
      const res = await fetch(
        `/api/sheets/stats?sheetId=${encodeURIComponent(sheetId)}&period=${next}`
      );
      if (!res.ok) return;
      const data = (await res.json()) as { stats: BetStatsPayload };
      setFetched({ source: initialStats, period: next, stats: data.stats });
    } catch {
      /* nätverksfel — behåll den period som redan visas */
    } finally {
      setPending(null);
    }
  }

  const settled = Math.max(0, stats.antal_spel - stats.oppna_spel);
  const plain = (value: number) => formatMoney(value).replace("+", "");

  const columns: Row[][] = [
    [
      { label: "Antal spel", value: String(stats.antal_spel) },
      { label: "Vinster", value: String(stats.vinster), color: "text-win" },
      { label: "Förluster", value: String(stats.forluster), color: "text-loss" },
      { label: "Void / push", value: String(stats.void) },
      {
        label: "Öppna spel",
        value: String(stats.oppna_spel),
        color: stats.oppna_spel > 0 ? "text-cyan" : undefined,
      },
      { label: "Öppen risk", value: plain(stats.oppen_risk) },
      {
        label: "Öppen potentiell vinst",
        value: plain(stats.oppen_potentiell_vinst),
      },
    ],
    [
      { label: "Insats", value: plain(stats.insats) },
      {
        label: "Vunnet",
        value: formatMoney(stats.vunnet),
        color: "text-win",
      },
      {
        label: "Förlorat",
        value: formatMoney(stats.forlorat),
        color: "text-loss",
      },
      {
        label: "Netto",
        value: formatMoney(stats.netto),
        color: nettoColor(stats.netto),
      },
      {
        label: "ROI",
        value: formatRoiOrDash(stats.roi, settled),
        color: settled >= 5 ? nettoColor(stats.roi) : "text-faint",
      },
      { label: "1 unit", value: plain(stats.unit_size) },
      {
        label: "Unitnetto",
        value:
          (stats.unitnetto > 0 ? "+" : "") + formatNumber(stats.unitnetto, 2),
        color: nettoColor(stats.unitnetto),
      },
    ],
    [
      { label: "Vinstprocent", value: formatPercent(stats.vinstprocent) },
      { label: "Medelodds", value: formatNumber(stats.medelodds, 2) },
      { label: "Medelinsats", value: plain(Math.round(stats.medelinsats)) },
      {
        label: "Medelvinst",
        value: formatMoney(stats.medelvinst),
        color: nettoColor(stats.medelvinst),
      },
      {
        label: "Bästa spel",
        value: formatMoney(stats.basta_spel),
        color: "text-win",
      },
      {
        label: "Sämsta spel",
        value: formatMoney(stats.samsta_spel),
        color: "text-loss",
      },
      {
        label: "Snittinsats öppna",
        value: plain(Math.round(stats.snittinsats_oppna)),
      },
    ],
  ];

  return (
    <section className="overflow-hidden rounded-[14px] border border-line bg-panel">
      <div className="flex flex-col gap-3 border-b border-line-soft px-5 py-[17px] sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-[17px] font-semibold uppercase tracking-[0.09em]">
          Statistik
        </h2>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {STATS_PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => void selectPeriod(p.value)}
              className={cn(
                "cursor-pointer border-b-2 pb-0.5 text-[14px] transition",
                period === p.value
                  ? "border-win font-bold text-win"
                  : "border-transparent font-medium text-muted hover:text-text"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className={cn(
          "grid gap-x-8 px-5 pb-5 pt-4 transition-opacity sm:grid-cols-2 lg:grid-cols-3",
          loading && "opacity-55"
        )}
      >
        {columns.map((rows, i) => (
          <div key={i}>
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex items-baseline justify-between gap-3 py-[9px]"
              >
                <span className="text-[15px] text-muted">{row.label}</span>
                <span
                  className={cn(
                    "whitespace-nowrap font-mono-num text-[15.5px] font-semibold",
                    row.color || "text-text"
                  )}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
