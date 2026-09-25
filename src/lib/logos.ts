function isHockey(sport?: string | null) {
  return (sport || "").toLowerCase().includes("hockey");
}

/** Fallback när fixtures-cachen saknar logo_url men har team-id. */
export function teamLogoUrl(
  logo: string | null | undefined,
  teamId: number | null | undefined,
  sport?: string | null
) {
  if (logo) return logo;
  if (teamId == null) return null;
  return `https://media.api-sports.io/${isHockey(sport) ? "hockey" : "football"}/teams/${teamId}.png`;
}

/** Fallback när fixtures-cachen saknar league_logo men har league_id. */
export function leagueLogoUrl(
  logo: string | null | undefined,
  leagueId: number | null | undefined,
  sport?: string | null
) {
  if (logo) return logo;
  if (leagueId == null) return null;
  return `https://media.api-sports.io/${isHockey(sport) ? "hockey" : "football"}/leagues/${leagueId}.png`;
}

/** Första bokstaven i lagnamn (platshållare när logo saknas). */
export function teamInitial(name: string | null | undefined) {
  const letter = (name || "").trim().charAt(0);
  return letter ? letter.toUpperCase() : "?";
}

/**
 * Deterministiska tvåbokstavs-initialer från liganamn.
 * "Allsvenskan" → "AL", "Champions League" → "CL".
 * Aldrig sportkod (FB) — samma liga ger alltid samma initialer.
 */
