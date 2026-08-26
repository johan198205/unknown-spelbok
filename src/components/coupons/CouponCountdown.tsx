"use client";

import { useEffect, useState } from "react";
import { countdownTo, publishedLabel } from "@/lib/coupons";

const TONE: Record<"cyan" | "yellow" | "muted", string> = {
  cyan: "var(--cyan)",
  yellow: "var(--yellow)",
  muted: "var(--faint)",
};

/**
 * Nedräkning till första avspark bland benen.
 *
 * Tickar var 30:e sekund, inte varje sekund: den minsta enheten vyn visar
 * är minuter, och en sekundvisare på ett kort som ligger tolv i taget på
 * sidan hade kostat 36 renderingar per sekund för ingenting.
 *
 * Första renderingen räknas från samma ISO-sträng på server och klient, så
 * texten är identisk i båda och hydreringen är tyst.
 */
export function CouponCountdown({ kickoff }: { kickoff: string | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const { text, tone, started } = countdownTo(kickoff, now);
  const color = TONE[tone];

  return (
    <div
      className="mb-3.5 inline-flex items-center gap-[7px] font-mono-num text-[13px]"
      style={{ color }}
    >
      <span
        aria-hidden
        className={started ? "size-1.5 rounded-full" : "size-1.5 rounded-full animate-sbpulse"}
        style={{ background: color }}
      />
      {text}
    </div>
  );
}

/** Publiceringstid relativt nu. Samma tysta hydrering som nedräkningen. */
export function CouponPublished({ publishedAt }: { publishedAt: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  return <>{publishedLabel(publishedAt, now)}</>;
}
