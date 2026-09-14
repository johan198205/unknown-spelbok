import { createClient } from "@/lib/supabase/server";

export type LandingHero = {
  title: string;
  body: string;
  seoTitle: string | null;
  seoDescription: string | null;
};

const DEFAULT_HERO: LandingHero = {
  title: "TA KONTROLL ÖVER\nDITT SPELANDE.",
  body: "Bokför varje spel, se din riktiga ROI och sluta gissa. Jämför dig med andra i topplistorna där bara siffrorna talar.",
  seoTitle: null,
  seoDescription: null,
};

/**
 * Hero-texter från CMS-sidan `startsida` (Admin → Sidor).
 * Saknas sidan eller är den opublicerad → defaults.
 */
export async function fetchLandingHero(): Promise<LandingHero> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pages")
    .select("title, content, seo_title, seo_description")
    .eq("slug", "startsida")
    .eq("published", true)
    .maybeSingle();

  if (!data) return DEFAULT_HERO;

  const title = (data.title || DEFAULT_HERO.title).trim();
  // Första stycket före ## / blockquote — resten är admin-hjälp i CMS.
  const body =
    String(data.content ?? "")
      .split(/\n{2,}/)
      .map((p: string) => p.trim())
      .find((p: string) => p && !p.startsWith("#") && !p.startsWith(">")) ||
    DEFAULT_HERO.body;

  // Bryt efter ÖVER om titeln är på en rad (samma look som tidigare).
  const displayTitle =
    title.includes("\n")
      ? title
      : title.replace(/\s+ÖVER\s+/i, " ÖVER\n");

  return {
    title: displayTitle,
    body: body.replace(/\s+/g, " ").trim(),
    seoTitle: data.seo_title,
    seoDescription: data.seo_description,
  };
}
