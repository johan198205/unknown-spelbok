import type { Bet, BetResult } from "@/lib/types";
import { betLeagueLogo, leagueInitials } from "@/lib/logos";
import { betCategory, distinctCategories } from "@/lib/bet-category";

export { distinctCategories };

export type SheetSportFilter = "all" | "football" | "hockey";
export type SheetResultFilter = "all" | BetResult;
/**
 * Spelbokens period. Samma väljare styr både grafen och tabellen — grafen
 * har ingen egen periodrad längre.
 */
export type SheetPeriodFilter = "30d" | "3m" | "ytd" | "all";
/** Dashboardens graf har fortfarande en egen period med 1 år. */
export type ChartPeriodFilter = "30d" | "3m" | "1y" | "all";
export type SheetViewMode = "table" | "cards";
/** Matchcellens täthet: inramat resultatblock eller en enda rad. */
export type SheetDensity = "result" | "slim";

export const SPORT_FILTER_OPTIONS: Array<{
  value: SheetSportFilter;
  label: string;
}> = [
  { value: "all", label: "Alla sporter" },
  { value: "football", label: "Fotboll" },
  { value: "hockey", label: "Hockey" },
];

export const RESULT_FILTER_OPTIONS: Array<{
  value: SheetResultFilter;
  label: string;
}> = [
  { value: "all", label: "Alla" },
  { value: "open", label: "Öppen" },
  { value: "win", label: "Vinst" },
  { value: "loss", label: "Förlust" },
  { value: "void", label: "Void" },
  { value: "halfwin", label: "Halv vinst" },
  { value: "halfloss", label: "Halv förlust" },
];

export const PERIOD_FILTER_OPTIONS: Array<{
  value: SheetPeriodFilter;
  label: string;
}> = [
  { value: "30d", label: "30 dagar" },
  { value: "3m", label: "3 månader" },
  { value: "ytd", label: "I år" },
  { value: "all", label: "Allt" },
];

export const CHART_PERIOD_OPTIONS: Array<{
  value: ChartPeriodFilter;
  label: string;
}> = [
  { value: "30d", label: "30 dagar" },
  { value: "3m", label: "3 månader" },
  { value: "1y", label: "1 år" },
  { value: "all", label: "Allt" },
];

export const DENSITY_OPTIONS: Array<{ value: SheetDensity; label: string }> = [
  { value: "result", label: "Resultat" },
  { value: "slim", label: "Slimmad" },
];

export const VIEW_OPTIONS: Array<{ value: SheetViewMode; label: string }> = [
  { value: "table", label: "Tabell" },
  { value: "cards", label: "Kort" },
];

export interface SheetFilterState {
  sport: SheetSportFilter;
  league: string; // "" = alla
  category: string; // "" = alla kategorier
  bookmaker: string; // bookmaker_id, "" = alla spelbolag
  result: SheetResultFilter;
  period: SheetPeriodFilter;
  view: SheetViewMode;
  density: SheetDensity;
}

export const DEFAULT_SHEET_FILTERS: SheetFilterState = {
  sport: "all",
  league: "",
  category: "",
  bookmaker: "",
  result: "all",
  period: "all",
  view: "table",
  density: "result",
};

/** De fem fälten i filterpanelen — perioden och vyerna räknas inte som filter. */
const PANEL_KEYS = [
  "sport",
  "league",
  "category",
  "bookmaker",
  "result",
] as const;

function isHockeySport(sport: string | null | undefined) {
  return (sport || "").toLowerCase().includes("hockey");
}

function isFootballSport(sport: string | null | undefined) {
  const s = (sport || "").toLowerCase();
  return s.includes("fotboll") || s.includes("football") || s === "soccer";
}

export function periodCutoff(
  period: SheetPeriodFilter | ChartPeriodFilter,
  now = new Date()
): number | null {
  if (period === "all") return null;
  if (period === "30d") return now.getTime() - 30 * 86400000;
  if (period === "3m") return now.getTime() - 92 * 86400000;
  if (period === "1y") return now.getTime() - 365 * 86400000;
  if (period === "ytd") return new Date(now.getFullYear(), 0, 1).getTime();
  return null;
}

export function periodLabel(period: SheetPeriodFilter): string {
  return (
    PERIOD_FILTER_OPTIONS.find((o) => o.value === period)?.label || "Allt"
  );
}

