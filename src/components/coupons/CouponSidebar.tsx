"use client";

import { SheetAffiliateTop3 } from "@/components/bets/SheetAffiliateTop3";
import type { AffiliateTopRow } from "@/lib/bet-stats";

export function CouponSidebar({
  affiliates,
}: {
  /** Behålls för bakåtkompatibilitet — facit visas inte längre. */
  record?: unknown;
  affiliates: AffiliateTopRow[];
}) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <SheetAffiliateTop3 affiliates={affiliates} />
    </div>
  );
}
