"use client";

import { useState, useTransition } from "react";
import { SheetAffiliateTop3 } from "@/components/bets/SheetAffiliateTop3";
import { subscribeToCoupons } from "@/lib/coupon-actions";
import type { AffiliateTopRow } from "@/lib/bet-stats";

const HEADING =
  "font-display text-[15px] font-semibold uppercase tracking-[0.09em]";

export function CouponSidebar({
  affiliates,
}: {
  /** Behålls för bakåtkompatibilitet — facit visas inte längre. */
  record?: unknown;
  affiliates: AffiliateTopRow[];
}) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <NotifyCard />
      <SheetAffiliateTop3 affiliates={affiliates} />
    </div>
  );
}

function NotifyCard() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await subscribeToCoupons(email);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setError(null);
      setDone(true);
      setEmail("");
    });
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-[14px] border bg-panel p-[18px]"
      style={{ borderColor: "rgba(53,214,245,.28)" }}
    >
      <div className={`${HEADING} mb-1.5`}>Notis vid ny kupong</div>
      <div className="mb-3 text-[13.5px] leading-[1.5] text-muted">
        Ett mejl när redaktionen släpper en ny kupong. Inget annat.
      </div>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="namn@exempel.se"
        aria-label="E-postadress"
        className="mb-[9px] w-full rounded-[10px] border border-line bg-bg-soft px-[13px] py-3 text-[15px] text-text outline-none focus:border-line-hover"
      />
      <button
        type="submit"
        disabled={pending}
        className="w-full cursor-pointer rounded-[10px] border-none bg-cyan py-3 text-[15px] font-bold text-[#06222B] disabled:opacity-60"
      >
        {done ? "Anmäld ✓" : pending ? "Skickar…" : "Ge mig notiser"}
      </button>
      {error ? (
        <div className="mt-2 text-[12px] text-loss">{error}</div>
      ) : null}
    </form>
  );
}
