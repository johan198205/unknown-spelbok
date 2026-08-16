"use client";

import { nettoColor } from "@/lib/utils";

export function MonthlyBars({
  months,
}: {
  months: Array<{ key: string; label: string; netto: number }>;
}) {
  const max = Math.max(...months.map((m) => Math.abs(m.netto)), 1);
  const scroll = months.length > 6;

  return (
    <div
      className={`flex items-end gap-2 ${scroll ? "overflow-x-auto sb-scroll pb-1" : ""}`}
      style={{ minHeight: 140 }}
    >
      {months.map((m) => {
        const h = Math.max(8, (Math.abs(m.netto) / max) * 100);
        return (
          <div
            key={m.key}
            className="flex w-12 shrink-0 flex-col items-center gap-1.5"
          >
            <div
              className={`w-full rounded-t-[6px] ${m.netto >= 0 ? "bg-win" : "bg-loss"}`}
              style={{ height: h }}
              title={`${m.label}: ${m.netto}`}
            />
            <div className="font-mono-num text-[10px] text-faint">{m.label}</div>
            <div
              className={`font-mono-num text-[10px] font-semibold ${nettoColor(m.netto)}`}
            >
              {Math.round(m.netto)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
