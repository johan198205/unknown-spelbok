"use client";

import { useMemo, useState } from "react";
import { BookmakerCard } from "@/components/bets/BookmakerCard";
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
        {filtered.map((b) => (
          <BookmakerCard
            key={b.id}
            data={b}
            src="spelbolag"
            open={openId === b.id}
            onToggleReview={() => setOpenId(openId === b.id ? null : b.id)}
          />
        ))}
      </div>
    </div>
  );
}
