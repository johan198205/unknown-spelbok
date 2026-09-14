import type { SportSlug } from "@/lib/apisports";

const FOOTBALL_PRIORITY: { id: number; names: string[] }[] = [
  { id: 113, names: ["allsvenskan"] },
  { id: 39, names: ["premier league"] },
  { id: 140, names: ["la liga", "primera division"] },
  { id: 135, names: ["serie a"] },
  { id: 78, names: ["bundesliga"] },
  { id: 61, names: ["ligue 1"] },
  { id: 2, names: ["uefa champions league", "champions league"] },
];

const HOCKEY_PRIORITY: { id: number; names: string[] }[] = [
  { id: 57, names: ["shl", "swedish hockey league"] },
];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

/** Index i prioritetslistan, eller −1 om ligan inte är prioriterad. */
export function priorityRank(
  sport: SportSlug,
  id: number | null | undefined,
  name: string
): number {
  const list = sport === "hockey" ? HOCKEY_PRIORITY : FOOTBALL_PRIORITY;
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
  const s = (sport || "").toLowerCase();
  if (s.includes("hockey")) return "hockey";
  return "football";
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
