/**
 * Delad API-Sports-klient (API-Football v3 / API-Hockey v3).
 *
 * Används av Edge Functions (kopia i supabase/functions/_shared/apisports.ts)
 * och eventuella serverscript. Route handlers i Next.js ska ALDRIG anropa
 * det externa API:et — de läser bara Supabase-cachen.
 *
 * Sport-agnostisk: skicka in rätt base-URL.
 *   football → APISPORTS_FOOTBALL_URL (https://v3.football.api-sports.io)
 *   hockey   → APISPORTS_HOCKEY_URL   (https://v3.hockey.api-sports.io)
 *
 * Håll i synk med supabase/functions/_shared/apisports.ts.
 */

export const DEFAULT_TIMEZONE = "Europe/Stockholm";
export const MAX_REQUESTS_PER_MINUTE = 8;
export const FIXTURE_IDS_PER_CALL = 20;
export const DEFAULT_FOOTBALL_URL = "https://v3.football.api-sports.io";
export const DEFAULT_HOCKEY_URL = "https://v3.hockey.api-sports.io";

export type SportSlug = "football" | "hockey";

export type ApiSportsPaging = {
  current: number;
  total: number;
};

export type ApiSportsEnvelope<T> = {
  get?: string;
  parameters?: Record<string, unknown>;
  errors: unknown;
  results?: number;
  paging?: ApiSportsPaging;
  response: T[];
};

export type ApiTeam = {
  id: number;
  name: string;
  logo: string | null;
};

export type ApiFixtureItem = {
  fixture: {
    id: number;
    date: string;
    timezone?: string;
    status: { short: string; long?: string; elapsed?: number | null; extra?: number | null };
    venue?: { name?: string | null; city?: string | null } | null;
    referee?: string | null;
  };
  league: {
    id: number;
    name: string;
    country?: string;
    logo?: string | null;
    season: number;
  };
  teams: {
    home: ApiTeam;
    away: ApiTeam;
  };
  goals: { home: number | null; away: number | null };
  score?: {
    halftime?: { home: number | null; away: number | null };
    fulltime?: { home: number | null; away: number | null };
    extratime?: { home: number | null; away: number | null };
    penalty?: { home: number | null; away: number | null };
  };
};

export type ApiLeagueItem = {
  league: { id: number; name: string; logo?: string | null };
  country?: { name?: string };
  seasons?: { year: number; current?: boolean }[];
};

export type ApiTeamItem = {
  team: ApiTeam;
};

export class ApiSportsError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly body?: unknown
  ) {
    super(message);
    this.name = "ApiSportsError";
  }
}

export type ApiSportsConfig = {
  baseUrl: string;
  apiKey: string;
  /** Max anrop per minut. Free plan är 10; vi håller oss till 8 med marginal. */
  maxPerMinute?: number;
  timezone?: string;
};

export type ApiSportsClient = {
  get: <T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>
  ) => Promise<T[]>;
  /** Första sidans `response` som den är (objekt eller lista). */
  getResponse: <T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>
  ) => Promise<T>;
  requestCount: () => number;
};

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function formatErrors(errors: unknown): string {
  if (!errors) return "okänt API-fel";
  if (Array.isArray(errors)) {
    if (!errors.length) return "";
    return errors
      .map((e) => (typeof e === "string" ? e : JSON.stringify(e)))
      .join("; ");
  }
  if (typeof errors === "object") {
    const entries = Object.entries(errors as Record<string, unknown>);
    if (!entries.length) return "";
    return entries
      .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
      .join("; ");
  }
  return String(errors);
}

/** HTTP 200 kan bära fel i `errors`. Tom array/tomt objekt = OK. */
export function assertApiSportsOk(json: {
  errors?: unknown;
}, httpStatus: number) {
  const message = formatErrors(json.errors);
  if (message) {
    throw new ApiSportsError(
      `API-Sports-fel (HTTP ${httpStatus}): ${message}`,
      httpStatus,
      json
    );
  }
}

