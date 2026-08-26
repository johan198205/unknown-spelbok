"use client";

import { useState, useTransition } from "react";
import { SheetAffiliateTop3 } from "@/components/bets/SheetAffiliateTop3";
import { subscribeToCoupons } from "@/lib/coupon-actions";
import type { CouponRecord } from "@/lib/coupons";
import type { AffiliateTopRow } from "@/lib/bet-stats";
import { formatMoney, formatPercent, formatRoi, nettoColor } from "@/lib/utils";

const HEADING =
  "font-display text-[15px] font-semibold uppercase tracking-[0.09em]";

export function CouponSidebar({
  record,
  affiliates,
}: {
  record: CouponRecord;
  affiliates: AffiliateTopRow[];
}) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <NotifyCard />
      <RecordCard record={record} />
      {/*
        Samma widget som spelbok-vyn, med samma nyckelnamn (AffiliateTopRow).
        Byggde vi en egen rad-typ här med t.ex. `bonusValue` i stället för
        `bonus_value` hade fälten tystnat i stället för att krascha.
      */}
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
      <div className="mt-[9px] text-[11.5px] text-faint">
        Avregistrera när du vill. 18+
      </div>
    </form>
  );
}

function RecordCard({ record }: { record: CouponRecord }) {
  const rows: { label: string; value: string; color?: string }[] = [
    { label: "Kuponger", value: String(record.total) },
    { label: "Vunna", value: String(record.won) },
    { label: "Förlorade", value: String(record.lost) },
    { label: "Träffprocent", value: formatPercent(record.hitrate) },
    {
      label: "Netto",
      value: formatMoney(record.netto, "kr"),
      color: nettoColor(record.netto),
    },
    {
      label: "ROI",
      value: formatRoi(record.roi),
      color: nettoColor(record.roi),
    },
  ];

  return (
    <section className="rounded-[14px] border border-line bg-panel p-[18px]">
      <div className={`${HEADING} mb-2.5`}>Redaktionens facit</div>
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-baseline gap-3 border-t border-line-soft py-[9px]"
        >
          <span className="flex-1 text-[14px] text-muted">{row.label}</span>
          <span
            className={`font-mono-num text-[15px] font-semibold ${row.color ?? "text-text"}`}
          >
            {row.value}
          </span>
        </div>
      ))}
      <div className="mt-2.5 text-[11.5px] text-faint">
        Räknat på avgjorda kuponger med redaktionens rekommenderade insats.
      </div>
    </section>
  );
}
