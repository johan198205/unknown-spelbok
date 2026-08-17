/**
 * Settling-hjälpare för 1X2 och Över/Under.
 *
 * 1X2 i v1 jämför ALLTID regulationScore (score.fulltime = 90 min).
 * Vid AET/PEN räknas alltså inte förlängning eller straffar. Se
 * src/lib/apisports.ts → regulationScore.
 */

export type Settlement = "win" | "loss" | "void";

/**
 * Läser ett tips och returnerar resultat, eller null när tipset inte går att
 * avgöra maskinellt (då hamnar spelet i settle_queue).
 *
 * Klarar de former appen faktiskt sparar (se src/lib/picks.ts):
 *   "1 (hemma)", "X (oavgjort)", "2 (borta)", "Ö2.5", "U2.5", "Över 2,5 mål"
 */
export function resolvePick(
  pick: string,
  homeScore: number,
  awayScore: number
): Settlement | null {
  const raw = pick
    .toLowerCase()
    .replace(",", ".")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!raw) return null;

  if (["1", "hemma", "home"].includes(raw)) {
    return homeScore > awayScore ? "win" : "loss";
  }
  if (["x", "kryss", "draw", "oavgjort"].includes(raw)) {
    return homeScore === awayScore ? "win" : "loss";
  }
  if (["2", "borta", "away"].includes(raw)) {
    return awayScore > homeScore ? "win" : "loss";
  }

  const total = homeScore + awayScore;
  const line = /^(över|over|ö|o|under|u)\s*(\d+(?:\.\d+)?)(?:\s*mål)?$/.exec(raw);
  if (line) {
    const value = Number(line[2]);
    if (total === value) return "void";
    const isOver = line[1] !== "under" && line[1] !== "u";
    const above = total > value;
    return isOver === above ? "win" : "loss";
  }

  return null;
}
