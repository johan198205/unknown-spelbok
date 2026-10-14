import type { Metadata } from "next";
import { PageBodyContent, PageIntro } from "@/components/content/PageIntro";
import { PlanketFeed } from "@/components/planket/PlanketFeed";
import { PlanketSidebar } from "@/components/planket/PlanketSidebar";
import { BannerCreative, hasCreative } from "@/components/ui/AdSlot";
import { getBannersForPlacement } from "@/lib/banners";
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

  const [page, sheetRows, bookRows, feedBanners] = await Promise.all([
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
    fetchFeedBanners(),
  ]);

  // Mobilens annonser i flödet, renderade här på servern och lämnade till
  // flödet som färdiga noder.
  const feedAds = feedBanners.map((banner) => (
    <BannerCreative key={banner.id} banner={banner} placement="planket" />
  ));

  const sheets = (sheetRows.data ?? []) as Sheet[];
  const bookmakers = (bookRows.data ?? []) as Bookmaker[];

  return (
    <>
      <PageIntro slug="planket" className="mb-4" />

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
            feedAds={feedAds}
          />
        </div>

        <PlanketSidebar />
      </div>

      <PageBodyContent slug="planket" className="mt-10" />
    </>
  );
}

/**
 * 300×250 på placeringen Planket. Tills sådana lagts in under
 * /admin/banners lånas startsidans 300×250, så flödet aldrig står utan.
 */
async function fetchFeedBanners() {
  const own = (await getBannersForPlacement("planket", "300x250")).filter(
    hasCreative
  );
  if (own.length) return own;
  return (await getBannersForPlacement("home", "300x250")).filter(hasCreative);
}
