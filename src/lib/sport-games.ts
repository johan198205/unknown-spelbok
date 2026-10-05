/**
 * Matcher från v1-API:erna (/games, /fights) → samma form som API-Football.
 *
 * Varje sport har egen struktur för datum, status och resultat. Vi gör om
 * dem till ApiFixtureItem en gång, här, så att fixtures-raderna, rättningen,
 * livepollingen och gränssnittet kan läsa alla sporter likadant:
 *
 *   fixture.id          intern id (sportens offset + API:ets id, se sports.ts)
 *   fixture.status      översatt till fotbollens koder (NS, LIVE, HT, FT,
 *                       AET, PEN, PST, CANC, ABD, AWD, INT); originalkoden
 *                       ligger kvar i `source.status`
 *   goals               slutresultat inkl. förlängning
 *   score.fulltime      det 1X2 avgörs på: ordinarie tid i sporter som kan
 *                       sluta oavgjort, annars slutresultatet
 *
 * Originalsvaret sparas i `source` så inget går förlorat.
 *
 * Kopieras till supabase/functions/_shared/sport-games.ts (importen får .ts).
 */

import {
  chunk,
  DEFAULT_TIMEZONE,
  FIXTURE_IDS_PER_CALL,
  type ApiFixtureItem,
  type ApiSportsClient,
} from "./apisports";
import {
  apiFixtureId,
  encodeFixtureId,
  sportDef,
  type SportSlug,
} from "./sports";

type Num = number | null;

export type NormalizedGame = ApiFixtureItem & {
  source: { sport: SportSlug; id: number; status: string | null };
};

type Raw = Record<string, unknown>;

function obj(value: unknown): Raw {
  return value && typeof value === "object" ? (value as Raw) : {};
}

