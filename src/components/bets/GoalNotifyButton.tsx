"use client";

import { useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

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

  async function toggle() {
    if (disabled || busy) return;
    const next = !on;
    setOn(next);
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("bets")
      .update({ notify_goals: next })
      .eq("id", betId);
    setBusy(false);
    if (error) setOn(!next);
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={disabled || busy}
      title={on ? "Målnotiser på — klicka för att stänga av" : "Få push vid mål i matchen"}
      aria-label={on ? "Stäng av målnotiser" : "Aktivera målnotiser"}
      aria-pressed={on}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-[8px] border transition",
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
  );
}
