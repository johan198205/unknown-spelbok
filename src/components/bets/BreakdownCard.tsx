import { cn, formatMoney, formatRoi, nettoColor } from "@/lib/utils";
import type { BreakdownRow } from "@/lib/breakdowns";

/**
 * Delad uppdelningslista (per liga, spelbolag, spelform, sport, odds). Används
 * på startsidan och i spelboken — därför ingen "use client" här.
 */
export function BreakdownCard({
  title,
  rows,
  limit = 8,
  empty = "Ingen data",
  loading = false,
  className,
}: {
  title: string;
  rows: BreakdownRow[];
  /** Antal rader som visas innan resten sammanfattas som "+N fler". */
  limit?: number;
  empty?: string;
  loading?: boolean;
  className?: string;
}) {
  const shown = rows.slice(0, limit);
  const hidden = rows.length - shown.length;

  return (
    <section
      className={cn(
        "rounded-[var(--radius-panel)] border border-line bg-panel p-4",
        className
      )}
    >
      <h3 className="mb-3 font-display text-[17px] font-semibold uppercase tracking-[0.05em]">
        {title}
      </h3>
      <div className={cn("space-y-1", loading && "opacity-55")}>
        {loading && !rows.length ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-[8px] bg-panel-2" />
          ))
        ) : shown.length ? (
          <>
            {shown.map((row) => (
              <div
                key={row.name}
                className="flex items-center gap-2.5 rounded-[8px] px-1 py-2"
              >
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">
                  {row.name}
                </span>
                <span className="shrink-0 font-mono-num text-[12.5px] text-muted">
                  {row.bets} spel
                </span>
                <span
                  className={cn(
                    "w-[4.5rem] shrink-0 text-right font-mono-num text-[12.5px] font-semibold",
                    nettoColor(row.roi)
                  )}
                >
                  {formatRoi(row.roi)}
                </span>
                <span
                  className={cn(
                    "w-[6rem] shrink-0 text-right font-mono-num text-[13.5px] font-semibold",
                    nettoColor(row.netto)
                  )}
                >
                  {formatMoney(row.netto)}
                </span>
              </div>
            ))}
            {hidden > 0 ? (
              <p className="px-1 pt-1 text-[12px] text-faint">
                +{hidden} till med färre spel
              </p>
            ) : null}
          </>
        ) : (
          <p className="py-6 text-center text-[13px] text-muted">{empty}</p>
        )}
      </div>
    </section>
  );
}