export function matchesSportFilter(
  bet: Bet,
  sport: SheetSportFilter
): boolean {
  if (sport === "all") return true;
  const s = bet.sport || bet.fixtures?.sport || "";
  if (sport === "hockey") return isHockeySport(s);
  if (sport === "football") {
    if (!s) return true; // saknad sport → ofta fotboll
    return isFootballSport(s) || !isHockeySport(s);
  }
  return true;
}

export function filterSheetBets(
  bets: Bet[],
  filters: Pick<
    SheetFilterState,
    "sport" | "league" | "category" | "bookmaker" | "result" | "period"
  >,
  now = new Date()
): Bet[] {
  const cut = periodCutoff(filters.period, now);
  return bets.filter((bet) => {
    if (!matchesSportFilter(bet, filters.sport)) return false;
    if (filters.league && (bet.league || "") !== filters.league) return false;
    if (filters.category && betCategory(bet.pick) !== filters.category) {
      return false;
    }
    if (filters.bookmaker && (bet.bookmaker_id || "") !== filters.bookmaker) {
      return false;
    }
    if (filters.result !== "all" && bet.result !== filters.result) return false;
    if (cut != null && +new Date(bet.placed_at) < cut) return false;
    return true;
  });
}

export type SheetSortKey =
  | "date"
  | "league"
  | "match"
  | "pick"
  | "bookmaker"
  | "stake"
  | "odds"
  | "result"
  | "netto";

export type SheetSortDir = "asc" | "desc";

export const DEFAULT_SHEET_SORT: {
  key: SheetSortKey;
  dir: SheetSortDir;
} = { key: "date", dir: "desc" };

/** Rättningarna i den ordning kolumnsorteringen ska ge. */
const RESULT_ORDER: BetResult[] = [
  "win",
  "halfwin",
  "void",
  "halfloss",
  "loss",
  "open",
];

function sortValue(bet: Bet, key: SheetSortKey): number | string {
  switch (key) {
    case "date":
      return +new Date(bet.placed_at);
    case "league":
      return (bet.league || "").toLowerCase();
    case "match":
      return bet.match.toLowerCase();
    case "pick":
      return (bet.pick || "").toLowerCase();
    case "bookmaker":
      return (bet.bookmakers?.name || "").toLowerCase();
    case "stake":
      return Number(bet.stake);
    case "odds":
      return Number(bet.odds);
    case "result":
      return RESULT_ORDER.indexOf(bet.result);
    case "netto":
      return bet.result === "open" ? 0 : Number(bet.payout) - Number(bet.stake);
  }
}

export function sortSheetBets(
  bets: Bet[],
  key: SheetSortKey,
  dir: SheetSortDir
): Bet[] {
  const factor = dir === "asc" ? 1 : -1;
  return [...bets].sort((a, b) => {
    const av = sortValue(a, key);
    const bv = sortValue(b, key);
    if (typeof av === "string" || typeof bv === "string") {
      return String(av).localeCompare(String(bv), "sv") * factor;
    }
    return (av - bv) * factor;
  });
}

export interface LeagueOption {
  name: string;
  logo: string | null;
  leagueId: number | null;
  sport: string | null;
  initials: string;
}

export function distinctLeagues(bets: Bet[]): LeagueOption[] {
  const map = new Map<string, LeagueOption>();
  for (const bet of bets) {
    const name = (bet.league || "").trim();
    if (!name) continue;
    const existing = map.get(name);
    const logo = betLeagueLogo(bet);
    const leagueId = bet.league_id ?? bet.fixtures?.league_id ?? null;
    const sport = bet.sport ?? bet.fixtures?.sport ?? null;
    if (!existing) {
      map.set(name, {
        name,
        logo,
        leagueId,
        sport,
        initials: leagueInitials(name),
      });
    } else {
      if (!existing.logo && logo) existing.logo = logo;
      if (existing.leagueId == null && leagueId != null) {
        existing.leagueId = leagueId;
      }
      if (!existing.sport && sport) existing.sport = sport;
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "sv"));
}

export interface BookmakerOption {
  id: string;
  name: string;
  count: number;
}

export function distinctBookmakers(bets: Bet[]): BookmakerOption[] {
  const map = new Map<string, BookmakerOption>();
  for (const bet of bets) {
    const id = bet.bookmaker_id;
    if (!id) continue;
    const existing = map.get(id);
    if (existing) existing.count += 1;
    else {
      map.set(id, {
        id,
        name: bet.bookmakers?.name || "Okänt spelbolag",
        count: 1,
      });
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "sv"));
}

