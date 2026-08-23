import type { Bet, BetResult, BetStats } from "./types";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function formatMoney(value: number, currency = "kr") {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString("sv-SE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} ${currency}`;
}

export function formatNumber(value: number, digits = 1) {
  return value.toLocaleString("sv-SE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatRoi(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value, 1)}%`;
}

export function formatOdds(value: number) {
  return value.toFixed(2);
}

export function nettoColor(value: number) {
  if (value > 0) return "text-win";
  if (value < 0) return "text-loss";
  return "text-muted";
}

export function resultLabel(result: BetResult) {
  const map: Record<BetResult, string> = {
    open: "Öppen",
    win: "Vinst",
    loss: "Förlust",
    void: "Void",
    halfwin: "Halv vinst",
    halfloss: "Halv förlust",
  };
  return map[result];
}

export function resultTone(result: BetResult) {
  switch (result) {
    case "win":
    case "halfwin":
      return { bg: "bg-win/15", fg: "text-win", border: "border-win/40" };
    case "loss":
    case "halfloss":
      return { bg: "bg-loss/15", fg: "text-loss", border: "border-loss/40" };
    case "void":
      return { bg: "bg-yellow/15", fg: "text-yellow", border: "border-yellow/40" };
    default:
      return { bg: "bg-panel-2", fg: "text-muted", border: "border-line" };
  }
}

export function betNetto(bet: Pick<Bet, "stake" | "payout" | "result">) {
  if (bet.result === "open") return 0;
  return Number(bet.payout) - Number(bet.stake);
}

export function payoutForResult(
  result: BetResult,
  stake: number,
  odds: number
) {
  if (result === "win") return Math.round(stake * odds * 100) / 100;
  if (result === "loss" || result === "open") return 0;
  if (result === "void") return stake;
  if (result === "halfwin") {
    return Math.round((stake + (stake * (odds - 1)) / 2) * 100) / 100;
  }
  if (result === "halfloss") return Math.round((stake / 2) * 100) / 100;
  return 0;
}

export function computeStats(bets: Bet[]): BetStats {
  const settled = bets.filter((b) => b.result !== "open");
  const wins = settled.filter((b) => b.result === "win" || b.result === "halfwin");
  const stake = settled.reduce((sum, b) => sum + Number(b.stake), 0);
  const payout = settled.reduce((sum, b) => sum + Number(b.payout), 0);
  const netto = payout - stake;
  const oddsSum = settled.reduce((sum, b) => sum + Number(b.odds), 0);

  return {
    bets: settled.length,
    stake,
    payout,
    netto,
    roi: stake > 0 ? (netto / stake) * 100 : 0,
    hitrate: settled.length > 0 ? (wins.length / settled.length) * 100 : 0,
    avgOdds: settled.length > 0 ? oddsSum / settled.length : 0,
    avgStake: settled.length > 0 ? stake / settled.length : 0,
    open: bets.filter((b) => b.result === "open").length,
  };
}

export function cumulativeNetto(bets: Bet[]) {
  const settled = [...bets]
    .filter((b) => b.result !== "open")
    .sort((a, b) => +new Date(a.placed_at) - +new Date(b.placed_at));

  let running = 0;
  return settled.map((bet) => {
    running += betNetto(bet);
    return { date: bet.placed_at, value: running };
  });
}

/** Ackumulerat netto per settlad speldag (YYYY-MM-DD), sorterat stigande. */
export function cumulativeNettoByDay(bets: Bet[]) {
  const byDay = new Map<string, number>();
  for (const bet of bets) {
    if (bet.result === "open") continue;
    const day = bet.placed_at.slice(0, 10);
    byDay.set(day, (byDay.get(day) || 0) + betNetto(bet));
  }

  const days = [...byDay.keys()].sort();
  let running = 0;
  return days.map((date) => {
    running += byDay.get(date) || 0;
    return { date, value: running };
  });
}

export const SHEET_SERIES_COLORS = [
  "#35d6f5",
  "#ffb84d",
  "#a78bfa",
  "#66e38a",
  "#ff8fb1",
  "#7fb4ff",
  "#f5a97f",
  "#5eead4",
];

/**
 * Ackumulerat netto per speldag för totalen och för varje spelbok, alla
 * projicerade på samma dagsaxel så linjerna kan ritas i samma graf.
 */
export function cumulativeNettoBySheet(
  bets: Bet[],
  sheets: Array<{ id: string; name: string }>
) {
  const settled = bets.filter((b) => b.result !== "open");
  const days = [...new Set(settled.map((b) => b.placed_at.slice(0, 10)))].sort();

  const build = (list: Bet[]) => {
    const byDay = new Map<string, number>();
    for (const bet of list) {
      const day = bet.placed_at.slice(0, 10);
      byDay.set(day, (byDay.get(day) || 0) + betNetto(bet));
    }
    let running = 0;
    return days.map((date) => {
      running += byDay.get(date) || 0;
      return { date, value: running };
    });
  };

  return {
    days,
    total: build(settled),
    series: sheets
      .map((sheet, i) => ({
        id: sheet.id,
        name: sheet.name,
        color: SHEET_SERIES_COLORS[i % SHEET_SERIES_COLORS.length],
        bets: settled.filter((b) => b.sheet_id === sheet.id),
      }))
      .filter((s) => s.bets.length > 0)
      .map(({ bets: sheetBets, ...rest }) => ({
        ...rest,
        points: build(sheetBets),
      })),
  };
}

export function initialOf(name: string) {
  return (name?.trim()?.[0] || "?").toUpperCase();
}
