"use client";

import { useState } from "react";
import { formatMoney, formatRoi, nettoColor } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { BreakdownRow } from "@/lib/breakdowns";

export function StatsAccordion({
  title,
  rows,
}: {
  title: string;
  rows: BreakdownRow[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-[12px] border border-line bg-panel lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left"
      >
        <span className="font-display text-[17px] font-semibold">{title}</span>
        <span className="text-muted">{open ? "−" : "+"}</span>
      </button>
      {rows.length ? (
        <div className={cn(!open && "max-h-[168px] overflow-hidden")}>
          {rows.map((r) => (
            <div
              key={r.name}
              className="flex items-center gap-3 border-t border-line-soft px-4 py-3 text-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{r.name}</div>
                {open ? (
                  <div className="text-[12px] text-muted">
                    {r.bets} spel · ROI {formatRoi(r.roi)}
                  </div>
                ) : (
                  <div className="text-[12px] text-muted">{r.bets} spel</div>
                )}
              </div>
              <span
                className={`font-mono-num font-semibold ${nettoColor(r.netto)}`}
              >
                {formatMoney(r.netto)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="border-t border-line-soft px-4 py-6 text-center text-muted">
          Ingen data
        </div>
      )}
      {rows.length > 3 && !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full border-t border-line-soft py-2 text-sm font-semibold text-cyan"
        >
          Visa alla
        </button>
      ) : null}
    </div>
  );
}
