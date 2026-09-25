"use client";

import { useRef, useState } from "react";
import { track } from "@/lib/analytics";
import {
  BOOKMAKER_HERO_BUCKET,
  PAYMENT_MARKS,
  bonus2Kind,
  displayText,
  formatBonusLine,
  getBookmakerHeroUrl,
  getBookmakerLogoUrl,
  primaryPayment,
  ratingTitle,
  starRowDataUri,
  wageringParts,
} from "@/lib/bookmakers";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export type BookmakerCardData = {
  id?: string;
  name: string;
  slug: string;
  logo_url: string | null;
  hero_url?: string | null;
  rank: number;
  rating: number | null;
  bonus: string | null;
  bonus_value: number | null;
  badge?: string | null;
  wagering?: string | null;
  bonus2_label?: string | null;
  bonus2_value?: string | null;
  usp?: string | null;
  terms: string | null;
  terms_url?: string | null;
  extra_disclaimer?: string | null;
  review: string | null;
  plus: string[] | null;
  minus: string[] | null;
  payments?: string[] | null;
  brand_color?: string | null;
  license?: string | null;
  tracking_url: string | null;
  fast_payout?: boolean;
  tags?: string[] | null;
};

const STODLINJEN = "https://stodlinjen.se";
const SPELPAUS = "https://spelpaus.se";

function StarRow({ rating }: { rating: number | null }) {
  return (
    <span
      title={ratingTitle(rating)}
      className="absolute right-3 top-3 z-[3] flex cursor-help items-center"
    >
      <span
        className="block h-4 w-[84px] bg-contain bg-right bg-no-repeat"
        style={{ backgroundImage: `url("${starRowDataUri(rating)}")` }}
        aria-hidden
      />
    </span>
  );
}

