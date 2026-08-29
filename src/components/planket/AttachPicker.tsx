"use client";

import { useEffect, useMemo, useState } from "react";
import { LeagueCrest } from "@/components/planket/Bits";
import { formatPick } from "@/lib/picks";
import {
  listAttachableBets,
  listAttachableCoupons,
} from "@/lib/planket-actions";
import { planketKickoff, planketKr, planketOdds } from "@/lib/planket";
import type { AttachableBet, AttachableCoupon } from "@/lib/planket-server";
import { cn } from "@/lib/utils";

export type Attachment =
  | { type: "bet"; bet: AttachableBet }
  | { type: "coupon"; coupon: AttachableCoupon };

/**
 * Bifoga-väljaren.
 *
 * Spel: användarens senaste 20 ur ALLA egna spelböcker, sökbar på lag och
 * marknad. Ett spel som redan ligger i ett levande inlägg markeras "Postad"
 * och går inte att välja igen — samma regel som det unika indexet
 * posts_bet_uidx, fast synlig.
 *
 * Kommer spelet ur en privat spelbok får raden den gula noten: det spelet
 * blir synligt, resten av boken förblir privat.
 */
export function AttachPicker({
  mode,
  onPick,
  onClose,
}: {
  mode: "bet" | "coupon";
  onPick: (attachment: Attachment) => void;
  onClose: () => void;
}) {
  const [bets, setBets] = useState<AttachableBet[] | null>(null);
  const [coupons, setCoupons] = useState<AttachableCoupon[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;
    if (mode === "bet") {
      void listAttachableBets().then((rows) => {
        if (alive) setBets(rows);
      });
    } else {
      void listAttachableCoupons().then((rows) => {
        if (alive) setCoupons(rows);
      });
    }
    return () => {
      alive = false;
    };
  }, [mode]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const needle = query.trim().toLowerCase();

  const visibleBets = useMemo(() => {
    if (!bets) return null;
    if (!needle) return bets;
    return bets.filter((bet) =>
      `${bet.match} ${formatPick(bet.pick)} ${bet.league ?? ""}`
        .toLowerCase()
        .includes(needle)
    );
  }, [bets, needle]);

  const visibleCoupons = useMemo(() => {
    if (!coupons) return null;
    if (!needle) return coupons;
    return coupons.filter((c) => c.title.toLowerCase().includes(needle));
  }, [coupons, needle]);

  const loading = mode === "bet" ? visibleBets === null : visibleCoupons === null;
  const empty =
    mode === "bet" ? visibleBets?.length === 0 : visibleCoupons?.length === 0;

  return (
    <div className="mt-3 overflow-hidden rounded-[11px] border border-line-strong bg-[#0F1420]">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            mode === "bet" ? "Sök lag eller marknad…" : "Sök kupong…"
          }
          className="min-w-0 flex-1 border-none bg-transparent text-[14px] text-text outline-none"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Stäng väljaren"
          className="shrink-0 cursor-pointer rounded-[7px] border border-line-strong bg-[#1B2233] px-2 py-1 text-[13px] leading-none text-[#8A94AB] hover:text-text"
        >
          ×
        </button>
      </div>

      <div className="max-h-[280px] overflow-y-auto sb-scroll">
        {loading ? (
          <div className="px-3 py-6 text-center text-[13.5px] text-[#5D6883]">
            Hämtar…
          </div>
        ) : empty ? (
          <div className="px-3 py-6 text-center text-[13.5px] text-[#5D6883]">
            {mode === "bet"
              ? "Inga spel att bifoga. Lägg ett spel i spelboken först."
              : "Inga öppna kuponger just nu."}
          </div>
        ) : mode === "bet" ? (
          visibleBets!.map((bet) => (
            <BetRow key={bet.id} bet={bet} onPick={onPick} />
          ))
        ) : (
          visibleCoupons!.map((coupon) => (
            <CouponRow key={coupon.id} coupon={coupon} onPick={onPick} />
          ))
        )}
      </div>
    </div>
  );
}

function BetRow({
  bet,
  onPick,
}: {
  bet: AttachableBet;
  onPick: (attachment: Attachment) => void;
}) {
  return (
    <button
      type="button"
      disabled={bet.posted}
      onClick={() => onPick({ type: "bet", bet })}
      className={cn(
        "block w-full border-b border-line-soft px-3 py-2.5 text-left last:border-b-0",
        bet.posted
          ? "cursor-not-allowed opacity-55"
          : "cursor-pointer hover:bg-hover"
      )}
    >
      <div className="flex items-center gap-2.5">
        <LeagueCrest
          logo={bet.league_logo}
          leagueId={bet.league_id}
          sport={bet.sport}
          name={bet.league}
          size={20}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px]">{bet.match}</div>
          <div className="truncate text-[12px] text-[#5D6883]">
            {[
              bet.league,
              planketKickoff(bet.kickoff),
              formatPick(bet.pick),
              bet.sheet_name,
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono-num text-[14px] font-semibold tabular-nums">
            {planketOdds(bet.odds)}
          </div>
          <div className="font-mono-num text-[11.5px] text-[#5D6883]">
            {planketKr(bet.stake)}
          </div>
        </div>
        {bet.posted ? (
          <span className="shrink-0 rounded-[6px] border border-line-strong px-2 py-[3px] text-[11px] font-semibold text-[#8A94AB]">
            Postad
          </span>
        ) : null}
      </div>

      {bet.sheet_private && !bet.posted ? (
        <div className="mt-1.5 text-[11.5px] leading-[1.5] text-yellow">
          Spelet blir synligt på Planket. Resten av boken förblir privat.
        </div>
      ) : null}
    </button>
  );
}

function CouponRow({
  coupon,
  onPick,
}: {
  coupon: AttachableCoupon;
  onPick: (attachment: Attachment) => void;
}) {
  return (
    <button
      type="button"
      disabled={coupon.posted}
      onClick={() => onPick({ type: "coupon", coupon })}
      className={cn(
        "flex w-full items-center gap-2.5 border-b border-line-soft px-3 py-2.5 text-left last:border-b-0",
        coupon.posted
          ? "cursor-not-allowed opacity-55"
          : "cursor-pointer hover:bg-hover"
      )}
    >
      <span className="shrink-0 font-display text-[11.5px] font-semibold uppercase tracking-[0.11em] text-yellow">
        Kupong
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px]">{coupon.title}</div>
        <div className="truncate text-[12px] text-[#5D6883]">
          {[
            `${coupon.legs} spel`,
            coupon.bookmaker_name,
            planketKr(coupon.stake),
          ]
            .filter(Boolean)
            .join(" · ")}
        </div>
      </div>
      <span className="shrink-0 font-mono-num text-[14px] font-semibold tabular-nums">
        {planketOdds(coupon.total_odds)}
      </span>
      {coupon.posted ? (
        <span className="shrink-0 rounded-[6px] border border-line-strong px-2 py-[3px] text-[11px] font-semibold text-[#8A94AB]">
          Postad
        </span>
      ) : null}
    </button>
  );
}
