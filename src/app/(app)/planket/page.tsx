import type { Metadata } from "next";
import { Avatar } from "@/components/planket/Bits";
import { PlanketFeed } from "@/components/planket/PlanketFeed";
import { PlanketSidebar } from "@/components/planket/PlanketSidebar";
import { getProfile } from "@/lib/auth";
import { fetchPlanketPage } from "@/lib/planket-server";
import { createClient } from "@/lib/supabase/server";
import type { Bookmaker, Sheet } from "@/lib/types";

export const metadata: Metadata = {
  title: "Planket",
  description:
    "Community-flödet i Spelbok. Användare postar spel och kuponger ur sin egen spelbok — och andra kan rygga dem.",
};

// Flödet ändras hela tiden och är personligt (egna reaktioner, egna
// ryggningar). Ingen cache.
export const dynamic = "force-dynamic";

export default async function PlanketPage() {
  const profile = await getProfile();
  const supabase = await createClient();

  const [page, sheetRows, bookRows] = await Promise.all([
    fetchPlanketPage(),
    profile
      ? supabase
          .from("sheets")
          .select("*")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as Sheet[] }),
    profile
      ? supabase
          .from("bookmakers")
          .select("*")
          .eq("active", true)
          .order("rank")
          .order("name")
      : Promise.resolve({ data: [] as Bookmaker[] }),
  ]);

  const sheets = (sheetRows.data ?? []) as Sheet[];
  const bookmakers = (bookRows.data ?? []) as Bookmaker[];

  return (
    <>
      {/*
        Mobilens sidhuvud. Appens globala MobileHeader visar SPELBOK och
        klockan; den här säger vilken sida man står på.
      */}
      <div className="-mx-4 mb-3 flex items-center justify-between border-b border-line-soft px-4 pb-3 lg:hidden">
        <h1 className="font-display text-[19px] font-semibold uppercase tracking-[0.08em]">
          Planket
        </h1>
        {profile ? <Avatar username={profile.username} src={profile.avatar_url} size={32} /> : null}
      </div>

      <h1 className="mb-4 hidden font-display text-[26px] font-semibold uppercase tracking-[0.06em] lg:block">
        Planket
      </h1>

      {/*
        Två fasta kolumner med 24 px mellanrum. Rubriken ligger ovanför båda,
        så första bannern börjar i linje med första rutan i flödet.

        Flödet fyller samma bredd som övriga sidor (layoutens 1360 px) och
        högerkolumnen är en banner bred (160 px) från lg.
        Högerkolumnen är annonsyta (160×600, se PlanketSidebar).
      */}
      <div className="flex w-full gap-6">
        <div className="w-full min-w-0 flex-1">

          <PlanketFeed
            initialPosts={page.posts}
            initialCursor={page.nextCursor}
            initialHasMore={page.hasMore}
            username={profile?.username ?? null}
            avatarUrl={profile?.avatar_url ?? null}
            sheets={sheets}
            bookmakers={bookmakers}
            isAuthenticated={!!profile}
          />
        </div>

        <PlanketSidebar />
      </div>
    </>
  );
}
