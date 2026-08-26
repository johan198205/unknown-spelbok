"use client";

import type { ReactNode } from "react";
import { Copy, Trash2 } from "lucide-react";
import { GoalNotifyButton } from "@/components/bets/GoalNotifyButton";
import { canNotifyBet, canRyggaBet } from "@/lib/rygga";
import type { Bet } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Enhetlig ikonknapp: 36×36 (28×28 i tabellen), tunn border, tooltip. */
export function BetActionIconButton({
  label,
  onClick,
  children,
  tone = "default",
  size = "md",
  className,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  tone?: "default" | "danger" | "active";
  /** sm = tabellens täta åtgärdskolumn, md = kort och mobil. */
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div className="group/action relative z-10 shrink-0">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }}
        aria-label={label}
        title={label}
        className={cn(
          "inline-flex items-center justify-center rounded-[8px] border transition",
          size === "sm" ? "size-7" : "size-9",
          tone === "active"
            ? "border-win/40 bg-win/10 text-win"
            : tone === "danger"
              ? "border-line bg-transparent text-faint hover:border-loss/40 hover:text-loss"
              : "border-line bg-transparent text-faint hover:text-text",
          className
        )}
      >
        {children}
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute right-0 top-full z-20 mt-1 hidden w-max max-w-[200px] rounded-[6px] border border-line bg-panel px-2 py-1 font-[family-name:var(--font-ui,inherit)] text-[11px] font-medium text-text shadow-[var(--shadow-modal)] group-hover/action:block"
      >
        {label}
      </span>
    </div>
  );
}

/**
 * Fast ordning: Notis · Rygga · Ta bort.
 * Saknade ikoner renderas inte (ingen disabled-placeholder).
 */
export function BetRowActions({
  bet,
  canEdit,
  canRygga,
  onRygga,
  onRemove,
  className,
  size = "md",
  /** Desktop: fade in vid radhover. Mobil: alltid synlig. */
  hoverReveal = true,
}: {
  bet: Bet;
  canEdit: boolean;
  canRygga: boolean;
  onRygga?: () => void;
  onRemove?: () => void;
  className?: string;
  /** sm = tabellens täta åtgärdskolumn, md = kort och mobil. */
  size?: "sm" | "md";
  hoverReveal?: boolean;
}) {
  const showNotify = canEdit && canNotifyBet(bet);
  const showRygga = canRygga && canRyggaBet(bet);
  const showDelete = canEdit && !!onRemove;

  if (!showNotify && !showRygga && !showDelete) return null;

  return (
    <div
      className={cn(
        // Ikonerna står alltid på EN rad — wrap här knuffar ner papperskorgen
        // under rättningen och raden växer i höjd.
        "flex flex-nowrap items-center justify-end",
        size === "sm" ? "gap-1" : "gap-1.5",
        hoverReveal &&
          "opacity-100 transition-opacity duration-[120ms] lg:opacity-0 lg:group-hover/row:opacity-100 lg:focus-within:opacity-100",
        className
      )}
    >
      {showNotify ? (
        <GoalNotifyButton
          betId={bet.id}
          enabled={bet.notify_goals === true}
          size={size}
        />
      ) : null}
      {showRygga && onRygga ? (
        <BetActionIconButton label="Rygga spel" onClick={onRygga} size={size}>
          <Copy className="size-3.5" strokeWidth={2.25} />
        </BetActionIconButton>
      ) : null}
      {showDelete ? (
        <BetActionIconButton
          label="Ta bort"
          tone="danger"
          size={size}
          onClick={onRemove}
        >
          <Trash2 className="size-3.5" strokeWidth={2.25} />
        </BetActionIconButton>
      ) : null}
    </div>
  );
}
