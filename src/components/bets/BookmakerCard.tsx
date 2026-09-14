"use client";

import { useState } from "react";
import { BookmakerDisclaimer } from "@/components/bets/BookmakerDisclaimer";
import { track } from "@/lib/analytics";
import { getBookmakerLogoUrl } from "@/lib/bookmakers";
import { cn } from "@/lib/utils";

export type BookmakerCardData = {
  name: string;
  slug: string;
  logo_url: string | null;
  rank: number;
  rating: number | null;
  bonus: string | null;
  bonus_value: number | null;
  usp: string | null;
  terms: string | null;
  terms_url: string | null;
  extra_disclaimer: string | null;
  review: string | null;
  plus: string[] | null;
  minus: string[] | null;
  brand_color?: string | null;
  withdrawal_time?: string | null;
  tracking_url: string | null;
};

function StarRow({ rating }: { rating: number | null }) {
  const value = Math.max(0, Math.min(5, rating ?? 0));
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} av 5`}>
      {Array.from({ length: 5 }, (_, i) => {
        const on = i < full || (i === full && half);
        return (
          <span
            key={i}
            className={cn(
              "text-[13px] leading-none",
              on ? "text-[#F5C542]" : "text-[#C5CBD6]"
            )}
          >
            ★
          </span>
        );
      })}
    </span>
  );
}

export function BookmakerCard({
  data,
  src,
  preview = false,
  open,
  onToggleReview,
  className,
}: {
  data: BookmakerCardData;
  src?: string;
  preview?: boolean;
  open?: boolean;
  onToggleReview?: () => void;
  className?: string;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const toggle = onToggleReview ?? (() => setInternalOpen((v) => !v));

  const brand = data.brand_color?.trim() || "#1B2436";
  const usps = (data.plus ?? []).filter(Boolean).slice(0, 2);
  const goHref = `/go/${data.slug}${src ? `?src=${src}` : ""}`;

  const cta = (
    <>
      <span className="font-display block text-[17px] font-semibold tracking-[0.06em]">
        TILL {data.name.toUpperCase()}
      </span>
      <span className="mt-0.5 block text-[12.5px] opacity-90">
        Vidare till {data.name}
      </span>
    </>
  );

  const logoBlock = data.logo_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={getBookmakerLogoUrl(data.logo_url) ?? data.logo_url}
      alt={data.name}
      className="max-h-10 max-w-[70%] object-contain"
    />
  ) : (
    <span className="font-display text-2xl font-bold text-white">{data.name}</span>
  );

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-card-light shadow-[0_10px_30px_rgba(0,0,0,.25)] transition",
        !preview && "hover:-translate-y-1",
        className
      )}
    >
      <div
        className="relative flex h-[120px] items-center justify-center"
        style={{ backgroundColor: brand }}
      >
        {data.tracking_url && !preview ? (
          <a
            href={goHref}
            target="_blank"
            rel="noopener sponsored nofollow"
            onClick={() => track({ event: "affiliate_click", bookmaker: data.slug })}
            className="flex h-full w-full items-center justify-center no-underline"
            aria-label={`Till ${data.name}`}
          >
            {logoBlock}
          </a>
        ) : (
          logoBlock
        )}
        <span className="pointer-events-none absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg bg-white/95 font-display text-sm font-bold text-[#1A1F2B]">
          {data.rank}
        </span>
        {data.rating != null ? (
          <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-[rgba(15,20,32,.72)] px-2.5 py-1">
            <StarRow rating={data.rating} />
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 px-4 pb-0 pt-4 text-center">
        <div>
          <div className="text-[10.5px] font-bold tracking-[0.14em] text-[#6B7688]">
            BONUS
          </div>
          <div className="font-display text-[26px] font-semibold leading-tight text-[#12171F]">
            {data.bonus_value
              ? `${data.bonus_value.toLocaleString("sv-SE")} kr`
              : data.bonus || "—"}
          </div>
          {data.usp ? (
            <div className="mt-1 text-[12.5px] text-[#6B7688]">{data.usp}</div>
          ) : null}
        </div>

        {usps.length ? (
          <ul className="space-y-1 text-left text-[12.5px] text-[#333A45]">
            {usps.map((u) => (
              <li key={u} className="flex gap-2">
                <span className="font-bold text-[#1E8E4E]">+</span>
                <span>{u}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {data.withdrawal_time ? (
          <div className="rounded-[9px] bg-[#F3F5F8] px-3 py-2 text-[12.5px] text-[#5B6472]">
            Uttag:{" "}
            <span className="font-semibold text-[#12171F]">
              {data.withdrawal_time}
            </span>
          </div>
        ) : null}

        {data.tracking_url ? (
          preview ? (
            <div className="mt-auto block rounded-[11px] bg-[#3FA662] px-3.5 py-3 text-center text-white">
              {cta}
            </div>
          ) : (
            <a
              href={goHref}
              target="_blank"
              rel="noopener sponsored nofollow"
              onClick={() => track({ event: "affiliate_click", bookmaker: data.slug })}
              className="mt-auto block rounded-[11px] bg-[#3FA662] px-3.5 py-3 text-center text-white no-underline hover:bg-[#348C53] hover:text-white hover:no-underline"
            >
              {cta}
            </a>
          )
        ) : null}

        {(data.terms || data.terms_url) && (
          <div className="text-left">
            <button
              type="button"
              onClick={() => setTermsOpen((v) => !v)}
              className="cursor-pointer border-0 bg-transparent p-0 text-[12.5px] font-semibold text-[#3A6FD8]"
            >
              {termsOpen ? "Dölj villkor" : "Regler & villkor"}
            </button>
            {termsOpen ? (
              <p className="mt-1.5 text-[12px] leading-relaxed text-[#5B6472]">
                {data.terms || "Se villkor via länken i disclaimern."}
              </p>
            ) : data.terms ? (
              <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[#7A838F]">
                {data.terms}
              </p>
            ) : null}
          </div>
        )}

        <BookmakerDisclaimer
          tone="light"
          prefix="Reklamlänk"
          bookmaker={data}
          className="text-[11px]"
        />
      </div>

      <div className="mt-3.5 rounded-b-[15px] border-t border-black/10 bg-[#ECEFF4] p-3 text-center">
        <div className="text-[12.5px] text-[#5B6472]">{data.name}</div>
        <button
          type="button"
          onClick={toggle}
          className="cursor-pointer border-0 bg-transparent text-[13.5px] font-bold text-[#12171F]"
        >
          {isOpen ? "Dölj recension" : "Läs mer"}
        </button>
        {isOpen ? (
          <div className="mt-2.5 animate-sbfade text-left">
            <p className="mb-2.5 text-[13px] leading-relaxed text-[#333A45]">
              {data.review}
            </p>
            {(data.plus || []).map((p) => (
              <div
                key={p}
                className="flex gap-2 py-0.5 text-[12.5px] text-[#333A45]"
              >
                <span className="font-bold text-[#1E8E4E]">+</span>
                {p}
              </div>
            ))}
            {(data.minus || []).map((m) => (
              <div
                key={m}
                className="flex gap-2 py-0.5 text-[12.5px] text-[#333A45]"
              >
                <span className="font-bold text-[#C23B4A]">−</span>
                {m}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
