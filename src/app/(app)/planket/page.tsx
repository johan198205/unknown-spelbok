import type { Metadata } from "next";
import { Avatar } from "@/components/planket/Bits";
import { PlanketFeed } from "@/components/planket/PlanketFeed";
import { PlanketSidebar } from "@/components/planket/PlanketSidebar";
import { ResponsibleBox } from "@/components/planket/ResponsibleBox";
import { getProfile } from "@/lib/auth";
import { fetchPlanketPage } from "@/lib/planket-server";
import { createClient } from "@/lib/supabase/server";
import type { Sheet } from "@/lib/types";

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

  const [page, sheetRows] = await Promise.all([
    fetchPlanketPage(),
    profile
      ? supabase
          .from("sheets")
          .select("*")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as Sheet[] }),
  ]);

  const sheets = (sheetRows.data ?? []) as Sheet[];

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
        {profile ? <Avatar username={profile.username} size={32} /> : null}
      </div>

      {/*
        Två fasta kolumner med 24 px mellanrum, båda uppifrån.

        Högerkolumnen kommer in vid `sheet` (1180 px), inte vid lg (1024 px).
        640 + 24 + 320 = 984, och med sidans 40 px vågräta padding blir det
        exakt 1024 — noll marginal. Ett synligt rullningslist hade räckt för
        att ge vågrät scroll. Korten byter däremot till desktopvarianten
        redan vid lg, där kolumnen har gott om plats.
      */}
      <div className="mx-auto flex w-full max-w-[1280px] items-start gap-6">
        <div className="w-full min-w-0 lg:max-w-[640px] sheet:w-[640px] sheet:max-w-none sheet:shrink-0">
          <h1 className="mb-4 hidden font-display text-[26px] font-semibold uppercase tracking-[0.06em] lg:block">
            Planket
          </h1>

          <PlanketFeed
            initialPosts={page.posts}
            initialCursor={page.nextCursor}
            initialHasMore={page.hasMore}
            username={profile?.username ?? null}
            sheets={sheets}
            isAuthenticated={!!profile}
            /*
              Ansvarsrutan är alltid synlig, aldrig bakom en flik. Under
              1180 px finns ingen högerkolumn, så då ligger den sist i
              flödet i stället.
            */
            footer={
              <div className="sheet:hidden">
                <ResponsibleBox />
              </div>
            }
          />
        </div>

        <PlanketSidebar />
      </div>
    </>
  );
}