function HeroUpload({
  name,
  onUploaded,
}: {
  name: string;
  onUploaded: (url: string, filename: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | null | undefined) {
    if (!file) return;
    const ok = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
    if (!ok) {
      setError("JPG, PNG eller WebP");
      return;
    }
    if (file.size > 1024 * 1024) {
      setError("Max 1 MB");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${Date.now()}-${safe}`;
    const { error: uploadError } = await supabase.storage
      .from(BOOKMAKER_HERO_BUCKET)
      .upload(path, file, { upsert: true });
    if (uploadError) {
      setError(uploadError.message);
      setBusy(false);
      return;
    }
    const { data } = supabase.storage
      .from(BOOKMAKER_HERO_BUCKET)
      .getPublicUrl(path);
    onUploaded(data.publicUrl, file.name);
    setBusy(false);
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void onFile(e.dataTransfer.files?.[0]);
      }}
      className={cn(
        "absolute inset-0 z-[1] flex cursor-pointer items-center justify-center border-0 px-4 text-center transition",
        dragging ? "bg-black/45" : "bg-black/25 hover:bg-black/40"
      )}
    >
      <span className="text-[13px] font-semibold leading-snug text-white drop-shadow">
        {busy
          ? "Laddar upp…"
          : error
            ? error
            : `Släpp bannerbild för ${name} · 640×300`}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </button>
  );
}

export function BookmakerCard({
  data,
  src,
  preview = false,
  editorMode = false,
  open,
  onToggleReview,
  onHeroUploaded,
  className,
}: {
  data: BookmakerCardData;
  src?: string;
  preview?: boolean;
  editorMode?: boolean;
  open?: boolean;
  onToggleReview?: () => void;
  onHeroUploaded?: (url: string, filename: string) => void;
  className?: string;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const toggle = onToggleReview ?? (() => setInternalOpen((v) => !v));

  const brand = displayText(data.brand_color) || "#1B2436";
  const goHref = `/go/${data.slug}${src ? `?src=${src}` : ""}`;
  const isTop = data.rank === 1;
  const heroUrl = getBookmakerHeroUrl(data.hero_url);
  const logoUrl = getBookmakerLogoUrl(data.logo_url);
  const badge = displayText(data.badge);
  const pay = primaryPayment(data.payments);
  const bonusLine = formatBonusLine(data);
  const wager = wageringParts(data.wagering);
  const bonus2Label = displayText(data.bonus2_label);
  const bonus2Value = displayText(data.bonus2_value);
  const showBonus2 = !!bonus2Label && !!bonus2Value && !!bonus2Kind(bonus2Label);
  const terms = displayText(data.terms);
  const termsUrl = displayText(data.terms_url);
  const hasMore = !!terms || !!termsUrl;

  const fallbackBg = {
    backgroundColor: brand,
    backgroundImage: [
      logoUrl ? `url(${logoUrl})` : null,
      "radial-gradient(120% 90% at 22% 10%, rgba(255,255,255,.22), rgba(255,255,255,0) 62%)",
      "linear-gradient(165deg, rgba(255,255,255,.10), rgba(0,0,0,.34))",
    ]
      .filter(Boolean)
      .join(", "),
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    backgroundSize: logoUrl ? "62% auto, cover, cover" : "cover, cover",
  } as const;

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl bg-[#F7F8FB] transition duration-[180ms] ease-out",
        isTop
          ? "border border-[rgba(255,209,102,.5)] shadow-[0_0_40px_rgba(255,209,102,.10)]"
          : "border border-[rgba(230,234,242,.10)] shadow-[0_10px_30px_rgba(0,0,0,.28)]",
        !preview && "hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(0,0,0,.45)]",
        className
      )}
    >
      <div
        className="relative h-[150px] overflow-hidden rounded-t-[15px]"
        style={heroUrl ? undefined : fallbackBg}
      >
        {heroUrl ? (
          <div
            role="img"
            aria-label={data.name}
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${heroUrl})` }}
          />
        ) : null}

        {editorMode ? (
          <HeroUpload
            name={data.name || "spelbolaget"}
            onUploaded={(url, filename) => onHeroUploaded?.(url, filename)}
          />
        ) : null}

        <span className="pointer-events-none absolute left-3 top-3 z-[3] flex h-7 w-7 items-center justify-center rounded-lg bg-[rgba(247,248,251,.94)] font-display text-[15px] font-bold text-[#1A1F2B]">
          {data.rank}
        </span>
        <StarRow rating={data.rating} />
      </div>

      <div className="relative z-[2] -mt-[17px] flex h-[34px] items-center justify-center gap-2">
        {badge ? (
          <span
            className="whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-bold text-white shadow-[0_4px_14px_rgba(0,0,0,.28)]"
            style={{ background: isTop ? "#1B4F8A" : "#2C3A52" }}
          >
            {badge}
          </span>
        ) : null}
        {pay ? (
          <span className="inline-flex items-center gap-[7px] whitespace-nowrap rounded-full border border-black/[.08] bg-white px-3.5 py-[7px] text-[13px] font-semibold text-[#12171F] shadow-[0_4px_14px_rgba(0,0,0,.18)]">
            <span
              className="block size-4 bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: `url("${PAYMENT_MARKS[pay]}")` }}
              aria-hidden
            />
            {pay}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col justify-center px-[18px] pb-5 pt-4 text-center">
        {bonusLine ? (
          <div className="text-[19px] font-bold leading-snug text-[#12171F]">
            {bonusLine}
          </div>
        ) : null}
        <div className="mt-[5px] text-[14px] text-[#5B6472]">
          {wager.value == null ? (
            wager.label
          ) : (
            <>
              {wager.label}{" "}
              <span className="font-bold text-[#12171F]">{wager.value}</span>
            </>
          )}
        </div>
        {showBonus2 ? (
          <div className="mx-auto mt-[11px] inline-flex items-baseline gap-[7px] rounded-full border border-black/[.07] bg-[#F0F2F7] px-[13px] py-1.5">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-[#5B6472]">
              {bonus2Label}
            </span>
            <span className="text-[14px] font-bold text-[#12171F]">
              {bonus2Value}
            </span>
          </div>
        ) : null}
      </div>

      {data.tracking_url ? (
        <div className="px-[18px]">
          {preview ? (
            <span className="block rounded-full bg-[#2F8B4F] px-[18px] py-[15px] text-center text-[17px] font-bold text-white">
              Till {data.name || "spelbolaget"}
            </span>
          ) : (
            <a
              href={goHref}
              target="_blank"
              rel="noopener sponsored nofollow"
              onClick={() =>
                track({ event: "affiliate_click", bookmaker: data.slug })
              }
              className="block rounded-full bg-[#2F8B4F] px-[18px] py-[15px] text-center text-[17px] font-bold text-white no-underline transition-colors hover:bg-[#26703F] hover:text-white hover:no-underline"
            >
              Till {data.name || "spelbolaget"}
            </a>
          )}
        </div>
      ) : null}

      <div className="mt-4 border-t border-black/[.07] px-[18px] pb-4 pt-[13px]">
        <div className="flex items-start gap-2.5">
          <div
            className={cn(
              "min-w-0 flex-1 text-left text-[12.5px] leading-[1.55] text-[#5B6472]",
              !isOpen && "line-clamp-1"
            )}
          >
            18+, Spela ansvarsfullt,{" "}
            <a
              href={STODLINJEN}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[#2C6FD6] no-underline hover:underline"
            >
              stödlinjen
            </a>
            ,{" "}
            <a
              href={SPELPAUS}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[#2C6FD6] no-underline hover:underline"
            >
              spelpaus
            </a>
            .{terms ? ` ${terms}` : ""}
            {termsUrl ? (
              <>
                {" – "}
                <a
                  href={termsUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="font-bold text-[#2C6FD6] no-underline hover:underline"
                >
                  Regler &amp; villkor gäller
                </a>
              </>
            ) : null}
          </div>
          {hasMore ? (
            <button
              type="button"
              onClick={toggle}
              aria-expanded={isOpen}
              aria-label={isOpen ? "Visa mindre" : "Visa hela texten"}
              className="-mr-1.5 -mt-1 inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded border-0 bg-transparent text-[#8A93A3] hover:text-[#5B6472]"
            >
              <svg
                viewBox="0 0 12 8"
                className={cn(
                  "h-2 w-3 transition-transform duration-200",
                  isOpen && "rotate-180"
                )}
                aria-hidden
              >
                <path d="M0 0h12L6 8z" fill="currentColor" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
