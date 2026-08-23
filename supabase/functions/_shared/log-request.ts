/**
 * Förbrukningslogg för API-Sports i Edge Functions (api_request_log).
 *
 * Cron-jobben (poll-live, sync-fixtures, settle-results) står för
 * merparten av anropen mot API-Sports — utan den här loggen visar
 * /admin/api-usage bara den lilla del som Next.js gör.
 *
 * Fire-and-forget: inserten awaitas aldrig i huvudflödet, och fel
 * sväljs. Deno-motsvarigheten till src/lib/api-sports/logRequest.ts.
 */

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import type { ApiSportsRequestEvent } from "./apisports.ts";
import { createServiceClient } from "./supabase.ts";

export type ApiProvider = "api-football" | "api-hockey";

/** Nyckeln ligger i headern, aldrig i params — men filtrera ändå. */
const SECRET_KEY = /key|token|secret|auth|apikey/i;
const MAX_PARAM_KEYS = 20;
const MAX_VALUE_LENGTH = 200;

let client: SupabaseClient | null = null;

function serviceClient() {
  if (!client) client = createServiceClient();
  return client;
}

function normalizeEndpoint(path: string) {
  const trimmed = String(path ?? "").trim().split("?")[0];
  if (!trimmed) return "/";
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return (withSlash.replace(/\/+$/, "") || "/").toLowerCase();
}

function sanitizeParams(
  params: Record<string, string | number | boolean | undefined>
) {
  const out: Record<string, string | number | boolean> = {};
  let count = 0;

  for (const [key, value] of Object.entries(params ?? {})) {
    if (count >= MAX_PARAM_KEYS) break;
    if (value === undefined || value === null || value === "") continue;
    if (SECRET_KEY.test(key)) continue;
    out[key] =
      typeof value === "number" || typeof value === "boolean"
        ? value
        : String(value).slice(0, MAX_VALUE_LENGTH);
    count += 1;
  }

  return count ? out : null;
}

/** Håller invocationen vid liv tills inserten är klar, när runtimen stödjer det. */
function keepAlive(promise: PromiseLike<unknown>) {
  const runtime = (globalThis as {
    EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void };
  }).EdgeRuntime;
  try {
    // PostgrestBuilder är bara PromiseLike — waitUntil vill ha en riktig Promise.
    runtime?.waitUntil?.(Promise.resolve(promise));
  } catch {
    /* ingen waitUntil i den här runtimen */
  }
}

/** Kroken som fetch-wrappern anropar per externt anrop. */
export function apiSportsLogger(provider: ApiProvider) {
  return (event: ApiSportsRequestEvent) => {
    try {
      const insert = serviceClient()
        .from("api_request_log")
        .insert({
          provider,
          endpoint: normalizeEndpoint(event.path),
          params: sanitizeParams(event.params),
          status_code: event.status,
          cache_hit: false,
          requests_remaining: event.requestsRemaining,
          requests_limit: event.requestsLimit,
          response_time_ms: event.responseTimeMs,
        })
        .then(
          () => {},
          () => {}
        );
      keepAlive(insert);
    } catch {
      /* loggen är sekundär — aldrig kasta ur den */
    }
  };
}

/** Cache-träff: behovet fanns, men inget externt anrop gjordes. */
export function logCacheHit(
  provider: ApiProvider,
  endpoint: string,
  params: Record<string, string | number | boolean | undefined> = {}
) {
  try {
    const insert = serviceClient()
      .from("api_request_log")
      .insert({
        provider,
        endpoint: normalizeEndpoint(endpoint),
        params: sanitizeParams(params),
        cache_hit: true,
      })
      .then(
        () => {},
        () => {}
      );
    keepAlive(insert);
  } catch {
    /* loggen är sekundär */
  }
}
