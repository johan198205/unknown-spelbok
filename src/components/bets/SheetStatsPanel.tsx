"use client";

import { useEffect, useRef, useState } from "react";
import { useAmount, useDisplayPrefs } from "@/components/DisplayPrefsProvider";
import { useT } from "@/components/TextsProvider";
import { formatAmount } from "@/lib/display";
import {
  STATS_PERIODS,
  type BetStatsPayload,
  type StatsPeriod,
} from "@/lib/bet-stats";
import {
  cn,
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
 *
 * Besökta perioder cachas lokalt så tillbakaklick inte väntar på nätet igen.
 */
export function SheetStatsPanel({
  sheetId,
  initialStats,
}: {
  sheetId: string;
  initialStats: BetStatsPayload;
}) {
  const t = useT();
  const amount = useAmount();
  const prefs = useDisplayPrefs();

  const [period, setPeriod] = useState<StatsPeriod>("all");
  const [cache, setCache] = useState<Partial<Record<StatsPeriod, BetStatsPayload>>>(
    () => ({ all: initialStats })
  );
  const [pending, setPending] = useState<StatsPeriod | null>(null);
  const sourceRef = useRef(initialStats);

  // Ny spelbok / serverrefresh → börja om med "Från start".
  useEffect(() => {
    if (sourceRef.current === initialStats) return;
    sourceRef.current = initialStats;
    setPeriod("all");
    setCache({ all: initialStats });
    setPending(null);
  }, [initialStats]);

  const highlight = pending ?? period;
  const stats = cache[period] ?? initialStats;
  const loading = pending != null;

  async function selectPeriod(next: StatsPeriod) {
    if (next === highlight || loading) return;

    if (cache[next]) {
      setPeriod(next);
      return;
    }

    setPending(next);
    try {
      const res = await fetch(
        `/api/sheets/stats?sheetId=${encodeURIComponent(sheetId)}&period=${next}`
      );
      if (!res.ok) return;
      const data = (await res.json()) as { stats: BetStatsPayload };
      setCache((prev) => ({ ...prev, [next]: data.stats }));
      setPeriod(next);
    } catch {
      /* nätverksfel — behåll den period som redan visas */
    } finally {
      setPending(null);
    }
  }

  const settled = Math.max(0, stats.antal_spel - stats.oppna_spel);
  const plain = (value: number) => amount(value, { sign: false });

  const columns: Row[][] = [
    [
      { label: t("spelbok.stats.count"), value: String(stats.antal_spel) },
      { label: t("spelbok.stats.wins"), value: String(stats.vinster), color: "text-win" },
      { label: t("spelbok.stats.losses"), value: String(stats.forluster), color: "text-loss" },
      { label: t("spelbok.stats.voids"), value: String(stats.void) },
      {
        label: t("spelbok.stats.open"),
        value: String(stats.oppna_spel),
        color: stats.oppna_spel > 0 ? "text-cyan" : undefined,
      },
      { label: t("spelbok.stats.openRisk"), value: plain(stats.oppen_risk) },
      {
        label: t("spelbok.stats.openPotential"),
        value: plain(stats.oppen_potentiell_vinst),
      },
    ],
    [
      { label: t("spelbok.stats.stake"), value: plain(stats.insats) },
      {
        label: t("spelbok.stats.won"),
        value: amount(stats.vunnet),
        color: "text-win",
      },
      {
        label: t("spelbok.stats.lost"),
        value: amount(stats.forlorat),
        color: "text-loss",
      },
      {
        label: t("spelbok.stats.netto"),
        value: amount(stats.netto),
        color: nettoColor(stats.netto),
      },
      {
        label: t("spelbok.stats.roi"),
        value: formatRoiOrDash(stats.roi, settled),
        color: settled >= 5 ? nettoColor(stats.roi) : "text-faint",
      },
      {
        label: t("spelbok.stats.unitSize"),
        value: formatAmount(stats.unit_size, { ...prefs, mode: "money" }, {
          sign: false,
        }),
      },
      {
        label: t("spelbok.stats.unitNetto"),
        value:
          (stats.unitnetto > 0 ? "+" : "") + formatNumber(stats.unitnetto, 2),
        color: nettoColor(stats.unitnetto),
      },
    ],
    [
      { label: t("spelbok.stats.hitrate"), value: formatPercent(stats.vinstprocent) },
      { label: t("spelbok.stats.avgOdds"), value: formatNumber(stats.medelodds, 2) },
      { label: t("spelbok.stats.avgStake"), value: plain(Math.round(stats.medelinsats)) },
      {
        label: t("spelbok.stats.avgWin"),
        value: amount(stats.medelvinst),
        color: nettoColor(stats.medelvinst),
      },
      {
        label: t("spelbok.stats.best"),
        value: amount(stats.basta_spel),
        color: "text-win",
      },
      {
        label: t("spelbok.stats.worst"),
        value: amount(stats.samsta_spel),
        color: "text-loss",
      },
      {
        label: t("spelbok.stats.avgStakeOpen"),
        value: plain(Math.round(stats.snittinsats_oppna)),
      },
    ],
  ];

  return (
    <section className="overflow-hidden rounded-[14px] border border-line bg-panel">
      <div className="flex flex-col gap-3 border-b border-line-soft px-5 py-[17px] sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-[17px] font-semibold uppercase tracking-[0.09em]">
          {t("spelbok.stats.title")}
        </h2>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {STATS_PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => void selectPeriod(p.value)}
              className={cn(
                "cursor-pointer border-b-2 pb-0.5 text-[14px] transition",
                highlight === p.value
                  ? "border-win font-bold text-win"
                  : "border-transparent font-medium text-muted hover:text-text"
              )}
            >
              {t(p.key)}
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
