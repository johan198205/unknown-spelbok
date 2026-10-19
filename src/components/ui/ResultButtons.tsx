"use client";

import { useT } from "@/components/TextsProvider";
import type { TextKey } from "@/lib/texts";
import type { BetResult } from "@/lib/types";
import { cn } from "@/lib/utils";

type Mark = {
  /** Intern id — texten som visas kommer från `label`-nyckeln. */
  mark: "W" | "L" | "P" | "V";
  label: TextKey;
  result: BetResult;
  title: TextKey;
  activeBg: string;
  activeFg: string;
  activeBorder: string;
};

/**
 * W/L/P/V from design marks.
 * P = PUSH → void (amber). V = VOID → void (muted).
 * Re-click active mark clears to open.
 */
const MARKS: Mark[] = [
  {
    mark: "W",
    label: "common.resultButtons.win",
    result: "win",
    title: "common.resultButtons.winTitle",
    activeBg: "bg-[var(--win-soft-16)]",
    activeFg: "text-win",
    activeBorder: "border-[var(--win-border)]",
  },
  {
    mark: "L",
    label: "common.resultButtons.loss",
    result: "loss",
    title: "common.resultButtons.lossTitle",
    activeBg: "bg-[var(--loss-soft-16)]",
    activeFg: "text-loss",
    activeBorder: "border-[var(--loss-border)]",
  },
  {
    mark: "P",
    label: "common.resultButtons.push",
    result: "void",
    title: "common.resultButtons.pushTitle",
    activeBg: "bg-[var(--yellow-soft)]",
    activeFg: "text-yellow",
    activeBorder: "border-[var(--yellow-border)]",
  },
  {
    mark: "V",
    label: "common.resultButtons.void",
    result: "void",
    title: "common.resultButtons.voidTitle",
    activeBg: "bg-[rgba(138,148,171,0.16)]",
    activeFg: "text-muted",
    activeBorder: "border-[rgba(138,148,171,0.4)]",
  },
];

export function ResultButtons({
  value,
  onChange,
  disabled,
  className,
  voidAs = "push",
}: {
  value: BetResult;
  onChange?: (result: BetResult) => void;
  disabled?: boolean;
  className?: string;
  /** Which void-button lights up when result is void */
  voidAs?: "push" | "void";
}) {
  const t = useT();

  return (
    <div className={cn("inline-flex flex-wrap gap-1", className)}>
      {MARKS.map((m) => {
        let showActive = value === m.result && value !== "open";
        if (m.result === "void" && value === "void") {
          showActive =
            (voidAs === "push" && m.mark === "P") ||
            (voidAs === "void" && m.mark === "V");
        }

        return (
          <button
            key={m.mark}
            type="button"
            title={t(m.title)}
            disabled={disabled || !onChange}
            onClick={() => {
              if (!onChange) return;
              onChange(value === m.result ? "open" : m.result);
            }}
            className={cn(
              "min-w-[28px] rounded border px-1.5 py-1 font-mono-num text-[10px] font-semibold transition cursor-pointer disabled:cursor-default disabled:opacity-60",
              showActive
                ? `${m.activeBg} ${m.activeFg} ${m.activeBorder}`
                : "border-line-strong bg-transparent text-faint"
            )}
          >
            {t(m.label)}
          </button>
        );
      })}
    </div>
  );
}
