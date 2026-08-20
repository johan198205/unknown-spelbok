"use client";

import { useState } from "react";
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
  review: string | null;
  plus: string[] | null;
  minus: string[] | null;
  tracking_url: string | null;
};

export function BookmakerCard({
  data,
  src,
  preview = false,
  open,
  onToggleReview,
  className,
}: {
  data: BookmakerCardData;
  /** Tagged on the /go-link so klick kan spåras per placering */
  src?: string;
  /** Admin-förhandsvisning: inga länkar, inga klick */
  preview?: boolean;
  open?: boolean;
  onToggleReview?: () => void;
  className?: string;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const toggle = onToggleReview ?? (() => setInternalOpen((v) => !v));

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
        style={{ backgroundColor: "#1B2436" }}
      >
        {data.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getBookmakerLogoUrl(data.logo_url) ?? data.logo_url}
            alt={data.name}
            className="max-h-10 max-w-[70%] object-contain"
          />
        ) : (
          <span className="font-display text-2xl font-bold text-white">
            {data.name}
          </span>
        )}
        <span className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg bg-white/95 font-display text-sm font-bold text-[#1A1F2B]">
          {data.rank}
        </span>
        {data.rating != null ? (
          <span className="absolute right-3 top-3 rounded-full bg-[rgba(15,20,32,.72)] px-2.5 py-1 font-mono-num text-[12.5px] font-semibold text-white">
            ★ {Number(data.rating).toFixed(1)}
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
          <div className="text-[11.5px] text-[#6B7688]">{data.usp}</div>
        </div>

        {data.tracking_url ? (
          preview ? (
            <div className="mt-auto block rounded-[11px] bg-[#3FA662] px-3.5 py-3 text-center text-white">
              {cta}
            </div>
          ) : (
            <a
              href={`/go/${data.slug}${src ? `?src=${src}` : ""}`}
              target="_blank"
              rel="noopener sponsored nofollow"
              className="mt-auto block rounded-[11px] bg-[#3FA662] px-3.5 py-3 text-center text-white no-underline hover:bg-[#348C53] hover:text-white hover:no-underline"
            >
              {cta}
            </a>
          )
        ) : null}

        <div className="text-[11px] leading-relaxed text-[#7A838F]">
          Reklamlänk | 18+ | {data.terms}
        </div>
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
                <span className="font-bold text-[#C8324A]">−</span>
                {m}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
