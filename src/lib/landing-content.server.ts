import {
  DEFAULT_LANDING,
  DEFAULT_LANDING_TITLE,
  formatLandingTitle,
  landingFromPageContent,
  type LandingPage,
} from "@/lib/landing-content";
import { createClient } from "@/lib/supabase/server";

/**
 * Publika texter för `/` från CMS-sidan `startsida`.
 * Saknas sidan eller är den opublicerad → defaults.
 */
export async function fetchLandingPage(): Promise<LandingPage> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pages")
    .select("title, content, seo_title, seo_description")
    .eq("slug", "startsida")
    .eq("published", true)
    .maybeSingle();

  if (!data) {
    return {
      ...DEFAULT_LANDING,
      title: DEFAULT_LANDING_TITLE,
      seoTitle: null,
      seoDescription: null,
    };
  }

  return {
    ...landingFromPageContent(String(data.content ?? "")),
    title: formatLandingTitle(data.title || DEFAULT_LANDING_TITLE),
    seoTitle: data.seo_title,
    seoDescription: data.seo_description,
  };
}
