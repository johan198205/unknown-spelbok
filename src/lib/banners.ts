import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Banner, BannerFormat, BannerPlacement } from "@/lib/types";

/**
 * Var i turordningen varje placering + format står just nu. Räknaren lever i
 * processen och nollställs när instansen byts ut — det gör inget, poängen är
 * att två laddningar i rad inte ska visa samma banner, inte att räkna exakt.
 */
const rotation = new Map<string, number>();

/**
 * Rotationen sker per sidvisning, inte per dygn: annonsörerna delar ytan lika
 * i stället för att en av dem äger den ett helt dygn.
 *
 * Spårningen påverkas inte. Både visning och klick loggas i klienten mot den
 * banner-id som faktiskt renderades (se BannerLink/BannerHtml), och cache()
 * nedan gör att en och samma placering aldrig kan byta banner mitt i en
 * rendering.
 */
function nextIndex(key: string, length: number) {
  const at = (rotation.get(key) ?? 0) % length;
  rotation.set(key, at + 1);
  return at;
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
    if (banners.length === 1) return banners[0];

    return banners[nextIndex(`${placement}:${format}`, banners.length)];
  }
);
