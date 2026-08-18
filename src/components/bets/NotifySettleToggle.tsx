"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function NotifySettleToggle({
  enabled,
  disabled,
}: {
  enabled: boolean;
  disabled?: boolean;
}) {
  const [on, setOn] = useState(enabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (disabled || busy) return;
    const next = !on;
    setOn(next);
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setOn(!next);
      setBusy(false);
      return;
    }
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ notify_settle: next })
      .eq("id", user.id);
    setBusy(false);
    if (updateError) {
      setOn(!next);
      setError("Kunde inte spara inställningen.");
    }
  }

  return (
    <div className="space-y-1.5">
      <label
        className={cn(
          "flex items-start gap-3 text-[14.5px]",
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
        )}
      >
        <input
          type="checkbox"
          className="mt-0.5 size-4 accent-[var(--win)]"
          checked={on}
          disabled={disabled || busy}
          onChange={() => void toggle()}
        />
        <span>
          <span className="font-semibold text-text">När ett spel rättas</span>
          <span className="mt-0.5 block text-[13px] text-muted">
            Push när matchen är slut och spelet rättas automatiskt.
          </span>
        </span>
      </label>
      {error ? <p className="text-[13px] text-loss">{error}</p> : null}
    </div>
  );
}
