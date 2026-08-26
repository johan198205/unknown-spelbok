"use client";

import { useState } from "react";
import Link from "next/link";
import { LeagueLogo } from "@/components/bets/LeagueLogo";
import { TeamCrest } from "@/components/bets/TeamPair";
import { CouponCountdown, CouponPublished } from "./CouponCountdown";
import { CouponProof } from "./CouponProof";
import { CouponShareModal } from "./CouponShareModal";
import { CopyCouponButton } from "./CopyCouponButton";
import { useToast } from "@/components/ui/Toast";
import { track } from "@/lib/analytics";
import { getBookmakerLogoUrl } from "@/lib/bookmakers";
import {
  COUPON_STATUS_LABEL,
  COUPON_STATUS_TONE,
  COUPON_TYPE_LABEL,
  LEG_RESULT_COLOR,
  LEG_RESULT_MARK,
  couponNetto,
  couponUrl,
  firstKickoff,
  formatCouponOdds,
  isSettled,
  legWhen,
  possibleWin,
  settledLabel,
  type Coupon,
  type CouponLeg,
} from "@/lib/coupons";
import { formatMoney } from "@/lib/utils";

const LABEL = "text-[10px] uppercase tracking-[0.13em] text-[#8A94AB]";

export function CouponCard({
  coupon,
  editorMode,
  alreadyCopied,
  loggedIn,
}: {
  coupon: Coupon;
  editorMode: boolean;
  alreadyCopied: boolean;
  loggedIn: boolean;
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const tone = COUPON_STATUS_TONE[coupon.status];
  const settled = isSettled(coupon);
  const netto = couponNetto(coupon);
  const stakeLabel = formatMoney(Number(coupon.stake), "kr").replace("+", "");
  const oddsLabel = formatCouponOdds(coupon.total_odds);
  const bookmakerName = coupon.bookmakers?.name ?? "spelbolaget";

  return (
    <article
      id={`kupong-${coupon.id}`}
      className="overflow-hidden rounded-[16px] border bg-panel"
      style={{ borderColor: tone.border }}
    >
      {/* HUVUD */}
      <div className="flex flex-wrap items-center gap-2.5 border-b border-line-soft px-5 py-[15px]">
        {coupon.kicker ? (
          <span
            className="font-display rounded-[6px] px-2.5 py-[5px] text-[11.5px] font-semibold uppercase tracking-[0.12em]"
            style={{ background: tone.badgeBg, color: tone.badgeFg }}
          >
            {coupon.kicker}
          </span>
        ) : null}
        {/*
          Metaraden krymper och ellipsas i stället för att knuffa ner
          statusbadgen på en egen rad. "3 timmar sedan" är bredare än
          designens "3 t sedan", och i 3-läget räcker kortbredden inte
          till för kicker + meta + badge på samma rad.
        */}
        <span className="font-mono-num min-w-0 flex-1 truncate text-[12px] text-faint">
          {COUPON_TYPE_LABEL[coupon.type]} ·{" "}
          <CouponPublished publishedAt={coupon.published_at} />
        </span>
        <span
          className="font-mono-num ml-auto whitespace-nowrap rounded-[6px] px-2.5 py-[5px] text-[11.5px] font-semibold tracking-[0.07em]"
          style={{ background: tone.badgeBg, color: tone.badgeFg }}
        >
          {COUPON_STATUS_LABEL[coupon.status]}
        </span>
      </div>

      {/* TITEL */}
      <div className="px-5 pt-[18px]">
        <h2 className="font-display mb-1 text-[23px] font-semibold leading-[1.15]">
          <Link
            href={`/kuponger/${coupon.slug}`}
            className="text-text no-underline hover:text-text hover:underline"
          >
            {coupon.title}
          </Link>
        </h2>
        {settled ? (
          <div className="font-mono-num mb-3.5 text-[13px] text-faint">
            {settledLabel(coupon, formatMoney(netto, "kr"))}
          </div>
        ) : (
          <CouponCountdown kickoff={firstKickoff(coupon.legs)} />
        )}
      </div>

      {/* BENEN */}
      <div className="px-5">
        <div className="overflow-hidden rounded-[12px] border border-line-soft bg-bg-soft">
          {coupon.legs.map((leg) => (
            <LegRow key={leg.id} leg={leg} />
          ))}

          <div className="flex flex-wrap items-center border-t border-line bg-panel">
            <SummaryCell label="Insats" value={stakeLabel} basis="120px" />
            <SummaryCell label="Totalodds" value={oddsLabel} basis="110px" size="22px" />
            {settled ? (
              <SummaryCell
                label="Utfall"
                value={formatMoney(netto, "kr")}
                basis="140px"
                size="22px"
                color={
                  netto > 0
                    ? "var(--win)"
                    : netto < 0
                      ? "var(--loss)"
                      : "var(--text)"
                }
              />
            ) : (
              <SummaryCell
                label="Möjlig vinst"
                value={formatMoney(possibleWin(coupon), "kr")}
                basis="140px"
                color="var(--win)"
              />
            )}
            <SummaryCell
              label="Status"
              value={COUPON_STATUS_LABEL[coupon.status]}
              basis="110px"
              size="14px"
              color={tone.badgeFg}
            />
          </div>
        </div>
      </div>

      {/* SPELREKOMMENDATION + SPELBEVIS */}
      <div className="flex flex-wrap items-start gap-5 px-5 pt-4">
        <div className="min-w-0" style={{ flex: "1 1 320px" }}>
          <div className={`${LABEL} mb-[7px]`}>Spelrekommendation</div>
          <p className="m-0 text-[15px] leading-[1.65] text-text-soft [text-wrap:pretty]">
            {coupon.body}
          </p>
        </div>

        <CouponProof
          couponId={coupon.id}
          proofUrl={coupon.proof_url}
          publishedAt={coupon.published_at}
          bookmakerName={bookmakerName}
          title={coupon.title}
          stake={stakeLabel}
          totalOdds={oddsLabel}
          editorMode={editorMode}
        />
      </div>

      <CouponCta coupon={coupon} />

      {/* FOT */}
      <div className="mt-4 flex flex-wrap items-center gap-[9px] border-t border-line-soft px-5 pb-[18px] pt-4">
        <CopyCouponButton
          couponId={coupon.id}
          alreadyCopied={alreadyCopied}
          loggedIn={loggedIn}
        />
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="cursor-pointer rounded-[10px] border border-line-strong bg-transparent px-4 py-[11px] text-[14px] font-semibold text-text-soft hover:border-line-hover"
        >
          Delningskort
        </button>
        <ShareButtons coupon={coupon} />
      </div>

      {shareOpen ? (
        <CouponShareModal coupon={coupon} onClose={() => setShareOpen(false)} />
      ) : null}
    </article>
  );
}

function LegRow({ leg }: { leg: CouponLeg }) {
  const fx = leg.fixtures;
  const mark = leg.result ? LEG_RESULT_MARK[leg.result] : "–";
  const markColor = leg.result ? LEG_RESULT_COLOR[leg.result] : "#3F4A60";

  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-line-soft px-3.5 py-[13px] first:border-t-0">
      <span className="inline-flex size-[26px] shrink-0 items-center justify-center rounded-full bg-[rgba(230,234,242,0.07)] p-[3px]">
        <LeagueLogo
          src={fx?.league_logo}
          leagueId={fx?.league_id}
          sport={fx?.sport}
          name={fx?.league_name}
          size={20}
        />
      </span>

      <div className="min-w-0" style={{ flex: "1 1 210px" }}>
        {/*
          Lagnamnen får krympa och ellipsas var för sig (flex 0 1 auto,
          min-width 24px). white-space:nowrap på hela raden hade i stället
          tryckt ut odds och resultatmarkör utanför kortet i 3-läget.
        */}
        <div className="flex min-w-0 items-center gap-[7px]">
          <TeamCrest
            logo={fx?.home_logo}
            teamId={fx?.home_team_id}
            sport={fx?.sport}
            name={fx?.home_name ?? "?"}
            size={22}
          />
          <span
            className="truncate text-[14.5px]"
            style={{ flex: "0 1 auto", minWidth: 24 }}
          >
            {fx?.home_name ?? "Okänt lag"}
          </span>
          <span className="shrink-0 text-[11.5px] text-faint">–</span>
          <TeamCrest
            logo={fx?.away_logo}
            teamId={fx?.away_team_id}
            sport={fx?.sport}
            name={fx?.away_name ?? "?"}
            size={22}
          />
          <span
            className="truncate text-[14.5px]"
            style={{ flex: "0 1 auto", minWidth: 24 }}
          >
            {fx?.away_name ?? "Okänt lag"}
          </span>
        </div>
        <div className="font-mono-num mt-[3px] text-[11.5px] text-faint">
          {fx?.league_name ?? "Okänd liga"} · {legWhen(fx?.kickoff)}
        </div>
      </div>

      <span className="text-[14.5px] font-bold" style={{ flex: "0 1 auto" }}>
        {leg.pick}
      </span>
      <span
        className="font-mono-num shrink-0 text-right text-[15px] font-semibold"
        style={{ width: 56 }}
      >
        {formatCouponOdds(leg.odds)}
      </span>
      <span
        className="font-mono-num shrink-0 text-center text-[11.5px] font-semibold"
        style={{ width: 26, color: markColor }}
      >
        {mark}
      </span>
    </div>
  );
}

