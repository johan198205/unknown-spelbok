"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { copyCouponToSheet } from "@/lib/coupon-actions";
import type { CouponStatus } from "@/lib/types";

const BASE =
  "cursor-pointer rounded-[10px] border border-line-strong bg-panel-2 px-4 py-[11px] text-[14px] font-semibold text-text no-underline hover:border-line-hover hover:text-text hover:no-underline disabled:cursor-not-allowed disabled:opacity-60";

/**
 * Bokför kupongen i användarens spelbok.
 *
 * Utloggad är knappen en länk till registrering — inte en knapp som
 * visar ett felmeddelande. Serveråtgärden kollar ändå sessionen; det
 * här är bara den snabba vägen.
 *
 * En avgjord kupong, eller en där första avspark har passerat, går inte
 * att kopiera: knappen blir inaktiv. Serveråtgärden har samma spärr.
 */
export function CopyCouponButton({
  couponId,
  alreadyCopied,
  loggedIn,
  status,
  firstKickoff,
}: {
  couponId: string;
  alreadyCopied: boolean;
  loggedIn: boolean;
  status: CouponStatus;
  firstKickoff: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(alreadyCopied);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const started = !!firstKickoff && now >= new Date(firstKickoff).getTime();

  if (copied) {
    return (
      <button type="button" disabled className={BASE}>
        Redan bokförd
      </button>
    );
  }

  if (status !== "open" || started) {
    return (
      <button type="button" disabled className={BASE}>
        {status !== "open" ? "Avgjord" : "Avspark passerad"}
      </button>
    );
  }

  if (!loggedIn) {
    return (
      <Link href="/registrera" className={BASE}>
        Kopiera till min spelbok
      </Link>
    );
  }

  function copy() {
    startTransition(async () => {
      const result = await copyCouponToSheet(couponId);
      toast(result.message);
      if (result.ok || result.message === "Redan bokförd") setCopied(true);
      if (result.ok) router.refresh();
    });
  }

  return (
    <button type="button" disabled={pending} onClick={copy} className={BASE}>
      {pending ? "Bokför…" : "Kopiera till min spelbok"}
    </button>
  );
}
