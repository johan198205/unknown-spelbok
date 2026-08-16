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

export function initialOf(name: string) {
  return (name?.trim()?.[0] || "?").toUpperCase();
}
