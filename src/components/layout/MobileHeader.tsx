import Link from "next/link";
import { formatMoney, initialOf, nettoColor } from "@/lib/utils";

export function MobileHeader({
  username,
  netto,
}: {
  username?: string | null;
  netto: number;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-line-soft bg-[rgba(15,20,32,.92)] px-4 py-3 backdrop-blur-[10px] lg:hidden">
      <div className="flex items-center gap-3">
        <Link
          href="/hem"
          className="font-display text-[17px] font-bold tracking-[0.14em] text-text no-underline"
        >
          SPELBOK
        </Link>
        <div className="ml-auto flex items-center gap-2.5">
          <span
            className={`font-mono-num text-[13px] font-semibold ${nettoColor(netto)}`}
          >
            {formatMoney(netto)}
          </span>
          {username ? (
            <Link
              href="/installningar"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-line-strong bg-panel-2 font-display text-sm font-semibold text-text no-underline"
              aria-label="Profil"
            >
              {initialOf(username)}
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
