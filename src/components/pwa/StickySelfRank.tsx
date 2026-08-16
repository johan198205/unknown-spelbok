"use client";

import { formatMoney, initialOf, nettoColor } from "@/lib/utils";

export function StickySelfRank({
  rank,
  name,
  netto,
}: {
  rank: number;
  name: string;
  netto: number;
}) {
  return (
    <div className="fixed inset-x-0 bottom-[96px] z-40 border-t border-win/30 bg-[rgba(15,20,32,.96)] px-4 py-2.5 backdrop-blur-md lg:hidden">
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <span className="font-display w-6 font-semibold text-win">{rank}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-win/40 bg-win/10 font-display text-sm font-semibold text-win">
          {initialOf(name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">Du: plats {rank}</div>
        </div>
        <span className={`font-mono-num text-sm font-semibold ${nettoColor(netto)}`}>
          {formatMoney(netto)}
        </span>
      </div>
    </div>
  );
}
