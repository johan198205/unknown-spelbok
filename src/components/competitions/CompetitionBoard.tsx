import {
  medalColor,
  missingSummary,
  type BoardEntry,
  type CompetitionRules,
} from "@/lib/competitions";
import { cn, formatMoney, formatRoi, initialOf, nettoColor } from "@/lib/utils";

/**
 * Shared leaderboard rows for /tavlingar and /topplista. Entrants below
 * min_bets / min_total_stake are dimmed and marked "Ej kvalificerad".
 */
export function CompetitionBoard({
  entries,
  rules,
  selfId,
  dense = false,
  className,
}: {
  entries: BoardEntry[];
  rules: CompetitionRules;
  selfId?: string | null;
  dense?: boolean;
  className?: string;
}) {
  if (!entries.length) {
    return (
      <div
        className={cn(
          "px-4 py-8 text-center text-muted lg:px-5",
          className
        )}
      >
        Inga deltagare ännu.
      </div>
    );
  }

  return (
    <div className={className}>
      {entries.map((entry) => {
        const isSelf = !!selfId && entry.user_id === selfId;
        const missing = entry.qualified ? "" : missingSummary(entry, rules);

        return (
          <div
            key={entry.user_id}
            className={cn(
              "flex items-center gap-3 border-b border-rowline px-4 py-3 lg:px-5",
              isSelf && "bg-win/10",
              !entry.qualified && "opacity-55"
            )}
          >
            <span
              className={cn(
                "font-display w-6 shrink-0 text-[17px] font-semibold",
                entry.rank ? medalColor(entry.rank) : "text-dim"
              )}
            >
              {entry.rank ?? "–"}
            </span>
            <span className="font-display flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-pill)] border border-line-strong bg-panel-2 text-[13px] font-semibold">
              {initialOf(entry.username)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-semibold">
                {entry.username}
                {isSelf ? " · Du" : ""}
              </div>
              {entry.qualified ? null : (
                <div className="truncate font-mono-num text-[11.5px] text-dim">
                  Ej kvalificerad{missing ? ` · ${missing}` : ""}
                </div>
              )}
            </div>
            {dense ? null : (
              <>
                <span className="hidden font-mono-num text-[12.5px] text-muted sm:block">
                  {entry.bets_count} spel
                </span>
                <span
                  className={cn(
                    "hidden min-w-[70px] text-right font-mono-num text-[13.5px] font-semibold sm:block",
                    entry.qualified ? nettoColor(entry.roi) : "text-muted"
                  )}
                >
                  {formatRoi(entry.roi)}
                </span>
              </>
            )}
            <span
              className={cn(
                "min-w-[92px] text-right font-mono-num text-[13.5px] font-semibold",
                entry.qualified ? nettoColor(entry.netto) : "text-muted"
              )}
            >
              {formatMoney(entry.netto)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
