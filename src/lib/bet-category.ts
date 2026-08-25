/**
 * Kategori härledd ur spelvalets text ("Ö9.5 hörnor" → Hörnor).
 *
 * Client-safe och utan beroenden: används av spelbokens filterrad, av
 * dashboardens Fördelning-kort och av breakdowns.ts.
 *
 * Ordningen i `betCategory` ÄR specifikationen — första träffen vinner.
 * Flytta inte på grenarna: "Ö1.5 mål 2:a halvlek" ska bli Halvlek & period,
 * inte Totaler, och "Borta +1.5" ska bli Handikapp, inte Matchresultat.
 */

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
