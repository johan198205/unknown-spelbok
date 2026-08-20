import { headers } from "next/headers";
import { SiteFooter, SiteHeader } from "@/components/layout/SiteHeader";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileChrome } from "@/components/layout/MobileChrome";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Bookmaker, Sheet } from "@/lib/types";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  const pathname = (await headers()).get("x-pathname") || "";
  const useAppChrome =
    !!profile &&
    (pathname.startsWith("/topplista") ||
      pathname.startsWith("/spelbolag") ||
      pathname.startsWith("/s/"));

  if (!useAppChrome) {
    return (
      <>
        <SiteHeader variant={profile ? "app" : "public"} />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </>
    );
  }

  const supabase = await createClient();
  const [{ data: bets }, { data: sheetRows }, { data: bookRows }] =
    await Promise.all([
      supabase
        .from("bets")
        .select("stake, payout, result")
        .eq("user_id", profile!.id),
      supabase
        .from("sheets")
        .select("*")
        .eq("user_id", profile!.id)
        .order("created_at", { ascending: true }),
      supabase.from("bookmakers").select("*").eq("active", true).order("rank").order("name"),
    ]);

  const settled = (bets || []).filter((b) => b.result !== "open");
  const netto = settled.reduce(
    (sum, b) => sum + Number(b.payout) - Number(b.stake),
    0
  );

  return (
    <>
      <div className="hidden lg:contents">
        <SiteHeader variant="app" />
      </div>
      <MobileHeader username={profile!.username} netto={netto} />
      <MobileChrome
        sheets={(sheetRows || []) as Sheet[]}
        bookmakers={(bookRows || []) as Bookmaker[]}
        initialBetCount={(bets || []).length}
      >
        <main className="mx-auto w-full max-w-[1360px] flex-1 px-4 py-4 pb-[calc(112px+env(safe-area-inset-bottom))] lg:px-0 lg:py-0 lg:pb-0">
          {children}
        </main>
      </MobileChrome>
      <div className="hidden lg:block">
        <SiteFooter />
      </div>
    </>
  );
}
