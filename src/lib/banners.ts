import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Banner, BannerFormat, BannerPlacement } from "@/lib/types";

/**
 * Rotation is keyed on the day of year so every render inside the same day
 * picks the same banner — otherwise the click logged by the browser could
 * belong to a different banner than the one the view was logged for.
 */
function dayOfYear(now = new Date()) {
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  return Math.floor((now.getTime() - start) / 86_400_000);
}

/**
 * Cached per request: a page may render the same placement twice for
 * responsive variants, and only one of them is ever visible.
 */
export const getBannerForPlacement = cache(
  async (
    placement: BannerPlacement,
    format: BannerFormat
  ): Promise<Banner | null> => {
    const supabase = await createClient();
    const nowIso = new Date().toISOString();

    const { data, error } = await supabase
      .from("banners")
      .select("*")
      .eq("placement", placement)
      .eq("active", true)
      .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
      .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
      .order("sort", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      console.error("getBannerForPlacement failed", error.message);
      return null;
    }

    // Formatet filtreras i JS, inte i frågan: en banner utan format (raden är
    // äldre än db/banner-format.sql) får fortsätta visas i alla ytor i stället
    // för att försvinna.
    const banners = ((data ?? []) as Banner[]).filter(
      (b) => (b.format ?? format) === format
    );
    if (!banners.length) return null;

    return banners[dayOfYear() % banners.length];
  }
);