function authHeaders(baseUrl: string, apiKey: string): Record<string, string> {
  const host = (() => {
    try {
      return new URL(baseUrl).host;
    } catch {
      return "";
    }
  })();

  if (/rapidapi\.com$/i.test(host)) {
    return {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": host,
    };
  }

  return { "x-apisports-key": apiKey };
}

function withParams(
  baseUrl: string,
  path: string,
  params: Record<string, string | number | boolean | undefined>
) {
  const url = new URL(path.replace(/^\//, ""), baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    url.searchParams.set(key, String(value));
  }
  return url;
}

/**
 * Skapar en klient med rate limit (max 8/min), retry (3 försök vid
 * nätverksfel/429) och automatisk paging (`paging.total > 1`).
 */
export function createApiSportsClient(config: ApiSportsConfig): ApiSportsClient {
  const maxPerMinute = config.maxPerMinute ?? MAX_REQUESTS_PER_MINUTE;
  const minIntervalMs = Math.ceil(60_000 / maxPerMinute);
  const headers = {
    Accept: "application/json",
    ...authHeaders(config.baseUrl, config.apiKey),
  };

  let lastRequestAt = 0;
  let requests = 0;

  async function throttle() {
    const wait = lastRequestAt + minIntervalMs - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
  }

  async function fetchPage(
    path: string,
    params: Record<string, string | number | boolean | undefined>
  ): Promise<ApiSportsEnvelope<unknown>> {
    const url = withParams(config.baseUrl, path, params);
    let lastError: unknown;

    for (let attempt = 1; attempt <= 3; attempt++) {
      await throttle();
      requests += 1;

      try {
        const res = await fetch(url, { headers });

        if (res.status === 429) {
          const retryAfter = Number(res.headers.get("retry-after"));
          const backoff = Number.isFinite(retryAfter)
            ? retryAfter * 1000
            : 5000 * attempt;
          lastError = new ApiSportsError(`429 rate limit`, 429);
          await sleep(backoff);
          continue;
        }

        const json = (await res.json()) as ApiSportsEnvelope<unknown>;
        assertApiSportsOk(json, res.status);

        if (!res.ok) {
          throw new ApiSportsError(
            `API-Sports HTTP ${res.status}`,
            res.status,
            json
          );
        }

        return json;
      } catch (err) {
        lastError = err;
        const retryable =
          err instanceof ApiSportsError
            ? err.status === 429 || (err.status != null && err.status >= 500)
            : true;
        if (!retryable || attempt === 3) throw err;
        await sleep(1000 * attempt);
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new ApiSportsError("API-Sports: slut på försök");
  }

  async function get<T>(
    path: string,
    params: Record<string, string | number | boolean | undefined> = {}
  ): Promise<T[]> {
    const items: T[] = [];
    let page = 1;
    let total = 1;

    while (page <= total) {
      const json = await fetchPage(
        path,
        page === 1 && total === 1 ? params : { ...params, page }
      );
      items.push(...((json.response ?? []) as T[]));
      total = Math.max(1, json.paging?.total ?? 1);
      page += 1;
    }

    return items;
  }

  async function getResponse<T>(
    path: string,
    params: Record<string, string | number | boolean | undefined> = {}
  ): Promise<T> {
    const json = await fetchPage(path, params);
    return json.response as T;
  }

  return {
    get,
    getResponse,
    requestCount: () => requests,
  };
}

export function footballClientFromEnv(env: {
  get: (key: string) => string | undefined;
}): ApiSportsClient {
  const apiKey = env.get("APISPORTS_KEY") || env.get("APIFOOTBALL_KEY");
  if (!apiKey) {
    throw new ApiSportsError(
      "APISPORTS_KEY saknas (fallback APIFOOTBALL_KEY tom)"
    );
  }
  return createApiSportsClient({
    baseUrl: env.get("APISPORTS_FOOTBALL_URL") || DEFAULT_FOOTBALL_URL,
    apiKey,
  });
}

export function hockeyClientFromEnv(env: {
  get: (key: string) => string | undefined;
}): ApiSportsClient {
  const apiKey = env.get("APISPORTS_KEY") || env.get("APIFOOTBALL_KEY");
  if (!apiKey) {
    throw new ApiSportsError("APISPORTS_KEY saknas");
  }
  return createApiSportsClient({
    baseUrl: env.get("APISPORTS_HOCKEY_URL") || DEFAULT_HOCKEY_URL,
    apiKey,
  });
}

export function clientForSport(
  sport: SportSlug,
  env: { get: (key: string) => string | undefined }
): ApiSportsClient {
  return sport === "hockey" ? hockeyClientFromEnv(env) : footballClientFromEnv(env);
}

/** Svensk UI-etikett ↔ intern slug. Fixtures.sport lagras som UI-etikett. */
export function sportLabel(slug: string): string {
  if (slug === "football" || slug === "Fotboll") return "Fotboll";
  if (slug === "hockey" || slug === "Ishockey") return "Ishockey";
  return slug;
}

export function sportSlug(value: string): SportSlug {
  const v = value.toLowerCase();
  if (v === "ishockey" || v === "hockey") return "hockey";
  return "football";
}

/**
 * Status → intern handling vid settling.
 *
 * FT/AET/PEN  slutspelad → settling
 * AWD/WO      tilldömd/walkover → settling + adminflagga
 * PST/TBD     uppskjuten → rör inte spelen, uppdatera kickoff
 * CANC/ABD    inställd/avbruten → void
 * övriga      ej färdig
 */
export const STATUS = {
  final: ["FT", "AET", "PEN"] as const,
  awarded: ["AWD", "WO"] as const,
  postponed: ["PST", "TBD"] as const,
  voided: ["CANC", "ABD"] as const,
  live: ["NS", "1H", "HT", "2H", "ET", "BT", "P", "LIVE"] as const,
};

export type StatusBucket = "final" | "awarded" | "postponed" | "voided" | "pending";

export function statusBucket(short: string): StatusBucket {
  if ((STATUS.final as readonly string[]).includes(short)) return "final";
  if ((STATUS.awarded as readonly string[]).includes(short)) return "awarded";
  if ((STATUS.postponed as readonly string[]).includes(short)) return "postponed";
  if ((STATUS.voided as readonly string[]).includes(short)) return "voided";
  return "pending";
}

export const TERMINAL_STATUSES = [
  ...STATUS.final,
  ...STATUS.awarded,
  ...STATUS.voided,
] as const;

/**
 * 1X2 och Över/Under i v1 avser ordinarie tid (90 min).
 *
 * Vid AET/PEN är `goals` det aggregerade resultatet inkl. förlängning
 * (straffmål ligger i `score.penalty` och räknas inte in i goals).
 * Klassisk matchvinnare ska därför läsas ur `score.fulltime`.
 * Om fulltime saknas (pågående match) faller vi tillbaka på `goals`.
 */
export function regulationScore(item: ApiFixtureItem): {
  home: number;
  away: number;
} | null {
  const ftHome = item.score?.fulltime?.home;
  const ftAway = item.score?.fulltime?.away;
  if (ftHome != null && ftAway != null) return { home: ftHome, away: ftAway };

  const bucket = statusBucket(item.fixture.status.short);
  if (bucket === "final" || bucket === "awarded") {
    const home = item.goals.home;
    const away = item.goals.away;
    if (home != null && away != null) return { home, away };
  }

  return null;
}

export function currentScore(item: ApiFixtureItem): {
  home: number | null;
  away: number | null;
} {
  const reg = regulationScore(item);
  if (reg) return reg;
  return { home: item.goals.home, away: item.goals.away };
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