function SummaryCell({
  label,
  value,
  basis,
  size = "18px",
  color = "var(--text)",
}: {
  label: string;
  value: string;
  basis: string;
  size?: string;
  color?: string;
}) {
  return (
    <div
      className="min-w-0 border-l border-line-soft px-3.5 py-[13px]"
      style={{ flex: `1 1 ${basis}` }}
    >
      <div className={`${LABEL} mb-[5px]`}>{label}</div>
      <div
        className="font-mono-num whitespace-nowrap font-semibold"
        style={{ fontSize: size, color }}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * Rekommenderat spelbolag.
 *
 * Loggans mått följer kolumnantalet via --kupong-cta-logo-*; i 3-läget
 * ligger den på egen rad i full bredd så textkolumnen behåller hela
 * kortbredden. Motiveringen får radbryta — ellips på den gör den obegriplig.
 */
function CouponCta({ coupon }: { coupon: Coupon }) {
  const bookmaker = coupon.bookmakers;
  if (!bookmaker) return null;

  const logo = getBookmakerLogoUrl(bookmaker.logo_url);
  const short = bookmaker.name.split(" ")[0];

  return (
    <div className="px-5 pt-4">
      <div className="rounded-[12px] border border-line bg-bg-soft p-3.5">
        <div
          className="flex"
          style={{
            flexDirection: "var(--kupong-cta-dir)" as React.CSSProperties["flexDirection"],
            alignItems: "var(--kupong-cta-align)" as React.CSSProperties["alignItems"],
            gap: "var(--kupong-cta-gap)",
          }}
        >
          <span
            title={bookmaker.name}
            className="inline-block shrink-0 rounded-[9px] bg-panel-2 bg-center bg-no-repeat"
            style={{
              width: "var(--kupong-cta-logo-w)",
              height: "var(--kupong-cta-logo-h)",
              backgroundImage: logo ? `url(${JSON.stringify(logo)})` : undefined,
              backgroundSize: "82% auto",
            }}
          />
          <div className="w-full min-w-0 flex-1">
            <div className={`${LABEL} mb-[3px]`}>Rekommenderat spelbolag</div>
            <div className="font-display text-[17px] font-semibold leading-[1.2]">
              {bookmaker.name}
            </div>
            {coupon.bookmaker_reason ? (
              <div className="mt-0.5 text-[12.5px] leading-[1.45] text-muted">
                {coupon.bookmaker_reason}
              </div>
            ) : null}
          </div>
        </div>

        <a
          href={`/go/${bookmaker.slug}?src=kupong`}
          target="_blank"
          rel="noopener sponsored nofollow"
          onClick={() => track({ event: "affiliate_click", bookmaker: bookmaker.slug })}
          className="mt-3 block rounded-[9px] bg-win px-2.5 py-2.5 text-center text-[13.5px] font-bold text-win-ink no-underline hover:text-win-ink hover:no-underline hover:brightness-105"
        >
          Spela hos {short}
        </a>
      </div>
      <div className="mt-2 text-[11.5px] text-faint">
        Reklamlänk. {bookmaker.terms || "Villkor gäller. 18+"}
      </div>
    </div>
  );
}

function ShareButtons({ coupon }: { coupon: Coupon }) {
  const { toast } = useToast();

  function openWindow(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(couponUrl(coupon.slug));
      toast("Länk kopierad");
    } catch {
      toast("Kunde inte kopiera länken");
    }
  }

  const square =
    "font-display size-[38px] cursor-pointer rounded-[10px] border border-line-strong bg-transparent text-[13px] font-semibold text-muted hover:border-line-hover hover:text-text";

  return (
    <span className="ml-auto flex items-center gap-[7px]">
      <button
        type="button"
        title="Dela på Facebook"
        className={square}
        onClick={() =>
          openWindow(
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(couponUrl(coupon.slug))}`
          )
        }
      >
        f
      </button>
      <button
        type="button"
        title="Dela på X"
        className={square}
        onClick={() =>
          openWindow(
            `https://x.com/intent/tweet?text=${encodeURIComponent(coupon.title)}&url=${encodeURIComponent(couponUrl(coupon.slug))}`
          )
        }
      >
        X
      </button>
      <button
        type="button"
        title="Kopiera länk"
        className={square}
        onClick={() => void copyLink()}
      >
        ⧉
      </button>
    </span>
  );
}
