"use client";

import { cn } from "@/lib/utils";

/** Sidnummer runt den aktiva sidan, med ellips när listan är lång. */
function pageItems(page: number, pageCount: number): Array<number | "…"> {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  const items: Array<number | "…"> = [1];
  const from = Math.max(2, page - 1);
  const to = Math.min(pageCount - 1, page + 1);
  if (from > 2) items.push("…");
  for (let i = from; i <= to; i++) items.push(i);
  if (to < pageCount - 1) items.push("…");
  items.push(pageCount);
  return items;
}

export function SheetPagination({
  page,
  pageCount,
  onPage,
}: {
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  const base =
    "cursor-pointer rounded-[8px] border border-line bg-panel px-3 py-2 font-mono-num text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <nav
      aria-label="Sidor"
      className="flex flex-wrap items-center justify-center gap-1.5"
    >
      <button
        type="button"
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        className={cn(base, "text-muted hover:text-text")}
      >
        Föregående
      </button>
      {pageItems(page, pageCount).map((item, i) =>
        item === "…" ? (
          <span
            key={`gap-${i}`}
            className="px-1 font-mono-num text-[13px] text-faint"
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPage(item)}
            aria-current={item === page ? "page" : undefined}
            className={cn(
              base,
              item === page
                ? "border-[var(--win-border)] bg-[var(--win-fill)] text-win"
                : "text-muted hover:text-text"
            )}
          >
            {item}
          </button>
        )
      )}
      <button
        type="button"
        onClick={() => onPage(page + 1)}
        disabled={page >= pageCount}
        className={cn(base, "text-muted hover:text-text")}
      >
        Nästa
      </button>
    </nav>
  );
}
