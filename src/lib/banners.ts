import { cache } from "react";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Banner, BannerPlacement } from "@/lib/types";

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
  async (placement: BannerPlacement): Promise<Banner | null> => {
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

    const banners = (data ?? []) as Banner[];
    if (!banners.length) return null;

    return banners[dayOfYear() % banners.length];
  }
);

/**
 * Cached for the same reason, so one request counts one impression. The
 * client is built up front because `after` callbacks in a Server Component
 * may not touch request APIs such as `cookies()`.
 */
export const logBannerView = cache(async (bannerId: string) => {
  const supabase = await createClient();
  after(async () => {
    const { error } = await supabase
      .from("banner_events")
      .insert({ banner_id: bannerId, event: "view" });
    if (error) console.error("logBannerView failed", error.message);
  });
});
