"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { useT } from "@/components/TextsProvider";
import { useToast } from "@/components/ui/Toast";
import { getBookmakerLogoUrl } from "@/lib/bookmakers";
import {
  COUPON_STATUS_TONE,
  couponNetto,
  couponStatusLabel,
  couponUrl,
  formatCouponOdds,
  isSettled,
  possibleWin,
  type Coupon,
} from "@/lib/coupons";
import { teamLogoUrl } from "@/lib/logos";
import { formatMoney } from "@/lib/utils";

/** Kortets egna koordinatsystem. Allt inuti ritas i de här måtten. */
const CARD_W = 1200;
const CARD_H = 630;
// Fler ben än så får inte plats på kortet; se route.tsx för delningskortet.
const MAX_LEGS = 5;

export function CouponShareModal({
  coupon,
  onClose,
}: {
  coupon: Coupon;
  onClose: () => void;
}) {
  const t = useT();
  const { toast } = useToast();
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [busy, setBusy] = useState(false);

  /**
   * Ramen mäts, den hårdkodas inte. En fast px-bredd stämmer i exakt ett
   * fönster: kortet ska fylla ramen vid alla storlekar, så skalan räknas
   * ur ramens faktiska bredd och räknas om när den ändras.
   */
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const apply = () => setScale(frame.clientWidth / CARD_W);
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const url = couponUrl(coupon.slug);
  const settled = isSettled(coupon);
  const netto = couponNetto(coupon);

  async function download() {
    setBusy(true);
    try {
      // Bilden renderas på servern i full upplösning. Klienten laddar bara
      // ner den — en canvas i webbläsaren hade tappat både typsnitten och
      // lagloggorna (cross-origin gör canvasen otillåten att exportera).
      const response = await fetch(`/api/kuponger/${coupon.slug}/delningskort`);
      if (!response.ok) throw new Error(String(response.status));
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `kupong-${coupon.slug}.png`;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast(t("kuponger.share.downloadFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      toast(t("kuponger.card.linkCopied"));
    } catch {
      toast(t("kuponger.card.linkCopyFailed"));
    }
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[92] flex items-start justify-center overflow-auto bg-[rgba(4,4,5,.78)] px-4 py-10 backdrop-blur-[4px]"
    >
      <div className="w-full max-w-[760px]">
        <div className="mb-3.5 flex items-center justify-between gap-3">
          <div>
            <div className="font-display text-[22px] font-semibold uppercase tracking-[0.04em] text-text">
              {t("kuponger.share.title")}
            </div>
            <div className="text-[13.5px] text-muted">
              {t("kuponger.share.subtitle")}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("kuponger.share.close")}
            className="size-9 cursor-pointer rounded-[9px] border border-line-strong bg-panel text-[17px] text-muted hover:text-text"
          >
            ×
          </button>
        </div>

        <div
          ref={frameRef}
          className="w-full overflow-hidden rounded-[14px] border border-line bg-bg-deep"
          style={{ aspectRatio: `${CARD_W} / ${CARD_H}` }}
        >
          {scale > 0 ? (
            <ShareCard
              coupon={coupon}
              settled={settled}
              netto={netto}
              style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
            />
          ) : null}
        </div>

        <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => void download()}
            className="cursor-pointer rounded-[10px] bg-cta px-5 py-[13px] text-[15px] font-bold text-cta-ink disabled:opacity-60"
          >
            {busy ? t("kuponger.share.rendering") : t("kuponger.share.download")}
          </button>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="cursor-pointer rounded-[10px] border border-line-strong bg-panel px-[18px] py-[13px] text-[15px] font-semibold text-text hover:border-line-hover"
          >
            {t("kuponger.share.copyLink")}
          </button>
          <span className="ml-auto truncate font-mono-num text-[12.5px] text-faint">
            {url}
          </span>
        </div>
      </div>
    </div>
  );
}

