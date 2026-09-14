"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { NewSheetForm } from "@/components/bets/NewSheetForm";
import type { Sheet } from "@/lib/types";

/**
 * Spelboksflikar i layouten så de sitter kvar medan sidans innehåll laddar.
 * Aktiv flik läses från ?sheet= (eller första boken). Optimistic highlight
 * så klicket syns innan servern svarat.
 */
export function SpelbokSheetTabs({
  sheets,
  fallbackSheetId,
}: {
  sheets: Sheet[];
  /** När ?sheet= saknas — samma fallback som sidan (första boken). */
  fallbackSheetId: string | null;
}) {
  const searchParams = useSearchParams();
  const sheetParam = searchParams.get("sheet");
  const urlActive = sheetParam ?? fallbackSheetId ?? sheets[0]?.id ?? null;
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    setPicked(null);
  }, [urlActive]);

  const activeId = picked ?? urlActive;

  return (
    <div className="mb-[18px] flex flex-wrap items-center gap-2 sb-scroll">
      {sheets.map((s) => (
        <Link
          key={s.id}
          href={`/spelbok?sheet=${s.id}`}
          prefetch
          onClick={() => setPicked(s.id)}
          className={`shrink-0 rounded-[9px] border px-3.5 py-2 text-sm font-semibold no-underline ${
            activeId === s.id
              ? "border-win bg-win/10 text-win"
              : "border-line bg-panel text-muted hover:text-text"
          }`}
        >
          {s.name}
        </Link>
      ))}
      <NewSheetForm buttonLabel="+ Ny" />
    </div>
  );
}
