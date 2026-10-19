import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import {
  createT,
  parseTextOverrides,
  TEXTS_CACHE_TAG,
  TEXTS_SETTINGS_KEY,
  type TextOverrides,
} from "./index";

/**
 * Texterna läses på varje sidvisning (rot-layouten, generateMetadata och
 * serverkomponenter). Cachea, och låt admin invalidera via taggen. Egen klient
 * utan kakor: unstable_cache får inte röra cookies().
 */
async function readOverrides(): Promise<TextOverrides> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return {};

  const read = async (key: string) => {
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await client
      .from("app_settings")
      .select("value")
      .eq("key", TEXTS_SETTINGS_KEY)
      .maybeSingle();
    return (data as { value: unknown } | null) ?? null;
  };

  try {
    // Utan db/site-texts.sql är nyckeln inte läsbar för anon — fall tillbaka
    // på service role så texterna slår igenom ändå.
    const row = await read(anonKey);
    if (row) return parseTextOverrides(row.value);
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) return {};
    const fallback = await read(serviceKey);
    return fallback ? parseTextOverrides(fallback.value) : {};
  } catch {
    // Fail open: standardtexterna i koden räcker för att visa sidan.
    return {};
  }
}

export const getTextOverrides = unstable_cache(readOverrides, ["site-texts"], {
  revalidate: 300,
  tags: [TEXTS_CACHE_TAG],
});

/**
 * t() för serverkomponenter, generateMetadata, route handlers och server
 * actions: `const t = await getT();`. Klientkomponenter använder useT().
 */
export const getT = cache(async () => createT(await getTextOverrides()));
