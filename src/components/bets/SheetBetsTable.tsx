"use client";

import { BetRowActions } from "@/components/bets/BetRowActions";
import { BookmakerLogo } from "@/components/bets/BookmakerLogo";
import { LeagueLogo } from "@/components/bets/LeagueLogo";
import { LoggedBeforeKickoffIcon } from "@/components/bets/LoggedBeforeKickoff";
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
import { useAmount } from "@/components/DisplayPrefsProvider";
import { betNetto, cn, formatOdds, nettoColor } from "@/lib/utils";

type Column = {
  key: SheetSortKey | "actions";
  label: string;
  /** Kolumnbredder i procent — tabellen får aldrig bli bredare än sin ruta. */
  width: string;
  align?: "right";
  /** Åtgärdskolumnen är ikoner, inget att sortera på. */
  sortable?: boolean;
};

/*
  Bredderna är räknade mot den SMALASTE tabellen (sheet-brytpunkten, ~1140px)
  så att inget innehåll behöver brytas till en andra rad där: datumet ska stå
  på en rad, rättningens W/L/P/V ska ligga i linje med ⚡, och ikonerna ska
  rymmas bredvid varandra i sin egen kolumn.
*/
const COLUMNS: Column[] = [
  { key: "date", label: "Datum", width: "w-[10%]" },
  { key: "league", label: "Liga", width: "w-[10%] max-sheet-wide:w-[5%]" },
  { key: "match", label: "Match", width: "w-[14%] max-sheet-wide:w-[19%]" },
  { key: "pick", label: "Spel", width: "w-[12%]" },
  { key: "bookmaker", label: "Bolag", width: "w-[8%]" },
  { key: "stake", label: "Insats", width: "w-[7%]", align: "right" },
  { key: "odds", label: "Odds", width: "w-[5%]", align: "right" },
  { key: "result", label: "Rättning", width: "w-[14%]" },
  /* Netto måste rymma "−10 000 kr" på EN rad — annars trillar "kr" ner. */
  { key: "netto", label: "Netto", width: "w-[10%]", align: "right" },
  {
    key: "actions",
    label: "Åtgärder",
    width: "w-[10%]",
    align: "right",
    sortable: false,
  },
];

/** Datum på egen rad, tiden dämpad under. Datumet bryts aldrig mitt itu. */
function DateCell({ iso }: { iso: string }) {
  const date = new Date(iso);
  return (
    <>
      <div className="whitespace-nowrap font-mono-num text-[14px] text-text-soft">
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
                  "sticky top-0 z-10 border-b border-line bg-bg-soft px-2.5 py-2.5 text-[11.5px] font-semibold uppercase tracking-[0.11em] text-muted",
                  col.align === "right" ? "text-right" : "text-left"
                )}
              >
                {col.sortable === false || col.key === "actions" ? (
                  <span className="sr-only">{col.label}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSort(col.key as SheetSortKey)}
                    className="inline-flex cursor-pointer items-center gap-1 uppercase tracking-[0.11em] transition hover:text-text"
                  >
                    {col.label}
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
                  "group/row border-b border-rowline transition-colors even:bg-row-alt hover:bg-[#1A2233]",
                  bet.id === highlightBetId && "animate-sbrowpulse"
                )}
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
                  <span className="flex min-w-0 items-center gap-1.5">
                    {/* Fast bredd: låset får inte knuffa spelnamnet i sidled
                        mellan rader som saknar verifiering. */}
                    <span className="inline-flex w-3.5 shrink-0 justify-center">
                      <LoggedBeforeKickoffIcon value={bet.logged_before_kickoff} />
                    </span>
                    <span className="min-w-0">{formatPick(bet.pick)}</span>
                  </span>
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
                  <SheetSettleControls bet={bet} canEdit={canEdit} />
                </td>
                <td
                  className={cn(
                    "whitespace-nowrap px-2.5 py-3 text-right align-middle font-mono-num font-semibold",
                    bet.result === "open" ? "text-muted" : nettoColor(netto)
                  )}
                >
                  {bet.result === "open" ? "—" : amount(netto)}
                </td>
                <td className="px-2 py-3 align-middle">
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
                Inga spel i urvalet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
