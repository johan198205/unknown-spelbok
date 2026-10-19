"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookmakerCard } from "@/components/bets/BookmakerCard";
import { useT } from "@/components/TextsProvider";
import {
  BOOK_FILTER_LABEL,
  BOOK_SORT_LABEL,
  availableBookFilters,
  bookmakerMatchesFilter,
  type BookSortOption,
} from "@/lib/bookmakers";
import { saveBookmakerHero } from "@/lib/admin/bookmakers";
import type { Bookmaker } from "@/lib/types";
import { cn } from "@/lib/utils";

const SORT_OPTIONS: BookSortOption[] = ["Vårt betyg", "Högst bonus"];

export function BookmakersGrid({
  bookmakers,
  editorMode = false,
}: {
  bookmakers: Bookmaker[];
  editorMode?: boolean;
}) {
  const t = useT();
  const [items, setItems] = useState(bookmakers);
  // Inget filter och ingen sortering från start: listan visas i den
  // ordning redaktionen satt (rank) tills besökaren själv väljer något.
  const [filter, setFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<BookSortOption | null>(null);
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

  const activeFilter =
    filter && pills.includes(filter as (typeof pills)[number]) ? filter : null;

  const filtered = useMemo(() => {
    let list = activeFilter
      ? items.filter((b) => bookmakerMatchesFilter(b, activeFilter))
      : items.slice();

    list = list.slice().sort((a, b) => {
      if (sortBy === "Högst bonus") {
        return (b.bonus_value ?? 0) - (a.bonus_value ?? 0) || a.rank - b.rank;
      }
      if (sortBy === "Vårt betyg") {
        return (b.rating ?? 0) - (a.rating ?? 0) || a.rank - b.rank;
      }
      return a.rank - b.rank;
    });
    return list;
  }, [items, activeFilter, sortBy]);

  if (!bookmakers.length) {
    return (
      <div className="rounded-[12px] border border-line bg-panel px-6 py-12 text-center text-muted">
        {t("spelbolag.list.emptyBefore")}{" "}
        <code className="font-mono-num text-cyan">npm run import:bookmakers</code>{" "}
        {t("spelbolag.list.emptyAfter")}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2.5">
        {/* Mobil kör bara rullgardinen till höger. Ett klick på en aktiv
            knapp släpper filtret igen. */}
        <div className="hidden min-w-0 flex-1 flex-wrap gap-2 lg:flex">
          {pills.map((p) => {
            const on = activeFilter === p;
            return (
              <button
                key={p}
                type="button"
                aria-pressed={on}
                onClick={() => setFilter(on ? null : p)}
                className={cn(
                  "rounded-full border px-4 py-2.5 text-sm font-semibold transition",
                  on
                    ? "border-[rgba(102,227,138,.45)] bg-[rgba(102,227,138,.14)] text-[#66E38A]"
                    : "border-[#2a2a2e] bg-[#161618] text-[#C3CBDB] hover:border-[#46464d]"
                )}
              >
                {t(BOOK_FILTER_LABEL[p])}
              </button>
            );
          })}
        </div>

        <div ref={sortRef} className="relative ml-auto">
          <button
            type="button"
            onClick={() => setSortOpen((v) => !v)}
            className="inline-flex items-center gap-2.5 rounded-full border border-[#2a2a2e] bg-[#161618] px-4 py-2.5 text-sm font-semibold text-[#E6EAF2]"
          >
            <span>
              {sortBy
                ? t("spelbolag.sort.active", { sort: t(BOOK_SORT_LABEL[sortBy]) })
                : t("spelbolag.sort.button")}
            </span>
            <span className="text-[11px] text-[#5D6883]">▾</span>
          </button>
          {sortOpen ? (
            <div className="absolute right-0 top-full z-20 mt-2 min-w-[190px] rounded-[11px] border border-[#333338] bg-[#1a1a1d] p-1.5 shadow-[0_18px_50px_rgba(0,0,0,.6)]">
              {SORT_OPTIONS.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => {
                    // Samma val igen = tillbaka till standardordningen.
                    setSortBy(o === sortBy ? null : o);
                    setSortOpen(false);
                  }}
                  className={cn(
                    "w-full rounded-[7px] border-0 px-2.5 py-[9px] text-left text-[13.5px]",
                    o === sortBy
                      ? "bg-[#26262a] text-[#E6EAF2]"
                      : "bg-transparent text-[#C3CBDB] hover:bg-[#26262a]"
                  )}
                >
                  {t(BOOK_SORT_LABEL[o])}
                  {o === sortBy ? (
                    <span className="float-right text-[#5D6883]" aria-hidden>
                      ✕
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>


      <div className="grid grid-cols-2 items-stretch gap-2.5 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((b) => (
          <BookmakerCard
            key={b.id}
            data={b}
            compactOnMobile
            src="spelbolag"
            editorMode={editorMode}
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
