import { Lock, LockOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const COPY = {
  before: "Låst spel - detta spel bokfördes före matchstart.",
  after: "Olåst spel - detta spel bokfördes efter matchstart.",
  badgeBefore: "Låst – loggat före avspark",
  badgeAfter: "Öppet – efterregistrerat",
} as const;

/** Diskret ikon för spellistan (14–16px). null = ingen ikon. */
export function LoggedBeforeKickoffIcon({
  value,
  className,
}: {
  value: boolean | null | undefined;
  className?: string;
}) {
  if (value === true) {
    return (
      <span
        title={COPY.before}
        aria-label={COPY.before}
        className={cn("inline-flex shrink-0 text-win", className)}
      >
        <Lock className="size-3.5" strokeWidth={2.25} aria-hidden />
      </span>
    );
  }

  if (value === false) {
    return (
      <span
        title={COPY.after}
        aria-label={COPY.after}
        className={cn("inline-flex shrink-0 text-yellow", className)}
      >
        <LockOpen className="size-3.5" strokeWidth={2.25} aria-hidden />
      </span>
    );
  }

  return null;
}

/**
 * Låsikonen i spelbokens Rättning-kolumn och kortvy. Samma hänglås som i
 * mobilen: grönt för låst spel, gult för olåst.
 *
 * Värdet kommer från serverns `logged_before_kickoff` (created_at < kickoff) —
 * komponenten räknar aldrig själv.
 */
export function SheetLockIcon({
  value,
  className,
}: {
  value: boolean | null | undefined;
  className?: string;
}) {
  if (value !== true && value !== false) return null;
  const title = value ? COPY.before : COPY.after;
  const Icon = value ? Lock : LockOpen;
  return (
    <span
      title={title}
      aria-label={title}
      className={cn(
        "mr-2 inline-flex shrink-0 cursor-help items-center justify-center align-middle",
        value ? "text-win" : "text-yellow",
        className
      )}
    >
      <Icon className="size-4" strokeWidth={2.25} aria-hidden />
    </span>
  );
}

/** Textbadge för detaljvy / action sheet. */
export function LoggedBeforeKickoffBadge({
  value,
  className,
}: {
  value: boolean | null | undefined;
  className?: string;
}) {
  if (value === true) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-[7px] border border-win/40 bg-win/10 px-2 py-1 text-[11px] font-semibold text-win",
          className
        )}
      >
        <Lock className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
        {COPY.badgeBefore}
      </span>
    );
  }

  if (value === false) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-[7px] border border-yellow/40 bg-yellow/10 px-2 py-1 text-[11px] font-semibold text-yellow",
          className
        )}
      >
        <LockOpen className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
        {COPY.badgeAfter}
      </span>
    );
  }

  return null;
}
