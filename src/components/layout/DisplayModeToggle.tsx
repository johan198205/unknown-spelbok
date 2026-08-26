"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDisplayPrefs } from "@/components/DisplayPrefsProvider";
import { setDisplayMode } from "@/lib/display-actions";
import { currencySuffix, type DisplayMode } from "@/lib/display";
import { cn } from "@/lib/utils";

/**
 * Växlar mellan pengar och units för hela kontot. Syns bara inloggad.
 *
 * Läget ligger på profilen, så växlingen kräver en rundtur till servern och
 * en refresh av trädet (beloppen renderas serverside). useOptimistic gör att
 * knappen ändå svarar direkt.
 */
export function DisplayModeToggle({ className }: { className?: string }) {
  const prefs = useDisplayPrefs();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useOptimistic<DisplayMode>(prefs.mode);

  function select(next: DisplayMode) {
    if (next === mode) return;
    startTransition(async () => {
      setMode(next);
      const res = await setDisplayMode(next);
      // Vid fel faller optimistic-värdet tillbaka av sig självt när
      // transitionen är klar; refresh hämtar det som faktiskt sparades.
      if (res.ok) router.refresh();
    });
  }

  const options: Array<{ value: DisplayMode; label: string; title: string }> = [
    {
      value: "money",
      label: currencySuffix(prefs.currency),
      title: `Visa belopp i ${prefs.currency}`,
    },
    { value: "units", label: "u", title: "Visa belopp i units" },
  ];

  return (
    <div
      role="group"
      aria-label="Visa belopp i valuta eller units"
      className={cn(
        "flex items-center gap-0.5 rounded-[var(--radius-btn-sm)] border border-line bg-panel-2 p-0.5",
        pending && "opacity-70",
        className
      )}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          title={opt.title}
          aria-pressed={mode === opt.value}
          onClick={() => select(opt.value)}
          className={cn(
            "min-w-[30px] rounded-[6px] px-2 py-1 text-[12px] font-semibold transition-colors",
            mode === opt.value
              ? "bg-panel text-text"
              : "text-muted hover:text-text"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
