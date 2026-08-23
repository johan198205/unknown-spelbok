import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";

/**
 * app_settings-nyckeln 'tracking' håller marknadsföringsspårningen. Just nu
 * bara GTM-containern; id:t är inte hemligt (det syns i klienten ändå), så
 * nyckeln är läsbar för alla — se db/tracking-migration.sql.
 *
 * Modulen hålls fri från next/headers så den kan läsas från rot-layouten
 * innanför unstable_cache, som inte får röra request-API:er.
 */

export const TRACKING_SETTINGS_KEY = "tracking";

/** Cache-taggen som admin invaliderar när containern ändras. */
export const TRACKING_CACHE_TAG = "tracking-settings";

export const GTM_ID_PATTERN = /^GTM-[A-Z0-9]+$/;

export type TrackingSettings = {
  /** Tomt = GTM inaktiverat. */
  gtm_container_id: string;
};

export const TRACKING_DEFAULTS: TrackingSettings = {
  gtm_container_id: "",
};

export function normalizeGtmId(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toUpperCase();
}

export function parseTrackingSettings(value: unknown): TrackingSettings {
  const raw = (value ?? {}) as Record<string, unknown>;
  const id = normalizeGtmId(raw.gtm_container_id);
  // Ett trasigt värde ska inte injicera skräp i sidhuvudet.
  return { gtm_container_id: GTM_ID_PATTERN.test(id) ? id : "" };
}

/**
 * Läses på varje sidvisning via rot-layouten — cachea i 60 s så det inte blir
 * en databasrundtur per request. Egen anon-klient utan kakor: unstable_cache
 * får inte röra cookies().
 */
export const getGtmContainerId = unstable_cache(
  async (): Promise<string> => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return "";

    try {
      const client = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data } = await client
        .from("app_settings")
        .select("value")
        .eq("key", TRACKING_SETTINGS_KEY)
        .maybeSingle();

      return parseTrackingSettings((data as { value: unknown } | null)?.value)
        .gtm_container_id;
    } catch {
      // Fail open: en trasig läsning ska inte krascha varje sida.
      return "";
    }
  },
  ["tracking-settings"],
  { revalidate: 60, tags: [TRACKING_CACHE_TAG] }
);
