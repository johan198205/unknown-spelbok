"use client";

import { useState, type MouseEvent } from "react";
import { Bell, BellRing } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

function saveErrorMessage(message: string | undefined) {
  const text = (message ?? "").toLowerCase();
  if (
    text.includes("notify_goals") ||
    text.includes("schema cache") ||
    text.includes("could not find")
  ) {
    return "Kör SQL-filen notify-settings i Supabase först.";
  }
  return "Kunde inte spara målnotisen.";
}

export function GoalNotifyButton({
  betId,
  enabled,
  disabled,
}: {
  betId: string;
  enabled: boolean;
  disabled?: boolean;
}) {
  const [on, setOn] = useState(enabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (disabled || busy) return;
    const next = !on;
    setOn(next);
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("bets")
      .update({ notify_goals: next })
      .eq("id", betId);
    setBusy(false);
    if (updateError) {
      setOn(!next);
      setError(saveErrorMessage(updateError.message));
    }
  }

  const label = on
    ? "Målnotiser på — klicka för att stänga av"
    : "Få push vid mål i matchen";

  return (
    <div className="group/notify relative z-10 shrink-0">
      <button
        type="button"
        onClick={(event) => void toggle(event)}
        disabled={disabled || busy}
        aria-label={on ? "Stäng av målnotiser" : "Aktivera målnotiser"}
        aria-pressed={on}
        className={cn(
          "inline-flex size-9 items-center justify-center rounded-[8px] border transition",
          on
            ? "border-win/40 bg-win/10 text-win"
            : "border-line bg-transparent text-faint hover:text-text",
          (disabled || busy) && "cursor-not-allowed opacity-50"
        )}
      >
        {on ? (
          <BellRing className="size-3.5" strokeWidth={2.25} />
        ) : (
          <Bell className="size-3.5" strokeWidth={2.25} />
        )}
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute right-0 top-full z-20 mt-1 hidden w-max max-w-[220px] rounded-[6px] border border-line bg-panel px-2 py-1 text-[11px] font-medium text-text shadow-[var(--shadow-modal)] group-hover/notify:block"
      >
        {error ?? label}
      </span>
    </div>
  );
}
