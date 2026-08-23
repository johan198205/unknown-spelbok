/**
 * Förbrukningslogg för API-Sports (api_request_log).
 *
 * API-Sports sparar ingen historik, så varje anrop loggas lokalt —
 * både externa requests och cache-träffar. /admin/api-usage läser
 * tabellen.
 *
 * Loggningen är fire-and-forget och får ALDRIG bromsa eller krascha
 * huvudflödet: allt är try/catch, inserten körs efter svaret via
 * `after()` när vi är i en request, och fel sväljs.
 *
 * Deno-motsvarigheten för Edge Functions ligger i
 * supabase/functions/_shared/log-request.ts.
 */

import { after } from "next/server";
import type { ApiSportsRequestEvent } from "@/lib/apisports";
import { createAdminClient } from "@/lib/supabase/admin";

export type ApiProvider = "api-football" | "api-hockey";

export type ApiRequestLogEntry = {
  provider: ApiProvider;
  endpoint: string;
  params?: Record<string, unknown> | null;
  statusCode?: number | null;
  /** true = serverad ur cachen, inget externt anrop gjordes. */
  cacheHit?: boolean;
  requestsRemaining?: number | null;
  requestsLimit?: number | null;
  responseTimeMs?: number | null;
};

type LogRow = {
  provider: string;
  endpoint: string;
  params: Record<string, string | number | boolean> | null;
  status_code: number | null;
  cache_hit: boolean;
  requests_remaining: number | null;
  requests_limit: number | null;
  response_time_ms: number | null;
};

/** Nyckeln ligger i headern, aldrig i params — men filtrera ändå. */
const SECRET_KEY = /key|token|secret|auth|apikey/i;
const MAX_PARAM_KEYS = 20;
const MAX_VALUE_LENGTH = 200;
/** Skydd mot minnesläckage om Supabase ligger nere en längre stund. */
const MAX_BUFFER = 500;

const buffer: LogRow[] = [];
let flushScheduled = false;

function hasServiceRole() {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/** '/fixtures' oavsett om anroparen skrev 'fixtures' eller '/fixtures/'. */
export function normalizeEndpoint(path: string) {
  const trimmed = String(path ?? "").trim().split("?")[0];
  if (!trimmed) return "/";
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const withoutTrailing = withSlash.replace(/\/+$/, "");
  return (withoutTrailing || "/").toLowerCase();
}

function sanitizeParams(
  params: Record<string, unknown> | null | undefined
): Record<string, string | number | boolean> | null {
  if (!params) return null;
  const out: Record<string, string | number | boolean> = {};
  let count = 0;

  for (const [key, value] of Object.entries(params)) {
    if (count >= MAX_PARAM_KEYS) break;
    if (value === undefined || value === null || value === "") continue;
    if (SECRET_KEY.test(key)) continue;

    if (typeof value === "number" || typeof value === "boolean") {
      out[key] = value;
    } else {
      out[key] = String(value).slice(0, MAX_VALUE_LENGTH);
    }
    count += 1;
  }

  return count ? out : null;
}

function intOrNull(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}

async function flush() {
  const rows = buffer.splice(0, buffer.length);
  if (!rows.length) return;

  try {
    await createAdminClient().from("api_request_log").insert(rows);
  } catch {
    /* loggen är sekundär — tappa raderna hellre än att kasta vidare */
  }
}

function scheduleFlush() {
  if (flushScheduled) return;
  flushScheduled = true;

  const run = () => {
    flushScheduled = false;
    return flush();
  };

  try {
    // after() håller serverless-funktionen vid liv tills inserten är klar,
    // utan att fördröja svaret till klienten.
    after(run);
  } catch {
    // Utanför request-scope (cron, script, unstable_cache): kör direkt.
    setTimeout(() => void run(), 0);
  }
}

/** Loggar ett anrop. Returnerar direkt — inserten sker efter svaret. */
export function logApiSportsRequest(entry: ApiRequestLogEntry) {
  try {
    if (!hasServiceRole()) return;
    if (buffer.length >= MAX_BUFFER) return;

    buffer.push({
      provider: entry.provider,
      endpoint: normalizeEndpoint(entry.endpoint),
      params: sanitizeParams(entry.params),
      status_code: intOrNull(entry.statusCode),
      cache_hit: entry.cacheHit === true,
      requests_remaining: intOrNull(entry.requestsRemaining),
      requests_limit: intOrNull(entry.requestsLimit),
      response_time_ms: intOrNull(entry.responseTimeMs),
    });

    scheduleFlush();
  } catch {
    /* aldrig kasta ur loggningen */
  }
}

/** Cache-träff: inget externt anrop gjordes, men behovet fanns. */
export function logApiSportsCacheHit(
  provider: ApiProvider,
  endpoint: string,
  params?: Record<string, unknown> | null
) {
  logApiSportsRequest({ provider, endpoint, params, cacheHit: true });
}

/** Kroken som fetch-wrappern i lib/apisports.ts anropar per externt anrop. */
export function apiSportsLogger(provider: ApiProvider) {
  return (event: ApiSportsRequestEvent) => {
    logApiSportsRequest({
      provider,
      endpoint: event.path,
      params: event.params,
      statusCode: event.status,
      cacheHit: false,
      requestsRemaining: event.requestsRemaining,
      requestsLimit: event.requestsLimit,
      responseTimeMs: event.responseTimeMs,
    });
  };
}
