"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

async function saveNotifySettle(enabled: boolean) {
  const res = await fetch("/api/settings/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notify_settle: enabled }),
  });
  const data = (await res.json().catch(() => null)) as {
    notify_settle?: boolean;
    error?: string;
  } | null;
  if (!res.ok || data?.notify_settle !== enabled) {
    throw new Error(data?.error || "Kunde inte spara inställningen.");
  }
}

export function NotifySettleToggle({
  enabled,
  persisted,
  disabled,
}: {
  enabled: boolean;
  persisted?: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const seeded = useRef(false);

  useEffect(() => {
    if (persisted || seeded.current || disabled) return;
    seeded.current = true;
    void (async () => {
      setBusy(true);
      try {
        await saveNotifySettle(on);
        setSaved(true);
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Kunde inte spara inställningen."
        );
      } finally {
        setBusy(false);
      }
    })();
  }, [disabled, on, persisted, router]);

  async function toggle() {
    if (disabled || busy) return;
    const next = !on;
    setOn(next);
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await saveNotifySettle(next);
      setSaved(true);
      router.refresh();
    } catch (err) {
      setOn(!next);
      setError(
        err instanceof Error ? err.message : "Kunde inte spara inställningen."
      );
    } finally {
      setBusy(false);
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
      {saved && !error ? (
        <p className="text-[13px] text-win">Sparat i databasen.</p>
      ) : null}
    </div>
  );
}
