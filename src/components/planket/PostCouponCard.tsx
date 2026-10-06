"use client";

import Link from "next/link";
import { getBookmakerLogoUrl } from "@/lib/bookmakers";
import {
  COUPON_STATUS_LABEL,
  COUPON_STATUS_TONE,
  couponPath,
} from "@/lib/coupons";
import { formatPick } from "@/lib/picks";
import {
  couponMeta,
  couponOutcome,
  couponPossibleWin,
  planketKickoff,
  planketKr,
  planketOdds,
  type PlanketCoupon,
} from "@/lib/planket";
import { BookmakerPlate, FieldLabel, LeagueCrest } from "@/components/planket/Bits";
import { BookmakerLink } from "@/components/planket/PostBetCard";

/**
 * Kupongkortet i ett inlägg — variant C.
 *
 * Totalodds är produkten av benens odds, avrundad till två decimaler.
 * Den räknas i couponTotalOdds() på servern så raden alltid stämmer med
 * benen ovanför den — kupongens sparade total_odds används bara när
 * benen saknas.
 *
 * Summeringsraden har tre celler på desktop och två på mobil: möjlig
 * vinst får inte plats på 390 px utan att siffrorna bryts.
 *
 * En avgjord kupong visar statusbadge och utfall, aldrig möjlig vinst —
 * samma regel som kupongkortet på /kuponger och spelinläggen på planket.
 */
