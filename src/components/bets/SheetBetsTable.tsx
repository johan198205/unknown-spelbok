"use client";

import { BetRowActions } from "@/components/bets/BetRowActions";
import { BookmakerLogo } from "@/components/bets/BookmakerLogo";
import { LeagueLogo } from "@/components/bets/LeagueLogo";
import { SheetMatchCell } from "@/components/bets/SheetMatchCell";
import { SheetSettleControls } from "@/components/bets/SheetSettleControls";
import { betLeagueLogo } from "@/lib/logos";
import { formatPick } from "@/lib/picks";
import type {
  SheetDensity,
  SheetSortDir,
  SheetSortKey,
} from "@/lib/sheet-filters";
import type { Bet } from "@/lib/types";
import { betNetto, cn, formatMoney, formatOdds, nettoColor } from "@/lib/utils";

type Column = {
  key: SheetSortKey;
  label: string;
  /** Kolumnbredder i procent — tabellen får aldrig bli bredare än sin ruta. */
  width: string;
  align?: "right";
};

const COLUMNS: Column[] = [
  { key: "date", label: "Datum", width: "w-[7%]" },
  { key: "league", label: "Liga", width: "w-[13%] max-sheet-wide:w-[6%]" },
  { key: "match", label: "Match", width: "w-[20%] max-sheet-wide:w-[27%]" },
  { key: "pick", label: "Spel", width: "w-[13%]" },
  { key: "bookmaker", label: "Bolag", width: "w-[8%]" },
  { key: "stake", label: "Insats", width: "w-[7%]", align: "right" },
  { key: "odds", label: "Odds", width: "w-[5%]", align: "right" },
  { key: "result", label: "Rättning", width: "w-[15%]" },
  /* Netto måste rymma "−10 000 kr" på EN rad — annars trillar "kr" ner. */
  { key: "netto", label: "Netto", width: "w-[12%]", align: "right" },
];

/** Datum på egen rad, tiden dämpad under. */
function DateCell({ iso }: { iso: string }) {
  const date = new Date(iso);
  return (
    <>
      <div className="font-mono-num text-[14px] text-text-soft">
        {date.toLocaleDateString("sv-SE")}
      </div>
      <div className="font-mono-num text-[12.5px] text-faint">
        {date.toLocaleTimeString("sv-SE", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
    </>
  );
}

export function LeagueCell({ bet }: { bet: Bet }) {
  if (!bet.league) return <span className="text-faint">—</span>;
  return (
    <span className="flex min-w-0 items-center gap-2" title={bet.league}>
      <span className="inline-flex size-[28px] shrink-0 items-center justify-center rounded-[8px] bg-[rgba(230,234,242,0.07)] p-[3px]">
        <LeagueLogo
          src={betLeagueLogo(bet)}
          leagueId={bet.league_id ?? bet.fixtures?.league_id}
          sport={bet.sport ?? bet.fixtures?.sport}
          name={bet.league}
          size={22}
        />
      </span>
      <span className="min-w-0 truncate text-[15px] max-sheet-wide:hidden">
        {bet.league}
      </span>
    </span>
  );
}

/**
 * Spelbolagets logotyp, textchip när logga saknas.
 *
 * Ingen platta bakom loggan — den ljusa rutan blev en vit fyrkant i en mörk
 * tabell. Rutans mått finns kvar så kolumnen håller samma linje oavsett hur
 * bred wordmarken är.
 */
export function BookmakerPlate({
  bet,
  width = 68,
  height = 32,
}: {
  bet: Bet;
  width?: number;
  height?: number;
}) {
  const name = bet.bookmakers?.name || "";
  if (!bet.bookmakers?.logo_url) {
    return (
      <span
        title={name || undefined}
        className="inline-block max-w-full truncate rounded-[7px] bg-panel-2 px-2 py-1 text-[12.5px] text-muted"
      >
        {name || "—"}
      </span>
    );
  }
  return (
    <span
      title={name}
      className="inline-flex shrink-0 items-center justify-center"
      style={{ width, height }}
    >
      <BookmakerLogo
        logoPath={bet.bookmakers.logo_url}
        name={name}
        size={Math.round(height * 0.62)}
        maxWidth={Math.round(width * 0.78)}
        className="object-center"
      />
    </span>
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
}) {
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
                  "sticky top-0 z-10 border-b border-line bg-bg-soft px-2.5 py-2.5 text-[11.5px] font-semibold uppercase tracking-[0.11em] text-muted",
                  col.align === "right" ? "text-right" : "text-left"
                )}
              >
                <button
                  type="button"
                  onClick={() => onSort(col.key)}
                  className="inline-flex cursor-pointer items-center gap-1 uppercase tracking-[0.11em] transition hover:text-text"
                >
                  {col.label}
                  {sortKey === col.key ? (
                    <span aria-hidden className="text-[9px] text-win">
                      {sortDir === "asc" ? "▲" : "▼"}
                    </span>
                  ) : null}
                </button>
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
                className="group/row border-b border-rowline transition-colors even:bg-row-alt hover:bg-[#1A2233]"
              >
                <td className="px-2.5 py-3 align-middle">
                  <DateCell iso={bet.placed_at} />
                </td>
                <td className="px-2.5 py-3 align-middle">
                  <LeagueCell bet={bet} />
                </td>
                <td className="px-2.5 py-3 align-middle">
                  <SheetMatchCell bet={bet} density={density} />
                </td>
                <td className="px-2.5 py-3 align-middle font-bold">
                  {formatPick(bet.pick)}
                </td>
                <td className="px-2.5 py-3 align-middle">
                  <BookmakerPlate bet={bet} />
                </td>
                <td className="px-2.5 py-3 text-right align-middle font-mono-num">
                  {Number(bet.stake).toLocaleString("sv-SE")}
                </td>
                <td className="px-2.5 py-3 text-right align-middle font-mono-num font-semibold">
                  {formatOdds(Number(bet.odds))}
                </td>
                <td className="px-2.5 py-3 align-middle">
                  <div className="flex flex-col items-start gap-1.5">
                    <SheetSettleControls bet={bet} canEdit={canEdit} />
                    <BetRowActions
                      bet={bet}
                      canEdit={canEdit}
                      canRygga={canRygga}
                      onRygga={onRygga ? () => onRygga(bet) : undefined}
                      onRemove={onRemove ? () => onRemove(bet) : undefined}
                    />
                  </div>
                </td>
                <td
                  className={cn(
                    "whitespace-nowrap px-2.5 py-3 text-right align-middle font-mono-num font-semibold",
                    bet.result === "open" ? "text-muted" : nettoColor(netto)
                  )}
                >
                  {bet.result === "open" ? "—" : formatMoney(netto)}
                </td>
              </tr>
            );
          })}
          {!bets.length ? (
            <tr>
              <td colSpan={COLUMNS.length} className="px-4 py-12 text-center text-muted">
                Inga spel i urvalet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
