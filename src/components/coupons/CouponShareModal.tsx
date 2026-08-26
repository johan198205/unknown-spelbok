"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { getBookmakerLogoUrl } from "@/lib/bookmakers";
import {
  COUPON_STATUS_LABEL,
  COUPON_STATUS_TONE,
  couponNetto,
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

export function CouponShareModal({
  coupon,
  onClose,
}: {
  coupon: Coupon;
  onClose: () => void;
}) {
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
      toast("Kunde inte skapa bilden. Försök igen.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      toast("Länk kopierad");
    } catch {
      toast("Kunde inte kopiera länken");
    }
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[92] flex items-start justify-center overflow-auto bg-[rgba(5,7,12,.78)] px-4 py-10 backdrop-blur-[4px]"
    >
      <div className="w-full max-w-[760px]">
        <div className="mb-3.5 flex items-center justify-between gap-3">
          <div>
            <div className="font-display text-[22px] font-semibold uppercase tracking-[0.04em] text-text">
              Delningskort
            </div>
            <div className="text-[13.5px] text-muted">
              1200 × 630 px · Facebook och Open Graph
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Stäng"
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
            className="cursor-pointer rounded-[10px] bg-win px-5 py-[13px] text-[15px] font-bold text-win-ink disabled:opacity-60"
          >
            {busy ? "Renderar…" : "Ladda ner PNG"}
          </button>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="cursor-pointer rounded-[10px] border border-line-strong bg-panel px-[18px] py-[13px] text-[15px] font-semibold text-text hover:border-line-hover"
          >
            Kopiera länk
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
  const tone = COUPON_STATUS_TONE[coupon.status];
  const logo = getBookmakerLogoUrl(coupon.bookmakers?.logo_url);

  return (
    <div
      style={{
        width: CARD_W,
        height: CARD_H,
        padding: "56px 60px",
        display: "flex",
        flexDirection: "column",
        background:
          "radial-gradient(circle at 82% 8%, #1A2336, #0B0E14 62%)",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 30 }}>
        <span className="font-display" style={{ fontWeight: 700, fontSize: 30, letterSpacing: "0.2em", color: "#E6EAF2" }}>
          SPELBOK
        </span>
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
          {COUPON_STATUS_LABEL[coupon.status]}
        </span>
      </div>

      <div
        className="font-display"
        style={{
          fontSize: 52,
          fontWeight: 600,
          lineHeight: 1.06,
          color: "#E6EAF2",
          marginBottom: 26,
          maxWidth: 940,
        }}
      >
        {coupon.title}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: "auto" }}>
        {coupon.legs.slice(0, 5).map((leg) => {
          const fx = leg.fixtures;
          const home = teamLogoUrl(fx?.home_logo, fx?.home_team_id, fx?.sport);
          const away = teamLogoUrl(fx?.away_logo, fx?.away_team_id, fx?.sport);
          return (
            <div key={leg.id} style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <Crest src={home} />
              <Crest src={away} />
              <span
                style={{
                  fontSize: 26,
                  color: "#C3CBDB",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 400,
                }}
              >
                {fx?.home_name} – {fx?.away_name}
              </span>
              <span style={{ fontSize: 26, fontWeight: 700, color: "#E6EAF2", whiteSpace: "nowrap" }}>
                {leg.pick}
              </span>
              <span className="font-mono-num" style={{ marginLeft: "auto", fontSize: 28, fontWeight: 600, color: "#E6EAF2" }}>
                {formatCouponOdds(leg.odds)}
              </span>
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 52,
          paddingTop: 30,
          borderTop: "1px solid #232B3E",
        }}
      >
        <Field label="Insats" value={formatMoney(Number(coupon.stake), "kr").replace("+", "")} size={32} />
        <Field label="Totalodds" value={formatCouponOdds(coupon.total_odds)} size={46} color="#66E38A" />
        {/* Ett avgjort kort får aldrig delas med en vinstsiffra. */}
        {settled ? (
          <Field
            label="Utfall"
            value={formatMoney(netto, "kr")}
            size={32}
            color={netto > 0 ? "#66E38A" : netto < 0 ? "#FF5C6C" : "#E6EAF2"}
          />
        ) : (
          <Field
            label="Möjlig vinst"
            value={formatMoney(possibleWin(coupon), "kr")}
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
              backgroundColor: "#1B2436",
              backgroundImage: logo ? `url(${JSON.stringify(logo)})` : undefined,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
              backgroundSize: "78% auto",
            }}
          />
          <div style={{ fontSize: 15, color: "#5D6883", marginTop: 10 }}>
            spelbok.se · 18+ · Spela ansvarsfullt
          </div>
        </div>
      </div>
    </div>
  );
}

function Crest({ src }: { src: string | null }) {
  return (
    <span
      style={{
        width: 44,
        height: 44,
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
