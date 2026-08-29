"use client";

import { getBookmakerLogoUrl } from "@/lib/bookmakers";
import { formatPick } from "@/lib/picks";
import {
  couponMeta,
  couponPossibleWin,
  planketKickoff,
  planketKr,
  planketOdds,
  type PlanketCoupon,
} from "@/lib/planket";
import { BookmakerPlate, FieldLabel, LeagueCrest } from "@/components/planket/Bits";

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
 */
export function PostCouponCard({ coupon }: { coupon: PlanketCoupon }) {
  const legs = coupon.legs;
  const total = planketOdds(coupon.total_odds);
  const stake = planketKr(coupon.stake);
  const win = planketKr(couponPossibleWin(coupon.stake, coupon.total_odds), {
    sign: true,
  });
  const bookLogo = getBookmakerLogoUrl(coupon.bookmaker_logo);

  return (
    <>
      {/* ---------- Desktop ---------- */}
      <div className="mb-[13px] hidden overflow-hidden rounded-[12px] border border-line bg-[#1B2233] lg:block">
        <div className="flex items-center gap-[9px] border-b border-line px-[14px] py-[11px]">
          <span className="shrink-0 font-display text-[12.5px] font-semibold uppercase tracking-[0.11em] text-yellow">
            Kupong
          </span>
          <span className="min-w-0 flex-1 truncate font-mono-num text-[12.5px] text-[#5D6883]">
            {couponMeta(legs)}
          </span>
          <BookmakerPlate
            name={coupon.bookmaker_name}
            logoUrl={bookLogo}
            width={66}
            height={28}
          />
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
          <div className="flex-1 border-l border-line px-[14px] py-3">
            <FieldLabel>Möjlig vinst</FieldLabel>
            <div className="font-mono-num text-[20px] font-semibold tabular-nums text-win">
              {win}
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Mobil ---------- */}
      <div className="mb-3 overflow-hidden rounded-[11px] border border-line bg-[#1B2233] lg:hidden">
        <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
          <span className="shrink-0 font-display text-[11.5px] font-semibold uppercase tracking-[0.11em] text-yellow">
            Kupong
          </span>
          <span className="min-w-0 truncate font-mono-num text-[11.5px] text-[#5D6883]">
            {couponMeta(legs)}
          </span>
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
      </div>
    </>
  );
}
