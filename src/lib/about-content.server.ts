import {
  aboutFromPageContent,
  DEFAULT_ABOUT,
  type AboutPage,
} from "@/lib/about-content";
import { createClient } from "@/lib/supabase/server";

export async function fetchAboutPage(): Promise<AboutPage> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pages")
    .select("title, content, seo_title, seo_description")
    .eq("slug", "om-oss")
    .eq("published", true)
    .maybeSingle();

  if (!data) {
    return {
      ...DEFAULT_ABOUT,
      title: "Om oss",
      seoTitle: "Om Spelbok",
      seoDescription: DEFAULT_ABOUT.intro.slice(0, 160),
    };
  }

  return {
    ...aboutFromPageContent(String(data.content ?? "")),
    title: data.title || "Om oss",
    seoTitle: data.seo_title,
    seoDescription: data.seo_description,
  };
}