export function PostCouponCard({ coupon }: { coupon: PlanketCoupon }) {
  const legs = coupon.legs;
  const total = planketOdds(coupon.total_odds);
  const stake = planketKr(coupon.stake);
  const win = planketKr(couponPossibleWin(coupon.stake, coupon.total_odds), {
    sign: true,
  });
  const bookLogo = getBookmakerLogoUrl(coupon.bookmaker_logo);
  const settled = coupon.status !== "open";
  const tone = COUPON_STATUS_TONE[coupon.status];
  const netto = couponOutcome(coupon);
  const outcome = planketKr(netto, { sign: netto !== 0 });
  const outcomeClass =
    netto > 0 ? "text-win" : netto < 0 ? "text-loss" : "text-text";
  const href = couponPath(coupon.slug);
  const badge = settled ? (
    <span
      className="shrink-0 rounded-[6px] px-2 py-[3px] font-mono-num text-[11px] font-semibold tracking-[0.07em]"
      style={{ background: tone.badgeBg, color: tone.badgeFg }}
    >
      {COUPON_STATUS_LABEL[coupon.status]}
    </span>
  ) : null;

  return (
    <>
      {/* ---------- Desktop ---------- */}
      <div
        className="mb-[13px] hidden overflow-hidden rounded-[12px] border border-line bg-[#1B2233] lg:block"
        style={settled ? { borderColor: tone.border } : undefined}
      >
        <div className="flex items-center gap-[9px] border-b border-line px-[14px] py-[11px]">
          <Link
            href={href}
            className="flex min-w-0 flex-1 items-center gap-[9px] no-underline hover:no-underline"
          >
            <span className="shrink-0 font-display text-[12.5px] font-semibold uppercase tracking-[0.11em] text-yellow">
              Kupong
            </span>
            <span className="min-w-0 flex-1 truncate font-mono-num text-[12.5px] text-[#5D6883] hover:text-text-soft">
              {couponMeta(legs)}
            </span>
          </Link>
          {badge}
          <BookmakerLink
            href={
              coupon.bookmaker_slug
                ? `/go/${encodeURIComponent(coupon.bookmaker_slug)}?src=planket`
                : null
            }
          >
            <BookmakerPlate
              name={coupon.bookmaker_name}
              logoUrl={bookLogo}
              width={66}
              height={28}
            />
          </BookmakerLink>
        </div>

        {legs.map((leg) => (
          <div
            key={leg.id}
            className="flex items-center gap-3 border-b border-line px-[14px] py-[11px]"
          >
            <LeagueCrest
              logo={leg.league_logo}
              leagueId={leg.league_id}
              sport={leg.sport}
              name={leg.league}
              size={22}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px]">{leg.match}</div>
              <div className="mt-px truncate text-[12px] text-[#5D6883]">
                {[leg.league, planketKickoff(leg.kickoff)]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </div>
            {/*
              min-w-0 + truncate på marknaden: den är det enda fältet som
              får krympa. Oddskolumnen är låst till 48 px så alla ben
              radas upp på samma högerkant.
            */}
            <span className="min-w-0 shrink truncate text-[13.5px] font-bold">
              {formatPick(leg.pick)}
            </span>
            <span className="w-12 shrink-0 text-right font-mono-num text-[14.5px] font-semibold tabular-nums">
              {planketOdds(leg.odds)}
            </span>
          </div>
        ))}

        <div className="flex">
          <div className="flex-1 px-[14px] py-3">
            <FieldLabel>Totalodds</FieldLabel>
            <div className="font-mono-num text-[20px] font-semibold tabular-nums">
              {total}
            </div>
          </div>
          <div className="flex-1 border-l border-line px-[14px] py-3">
            <FieldLabel>Insats</FieldLabel>
            <div className="font-mono-num text-[20px] font-semibold tabular-nums">
              {stake}
            </div>
          </div>
          {settled ? (
            <div className="flex-1 border-l border-line px-[14px] py-3">
              <FieldLabel>Utfall</FieldLabel>
              <div
                className={`font-mono-num text-[20px] font-semibold tabular-nums ${outcomeClass}`}
              >
                {outcome}
              </div>
            </div>
          ) : (
            <div className="flex-1 border-l border-line px-[14px] py-3">
              <FieldLabel>Möjlig vinst</FieldLabel>
              <div className="font-mono-num text-[20px] font-semibold tabular-nums text-win">
                {win}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---------- Mobil ---------- */}
      <div
        className="mb-3 overflow-hidden rounded-[11px] border border-line bg-[#1B2233] lg:hidden"
        style={settled ? { borderColor: tone.border } : undefined}
      >
        <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
          <Link
            href={href}
            className="flex min-w-0 flex-1 items-center gap-2 no-underline hover:no-underline"
          >
            <span className="shrink-0 font-display text-[11.5px] font-semibold uppercase tracking-[0.11em] text-yellow">
              Kupong
            </span>
            <span className="min-w-0 truncate font-mono-num text-[11.5px] text-[#5D6883]">
              {couponMeta(legs)}
            </span>
          </Link>
          {badge}
        </div>

        {legs.map((leg) => (
          <div
            key={leg.id}
            className="flex items-center gap-[9px] border-b border-line px-3 py-[9px]"
          >
            <LeagueCrest
              logo={leg.league_logo}
              leagueId={leg.league_id}
              sport={leg.sport}
              name={leg.league}
              size={18}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px]">{leg.match}</div>
              <div className="truncate text-[12.5px] font-bold text-[#C3CBDB]">
                {formatPick(leg.pick)}
              </div>
            </div>
            <span className="shrink-0 font-mono-num text-[13.5px] font-semibold tabular-nums">
              {planketOdds(leg.odds)}
            </span>
          </div>
        ))}

        <div className="flex">
          <div className="flex-1 px-3 py-2.5">
            <FieldLabel className="text-[9.5px]">Totalodds</FieldLabel>
            <div className="font-mono-num text-[17px] font-semibold tabular-nums">
              {total}
            </div>
          </div>
          <div className="flex-1 border-l border-line px-3 py-2.5">
            <FieldLabel className="text-[9.5px]">Insats</FieldLabel>
            <div className="font-mono-num text-[17px] font-semibold tabular-nums">
              {stake}
            </div>
          </div>
        </div>
        {settled ? (
          <div className="flex items-baseline gap-2 border-t border-line px-3 py-2.5">
            <FieldLabel className="mb-0 text-[9.5px]">Utfall</FieldLabel>
            <span
              className={`ml-auto font-mono-num text-[17px] font-semibold tabular-nums ${outcomeClass}`}
            >
              {outcome}
            </span>
          </div>
        ) : null}
      </div>
    </>
  );
}
