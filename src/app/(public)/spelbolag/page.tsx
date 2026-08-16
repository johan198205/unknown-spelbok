import { BookmakersGrid } from "@/components/bets/BookmakersGrid";
import { createClient } from "@/lib/supabase/server";
import type { Bookmaker } from "@/lib/types";

export default async function SpelbolagPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bookmakers")
    .select("*")
    .eq("active", true)
    .order("rank");

  const bookmakers = (data || []) as Bookmaker[];

  return (
    <div className="animate-sbfade mx-auto max-w-[1180px] px-7 py-10">
      <div className="mb-[18px] text-center">
        <h1 className="font-display mb-1.5 text-[34px] font-semibold">
          Topplista: Sveriges bästa spelbolag 2026
        </h1>
        <div className="text-[14.5px] text-muted">
          <span className="font-bold text-text">{bookmakers.length}</span>{" "}
          jämförda spelbolag
        </div>
      </div>
      <div className="mb-5 text-[12.5px] text-faint">
        Innehåller reklamlänkar · 18+ · Spela ansvarsfullt ·{" "}
        <a href="https://stodlinjen.se" target="_blank" rel="noopener noreferrer">
          Stödlinjen
        </a>{" "}
        ·{" "}
        <a href="https://spelpaus.se" target="_blank" rel="noopener noreferrer">
          Spelpaus
        </a>
      </div>
      <BookmakersGrid bookmakers={bookmakers} />
    </div>
  );
}
