"use client";

import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { BookmakerLogo } from "@/components/bets/BookmakerLogo";
import { track } from "@/lib/analytics";
import type { AffiliateTopRow } from "@/lib/bet-stats";
import type { Bet, Bookmaker } from "@/lib/types";

/**
 * De tre spelbolag spelboken har flest spel hos. Har spelboken färre än tre
 * bolag fylls listan på med de högst rankade, så boxen aldrig står halvtom.
 */
function topBookmakers(
  bets: Pick<Bet, "bookmaker_id">[],
  bookmakers: Bookmaker[],
  fallback: AffiliateTopRow[]
): AffiliateTopRow[] {
  const byId = new Map(bookmakers.map((b) => [b.id, b]));
  const counts = new Map<string, number>();
  for (const bet of bets) {
    if (bet.bookmaker_id && byId.has(bet.bookmaker_id)) {
      counts.set(bet.bookmaker_id, (counts.get(bet.bookmaker_id) ?? 0) + 1);
    }
  }

  const played = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || byId.get(a[0])!.rank - byId.get(b[0])!.rank)
    .map(([id]) => byId.get(id)!)
    .map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      logo_url: b.logo_url,
      rank: b.rank,
      rating: b.rating,
      bonus_value: b.bonus_value,
      bonus: b.bonus,
      usp: b.usp,
      terms: b.terms,
    }));

  const ids = new Set(played.map((b) => b.id));
  return [...played, ...fallback.filter((b) => !ids.has(b.id))].slice(0, 3);
}

const NO_BETS: Pick<Bet, "bookmaker_id">[] = [];
const NO_BOOKMAKERS: Bookmaker[] = [];

/** Kompakta, helt klickbara spelbolagsrutor bredvid fördelningen. */
export function SheetAffiliateTop3({
  bets = NO_BETS,
  bookmakers = NO_BOOKMAKERS,
  affiliates,
}: {
  /** Spelbokens spel. Utan dem (t.ex. kupongsidan) visas de rankade bolagen. */
  bets?: Pick<Bet, "bookmaker_id">[];
  bookmakers?: Bookmaker[];
  /** Rankade bolag — fyller på när spelboken har färre än tre bolag. */
  affiliates: AffiliateTopRow[];
}) {
  const top = useMemo(
    () => topBookmakers(bets, bookmakers, affiliates),
    [bets, bookmakers, affiliates]
  );

  return (
    <section className="rounded-[14px] border border-line bg-panel p-[18px]">
      <h2 className="mb-3 font-display text-[15px] font-semibold uppercase tracking-[0.09em]">
        Topp 3 spelbolag
      </h2>

      {!top.length ? (
        <p className="py-6 text-center text-[13px] text-muted">
          Inga spelbolag just nu.
        </p>
      ) : (
        <div className="space-y-2">
          {top.map((bm) => (
            <a
              key={bm.id}
              href={`/go/${bm.slug}?src=spelbok_topp3`}
              target="_blank"
              rel="noopener sponsored nofollow"
              onClick={() => track({ event: "affiliate_click", bookmaker: bm.slug })}
              aria-label={`${bm.name} – till spelbolaget`}
              className="group flex items-center gap-2.5 rounded-[11px] border border-line bg-bg-soft px-[11px] py-[9px] text-text no-underline transition-colors hover:border-line-hover hover:no-underline"
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
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                {bm.bonus_value
                  ? `${bm.bonus_value.toLocaleString("sv-SE")} kr`
                  : bm.bonus || bm.name}
              </span>
              <ChevronRight
                className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-text"
                strokeWidth={2.25}
                aria-hidden
              />
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
