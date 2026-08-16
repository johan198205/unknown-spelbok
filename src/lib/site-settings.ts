import {
  createClient as createServiceClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

/**
 * app_settings-nyckeln 'site' styr publika delar av appen: namn, valuta,
 * öppen registrering och underhållsläge. Läses av middleware, registrera-sidan
 * och admin. Håll modulen fri från next/headers så middleware kan importera den.
 */

export const SITE_SETTINGS_KEY = "site";

export type SiteSettings = {
  name: string;
  currency: string;
  registrations_open: boolean;
  maintenance: boolean;
};

export const SITE_DEFAULTS: SiteSettings = {
  name: "Spelbok",
  currency: "SEK",
  registrations_open: true,
  maintenance: false,
};

function boolOf(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function stringOf(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function parseSiteSettings(value: unknown): SiteSettings {
  const raw = (value ?? {}) as Record<string, unknown>;
  return {
    name: stringOf(raw.name, SITE_DEFAULTS.name),
    currency: stringOf(raw.currency, SITE_DEFAULTS.currency),
    registrations_open: boolOf(
      raw.registrations_open,
      SITE_DEFAULTS.registrations_open
    ),
    maintenance: boolOf(raw.maintenance, SITE_DEFAULTS.maintenance),
  };
}

type AnyClient = SupabaseClient<never, never, never>;

async function readRow(client: AnyClient) {
  const { data } = await client
    .from("app_settings")
    .select("value")
    .eq("key", SITE_SETTINGS_KEY)
    .maybeSingle();
  return (data as { value: unknown } | null) ?? null;
}

/**
 * Läser inställningarna med den klient som skickas in. RLS måste tillåta
 * anonym läsning av nyckeln 'site' (se db/site-settings-policy.sql) —
 * annars faller vi tillbaka på service role när nyckeln finns i miljön.
 */
export async function fetchSiteSettings(
  client: SupabaseClient
): Promise<SiteSettings> {
  try {
    const row = await readRow(client as unknown as AnyClient);
    if (row) return parseSiteSettings(row.value);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return SITE_DEFAULTS;

    const service = createServiceClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const fallback = await readRow(service as unknown as AnyClient);
    return fallback ? parseSiteSettings(fallback.value) : SITE_DEFAULTS;
  } catch {
    // Fail open: en trasig läsning ska inte låsa ut hela sajten.
    return SITE_DEFAULTS;
  }
}

const CACHE_MS = 30_000;
let cache: { at: number; value: SiteSettings } | null = null;

/** Middleware körs på varje request — cachea kort istället för att fråga varje gång. */
export async function fetchSiteSettingsCached(
  client: SupabaseClient
): Promise<SiteSettings> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  const value = await fetchSiteSettings(client);
  cache = { at: Date.now(), value };
  return value;
}
