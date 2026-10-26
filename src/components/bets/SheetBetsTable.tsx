"use client";

import { BetRowActions } from "@/components/bets/BetRowActions";
import { BookmakerLogo } from "@/components/bets/BookmakerLogo";
import { LeagueLogo } from "@/components/bets/LeagueLogo";
import { SheetMatchCell } from "@/components/bets/SheetMatchCell";
import { SheetSettleControls } from "@/components/bets/SheetSettleControls";
import { betDisplayDate, betLeagueLogo } from "@/lib/logos";
import { formatPick } from "@/lib/picks";
import type {
  SheetDensity,
  SheetSortDir,
  SheetSortKey,
} from "@/lib/sheet-filters";
import { stockholmYmd } from "@/lib/stockholm";
import type { Bet } from "@/lib/types";
import { track } from "@/lib/analytics";
import { useAmount } from "@/components/DisplayPrefsProvider";
import { useT } from "@/components/TextsProvider";
import type { TextKey } from "@/lib/texts";
import { betNetto, cn, formatOdds, nettoColor } from "@/lib/utils";

type Column = {
  key: SheetSortKey | "actions";
  label: TextKey;
  /** Kolumnbredder i procent — tabellen får aldrig bli bredare än sin ruta. */
  width: string;
  align?: "right";
  /** Åtgärdskolumnen är ikoner, inget att sortera på. */
  sortable?: boolean;
};

/*
  Bredderna är räknade mot den SMALASTE tabellen (sheet-brytpunkten, ~1140px)
  så att inget innehåll behöver brytas till en andra rad där: datumet ska stå
  på en rad, rättningens lås + W/L/P/V ska rymmas, och ikonerna ska rymmas
  bredvid varandra i sin egen kolumn.

  Matchkolumnen bär långa lagnamn och får därför mest plats. Ligakolumnen
  bryter långa namn över högst tre rader och kapar först därefter med "…".
  Insatsen följer SEK/Units precis som Netto och måste rymma "10 000 kr".
*/
const COLUMNS: Column[] = [
  { key: "date", label: "spelbok.table.date", width: "w-[7%]" },
  { key: "match", label: "spelbok.table.match", width: "w-[24%]" },
  { key: "league", label: "spelbok.table.league", width: "w-[11%]" },
  { key: "pick", label: "spelbok.table.pick", width: "w-[9%]" },
  { key: "bookmaker", label: "spelbok.table.bookmaker", width: "w-[7%]" },
  { key: "stake", label: "spelbok.table.stake", width: "w-[8%]", align: "right" },
  { key: "odds", label: "spelbok.table.odds", width: "w-[5%]", align: "right" },
  { key: "result", label: "spelbok.table.result", width: "w-[13%]", align: "right" },
  /* Netto måste rymma "−10 000 kr" på EN rad — annars trillar "kr" ner. */
  { key: "netto", label: "spelbok.table.netto", width: "w-[10%]", align: "right" },
  {
    key: "actions",
    label: "spelbok.table.actions",
    width: "w-[6%]",
    align: "right",
    sortable: false,
  },
];

/** Datum på en rad — tiden visas i matchcellens statusfält. */
function DateCell({ iso }: { iso: string }) {
  const date = new Date(iso);
  return (
    <div className="whitespace-nowrap font-mono-num text-[14px] text-[#C3CBDB]">
      {Number.isNaN(date.getTime()) ? "" : stockholmYmd(date)}
    </div>
  );
}

export function LeagueCell({ bet }: { bet: Bet }) {
  if (!bet.league) return <span className="text-faint">—</span>;
  return (
    <span className="flex min-w-0 items-center gap-2.5" title={bet.league}>
      <span className="inline-flex size-[28px] shrink-0 items-center justify-center rounded-[8px] bg-[rgba(230,234,242,0.07)] p-[3px]">
        <LeagueLogo
          src={betLeagueLogo(bet)}
          leagueId={bet.league_id ?? bet.fixtures?.league_id}
          sport={bet.sport ?? bet.fixtures?.sport}
          name={bet.league}
          size={22}
        />
      </span>
      <span className="line-clamp-3 min-w-0 break-words text-[14px] leading-snug">
        {bet.league}
      </span>
    </span>
  );
}

/**
 * Spelbolagets logotyp, textchip när logga saknas.
 *
 * Tabellen: ingen färgplatta (vit/ljus ruta stör i mörk tabell).
 * Kortet: varumärkesfärgad platta 62×28.
 */
export function BookmakerPlate({
  bet,
  width = 68,
  height = 32,
  branded = false,
}: {
  bet: Bet;
  width?: number;
  height?: number;
  /** Varumärkesfärg bakom loggan — kortvyn. */
  branded?: boolean;
}) {
  const name = bet.bookmakers?.name || "";
  if (!bet.bookmakers?.logo_url) {
    return (
      <BookmakerLink bet={bet}>
        <span
          title={name || undefined}
          className="inline-block max-w-full truncate rounded-[6px] bg-panel-2 px-2.5 py-1.5 text-[11.5px] text-[#8A94AB]"
        >
          {name || "—"}
        </span>
      </BookmakerLink>
    );
  }
  const brand = bet.bookmakers.brand_color?.trim() || "#26272e";
  return (
    <BookmakerLink bet={bet}>
      <span
        title={name}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-[7px]",
          branded && "overflow-hidden"
        )}
        style={{
          width,
          height,
          ...(branded ? { backgroundColor: brand } : {}),
        }}
      >
        <BookmakerLogo
          logoPath={bet.bookmakers.logo_url}
          name={name}
          size={Math.round(height * 0.62)}
          maxWidth={Math.round(width * 0.78)}
          className="object-center"
        />
      </span>
    </BookmakerLink>
  );
}

