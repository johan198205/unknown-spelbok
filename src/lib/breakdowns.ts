/**
 * Delade uppdelningar av spel (liga, spelbolag, spelform, sport, odds).
 *
 * Används både av serversidorna (hem, spelbok) och av klientkomponenter, så
 * modulen får inte dra in något server-only — därav den lokala
 * sport-normaliseringen i stället för `sportLabel` från apisports.
 */

export type BreakdownRow = {
  name: string;
  bets: number;
  stake: number;
  netto: number;
  roi: number;
};

/** Minsta gemensamma nämnare mellan `Bet` och de smala select:arna i bet-stats. */
export type GroupableBet = {
  result: string;
  stake: number | string;
  odds: number | string;
  payout: number | string | null;
  league?: string | null;
  pick?: string | null;
  sport?: string | null;
  bookmakers?: { name: string } | null;
  fixtures?: { sport?: string | null } | null;
};

/** Oddsintervallen i stigande ordning — används för att sortera den gruppen. */
export const ODDS_BUCKETS = [
  "< 1.50",
  "1.50–1.99",
  "2.00–2.99",
  "3.00+",
] as const;

function normalizeSport(raw: string): string {
  const v = raw.toLowerCase();
  if (v === "football" || v === "fotboll") return "Fotboll";
  if (v === "hockey" || v === "ishockey") return "Ishockey";
  return raw;
}

export function leagueKey(bet: GroupableBet): string {
  return (bet.league || "").trim() || "Övrigt";
}

export function bookmakerKey(bet: GroupableBet): string {
  return (bet.bookmakers?.name || "").trim() || "Okänt";
}

/** Spelform = det valda spelet, t.ex. "1X" eller "Ö2.5". */
export function pickKey(bet: GroupableBet): string {
  return (bet.pick || "").trim() || "Okänt";
}

/** Äldre spel saknar sport på raden — fall tillbaka på matchens sport. */
export function sportKey(bet: GroupableBet): string {
  const raw = (bet.sport || bet.fixtures?.sport || "").trim();
  return raw ? normalizeSport(raw) : "Okänt";
}

export function oddsKey(bet: GroupableBet): string {
  const o = Number(bet.odds);
  if (o < 1.5) return ODDS_BUCKETS[0];
  if (o < 2) return ODDS_BUCKETS[1];
  if (o < 3) return ODDS_BUCKETS[2];
  return ODDS_BUCKETS[3];
}

/**
 * Grupperar satta spel (öppna räknas inte) och returnerar netto/ROI per grupp,
 * sorterat på netto fallande.
 */
export function groupBets<T extends GroupableBet>(
  bets: T[],
  key: (bet: T) => string
): BreakdownRow[] {
  const map = new Map<string, { bets: number; stake: number; netto: number }>();

  for (const bet of bets) {
    if (bet.result === "open") continue;
    const k = key(bet);
    const cur = map.get(k) ?? { bets: 0, stake: 0, netto: 0 };
    cur.bets += 1;
    cur.stake += Number(bet.stake);
    cur.netto += Number(bet.payout ?? 0) - Number(bet.stake);
    map.set(k, cur);
  }

  return [...map.entries()]
    .map(([name, v]) => ({
      name,
      bets: v.bets,
      stake: Math.round(v.stake * 100) / 100,
      netto: Math.round(v.netto * 100) / 100,
      roi: v.stake > 0 ? Math.round((v.netto / v.stake) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.netto - a.netto);
}

/** Oddsintervall sorteras på intervallet, inte på netto. */
export function groupByOdds<T extends GroupableBet>(bets: T[]): BreakdownRow[] {
  return groupBets(bets, oddsKey).sort(
    (a, b) =>
      ODDS_BUCKETS.indexOf(a.name as (typeof ODDS_BUCKETS)[number]) -
      ODDS_BUCKETS.indexOf(b.name as (typeof ODDS_BUCKETS)[number])
  );
}
