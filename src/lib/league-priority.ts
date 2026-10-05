import { sportDef, type SportSlug } from "@/lib/sports";

const FOOTBALL_PRIORITY: { id: number; names: string[] }[] = [
  { id: 113, names: ["allsvenskan"] },
  { id: 39, names: ["premier league"] },
  { id: 140, names: ["la liga", "primera division"] },
  { id: 135, names: ["serie a"] },
  { id: 78, names: ["bundesliga"] },
  { id: 61, names: ["ligue 1"] },
  { id: 2, names: ["uefa champions league", "champions league"] },
];

// Id:n i API-Hockey: 47 = SHL, 57 = NHL (jfr LEAGUE_BY_NAME i logos.ts).
const HOCKEY_PRIORITY: { id: number; names: string[] }[] = [
  { id: 47, names: ["shl", "swedish hockey league"] },
  { id: 57, names: ["nhl"] },
];

// Övriga sporter matchas på namn — id:n är API-specifika och okontrollerade.
const PRIORITY_BY_SPORT: Partial<
  Record<SportSlug, { id?: number; names: string[] }[]>
> = {
  football: FOOTBALL_PRIORITY,
  hockey: HOCKEY_PRIORITY,
  basketball: [{ names: ["nba"] }, { names: ["euroleague"] }, { names: ["basketligan"] }],
  "american-football": [{ names: ["nfl"] }, { names: ["ncaa"] }],
  baseball: [{ names: ["mlb"] }],
  handball: [{ names: ["handbollsligan"] }, { names: ["ehf champions league"] }],
  rugby: [{ names: ["six nations"] }, { names: ["premiership rugby"] }],
  afl: [{ names: ["afl"] }],
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

/** Index i prioritetslistan, eller −1 om ligan inte är prioriterad. */
export function priorityRank(
  sport: SportSlug,
  id: number | null | undefined,
  name: string
): number {
  const list = PRIORITY_BY_SPORT[sport] ?? [];
  const needle = normalize(name);
  if (id != null) {
    const byId = list.findIndex((item) => item.id === id);
    if (byId >= 0) return byId;
  }
  return list.findIndex((item) =>
    item.names.some((n) => needle === n || needle.includes(n))
  );
}

export function sportLabelToSlug(sport: string | null | undefined): SportSlug {
  return sportDef(sport).slug;
}

/** Prioriterade först (egen ordning), därefter alfabetiskt. */
export function compareLeaguesByPriority(
  sport: SportSlug,
  a: { leagueId?: number | null; name: string; country?: string | null },
  b: { leagueId?: number | null; name: string; country?: string | null }
): number {
  const ar = priorityRank(sport, a.leagueId, a.name);
  const br = priorityRank(sport, b.leagueId, b.name);
  const aPri = ar >= 0;
  const bPri = br >= 0;
  if (aPri && bPri) return ar - br;
  if (aPri) return -1;
  if (bPri) return 1;
  return (
    a.name.localeCompare(b.name, "sv") ||
    (a.country || "").localeCompare(b.country || "", "sv")
  );
}
