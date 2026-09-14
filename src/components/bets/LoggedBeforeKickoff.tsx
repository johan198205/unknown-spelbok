import { Lock, LockOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const COPY = {
  before: "Låst – loggat före avspark",
  after: "Öppet – loggat efter matchstart",
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

const SHEET_LOCK = {
  locked: {
    icon: "🔒",
    title: "Låst spel — lagt före avspark och kan inte ändras",
    bg: "bg-[rgba(102,227,138,.14)]",
    fg: "text-win",
  },
  open: {
    icon: "🔓",
    title: "Öppet spel — kan redigeras till avspark",
    bg: "bg-[rgba(255,184,77,.14)]",
    fg: "text-amber",
  },
} as const;

/**
 * Låsikonen i spelbokens Rättning-kolumn och kortvy.
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
  const spec = value ? SHEET_LOCK.locked : SHEET_LOCK.open;
  return (
    <span
      title={spec.title}
      aria-label={spec.title}
      className={cn(
        "mr-2 inline-flex size-[22px] shrink-0 cursor-help items-center justify-center rounded-full align-middle text-[12px] leading-none",
        spec.bg,
        spec.fg,
        className
      )}
    >
      <span aria-hidden>{spec.icon}</span>
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