function ShareCard({
  coupon,
  settled,
  netto,
  style,
}: {
  coupon: Coupon;
  settled: boolean;
  netto: number;
  style?: React.CSSProperties;
}) {
  const t = useT();
  const tone = COUPON_STATUS_TONE[coupon.status];
  const logo = getBookmakerLogoUrl(coupon.bookmakers?.logo_url);
  // Samma höjdbudget som PNG:en i api/kuponger/[slug]/delningskort.
  const overflow = coupon.legs.length > MAX_LEGS;
  const visibleLegs = coupon.legs.slice(0, overflow ? MAX_LEGS - 1 : MAX_LEGS);
  const hiddenLegs = coupon.legs.length - visibleLegs.length;
  const dense = coupon.legs.length >= MAX_LEGS;
  const crestSize = dense ? 36 : 44;
  const legFont = dense ? 22 : 26;

  return (
    <div
      style={{
        width: CARD_W,
        height: CARD_H,
        padding: "56px 60px",
        display: "flex",
        flexDirection: "column",
        background:
          "radial-gradient(circle at 82% 8%, #1f1f22, #000000 62%)",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 30 }}>
        <Logo
          title={t("kuponger.shareCard.brand")}
          className="w-auto shrink-0 text-[#EDEFF7]"
          style={{ height: 38 }}
        />
        {coupon.kicker ? (
          <span
            className="font-display"
            style={{
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              padding: "8px 14px",
              borderRadius: 8,
              background: tone.badgeBg,
              color: tone.badgeFg,
            }}
          >
            {coupon.kicker}
          </span>
        ) : null}
        <span
          className="font-mono-num"
          style={{
            marginLeft: "auto",
            fontSize: 19,
            fontWeight: 600,
            letterSpacing: "0.06em",
            padding: "9px 16px",
            borderRadius: 8,
            background: tone.badgeBg,
            color: tone.badgeFg,
          }}
        >
          {couponStatusLabel(coupon.status, t)}
        </span>
      </div>

      <div
        className="font-display"
        style={{
          fontSize: 52,
          fontWeight: 600,
          lineHeight: 1.2,
          color: "#E6EAF2",
          marginBottom: 19,
          maxWidth: 940,
          flexShrink: 0,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {coupon.title}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: dense ? 10 : 14,
          marginBottom: "auto",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {visibleLegs.map((leg) => {
          const fx = leg.fixtures;
          const home = teamLogoUrl(fx?.home_logo, fx?.home_team_id, fx?.sport);
          const away = teamLogoUrl(fx?.away_logo, fx?.away_team_id, fx?.sport);
          return (
            <div key={leg.id} style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <Crest src={home} size={crestSize} />
              <Crest src={away} size={crestSize} />
              <span
                style={{
                  fontSize: legFont,
                  color: "#C3CBDB",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 400,
                  minWidth: 0,
                }}
              >
                {fx?.home_name ?? "?"} – {fx?.away_name ?? "?"}
              </span>
              <span
                style={{
                  fontSize: legFont,
                  fontWeight: 700,
                  color: "#E6EAF2",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 300,
                  flexShrink: 0,
                }}
              >
                {leg.pick}
              </span>
              <span className="font-mono-num" style={{ marginLeft: "auto", flexShrink: 0, fontSize: legFont + 2, fontWeight: 600, color: "#E6EAF2" }}>
                {formatCouponOdds(leg.odds)}
              </span>
            </div>
          );
        })}
        {hiddenLegs > 0 ? (
          <span className="font-mono-num" style={{ fontSize: 20, fontWeight: 600, color: "#8A94AB" }}>
            {t("kuponger.shareCard.moreLegs", { count: hiddenLegs })}
          </span>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 52,
          paddingTop: 30,
          borderTop: "1px solid #2e2f37",
        }}
      >
        <Field label={t("kuponger.card.stake")} value={formatMoney(Number(coupon.stake), t("kuponger.unit.kr")).replace("+", "")} size={32} />
        <Field label={t("kuponger.card.totalOdds")} value={formatCouponOdds(coupon.total_odds)} size={46} color="#66E38A" />
        {/* Ett avgjort kort får aldrig delas med en vinstsiffra. */}
        {settled ? (
          <Field
            label={t("kuponger.card.outcome")}
            value={formatMoney(netto, t("kuponger.unit.kr"))}
            size={32}
            color={netto > 0 ? "#66E38A" : netto < 0 ? "#FF5C6C" : "#E6EAF2"}
          />
        ) : (
          <Field
            label={t("kuponger.card.possibleWin")}
            value={formatMoney(possibleWin(coupon), t("kuponger.unit.kr"))}
            size={32}
            color="#66E38A"
          />
        )}

        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <span
            style={{
              display: "inline-block",
              width: 150,
              height: 56,
              borderRadius: 10,
              backgroundColor: "#26272e",
              backgroundImage: logo ? `url(${JSON.stringify(logo)})` : undefined,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
              backgroundSize: "78% auto",
            }}
          />
          <div style={{ fontSize: 15, color: "#5D6883", marginTop: 10 }}>
            {t("kuponger.shareCard.footer")}
          </div>
        </div>
      </div>
    </div>
  );
}

function Crest({ src, size }: { src: string | null; size: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 99,
        background: "rgba(230,234,242,.08)",
        padding: 5,
        flexShrink: 0,
        display: "inline-block",
        backgroundImage: src ? `url(${JSON.stringify(src)})` : undefined,
        backgroundOrigin: "content-box",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: "contain",
      }}
    />
  );
}

function Field({
  label,
  value,
  size,
  color = "#E6EAF2",
}: {
  label: string;
  value: string;
  size: number;
  color?: string;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 15,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "#8A94AB",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div className="font-mono-num" style={{ fontSize: size, fontWeight: 600, color, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}