export type ActiveFilterChip = {
  key: (typeof PANEL_KEYS)[number];
  label: string;
};

/** Antal aktiva filter — perioden räknas inte, den syns redan i pill-raden. */
export function activeFilterCount(filters: SheetFilterState): number {
  return PANEL_KEYS.filter(
    (key) => filters[key] !== DEFAULT_SHEET_FILTERS[key]
  ).length;
}

export function clearPanelFilters(
  filters: SheetFilterState
): SheetFilterState {
  return {
    ...filters,
    sport: DEFAULT_SHEET_FILTERS.sport,
    league: DEFAULT_SHEET_FILTERS.league,
    category: DEFAULT_SHEET_FILTERS.category,
    bookmaker: DEFAULT_SHEET_FILTERS.bookmaker,
    result: DEFAULT_SHEET_FILTERS.result,
  };
}

/** Aktiva filter som borttagbara chips, i panelens ordning. */
export function activeFilterChips(
  filters: SheetFilterState,
  bookmakers: BookmakerOption[]
): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];
  if (filters.sport !== "all") {
    chips.push({
      key: "sport",
      label:
        SPORT_FILTER_OPTIONS.find((o) => o.value === filters.sport)?.label ||
        filters.sport,
    });
  }
  if (filters.league) chips.push({ key: "league", label: filters.league });
  if (filters.category) {
    chips.push({ key: "category", label: filters.category });
  }
  if (filters.bookmaker) {
    chips.push({
      key: "bookmaker",
      label:
        bookmakers.find((b) => b.id === filters.bookmaker)?.name ||
        "Spelbolag",
    });
  }
  if (filters.result !== "all") {
    chips.push({
      key: "result",
      label:
        RESULT_FILTER_OPTIONS.find((o) => o.value === filters.result)?.label ||
        filters.result,
    });
  }
  return chips;
}

export function parseSheetFilters(
  params: URLSearchParams
): SheetFilterState {
  const sportRaw = params.get("sport") || "all";
  const sport: SheetSportFilter =
    sportRaw === "football" || sportRaw === "hockey" ? sportRaw : "all";

  const resultRaw = params.get("result") || "all";
  const validResults: SheetResultFilter[] = [
    "all",
    "open",
    "win",
    "loss",
    "void",
    "halfwin",
    "halfloss",
  ];
  const result = validResults.includes(resultRaw as SheetResultFilter)
    ? (resultRaw as SheetResultFilter)
    : "all";

  const periodRaw = params.get("period") || "all";
  const validPeriods: SheetPeriodFilter[] = ["30d", "3m", "ytd", "all"];
  const period = validPeriods.includes(periodRaw as SheetPeriodFilter)
    ? (periodRaw as SheetPeriodFilter)
    : "all";

  const viewRaw = params.get("view") || "table";
  const view: SheetViewMode = viewRaw === "cards" ? "cards" : "table";

  const densityRaw = params.get("dens") || "result";
  const density: SheetDensity = densityRaw === "slim" ? "slim" : "result";

  return {
    sport,
    league: params.get("league") || "",
    category: (params.get("cat") || "").trim(),
    bookmaker: params.get("book") || "",
    result,
    period,
    view,
    density,
  };
}

export function sheetFiltersToParams(
  filters: SheetFilterState,
  base?: URLSearchParams
): URLSearchParams {
  const next = new URLSearchParams(base?.toString());
  const setOrDelete = (key: string, value: string, empty: string) => {
    if (!value || value === empty) next.delete(key);
    else next.set(key, value);
  };

  setOrDelete("sport", filters.sport, "all");
  setOrDelete("league", filters.league, "");
  setOrDelete("cat", filters.category, "");
  setOrDelete("book", filters.bookmaker, "");
  setOrDelete("result", filters.result, "all");
  setOrDelete("period", filters.period, "all");
  setOrDelete("view", filters.view, "table");
  setOrDelete("dens", filters.density, "result");
  // Spelformsfiltret är borta ur filterraden — städa bort gamla länkar.
  next.delete("pick");
  next.delete("chart");
  return next;
}

export function compactAxisValue(value: number): string {
  if (Math.abs(value) >= 1000) {
    const k = value / 1000;
    const rounded = Math.abs(k) >= 10 ? Math.round(k) : Math.round(k * 10) / 10;
    return `${rounded.toLocaleString("sv-SE")}k`;
  }
  return Math.round(value).toLocaleString("sv-SE");
}
