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
import { BookmakerDisclaimer } from "@/components/bets/BookmakerDisclaimer";
import { useT } from "@/components/TextsProvider";
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
  age_limit?: number | null;
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

function StarRow({
  rating,
  compact,
}: {
  rating: number | null;
  compact?: boolean;
}) {
  const t = useT();
  return (
    <span
      title={ratingTitle(rating, t)}
      className={cn(
        "absolute right-3 top-3 z-[3] flex cursor-help items-center",
        compact && "max-sm:right-2 max-sm:top-2"
      )}
    >
      <span
        className={cn(
          "block h-4 w-[84px] bg-contain bg-right bg-no-repeat",
          compact && "max-sm:h-3 max-sm:w-[62px]"
        )}
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
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | null | undefined) {
    if (!file) return;
    const ok = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
    if (!ok) {
      setError(t("spelbolag.hero.wrongType"));
      return;
    }
    if (file.size > 1024 * 1024) {
      setError(t("spelbolag.hero.tooLarge"));
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
          ? t("spelbolag.hero.uploading")
          : error
            ? error
            : t("spelbolag.hero.drop", { name })}
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
  onHeroUploaded,
  className,
  compactOnMobile = false,
}: {
  data: BookmakerCardData;
  src?: string;
  preview?: boolean;
  editorMode?: boolean;
  onHeroUploaded?: (url: string, filename: string) => void;
  className?: string;
  /**
   * Två kort i bredd på mobil: allt skalas ner under sm så att kortet
   * fortfarande känns luftigt i halva skärmbredden.
   */
  compactOnMobile?: boolean;
}) {
  const t = useT();
  const c = compactOnMobile;
  const brand = displayText(data.brand_color) || "#212124";
  const goHref = `/go/${data.slug}${src ? `?src=${src}` : ""}`;
  const isTop = data.rank === 1;
  const heroUrl = getBookmakerHeroUrl(data.hero_url);
  const logoUrl = getBookmakerLogoUrl(data.logo_url);
  const badge = displayText(data.badge);
  const pay = primaryPayment(data.payments);
  const bonusLine = formatBonusLine(data, t);
  const wager = wageringParts(data.wagering, t);
  const bonus2Label = displayText(data.bonus2_label);
  const bonus2Value = displayText(data.bonus2_value);
  const showBonus2 = !!bonus2Label && !!bonus2Value && !!bonus2Kind(bonus2Label);

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
        className={cn(
          "relative h-[150px] overflow-hidden rounded-t-[15px]",
          c && "max-sm:h-[92px]"
        )}
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
            name={data.name || t("spelbolag.card.fallbackName")}
            onUploaded={(url, filename) => onHeroUploaded?.(url, filename)}
          />
        ) : null}

        <span
          className={cn(
            "pointer-events-none absolute left-3 top-3 z-[3] flex h-7 w-7 items-center justify-center rounded-lg bg-[rgba(247,248,251,.94)] font-display text-[15px] font-bold text-[#1A1F2B]",
            c && "max-sm:left-2 max-sm:top-2 max-sm:h-6 max-sm:w-6 max-sm:text-[13px]"
          )}
        >
          {data.rank}
        </span>
        <StarRow rating={data.rating} compact={c} />
      </div>

      <div
        className={cn(
          "relative z-[2] -mt-[17px] flex h-[34px] items-center justify-center gap-2",
          c && "max-sm:-mt-[13px] max-sm:h-[26px] max-sm:gap-1"
        )}
      >
        {badge ? (
          <span
            className={cn(
              "whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-bold text-white shadow-[0_4px_14px_rgba(0,0,0,.28)]",
              c && "max-sm:px-2.5 max-sm:py-1 max-sm:text-[11px]"
            )}
            style={{ background: isTop ? "#1B4F8A" : "#2C3A52" }}
          >
            {badge}
          </span>
        ) : null}
        {pay ? (
          <span
            className={cn(
              "inline-flex items-center gap-[7px] whitespace-nowrap rounded-full border border-black/[.08] bg-white px-3.5 py-[7px] text-[13px] font-semibold text-[#12171F] shadow-[0_4px_14px_rgba(0,0,0,.18)]",
              // Två chips får inte plats i ett halvbrett kort — märket vinner.
              c && (badge ? "max-sm:hidden" : "max-sm:px-2.5 max-sm:py-1 max-sm:text-[11px]")
            )}
          >
            <span
              className="block size-4 bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: `url("${PAYMENT_MARKS[pay]}")` }}
              aria-hidden
            />
            {pay}
          </span>
        ) : null}
      </div>

      <div
        className={cn(
          "flex flex-1 flex-col justify-center px-[18px] pb-5 pt-4 text-center",
          c && "max-sm:px-2.5 max-sm:pb-3 max-sm:pt-2.5"
        )}
      >
        {bonusLine ? (
          <div
            className={cn(
              "text-[19px] font-bold leading-snug text-[#12171F]",
              c && "max-sm:text-[14.5px]"
            )}
          >
            {bonusLine}
          </div>
        ) : null}
        <div
          className={cn(
            "mt-[5px] text-[14px] text-[#5B6472]",
            c && "max-sm:text-[11.5px]"
          )}
        >
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
          <div
            className={cn(
              "mx-auto mt-[11px] inline-flex items-baseline gap-[7px] rounded-full border border-black/[.07] bg-[#F0F2F7] px-[13px] py-1.5",
              c && "max-sm:mt-2 max-sm:flex-col max-sm:items-center max-sm:gap-0 max-sm:rounded-[10px] max-sm:px-2 max-sm:py-1"
            )}
          >
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
        <div className={cn("px-[18px]", c && "max-sm:px-2.5")}>
          {preview ? (
            <span className="block rounded-full bg-[#2F8B4F] px-[18px] py-[15px] text-center text-[17px] font-bold text-white">
              {t("spelbolag.card.cta", { name: data.name || t("spelbolag.card.fallbackName") })}
            </span>
          ) : (
            <a
              href={goHref}
              target="_blank"
              rel="noopener sponsored nofollow"
              onClick={() =>
                track({ event: "affiliate_click", bookmaker: data.slug })
              }
              className={cn(
                "block rounded-full bg-[#2F8B4F] px-[18px] py-[15px] text-center text-[17px] font-bold text-white no-underline transition-colors hover:bg-[#26703F] hover:text-white hover:no-underline",
                c && "max-sm:px-2 max-sm:py-2.5 max-sm:text-[13.5px]"
              )}
            >
              {t("spelbolag.card.cta", { name: data.name || t("spelbolag.card.fallbackName") })}
            </a>
          )}
        </div>
      ) : null}

      <div
        className={cn(
          "mt-4 border-t border-black/[.07] px-[18px] pb-4 pt-[13px]",
          c && "max-sm:mt-3 max-sm:px-2 max-sm:pb-2.5 max-sm:pt-2"
        )}
      >
        <BookmakerDisclaimer
          bookmaker={data}
          tone="light"
          className={cn("text-left text-[12px]", c && "max-sm:text-[10.5px]")}
        />
      </div>
    </div>
  );
}
