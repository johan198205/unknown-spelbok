/**
 * Sportregister — en källa för allt som skiljer sporterna åt hos API-Sports.
 *
 * Fotboll ligger på API-Football v3 (/fixtures). Övriga lagsporter ligger på
 * var sitt v1-API (/games), MMA på /fights. Formel 1 är lopp, inte matcher,
 * och ingår inte.
 *
 * MATCH-ID: fixtures.fixture_id är en global bigint-nyckel, men varje API
 * numrerar sina matcher från noll. För att id:n inte ska krocka får varje
 * sport ett eget intervall: fixture_id = idOffset + API:ets id. Fotboll har
 * offset 0, så befintliga matcher och spel behåller sina id:n. Lag- och
 * liga-id:n lagras som API:ets egna och särskiljs med sportkolumnen.
 *
 * Ren modul utan importer — kopieras ordagrant till
 * supabase/functions/_shared/sports.ts. Håll dem i synk.
 */

export type SportSlug =
  | "football"
  | "hockey"
  | "basketball"
  | "american-football"
  | "baseball"
  | "handball"
  | "rugby"
  | "volleyball"
  | "afl"
  | "mma";

export type SportDef = {
  slug: SportSlug;
  /** Svensk etikett. fixtures.sport och bets.sport lagras med den här. */
  label: string;
  emoji: string;
  /** Standardadress. Kan skrivas över med env-variabeln i `urlEnv`. */
  baseUrl: string;
  urlEnv: string;
  /** Endpoint för matcher. */
  gamesPath: "/fixtures" | "/games" | "/fights";
  /** Provider i api_request_log och /admin/api-usage. */
  provider: string;
  /** Mappnamn på media.api-sports.io. */
  media: string;
  idOffset: number;
  /**
   * Kan ordinarie tid sluta oavgjort (1X2 avgörs då på ordinarie tid)?
   * Utan oavgjort avgörs matchvinnaren på slutresultatet inkl. förlängning.
   */
  regulationDraw: boolean;
  /** Skicka målnotiser vid ändrad ställning. Inte i poängsporter. */
  scoreNotices: boolean;
  /** Har sporten ligor i /leagues? MMA har bara viktklasser. */
  hasLeagues: boolean;
};

const ID_BLOCK = 1_000_000_000;

export const SPORTS: readonly SportDef[] = [
  {
    slug: "football",
    label: "Fotboll",
    emoji: "⚽",
    baseUrl: "https://v3.football.api-sports.io",
    urlEnv: "APISPORTS_FOOTBALL_URL",
    gamesPath: "/fixtures",
    provider: "api-football",
    media: "football",
    idOffset: 0,
    regulationDraw: true,
    scoreNotices: true,
    hasLeagues: true,
  },
  {
    slug: "hockey",
    label: "Ishockey",
    emoji: "🏒",
    baseUrl: "https://v1.hockey.api-sports.io",
    urlEnv: "APISPORTS_HOCKEY_URL",
    gamesPath: "/games",
    provider: "api-hockey",
    media: "hockey",
    idOffset: 1 * ID_BLOCK,
    regulationDraw: true,
    scoreNotices: true,
    hasLeagues: true,
  },
  {
    slug: "basketball",
    label: "Basket",
    emoji: "🏀",
    baseUrl: "https://v1.basketball.api-sports.io",
    urlEnv: "APISPORTS_BASKETBALL_URL",
    gamesPath: "/games",
    provider: "api-basketball",
    media: "basketball",
    idOffset: 2 * ID_BLOCK,
    regulationDraw: false,
    scoreNotices: false,
    hasLeagues: true,
  },
  {
    slug: "american-football",
    label: "Amerikansk fotboll",
    emoji: "🏈",
    baseUrl: "https://v1.american-football.api-sports.io",
    urlEnv: "APISPORTS_AMERICAN_FOOTBALL_URL",
    gamesPath: "/games",
    provider: "api-american-football",
    media: "american-football",
    idOffset: 3 * ID_BLOCK,
    regulationDraw: false,
    scoreNotices: false,
    hasLeagues: true,
  },
  {
    slug: "baseball",
    label: "Baseboll",
    emoji: "⚾",
    baseUrl: "https://v1.baseball.api-sports.io",
    urlEnv: "APISPORTS_BASEBALL_URL",
    gamesPath: "/games",
    provider: "api-baseball",
    media: "baseball",
    idOffset: 4 * ID_BLOCK,
    regulationDraw: false,
    scoreNotices: false,
    hasLeagues: true,
  },
  {
    slug: "handball",
    label: "Handboll",
    emoji: "🤾",
    baseUrl: "https://v1.handball.api-sports.io",
    urlEnv: "APISPORTS_HANDBALL_URL",
    gamesPath: "/games",
    provider: "api-handball",
    media: "handball",
    idOffset: 5 * ID_BLOCK,
    regulationDraw: true,
    scoreNotices: false,
    hasLeagues: true,
  },
  {
    slug: "rugby",
    label: "Rugby",
    emoji: "🏉",
    baseUrl: "https://v1.rugby.api-sports.io",
    urlEnv: "APISPORTS_RUGBY_URL",
    gamesPath: "/games",
    provider: "api-rugby",
    media: "rugby",
    idOffset: 6 * ID_BLOCK,
    regulationDraw: true,
    scoreNotices: false,
    hasLeagues: true,
  },
  {
    slug: "volleyball",
    label: "Volleyboll",
    emoji: "🏐",
    baseUrl: "https://v1.volleyball.api-sports.io",
    urlEnv: "APISPORTS_VOLLEYBALL_URL",
    gamesPath: "/games",
    provider: "api-volleyball",
    media: "volley", // ja, "volley" — inte "volleyball"
    idOffset: 7 * ID_BLOCK,
    regulationDraw: false,
    scoreNotices: false,
    hasLeagues: true,
  },
  {
    slug: "afl",
    label: "AFL",
    emoji: "🏉",
    baseUrl: "https://v1.afl.api-sports.io",
    urlEnv: "APISPORTS_AFL_URL",
    gamesPath: "/games",
    provider: "api-afl",
    media: "afl",
    idOffset: 8 * ID_BLOCK,
    regulationDraw: true,
    scoreNotices: false,
    hasLeagues: true,
  },
  {
    slug: "mma",
    label: "MMA",
    emoji: "🥊",
    baseUrl: "https://v1.mma.api-sports.io",
    urlEnv: "APISPORTS_MMA_URL",
    gamesPath: "/fights",
    provider: "api-mma",
    media: "mma",
    idOffset: 9 * ID_BLOCK,
    regulationDraw: false,
    scoreNotices: false,
    hasLeagues: false,
  },
] as const;