export function leagueInitials(name: string | null | undefined) {
  const parts = (name || "")
    .trim()
    .replace(/[^\wÅÄÖåäö\s]/gi, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/** Logga för en bet-rad: sparad kolumn, annars via kopplad fixture. */
export function betLeagueLogo(bet: {
  league?: string | null;
  league_logo?: string | null;
  league_id?: number | null;
  sport?: string | null;
  fixtures?: {
    league_logo?: string | null;
    league_id?: number | null;
    sport?: string | null;
  } | null;
}) {
  return (
    leagueLogoUrl(
      bet.league_logo ?? bet.fixtures?.league_logo,
      bet.league_id ?? bet.fixtures?.league_id,
      bet.sport ?? bet.fixtures?.sport
    ) ?? leagueLogoByName(bet.league)
  );
}

/** Delar "Hemma – Borta" / "Hemma - Borta" för manuella matcher. */
export function parseMatchSides(match: string) {
  const parts = match.split(/\s+[–−-]\s+/);
  if (parts.length < 2) return null;
  const home = parts[0]?.trim();
  const away = parts.slice(1).join(" – ").trim();
  if (!home || !away) return null;
  return { home, away };
}

/** Primärt datum i sheet: matchavspark, annars när spelet loggades. */
export function betDisplayDate(bet: {
  placed_at: string;
  fixtures?: { kickoff?: string | null } | null;
}) {
  return bet.fixtures?.kickoff || bet.placed_at;
}

/** True om spelet får raderas (före avspark). Saknad kickoff → tillåt (manuell match). */
export function canDeleteBet(bet: {
  fixtures?: { kickoff?: string | null } | null;
}) {
  const kickoffIso = bet.fixtures?.kickoff;
  if (!kickoffIso) return true;
  const kickoff = new Date(kickoffIso).getTime();
  if (!Number.isFinite(kickoff)) return true;
  return kickoff > Date.now();
}

/* ── Loggor för spel utan kopplad match (manuella och importerade) ──────────
   De har bara lag- och liganamn i klartext. Ligan slås upp på namnet och
   NHL-lagen på NHL:s egna logofiler. Övriga lag slås upp i lagkatalogen på
   servern (se manual-logos.ts). Hockey-API:t är inte köpt, så SHL-lagen har
   ingen källa än och visas med initialer. */

function normName(value: string | null | undefined) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Liganamn (normaliserat) → [sport, api-sports-id]. */
const LEAGUE_BY_NAME: Record<string, [sport: "hockey" | "football", id: number]> = {
  nhl: ["hockey", 57],
  "national hockey league": ["hockey", 57],
  shl: ["hockey", 47],
  "svenska hockeyligan": ["hockey", 47],
  "premier league": ["football", 39],
  epl: ["football", 39],
  championship: ["football", 40],
  "fa cup": ["football", 45],
  "fa cupen": ["football", 45],
  "la liga": ["football", 140],
  laliga: ["football", 140],
  "serie a": ["football", 135],
  bundesliga: ["football", 78],
  "ligue 1": ["football", 61],
  eredivisie: ["football", 88],
  "primeira liga": ["football", 94],
  allsvenskan: ["football", 113],
  superettan: ["football", 114],
  "svenska cupen": ["football", 115],
  eliteserien: ["football", 103],
  superligaen: ["football", 119],
  "champions league": ["football", 2],
  "uefa champions league": ["football", 2],
  "europa league": ["football", 3],
  "uefa europa league": ["football", 3],
  "conference league": ["football", 848],
  "uefa europa conference league": ["football", 848],
  "world cup": ["football", 1],
  vm: ["football", 1],
  em: ["football", 4],
  "euro championship": ["football", 4],
  mls: ["football", 253],
};

/** Ligans api-sports-id och sport utifrån namnet, eller null. */
export function leagueByName(name: string | null | undefined) {
  const hit = LEAGUE_BY_NAME[normName(name)];
  return hit ? { sport: hit[0], leagueId: hit[1] } : null;
}

/** Ligalogga utifrån namnet, för spel som saknar league_id. */
export function leagueLogoByName(name: string | null | undefined) {
  const hit = leagueByName(name);
  return hit ? leagueLogoUrl(null, hit.leagueId, hit.sport) : null;
}

/** Loggor som är mörka på genomskinlig botten och försvinner mot mörk yta. */
export function needsLightBackdrop(src: string | null | undefined) {
  return !!src && /\/hockey\/leagues\/47\.png$/.test(src);
}

/** NHL-lag → lagkod i NHL:s logofiler. Både fullt namn och kortnamn. */
const NHL_TEAMS: Array<[code: string, names: string[]]> = [
  ["ANA", ["anaheim ducks", "anaheim", "ducks"]],
  ["BOS", ["boston bruins", "boston", "bruins"]],
  ["BUF", ["buffalo sabres", "buffalo", "sabres"]],
  ["CGY", ["calgary flames", "calgary", "flames"]],
  ["CAR", ["carolina hurricanes", "carolina", "hurricanes"]],
  ["CHI", ["chicago blackhawks", "chicago", "blackhawks"]],
  ["COL", ["colorado avalanche", "colorado", "avalanche"]],
  ["CBJ", ["columbus blue jackets", "columbus", "blue jackets"]],
  ["DAL", ["dallas stars", "dallas", "stars"]],
  ["DET", ["detroit red wings", "detroit", "red wings"]],
  ["EDM", ["edmonton oilers", "edmonton", "oilers"]],
  ["FLA", ["florida panthers", "florida", "panthers"]],
  ["LAK", ["los angeles kings", "la kings", "los angeles", "kings"]],
  ["MIN", ["minnesota wild", "minnesota", "wild"]],
  ["MTL", ["montreal canadiens", "montreal", "canadiens"]],
  ["NSH", ["nashville predators", "nashville", "predators"]],
  ["NJD", ["new jersey devils", "new jersey", "devils"]],
  ["NYI", ["new york islanders", "ny islanders", "islanders"]],
  ["NYR", ["new york rangers", "ny rangers", "rangers"]],
  ["OTT", ["ottawa senators", "ottawa", "senators"]],
  ["PHI", ["philadelphia flyers", "philadelphia", "flyers"]],
  ["PIT", ["pittsburgh penguins", "pittsburgh", "penguins"]],
  ["SJS", ["san jose sharks", "san jose", "sharks"]],
  ["SEA", ["seattle kraken", "seattle", "kraken"]],
  ["STL", ["st louis blues", "st louis", "blues"]],
  ["TBL", ["tampa bay lightning", "tampa bay", "tampa", "lightning"]],
  ["TOR", ["toronto maple leafs", "toronto", "maple leafs"]],
  ["UTA", ["utah hockey club", "utah mammoth", "utah hc", "utah"]],
  ["VAN", ["vancouver canucks", "vancouver", "canucks"]],
  ["VGK", ["vegas golden knights", "vegas", "golden knights"]],
  ["WSH", ["washington capitals", "washington", "capitals"]],
  ["WPG", ["winnipeg jets", "winnipeg", "jets"]],
];

const NHL_BY_NAME = new Map(
  NHL_TEAMS.flatMap(([code, names]) => names.map((n) => [n, code] as const))
);

/** NHL-lagets logga, bara när spelet gäller hockey eller NHL. */
export function nhlTeamLogo(
  name: string | null | undefined,
  context: { sport?: string | null; league?: string | null }
) {
  const league = leagueByName(context.league);
  const hockey =
    isHockey(context.sport) || league?.sport === "hockey";
  if (!hockey) return null;
  // Ett SHL-spel med "Rangers" ska inte få New York Rangers logga.
  if (league && league.leagueId !== 57) return null;
  const code = NHL_BY_NAME.get(normName(name));
  return code ? `https://assets.nhle.com/logos/nhl/svg/${code}_light.svg` : null;
}

export { normName as normalizeTeamName };
