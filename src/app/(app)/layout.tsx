import { after } from "next/server";
import { SiteFooter, SiteHeader } from "@/components/layout/SiteHeader";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileChrome } from "@/components/layout/MobileChrome";
import { touchLastSeen } from "@/lib/admin/last-seen";
import { getProfile } from "@/lib/auth";
import { getDisplayPrefs } from "@/lib/display-prefs";
import { createClient } from "@/lib/supabase/server";
import type { Bookmaker, Sheet } from "@/lib/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  // Bokföring, inte rendering — kör efter svaret så navigeringen inte väntar.
  if (profile) after(() => touchLastSeen(profile));
  const supabase = await createClient();
  const prefs = await getDisplayPrefs();

  let netto = 0;
  let betCount = 0;
  let sheets: Sheet[] = [];
  let bookmakers: Bookmaker[] = [];

  if (profile) {
    const [{ data: bets }, { data: sheetRows }, { data: bookRows }] =
      await Promise.all([
        supabase
          .from("bets")
          .select("stake, payout, result")
          .eq("user_id", profile.id),
        supabase
          .from("sheets")
          .select("*")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("bookmakers")
          .select("*")
          .eq("active", true)
          .order("rank")
          .order("name"),
      ]);

    const settled = (bets || []).filter((b) => b.result !== "open");
    netto = settled.reduce(
      (sum, b) => sum + Number(b.payout) - Number(b.stake),
      0
    );
    betCount = (bets || []).length;
    sheets = (sheetRows || []) as Sheet[];
    bookmakers = (bookRows || []) as Bookmaker[];
  }

  return (
    <>
      <div className="hidden lg:contents">
        <SiteHeader variant="app" />
      </div>
      <MobileHeader username={profile?.username} netto={netto} prefs={prefs} />

      <MobileChrome
        sheets={sheets}
        bookmakers={bookmakers}
        initialBetCount={betCount}
      >
        <main className="mx-auto w-full max-w-[1360px] flex-1 px-4 py-4 pb-[calc(112px+env(safe-area-inset-bottom))] lg:px-5 lg:py-6 lg:pb-6">
          {children}
        </main>
      </MobileChrome>

      <div className="hidden lg:block">
        <SiteFooter />
      </div>
    </>
  );
}
