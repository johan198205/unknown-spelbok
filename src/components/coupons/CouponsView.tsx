"use client";

import { useEffect, useMemo, useState } from "react";
import { CouponCard } from "./CouponCard";
import { CouponSidebar } from "./CouponSidebar";
import {
  COUPON_GRID_MIN_WIDTH,
  COUPON_TABS,
  COUPON_VIEWS,
  DEFAULT_COUPON_VIEW,
  matchesTab,
  type Coupon,
  type CouponRecord,
  type CouponTab,
  type CouponView,
} from "@/lib/coupons";
import type { AffiliateTopRow } from "@/lib/bet-stats";
import { cn } from "@/lib/utils";

const PILL_TRACK =
  "flex flex-wrap gap-[3px] rounded-[9px] border border-line-soft bg-bg-soft p-[3px]";

function pillClass(active: boolean) {
  return cn(
    "cursor-pointer whitespace-nowrap rounded-[7px] border-none px-3.5 py-2 text-[14px] font-semibold",
    active ? "bg-panel-2 text-text" : "bg-transparent text-[#8A94AB]"
  );
}

export function CouponsView({
  coupons,
  record,
  affiliates,
  editorMode,
  loggedIn,
  copiedIds,
}: {
  coupons: Coupon[];
  record: CouponRecord;
  affiliates: AffiliateTopRow[];
  editorMode: boolean;
  loggedIn: boolean;
  copiedIds: string[];
}) {
  const [tab, setTab] = useState<CouponTab>("Alla");
  const [view, setView] = useState<CouponView>(DEFAULT_COUPON_VIEW);
  const [canGrid, setCanGrid] = useState(false);

  /**
   * Vyväxlaren finns bara över 1080px. Under den bredden gäller listläget
   * och knapparna ska inte ens ligga i DOM — därför matchMedia och inte en
   * gömd knapprad. Själva rutnätet sköts av CSS (globals.css), så inget
   * mått hoppar mellan servern och första klientrenderingen.
   */
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(`(min-width: ${COUPON_GRID_MIN_WIDTH}px)`);
    const apply = () => setCanGrid(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const shown = useMemo(
    () => coupons.filter((c) => matchesTab(c, tab)),
    [coupons, tab]
  );

  const copied = useMemo(() => new Set(copiedIds), [copiedIds]);

  return (
    <div className="kupong-layout" data-view={view}>
      <div className="min-w-0">
        <div className="mb-[18px] flex flex-wrap items-center gap-2.5">
          <div className={PILL_TRACK}>
            {COUPON_TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={pillClass(tab === t)}
              >
                {t}
              </button>
            ))}
          </div>

          <span className="font-mono-num ml-auto text-[14px] text-[#8A94AB]">
            {shown.length} {shown.length === 1 ? "kupong" : "kuponger"}
          </span>

          {canGrid ? (
            <div className={PILL_TRACK}>
              {COUPON_VIEWS.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  title={v.help}
                  onClick={() => setView(v.key)}
                  className={cn(pillClass(view === v.key), "px-[13px] text-[13.5px]")}
                >
                  {v.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="kupong-grid" data-view={view}>
          {shown.map((coupon) => (
            <CouponCard
              key={coupon.id}
              coupon={coupon}
              editorMode={editorMode}
              loggedIn={loggedIn}
              alreadyCopied={copied.has(coupon.id)}
            />
          ))}
        </div>

        {!shown.length ? (
          <div className="rounded-[14px] border border-line bg-panel p-7 text-center text-[15px] text-muted">
            Inga kuponger i det här urvalet.
          </div>
        ) : null}
      </div>

      <CouponSidebar record={record} affiliates={affiliates} />
    </div>
  );
}
