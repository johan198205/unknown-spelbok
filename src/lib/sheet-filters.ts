import type { Bet, BetResult } from "@/lib/types";
import { betLeagueLogo, leagueInitials } from "@/lib/logos";

export type SheetSportFilter = "all" | "football" | "hockey";
export type SheetResultFilter = "all" | BetResult;
export type SheetPeriodFilter =
  | "all"
  | "today"
  | "7d"
  | "30d"
  | "3m"
  | "ytd";
export type ChartPeriodFilter = "30d" | "3m" | "1y" | "all";
export type SheetViewMode = "table" | "cards";

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
  { value: "all", label: "Allt" },
  { value: "today", label: "Idag" },
  { value: "7d", label: "7 dagar" },
  { value: "30d", label: "30 dagar" },
  { value: "3m", label: "3 månader" },
  { value: "ytd", label: "I år" },
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

export interface SheetFilterState {
  sport: SheetSportFilter;
  league: string; // "" = alla
  result: SheetResultFilter;
  period: SheetPeriodFilter;
  view: SheetViewMode;
  chart: ChartPeriodFilter;
}

export const DEFAULT_SHEET_FILTERS: SheetFilterState = {
  sport: "all",
  league: "",
  result: "all",
  period: "all",
  view: "table",
  chart: "all",
};

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
  if (period === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start.getTime();
  }
  if (period === "7d") return now.getTime() - 7 * 86400000;
  if (period === "30d") return now.getTime() - 30 * 86400000;
  if (period === "3m") return now.getTime() - 92 * 86400000;
  if (period === "1y") return now.getTime() - 365 * 86400000;
  if (period === "ytd") return new Date(now.getFullYear(), 0, 1).getTime();
  return null;
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
  filters: Pick<SheetFilterState, "sport" | "league" | "result" | "period">,
  now = new Date()
): Bet[] {
  const cut = periodCutoff(filters.period, now);
  return bets.filter((bet) => {
    if (!matchesSportFilter(bet, filters.sport)) return false;
    if (filters.league && (bet.league || "") !== filters.league) return false;
    if (filters.result !== "all" && bet.result !== filters.result) return false;
    if (cut != null && +new Date(bet.placed_at) < cut) return false;
    return true;
  });
}

export function filterChartBets(
  bets: Bet[],
  chartPeriod: ChartPeriodFilter,
  now = new Date()
): Bet[] {
  const cut = periodCutoff(chartPeriod, now);
  if (cut == null) return bets;
  return bets.filter((bet) => +new Date(bet.placed_at) >= cut);
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
  const validPeriods: SheetPeriodFilter[] = [
    "all",
    "today",
    "7d",
    "30d",
    "3m",
    "ytd",
  ];
  const period = validPeriods.includes(periodRaw as SheetPeriodFilter)
    ? (periodRaw as SheetPeriodFilter)
    : "all";

  const chartRaw = params.get("chart") || "all";
  const validCharts: ChartPeriodFilter[] = ["30d", "3m", "1y", "all"];
  const chart = validCharts.includes(chartRaw as ChartPeriodFilter)
    ? (chartRaw as ChartPeriodFilter)
    : "all";

  const viewRaw = params.get("view") || "table";
  const view: SheetViewMode = viewRaw === "cards" ? "cards" : "table";

  return {
    sport,
    league: params.get("league") || "",
    result,
    period,
    view,
    chart,
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
  setOrDelete("result", filters.result, "all");
  setOrDelete("period", filters.period, "all");
  setOrDelete("chart", filters.chart, "all");
  setOrDelete("view", filters.view, "table");
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

export function formatChartDate(isoDay: string): string {
  // YY-MM-DD
  return isoDay.length >= 10 ? isoDay.slice(2, 10) : isoDay;
}
