import type { SupabaseClient } from "@supabase/supabase-js";
import { nhlTeamLogo, normalizeTeamName, parseMatchSides } from "@/lib/logos";
import type { Bet } from "@/lib/types";

/**
 * Lagloggor för spel utan kopplad match — manuellt inlagda och importerade.
 * De har bara "Hemma – Borta" i klartext, så lagen slås upp på namnet: NHL
 * via NHL:s logofiler och övriga i lagkatalogen `teams`, som synken fyller på
 * varje gång matchdata hämtas. Gamla spel får alltså loggor i efterhand när
 * lagen dyker upp där. Saknas laget blir det initialer som förut.
 */
export async function attachManualLogos<T extends Bet>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  bets: T[]
): Promise<T[]> {
  const manual = bets.filter((b) => !b.fixtures);
  if (!manual.length) return bets;

  const names = new Set<string>();
  for (const bet of manual) {
    const sides = parseMatchSides(bet.match);
    if (sides) {
      names.add(sides.home);
      names.add(sides.away);
    }
  }
  if (!names.size) return bets;

  const byName = new Map<string, { logo: string; sport: string }>();
  // I omgångar så att långa spelböcker inte spräcker URL-längden.
  const list = [...names];
  const rows: unknown[] = [];
  for (let i = 0; i < list.length; i += 150) {
    const { data } = await supabase
      .from("teams")
      .select("name, sport, logo_url")
      .in("name", list.slice(i, i + 150))
      .not("logo_url", "is", null);
    rows.push(...(data || []));
  }
  for (const row of rows as Array<{
    name: string;
    sport: string;
    logo_url: string;
  }>) {
    byName.set(`${row.sport}:${normalizeTeamName(row.name)}`, {
      logo: row.logo_url,
      sport: row.sport,
    });
  }

  const lookup = (name: string, bet: Bet) => {
    const nhl = nhlTeamLogo(name, bet);
    if (nhl) return nhl;
    // Samma lagnamn kan finnas i flera sporter (Djurgården) — sporten avgör.
    const sport = (bet.sport || "").toLowerCase().includes("hockey")
      ? "hockey"
      : "football";
    return byName.get(`${sport}:${normalizeTeamName(name)}`)?.logo ?? null;
  };

  return bets.map((bet) => {
    if (bet.fixtures) return bet;
    const sides = parseMatchSides(bet.match);
    if (!sides) return bet;
    const home = lookup(sides.home, bet);
    const away = lookup(sides.away, bet);
    return home || away ? { ...bet, manual_logos: { home, away } } : bet;
  });
}
