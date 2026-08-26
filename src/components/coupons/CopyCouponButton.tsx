"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { copyCouponToSheet } from "@/lib/coupon-actions";

const BASE =
  "cursor-pointer rounded-[10px] border border-line-strong bg-panel-2 px-4 py-[11px] text-[14px] font-semibold text-text no-underline hover:border-line-hover hover:text-text hover:no-underline disabled:cursor-not-allowed disabled:opacity-60";

/**
 * Bokför kupongen i användarens spelbok.
 *
 * Utloggad är knappen en länk till registrering — inte en knapp som
 * visar ett felmeddelande. Serveråtgärden kollar ändå sessionen; det
 * här är bara den snabba vägen.
 */
export function CopyCouponButton({
  couponId,
  alreadyCopied,
  loggedIn,
}: {
  couponId: string;
  alreadyCopied: boolean;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(alreadyCopied);

  if (!loggedIn) {
    return (
      <Link href="/registrera" className={BASE}>
        Kopiera till min spelbok
      </Link>
    );
  }

  if (copied) {
    return (
      <button type="button" disabled className={BASE}>
        Redan bokförd
      </button>
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
