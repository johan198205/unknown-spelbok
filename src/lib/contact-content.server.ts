import {
  contactFromPageContent,
  DEFAULT_CONTACT,
  type ContactPage,
} from "@/lib/contact-content";
import { createClient } from "@/lib/supabase/server";

export async function fetchContactPage(): Promise<ContactPage> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pages")
    .select("title, content, seo_title, seo_description")
    .eq("slug", "kontakt")
    .eq("published", true)
    .maybeSingle();

  if (!data) {
    return {
      ...DEFAULT_CONTACT,
      title: "Kontakt",
      seoTitle: "Kontakta Spelbok",
      seoDescription: DEFAULT_CONTACT.intro.slice(0, 160),
    };
  }

  return {
    ...contactFromPageContent(String(data.content ?? "")),
    title: data.title || "Kontakt",
    seoTitle: data.seo_title,
    seoDescription: data.seo_description,
  };
}
