/**
 * Kategori härledd ur spelvalets text ("Ö9.5 hörnor" → Hörnor).
 *
 * Client-safe och utan beroenden utöver textregistret: används av
 * spelbokens filterrad, av dashboardens Fördelning-kort och av breakdowns.ts.
 * Kategorinamnen nedan är värden (filter i URL:en, grupper i Fördelning) —
 * visa dem med betCategoryLabel().
 *
 * Ordningen i `betCategory` ÄR specifikationen — första träffen vinner.
 * Flytta inte på grenarna: "Ö1.5 mål 2:a halvlek" ska bli Halvlek & period,
 * inte Totaler, och "Borta +1.5" ska bli Handikapp, inte Matchresultat.
 */

import { createT, type TextKey, type TFunction } from "@/lib/texts";

export const BET_CATEGORIES = [
  "Hörnor",
  "Kort",
  "Spelare",
  "Halvlek & period",
  "Båda lagen mål",
  "Handikapp",
  "Totaler",
  "Matchresultat",
  "Övrigt",
] as const;

export type BetCategory = (typeof BET_CATEGORIES)[number];

const CATEGORY_KEYS: Record<BetCategory, TextKey> = {
  Hörnor: "terms.category.corners",
  Kort: "terms.category.cards",
  Spelare: "terms.category.player",
  "Halvlek & period": "terms.category.halfPeriod",
  "Båda lagen mål": "terms.category.bothTeams",
  Handikapp: "terms.category.handicap",
  Totaler: "terms.category.totals",
  Matchresultat: "terms.category.matchResult",
  Övrigt: "terms.category.other",
};

/** Visningsnamnet för en kategori. Okända värden visas som de är. */
export function betCategoryLabel(category: string, t?: TFunction): string {
  const key = CATEGORY_KEYS[category as BetCategory];
  return key ? (t ?? createT({}))(key) : category;
}

/**
 * Gruppnamn i breakdowns.ts som är fasta texter och inte data: oddsintervall
 * och "Okänt". Kategorier slås upp via betCategoryLabel, övriga namn (ligor,
 * spelbolag, sporter) visas som de är.
 */
const BREAKDOWN_KEYS: Record<string, TextKey> = {
  "Under 1.50": "terms.odds.under150",
  "1.50–1.99": "terms.odds.150to199",
  "2.00–2.99": "terms.odds.200to299",
  "3.00 och över": "terms.odds.300plus",
  Okänt: "terms.breakdown.unknown",
};

/** Visningsnamnet för en grupp i Fördelning (breakdowns.ts). */
export function breakdownLabel(name: string, t?: TFunction): string {
  const key = BREAKDOWN_KEYS[name];
  if (key) return (t ?? createT({}))(key);
  return betCategoryLabel(name, t);
}

/** Tecken följt av siffra: -1, +1.5, -0.25. */
const HANDICAP_LINE = /[+-]\d/;

/** 1X, X2, 12 i början av strängen. */
const DOUBLE_CHANCE = /^(1x|x2|12)/;

export function betCategory(pick: string | null | undefined): BetCategory {
  const v = (pick ?? "").trim().toLowerCase();
  if (!v) return "Övrigt";

  if (v.includes("hörn")) return "Hörnor";
  if (v.includes("kort") || v.includes("rött")) return "Kort";
  if (v.includes("målskytt") || v.includes("poäng") || v.includes("skott")) {
    return "Spelare";
  }
  if (v.includes("halvlek") || v.includes("period")) return "Halvlek & period";
  if (v.includes("båda lagen")) return "Båda lagen mål";
  if (v.includes("dnb") || v.includes("asiatisk") || HANDICAP_LINE.test(v)) {
    return "Handikapp";
  }
  if (
    v.startsWith("ö") ||
    v.startsWith("u") ||
    v.includes("över") ||
    v.includes("under") ||
    v.includes("games") ||
    v.includes("set") ||
    v.includes("totalt")
  ) {
    return "Totaler";
  }
  if (
    DOUBLE_CHANCE.test(v) ||
    v.startsWith("1 ") ||
    v.startsWith("2 ") ||
    v === "1" ||
    v === "2" ||
    v === "x" ||
    v.includes("hemma") ||
    v.includes("borta") ||
    v.includes("vinner")
  ) {
    return "Matchresultat";
  }

  return "Övrigt";
}

/** Kategorierna som faktiskt finns i en samling spel, i den fasta ordningen. */
export function distinctCategories(
  bets: Array<{ pick?: string | null }>
): BetCategory[] {
  const present = new Set(bets.map((b) => betCategory(b.pick)));
  return BET_CATEGORIES.filter((c) => present.has(c));
}
