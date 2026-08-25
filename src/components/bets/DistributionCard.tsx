"use client";

import { useState } from "react";
import type { BreakdownRow } from "@/lib/breakdowns";
import {
  MIN_ROI_BETS,
  cn,
  formatMoney,
  formatRoiOrDash,
  nettoColor,
} from "@/lib/utils";

export type DistributionTab =
  | "liga"
  | "kategori"
  | "spelform"
  | "spelbolag"
  | "sport"
  | "odds";

export type DistributionGroups = Record<DistributionTab, BreakdownRow[]>;

const TABS: Array<{ value: DistributionTab; label: string }> = [
  { value: "liga", label: "Liga" },
  { value: "kategori", label: "Kategori" },
  { value: "spelform", label: "Spelform" },
  { value: "spelbolag", label: "Spelbolag" },
  { value: "sport", label: "Sport" },
  { value: "odds", label: "Odds" },
];

const MAX_ROWS = 8;

/**
 * "Fördelning" — en panel med flikar i stället för fem fristående kort.
 *
 * De gamla panelerna var mest tom yta: flera hade bara en eller två rader.
 * Samma data, en yta, användaren väljer skärningen.
 */
export function DistributionCard({
  groups,
  /** "regular" = spelbokens större skala, "compact" = dashboardens. */
  size = "compact",
}: {
  groups: DistributionGroups;
  size?: "compact" | "regular";
}) {
  const [tab, setTab] = useState<DistributionTab>("liga");
  const rows = groups[tab] ?? [];
  const shown = rows.slice(0, MAX_ROWS);
  const hidden = rows.length - shown.length;
  const peak = Math.max(1, ...rows.map((r) => Math.abs(r.netto)));
  const big = size === "regular";

  return (
    <section
      className={cn(
        "rounded-[14px] border border-line bg-panel",
        big ? "p-[18px]" : "p-4"
      )}
    >
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h2
          className={cn(
            "font-display font-semibold uppercase tracking-[0.09em]",
            big ? "text-[17px]" : "text-[15px]"
          )}
        >
          Fördelning
        </h2>
        <div className="flex flex-wrap gap-[3px] rounded-[9px] border border-line-soft bg-bg-soft p-[3px]">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={cn(
                "cursor-pointer rounded-[7px] px-3 py-1.5 text-[12.5px] font-semibold transition",
                tab === t.value
                  ? "bg-panel-2 text-text"
                  : "bg-transparent text-muted hover:text-text"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {shown.length ? (
        <>
          {shown.map((row) => (
            <div
              key={row.name}
              className="flex items-center gap-2 border-t border-line-soft py-[9px] sm:gap-3"
            >
              <span
                className={cn(
                  "min-w-0 flex-[1_1_140px] truncate text-text-soft sm:min-w-[110px]",
                  big ? "text-[14.5px]" : "text-[13.5px]"
                )}
              >
                {row.name}
              </span>
              <span className="hidden h-[6px] w-[110px] shrink-0 overflow-hidden rounded-[99px] bg-panel-2 sm:block">
                <span
                  className={cn(
                    "block h-full rounded-[99px]",
                    row.netto >= 0 ? "bg-win" : "bg-loss"
                  )}
                  style={{ width: `${(Math.abs(row.netto) / peak) * 100}%` }}
                />
              </span>
              {/* Smalare kolumner under sm — annars äter siffrorna upp
                  etiketten på en 390px-skärm. */}
              <span
                className={cn(
                  "w-[56px] shrink-0 whitespace-nowrap text-right font-mono-num text-faint sm:w-[62px]",
                  big ? "text-[13.5px]" : "text-[12.5px]"
                )}
              >
                {row.bets} spel
              </span>
              <span
                className={cn(
                  "w-[54px] shrink-0 whitespace-nowrap text-right font-mono-num sm:w-[70px]",
                  big ? "text-[13.5px]" : "text-[12.5px]",
                  row.bets >= MIN_ROI_BETS ? nettoColor(row.roi) : "text-faint"
                )}
              >
                {formatRoiOrDash(row.roi, row.bets)}
              </span>
              <span
                className={cn(
                  "w-[84px] shrink-0 whitespace-nowrap text-right font-mono-num font-semibold sm:w-[96px]",
                  big ? "text-[15px]" : "text-[14px]",
                  nettoColor(row.netto)
                )}
              >
                {formatMoney(row.netto)}
              </span>
            </div>
          ))}

          {hidden > 0 ? (
            <p className="border-t border-line-soft pt-[9px] text-[12px] text-faint">
              +{hidden} till med färre spel
            </p>
          ) : null}

          <p className="mt-3 text-[11.5px] leading-snug text-faint">
            ROI visas från fem spel och uppåt. Färre spel säger inget om
            träffsäkerhet.
          </p>
        </>
      ) : (
        <p className="border-t border-line-soft py-8 text-center text-[13px] text-muted">
          Ingen data ännu.
        </p>
      )}
    </section>
  );
}
