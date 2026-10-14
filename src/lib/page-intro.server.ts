import { cache } from "react";
import {
  INTRO_PAGES,
  introFromPageContent,
  type IntroPageSlug,
  type PageIntroContent,
} from "@/lib/page-intro";
import { createClient } from "@/lib/supabase/server";

/**
 * Sidans intro från CMS:et. Saknas sidan (eller är den avpublicerad) visas
 * standardtexten, så att en ny miljö aldrig står utan rubrik.
 */
export const fetchPageIntro = cache(async function fetchPageIntro(
  slug: IntroPageSlug
): Promise<PageIntroContent> {
  const fallback = INTRO_PAGES[slug].defaults;
  const supabase = await createClient();
  const { data } = await supabase
    .from("pages")
    .select("content")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (!data) return fallback;
  return introFromPageContent(String(data.content ?? ""), fallback);
});
