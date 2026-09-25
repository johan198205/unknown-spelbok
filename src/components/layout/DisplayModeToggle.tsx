"use client";

import { useRef, useTransition } from "react";
import {
  useDisplayPrefs,
  useSetDisplayMode,
} from "@/components/DisplayPrefsProvider";
import { useToast } from "@/components/ui/Toast";
import { setDisplayMode } from "@/lib/display-actions";
import { type DisplayMode } from "@/lib/display";
import { cn } from "@/lib/utils";

/**
 * Växlar mellan pengar och units för hela kontot. Syns bara inloggad.
 *
 * Belopp som går via useAmount/FormattedAmount byter direkt via kontext.
 * Sparningen går i bakgrunden — ingen full router.refresh().
 */
export function DisplayModeToggle({
  className,
  variant = "compact",
}: {
  className?: string;
  /** "menu": stora knappar i hamburgermenyn, aktivt val i grönt. */
  variant?: "compact" | "menu";
}) {
  const prefs = useDisplayPrefs();
  const setModeLocal = useSetDisplayMode();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const requestId = useRef(0);

  function select(next: DisplayMode) {
    if (next === prefs.mode) return;
    const prev = prefs.mode;
    const id = ++requestId.current;
    setModeLocal(next);
    startTransition(async () => {
      const res = await setDisplayMode(next);
      if (id !== requestId.current) return;
      if (!res.ok) {
        setModeLocal(prev);
        toast(`Kunde inte byta visningsläge: ${res.error}`);
      }
    });
  }

  const options: Array<{ value: DisplayMode; label: string; title: string }> = [
    {
      value: "money",
      label: prefs.currency,
      title: `Visa belopp i ${prefs.currency}`,
    },
    { value: "units", label: "Units", title: "Visa belopp i units" },
  ];

  return (
    <div
      role="group"
      aria-label="Visa belopp i valuta eller units"
      className={cn(
        "flex items-center gap-0.5 rounded-[var(--radius-btn-sm)] border border-line bg-panel-2 p-0.5",
        variant === "menu" && "p-1",
        pending && "opacity-70",
        className,
      )}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          title={opt.title}
          aria-pressed={prefs.mode === opt.value}
          onClick={() => select(opt.value)}
          className={cn(
            "font-semibold transition-colors",
            variant === "menu"
              ? "flex-1 rounded-[7px] py-2.5 text-[14px]"
              : "min-w-[44px] rounded-[6px] px-2 py-1 text-[12px]",
            prefs.mode === opt.value
              ? variant === "menu"
                ? "bg-win text-win-ink"
                : "bg-panel text-text"
              : "text-muted hover:text-text",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
