import { BookmakersGrid } from "@/components/bets/BookmakersGrid";
import { PageBodyContent, PageIntro } from "@/components/content/PageIntro";
import { isEditor } from "@/lib/coupons-server";
import { createClient } from "@/lib/supabase/server";
import type { Bookmaker } from "@/lib/types";

export default async function SpelbolagPage() {
  const supabase = await createClient();
  const [{ data }, editorMode] = await Promise.all([
    supabase.from("bookmakers").select("*").eq("active", true).order("rank"),
    isEditor(),
  ]);

  const bookmakers = (data || []) as Bookmaker[];

  // Ingen HTML-banner här: sidan är själva spelbolagslistan. Kort intro
  // överst, den längre SEO-texten efter listan.
  return (
    <div className="animate-sbfade mx-auto max-w-[1180px] px-4 py-6 sm:px-7 sm:py-10">
      <PageIntro slug="spelbolag" align="center" className="mb-[18px]" />
      <BookmakersGrid bookmakers={bookmakers} editorMode={editorMode} />
      <PageBodyContent slug="spelbolag" className="mt-12" />
    </div>
  );
}
