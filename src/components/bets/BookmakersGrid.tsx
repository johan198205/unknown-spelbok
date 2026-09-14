"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookmakerCard } from "@/components/bets/BookmakerCard";
import {
  availableBookFilters,
  bookmakerMatchesFilter,
  type BookSortOption,
} from "@/lib/bookmakers";
import { saveBookmakerHero } from "@/lib/admin/bookmakers";
import type { Bookmaker } from "@/lib/types";
import { cn } from "@/lib/utils";

const SORT_OPTIONS: BookSortOption[] = ["Vårt betyg", "Högst bonus", "A–Ö"];

const STODLINJEN = "https://stodlinjen.se";
const SPELPAUS = "https://spelpaus.se";

export function BookmakersGrid({
  bookmakers,
  editorMode = false,
}: {
  bookmakers: Bookmaker[];
  editorMode?: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [items, setItems] = useState(bookmakers);
  const [filter, setFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<BookSortOption>("Vårt betyg");
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems(bookmakers);
  }, [bookmakers]);

  useEffect(() => {
    if (!sortOpen) return;
    function onDoc(e: MouseEvent) {
      if (!sortRef.current?.contains(e.target as Node)) setSortOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [sortOpen]);

  const pills = useMemo(() => availableBookFilters(items), [items]);

  useEffect(() => {
    if (filter && !pills.includes(filter as (typeof pills)[number])) {
      setFilter(pills[0] ?? null);
    } else if (!filter && pills.length) {
      setFilter(pills[0]);
    }
  }, [pills, filter]);

  const filtered = useMemo(() => {
    const active = filter ?? pills[0];
    let list = active
      ? items.filter((b) => bookmakerMatchesFilter(b, active))
      : items.slice();

    list = list.slice().sort((a, b) => {
      if (sortBy === "Högst bonus") {
        return (b.bonus_value ?? 0) - (a.bonus_value ?? 0);
      }
      if (sortBy === "A–Ö") {
        return a.name.localeCompare(b.name, "sv");
      }
      return (b.rating ?? 0) - (a.rating ?? 0);
    });
    return list;
  }, [items, filter, sortBy, pills]);

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
      <div className="mb-2 flex flex-wrap items-center gap-2.5">
        <div className="flex min-w-0 flex-1 flex-wrap gap-2">
          {pills.map((p) => {
            const on = filter === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setFilter(p)}
                className={cn(
                  "rounded-full border px-4 py-2.5 text-sm font-semibold transition",
                  on
                    ? "border-[rgba(102,227,138,.45)] bg-[rgba(102,227,138,.14)] text-[#66E38A]"
                    : "border-[#232B3E] bg-[#131826] text-[#C3CBDB] hover:border-[#3A4560]"
                )}
              >
                {p}
              </button>
            );
          })}
        </div>

        <div ref={sortRef} className="relative">
          <button
            type="button"
            onClick={() => setSortOpen((v) => !v)}
            className="inline-flex items-center gap-2.5 rounded-full border border-[#232B3E] bg-[#131826] px-4 py-2.5 text-sm font-semibold text-[#E6EAF2]"
          >
            <span>Filter: {sortBy}</span>
            <span className="text-[11px] text-[#5D6883]">▾</span>
          </button>
          {sortOpen ? (
            <div className="absolute right-0 top-full z-20 mt-2 min-w-[190px] rounded-[11px] border border-[#2A3346] bg-[#171D2E] p-1.5 shadow-[0_18px_50px_rgba(0,0,0,.6)]">
              {SORT_OPTIONS.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => {
                    setSortBy(o);
                    setSortOpen(false);
                  }}
                  className={cn(
                    "w-full rounded-[7px] border-0 px-2.5 py-[9px] text-left text-[13.5px]",
                    o === sortBy
                      ? "bg-[#1F293C] text-[#E6EAF2]"
                      : "bg-transparent text-[#C3CBDB] hover:bg-[#1F293C]"
                  )}
                >
                  {o}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mb-5 text-[12.5px] text-[#5D6883]">
        Innehåller reklamlänkar · 18+ · Spela ansvarsfullt ·{" "}
        <a
          href={STODLINJEN}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[#2C6FD6] no-underline hover:underline"
        >
          Stödlinjen
        </a>{" "}
        ·{" "}
        <a
          href={SPELPAUS}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[#2C6FD6] no-underline hover:underline"
        >
          Spelpaus
        </a>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((b) => (
          <BookmakerCard
            key={b.id}
            data={b}
            src="spelbolag"
            editorMode={editorMode}
            open={openId === b.id}
            onToggleReview={() => setOpenId(openId === b.id ? null : b.id)}
            onHeroUploaded={(url, filename) => {
              setItems((prev) =>
                prev.map((row) =>
                  row.id === b.id
                    ? {
                        ...row,
                        hero_url: url,
                        hero_filename: filename,
                        hero_uploaded_at: new Date().toISOString(),
                      }
                    : row
                )
              );
              void saveBookmakerHero({
                id: b.id,
                hero_url: url,
                hero_filename: filename,
              });
            }}
          />
        ))}
      </div>
    </div>
  );
}