/** Loggan går via /go/[slug] (klickloggning + redirect) när bolaget har en tracking-URL. */
function BookmakerLink({
  bet,
  children,
}: {
  bet: Bet;
  children: React.ReactNode;
}) {
  const slug = bet.bookmakers?.slug;
  if (!slug || !bet.bookmakers?.tracking_url) return <>{children}</>;
  return (
    <a
      href={`/go/${slug}?src=spelbok_rad`}
      target="_blank"
      rel="noopener sponsored nofollow"
      onClick={() => track({ event: "affiliate_click", bookmaker: slug })}
      className="inline-flex rounded-[7px] transition-opacity hover:opacity-80"
    >
      {children}
    </a>
  );
}

export function SheetBetsTable({
  bets,
  canEdit,
  canRygga,
  onRygga,
  onRemove,
  density,
  sortKey,
  sortDir,
  onSort,
  highlightBetId,
}: {
  bets: Bet[];
  canEdit: boolean;
  canRygga: boolean;
  onRygga?: (bet: Bet) => void;
  onRemove?: (bet: Bet) => void;
  density: SheetDensity;
  sortKey: SheetSortKey;
  sortDir: SheetSortDir;
  onSort: (key: SheetSortKey) => void;
  /** Raden en notis pekade ut. Pulsar i två sekunder, sedan null. */
  highlightBetId?: string | null;
}) {
  const t = useT();
  const amount = useAmount();

  return (
    <div className="overflow-x-hidden rounded-[12px] border border-line bg-panel">
      <table className="w-full table-fixed border-collapse text-[15px]">
        <colgroup>
          {COLUMNS.map((col) => (
            <col key={col.key} className={col.width} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "sticky top-0 z-10 border-b border-line bg-bg-soft px-3.5 py-2.5 text-[11.5px] font-semibold uppercase tracking-[0.11em] text-muted",
                  col.align === "right" ? "text-right" : "text-left"
                )}
              >
                {col.sortable === false || col.key === "actions" ? (
                  <span className="sr-only">{t(col.label)}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSort(col.key as SheetSortKey)}
                    className="inline-flex cursor-pointer items-center gap-1 uppercase tracking-[0.11em] transition hover:text-text"
                  >
                    {t(col.label)}
                    {sortKey === col.key ? (
                      <span aria-hidden className="text-[9px] text-win">
                        {sortDir === "asc" ? "▲" : "▼"}
                      </span>
                    ) : null}
                  </button>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bets.map((bet) => {
            const netto = betNetto(bet);
            return (
              <tr
                key={bet.id}
                className={cn(
                  "group/row border-b border-rowline transition-colors even:bg-row-alt hover:bg-[#1f1f22]",
                  bet.id === highlightBetId && "animate-sbrowpulse"
                )}
              >
                <td className="px-3.5 py-3 align-middle">
                  <DateCell iso={betDisplayDate(bet)} />
                </td>
                <td className="px-3.5 py-3 align-middle">
                  <SheetMatchCell bet={bet} density={density} />
                </td>
                <td className="px-3.5 py-3 align-middle">
                  <LeagueCell bet={bet} />
                </td>
                <td className="px-3.5 py-3 align-middle font-bold">
                  <span className="block min-w-0">{formatPick(bet.pick)}</span>
                </td>
                <td className="px-3.5 py-3 align-middle">
                  <BookmakerPlate bet={bet} />
                </td>
                <td className="whitespace-nowrap px-3.5 py-3 text-right align-middle font-mono-num">
                  {amount(Number(bet.stake), { sign: false })}
                </td>
                <td className="px-3.5 py-3 text-right align-middle font-mono-num font-semibold">
                  {formatOdds(Number(bet.odds))}
                </td>
                <td className="px-3.5 py-3 text-right align-middle">
                  <span className="inline-flex justify-end">
                    <SheetSettleControls bet={bet} canEdit={canEdit} />
                  </span>
                </td>
                <td
                  className={cn(
                    "whitespace-nowrap px-3.5 py-3 text-right align-middle font-mono-num font-semibold",
                    bet.result === "open" ? "text-muted" : nettoColor(netto)
                  )}
                >
                  {bet.result === "open" ? "—" : amount(netto)}
                </td>
                <td className="px-2.5 py-3 align-middle">
                  <BetRowActions
                    bet={bet}
                    canEdit={canEdit}
                    canRygga={canRygga}
                    size="sm"
                    onRygga={onRygga ? () => onRygga(bet) : undefined}
                    onRemove={onRemove ? () => onRemove(bet) : undefined}
                  />
                </td>
              </tr>
            );
          })}
          {!bets.length ? (
            <tr>
              <td colSpan={COLUMNS.length} className="px-4 py-12 text-center text-muted">
                {t("spelbok.table.empty")}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