function num(value: unknown): Num {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function sum(values: Num[]): Num {
  if (values.some((v) => v == null)) return null;
  return (values as number[]).reduce((a, b) => a + b, 0);
}

/**
 * Översätter sportens statuskod till fotbollens. Okända pågående koder blir
 * LIVE; okänt i övrigt blir NS så att matchen inte rättas av misstag.
 */
export function normalizeStatus(short: string | null | undefined): string {
  const s = (short || "").toUpperCase().trim();
  switch (s) {
    case "":
      return "NS";
    case "NS":
    case "TBD":
      return s;
    case "FT":
      return "FT";
    case "AOT": // after overtime
    case "AET":
    case "AET2": // rugby: efter andra förlängningen
      return "AET";
    case "AP": // after penalties / shootout
    case "PEN":
      return "PEN";
    case "POST":
    case "PST":
    case "DELAYED":
      return "PST";
    case "CANC":
      return "CANC";
    case "ABD":
      return "ABD";
    case "AW": // awarded i hockey, handboll, rugby och volleyboll
    case "AWD":
      return "AWD";
    case "WO": // walkover (handboll) — MMA:s WO betyder annat, se normalizeMma
      return "WO";
    case "INTR": // interrupted
    case "SUSP":
    case "INT":
      return "INT";
    case "HT":
    case "BT":
      return s;
    case "OT": // overtime pågår
    case "ET":
    case "1OT":
    case "2OT":
      return "ET";
    case "PT": // penalty shootout pågår
    case "P":
      return "P";
    default:
      return "LIVE";
  }
}

function isFinished(status: string) {
  return ["FT", "AET", "PEN", "AWD", "WO"].includes(status);
}

/** Datum: antingen ISO-sträng i `date` eller {date, time, timestamp}. */
function isoDate(game: Raw): string {
  const ts = num(game.timestamp) ?? num(obj(game.date).timestamp);
  if (ts != null) return new Date(ts * 1000).toISOString();
  const d = game.date;
  if (typeof d === "string" && d) return new Date(d).toISOString();
  const nested = obj(d);
  const day = str(nested.date);
  if (day) return new Date(`${day}T${str(nested.time) ?? "00:00"}:00Z`).toISOString();
  return new Date(0).toISOString();
}

function team(value: unknown) {
  const t = obj(value);
  return {
    id: num(t.id) ?? 0,
    name: str(t.name) ?? "Okänt lag",
    logo: str(t.logo),
  };
}

function seasonYear(value: unknown): number {
  const direct = num(value);
  if (direct != null) return direct;
  // "2025-2026" → 2025
  const match = typeof value === "string" ? value.match(/\d{4}/) : null;
  return match ? Number(match[0]) : new Date().getUTCFullYear();
}

/** Ett lags slutresultat: tal eller objekt med total/score/points. */
function totalOf(value: unknown): Num {
  const direct = num(value);
  if (direct != null) return direct;
  const o = obj(value);
  return num(o.total) ?? num(o.score) ?? num(o.points);
}

/**
 * Ordinarie tid: summan av perioderna, när sporten kan sluta oavgjort och
 * matchen gick till förlängning. Annars samma som slutresultatet.
 */
function regulation(
  sport: SportSlug,
  game: Raw,
  final: { home: Num; away: Num },
  status: string
): { home: Num; away: Num } {
  const def = sportDef(sport);
  if (!def.regulationDraw || status === "FT") return final;
  if (status !== "AET" && status !== "PEN") return final;

  const periods = obj(game.periods);
  const keys =
    sport === "hockey" ? ["first", "second", "third"] : ["first", "second"];
  const home: Num[] = [];
  const away: Num[] = [];
  for (const key of keys) {
    // Perioder anges som "2-1" (hockey) eller {home, away}.
    const p = periods[key];
    if (typeof p === "string") {
      const m = p.match(/^\s*(\d+)\s*-\s*(\d+)\s*$/);
      home.push(m ? Number(m[1]) : null);
      away.push(m ? Number(m[2]) : null);
    } else {
      home.push(num(obj(p).home));
      away.push(num(obj(p).away));
    }
  }
  const reg = { home: sum(home), away: sum(away) };
  return reg.home != null && reg.away != null ? reg : final;
}

/** MMA: IN (intro), PF (pre-fight), WO (walkouts), EOR (ronden slut) = pågår. */
const MMA_LIVE = ["IN", "PF", "WO", "EOR", "LIVE"];

function normalizeMma(item: Raw): NormalizedGame {
  const rawShort = (str(obj(item.status).short) ?? "").toUpperCase();
  const status = MMA_LIVE.includes(rawShort) ? "LIVE" : normalizeStatus(rawShort);
  const fighters = obj(item.fighters);
  const first = obj(fighters.first);
  const second = obj(fighters.second);
  const apiId = num(item.id) ?? 0;
  // Ingen poäng i MMA — vinnaren blir 1–0 så att "1"/"2" kan avgöras.
  const winnerKnown = first.winner === true || second.winner === true;
  const home = winnerKnown ? (first.winner === true ? 1 : 0) : null;
  const away = winnerKnown ? (second.winner === true ? 1 : 0) : null;
  const finished = isFinished(status);
  const category = str(item.category) ?? "MMA";
  return {
    fixture: {
      id: encodeFixtureId("mma", apiId),
      date: isoDate(item),
      status: { short: status, long: str(obj(item.status).long) ?? undefined, elapsed: null },
      venue: null,
    },
    league: {
      id: 0,
      name: str(item.slug) ?? category,
      country: undefined,
      logo: null,
      season: seasonYear(isoDate(item).slice(0, 4)),
    },
    teams: {
      home: { id: num(first.id) ?? 0, name: str(first.name) ?? "Fighter 1", logo: str(first.logo) },
      away: { id: num(second.id) ?? 0, name: str(second.name) ?? "Fighter 2", logo: str(second.logo) },
    },
    goals: { home: finished ? home : null, away: finished ? away : null },
    score: { fulltime: { home: finished ? home : null, away: finished ? away : null } },
    source: { sport: "mma", id: apiId, status: str(obj(item.status).short) },
  };
}

/**
 * Gör om en match från sportens API till ApiFixtureItem-form.
 * Fotboll skickas igenom oförändrad (förutom `source`).
 */
export function normalizeGame(sport: SportSlug, raw: unknown): NormalizedGame {
  const item = obj(raw);

  if (sport === "football") {
    const f = item as unknown as ApiFixtureItem;
    return {
      ...f,
      source: { sport, id: f.fixture.id, status: f.fixture.status.short },
    };
  }

  if (sport === "mma") return normalizeMma(item);

  // Amerikansk fotboll har id, datum, status och arena under `game`; AFL
  // bara id:t (resten ligger på toppnivå). Slå ihop, `game` vinner.
  const game: Raw =
    item.game && typeof item.game === "object"
      ? { ...item, ...obj(item.game) }
      : item;
  const apiId = num(game.id) ?? 0;
  const statusObj = obj(game.status);
  const rawStatus = str(statusObj.short);
  const status = normalizeStatus(rawStatus);

  const scores = obj(item.scores);
  const final = {
    home: totalOf(scores.home),
    away: totalOf(scores.away),
  };
  const reg = regulation(sport, item, final, status);

  const league = obj(item.league);
  const country = obj(item.country ?? league.country);
  const venue = obj(game.venue);
  const timer = num(statusObj.timer) ?? num(game.timer);

  const date = isoDate(game);
  return {
    fixture: {
      id: encodeFixtureId(sport, apiId),
      date,
      timezone: str(game.timezone) ?? str(obj(game.date).timezone) ?? undefined,
      status: {
        short: status,
        long: str(statusObj.long) ?? undefined,
        elapsed: timer,
      },
      venue: str(venue.name)
        ? { name: str(venue.name), city: str(venue.city) }
        : typeof game.venue === "string"
          ? { name: game.venue as string, city: null }
          : null,
    },
    league: {
      id: num(league.id) ?? 0,
      // AFL skickar varken namn eller logga för ligan.
      name: str(league.name) ?? sportDef(sport).label,
      country: str(country.name) ?? undefined,
      logo: str(league.logo),
      season: seasonYear(league.season ?? date.slice(0, 4)),
    },
    teams: {
      home: team(obj(item.teams).home),
      away: team(obj(item.teams).away),
    },
    goals: final,
    score: {
      fulltime: isFinished(status) ? reg : { home: null, away: null },
    },
    source: { sport, id: apiId, status: rawStatus },
  };
}

/** Kalenderdygnet (YYYY-MM-DD) i Stockholm för en tidpunkt. */
export function stockholmDate(iso: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: DEFAULT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

/**
 * Alla matcher i en sport för ett kalenderdygn (Stockholmstid).
 * Ett anrop för v1-API:erna; fotboll pagas av klienten.
 */
export async function fetchGamesByDate(
  api: ApiSportsClient,
  sport: SportSlug,
  ymd: string
): Promise<NormalizedGame[]> {
  const items = await api.get<unknown>(sportDef(sport).gamesPath, {
    date: ymd,
    timezone: DEFAULT_TIMEZONE,
  });
  return items.map((item) => normalizeGame(sport, item));
}

/** En enskild match via API:ets id. */
async function fetchGameById(
  api: ApiSportsClient,
  sport: SportSlug,
  apiId: number
): Promise<NormalizedGame | null> {
  const items = await api.get<unknown>(sportDef(sport).gamesPath, {
    id: apiId,
    timezone: DEFAULT_TIMEZONE,
  });
  return items.length ? normalizeGame(sport, items[0]) : null;
}

/** Över så här många saknade matcher hämtar vi inte en och en. */
const MAX_SINGLE_LOOKUPS = 10;

/**
 * Färskt API-läge för sparade matcher, nycklat på intern fixture_id.
 *
 * Fotboll: /fixtures?ids=, 20 åt gången. Övriga sporter saknar ids-parametern
 * — där hämtas i stället hela dygnet för varje avsparksdatum (ett anrop
 * täcker alla matcher den dagen), och det som ändå saknas slås upp styckvis.
 */
export async function fetchGamesForFixtures(
  api: ApiSportsClient,
  sport: SportSlug,
  fixtures: { fixture_id: number; kickoff?: string | null }[]
): Promise<Map<number, NormalizedGame>> {
  const out = new Map<number, NormalizedGame>();
  if (!fixtures.length) return out;

  if (sport === "football") {
    for (const ids of chunk(
      fixtures.map((f) => f.fixture_id),
      FIXTURE_IDS_PER_CALL
    )) {
      const items = await api.get<ApiFixtureItem>("/fixtures", {
        ids: ids.join("-"),
        timezone: DEFAULT_TIMEZONE,
      });
      for (const item of items) {
        const game = normalizeGame("football", item);
        out.set(game.fixture.id, game);
      }
    }
    return out;
  }

  const wanted = new Set(fixtures.map((f) => f.fixture_id));
  const dates = [
    ...new Set(
      fixtures
        .map((f) => (f.kickoff ? stockholmDate(f.kickoff) : null))
        .filter((d): d is string => !!d)
    ),
  ];
  for (const ymd of dates) {
    for (const game of await fetchGamesByDate(api, sport, ymd)) {
      if (wanted.has(game.fixture.id)) out.set(game.fixture.id, game);
    }
  }

  const missing = fixtures
    .filter((f) => !out.has(f.fixture_id))
    .slice(0, MAX_SINGLE_LOOKUPS);
  for (const f of missing) {
    const game = await fetchGameById(api, sport, apiFixtureId(f.fixture_id));
    if (game) out.set(game.fixture.id, game);
  }
  return out;
}
