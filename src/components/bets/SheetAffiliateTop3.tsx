"use client";

import Link from "next/link";
import { BookmakerLogo } from "@/components/bets/BookmakerLogo";
import { track } from "@/lib/analytics";
import { wageringLabel, type AffiliateTopRow } from "@/lib/bet-stats";

/** Kompakta reklamrader bredvid fördelningen — inte tre stora kort. */
export function SheetAffiliateTop3({
  affiliates,
}: {
  affiliates: AffiliateTopRow[];
}) {
  return (
    <section className="rounded-[14px] border border-line bg-panel p-[18px]">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-[15px] font-semibold uppercase tracking-[0.09em]">
          Topp 3 spelbolag
        </h2>
        <Link
          href="/spelbolag"
          className="shrink-0 text-[13px] font-semibold text-cyan no-underline hover:underline"
        >
          Hela listan
        </Link>
      </div>
      <p className="mb-3 mt-1 text-[11px] text-faint">Reklamlänkar · 18+</p>

      {!affiliates.length ? (
        <p className="py-6 text-center text-[13px] text-muted">
          Inga spelbolag just nu.
        </p>
      ) : (
        <div className="space-y-2">
          {affiliates.map((bm) => (
            <a
              key={bm.id}
              href={`/go/${bm.slug}?src=spelbok_topp3`}
              target="_blank"
              rel="noopener sponsored nofollow"
              onClick={() => track({ event: "affiliate_click", bookmaker: bm.slug })}
              className="flex items-center gap-2.5 rounded-[11px] border border-line bg-bg-soft px-[11px] py-[9px] text-text no-underline transition-colors hover:border-line-hover hover:no-underline"
            >
              <span
                className="inline-flex h-[26px] w-[44px] shrink-0 items-center justify-center"
                title={bm.name}
              >
                {bm.logo_url ? (
                  <BookmakerLogo
                    logoPath={bm.logo_url}
                    name={bm.name}
                    size={16}
                    maxWidth={36}
                  />
                ) : (
                  <span className="font-mono-num text-[11px] font-bold text-text-soft">
                    {bm.name.slice(0, 3).toUpperCase()}
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold">
                  {bm.bonus_value
                    ? `${bm.bonus_value.toLocaleString("sv-SE")} kr`
                    : bm.bonus || bm.name}
                </span>
                <span className="block truncate text-[11px] text-faint">
                  {wageringLabel(bm)}
                </span>
              </span>
              {bm.rating != null ? (
                <span className="shrink-0 font-mono-num text-[12px] font-semibold text-[#FFD166]">
                  ★{" "}
                  {Number(bm.rating).toLocaleString("sv-SE", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}
                </span>
              ) : null}
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
