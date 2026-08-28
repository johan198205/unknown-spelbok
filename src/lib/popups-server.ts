import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { POPUP_COLUMNS, type Popup } from "@/lib/popups";

/**
 * Alla aktiva popups inom sitt tidsfönster.
 *
 * Sidan-för-sida-filtreringen görs INTE här. Root-layouten renderas bara
 * vid full sidladdning, så en serverfiltrering på sökväg hade gjort att
 * en popup bunden till /kuponger aldrig triggade när besökaren klickade
 * sig dit inifrån appen. Renderaren får hela listan (den är kort — några
 * rader med text och en bild-URL) och matchar mot usePathname().
 *
 * Cachad per request: layouten kan rendera om i samma svep.
 */
export const getActivePopups = cache(async function getActivePopups(): Promise<
  Popup[]
> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("popups")
    .select(POPUP_COLUMNS)
    .eq("active", true)
    .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
    .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
    .order("sort", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    // Tabellen saknas (db/popups.sql inte körd) ska inte krascha varje
    // sida i appen — då visas helt enkelt inga popups.
    console.warn("popups: kunde inte läsa", error.message);
    return [];
  }

  return (data ?? []) as unknown as Popup[];
});