export const SPORT_SLUGS = SPORTS.map((s) => s.slug);
export const SPORT_LABELS = SPORTS.map((s) => s.label);

const BY_SLUG = new Map<string, SportDef>(SPORTS.map((s) => [s.slug, s]));

/** Alternativa stavningar som förekommer i äldre spel och importer. */
const ALIASES: Record<string, SportSlug> = {
  fotboll: "football",
  soccer: "football",
  ishockey: "hockey",
  "ice hockey": "hockey",
  basketboll: "basketball",
  nba: "basketball",
  "amerikansk fotboll": "american-football",
  "american football": "american-football",
  nfl: "american-football",
  baseboll: "baseball",
  mlb: "baseball",
  handboll: "handball",
  volleyboll: "volleyball",
  "australian football": "afl",
  ufc: "mma",
};

/** Sportens definition, eller null om värdet inte är en känd sport. */
export function findSport(value: string | null | undefined): SportDef | null {
  const v = (value || "").trim().toLowerCase();
  if (!v) return null;
  const direct = BY_SLUG.get(v);
  if (direct) return direct;
  const byLabel = SPORTS.find((s) => s.label.toLowerCase() === v);
  if (byLabel) return byLabel;
  const alias = ALIASES[v];
  if (alias) return BY_SLUG.get(alias)!;
  // Äldre data: "Hockey", "NHL-hockey" m.m.
  if (v.includes("hockey")) return BY_SLUG.get("hockey")!;
  return null;
}

/** Okänt eller tomt värde räknas som fotboll, som tidigare. */
export function sportDef(value: string | null | undefined): SportDef {
  return findSport(value) ?? BY_SLUG.get("football")!;
}

export function isSportSlug(value: string | null | undefined): value is SportSlug {
  return BY_SLUG.has((value || "").trim().toLowerCase());
}

/** Intern match-id (fixtures.fixture_id) för en match i ett visst API. */
export function encodeFixtureId(sport: SportSlug, apiId: number): number {
  return BY_SLUG.get(sport)!.idOffset + apiId;
}

/** API:ets egna match-id för en intern fixture_id. */
export function apiFixtureId(fixtureId: number): number {
  return fixtureId % ID_BLOCK;
}

/** Vilken sport en intern fixture_id tillhör, utläst ur id-intervallet. */
export function sportFromFixtureId(fixtureId: number): SportSlug {
  const block = Math.floor(fixtureId / ID_BLOCK);
  return SPORTS.find((s) => s.idOffset === block * ID_BLOCK)?.slug ?? "football";
}
