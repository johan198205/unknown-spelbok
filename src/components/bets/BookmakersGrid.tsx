"use client";

import { useMemo, useState } from "react";
import type { Bookmaker } from "@/lib/types";

export function BookmakersGrid({ bookmakers }: { bookmakers: Bookmaker[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState("Alla");

  const pills = ["Alla", "Snabba uttag", "Bonus"];

  const filtered = useMemo(() => {
    if (filter === "Snabba uttag") {
      return bookmakers.filter((b) => b.fast_payout);
    }
    if (filter === "Bonus") {
      return bookmakers.filter((b) => (b.bonus_value || 0) > 0);
    }
    return bookmakers;
  }, [bookmakers, filter]);

  if (!bookmakers.length) {
    return (
      <div className="rounded-[12px] border border-line bg-panel px-6 py-12 text-center text-muted">
        Inga spelbolag ännu. Kör{" "}
        <code className="font-mono-num text-cyan">npm run import:bookmakers</code>{" "}
        efter att du satt miljövariablerna.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {pills.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setFilter(p)}
            className={`rounded-full border px-4 py-2.5 text-sm font-semibold ${
              filter === p
                ? "border-win bg-win/10 text-win"
                : "border-line bg-panel text-muted"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((b) => {
          const open = openId === b.id;
          return (
            <div
              key={b.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-card-light shadow-[0_10px_30px_rgba(0,0,0,.25)] transition hover:-translate-y-1"
            >
              <div
                className="relative flex h-[120px] items-center justify-center"
                style={{ backgroundColor: "#1B2436" }}
              >
                {b.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={b.logo_url}
                    alt={b.name}
                    className="max-h-10 max-w-[70%] object-contain"
                  />
                ) : (
                  <span className="font-display text-2xl font-bold text-white">
                    {b.name}
                  </span>
                )}
                <span className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg bg-white/95 font-display text-sm font-bold text-[#1A1F2B]">
                  {b.rank}
                </span>
                {b.rating != null ? (
                  <span className="absolute right-3 top-3 rounded-full bg-[rgba(15,20,32,.72)] px-2.5 py-1 font-mono-num text-[12.5px] font-semibold text-white">
                    ★ {Number(b.rating).toFixed(1)}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-1 flex-col gap-3 px-4 pb-0 pt-4 text-center">
                <div>
                  <div className="text-[10.5px] font-bold tracking-[0.14em] text-[#6B7688]">
                    BONUS
                  </div>
                  <div className="font-display text-[26px] font-semibold leading-tight text-[#12171F]">
                    {b.bonus_value
                      ? `${b.bonus_value.toLocaleString("sv-SE")} kr`
                      : b.bonus || "—"}
                  </div>
                  <div className="text-[11.5px] text-[#6B7688]">{b.usp}</div>
                </div>

                {b.tracking_url ? (
                  <a
                    href={b.tracking_url}
                    target="_blank"
                    rel="noopener sponsored nofollow"
                    className="mt-auto block rounded-[11px] bg-[#3FA662] px-3.5 py-3 text-center text-white no-underline hover:bg-[#348C53]"
                  >
                    <span className="font-display block text-[17px] font-semibold tracking-[0.06em]">
                      TILL {b.name.toUpperCase()}
                    </span>
                    <span className="mt-0.5 block text-[12.5px] opacity-90">
                      Vidare till {b.name}
                    </span>
                  </a>
                ) : null}

                <div className="text-[11px] leading-relaxed text-[#7A838F]">
                  Reklamlänk | 18+ | {b.terms}
                </div>
              </div>

              <div className="mt-3.5 rounded-b-[15px] border-t border-black/10 bg-[#ECEFF4] p-3 text-center">
                <div className="text-[12.5px] text-[#5B6472]">{b.name}</div>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : b.id)}
                  className="cursor-pointer border-0 bg-transparent text-[13.5px] font-bold text-[#12171F]"
                >
                  {open ? "Dölj recension" : "Läs mer"}
                </button>
                {open ? (
                  <div className="mt-2.5 animate-sbfade text-left">
                    <p className="mb-2.5 text-[13px] leading-relaxed text-[#333A45]">
                      {b.review}
                    </p>
                    {(b.plus || []).map((p) => (
                      <div
                        key={p}
                        className="flex gap-2 py-0.5 text-[12.5px] text-[#333A45]"
                      >
                        <span className="font-bold text-[#1E8E4E]">+</span>
                        {p}
                      </div>
                    ))}
                    {(b.minus || []).map((m) => (
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
        })}
      </div>
    </div>
  );
}
