import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SpelbokSheetTabs } from "@/components/bets/SpelbokSheetTabs";
import { AdSlot } from "@/components/ui/AdSlot";
import type { Sheet } from "@/lib/types";

/**
 * Flikar + annonser ligger i layouten så de inte byts ut mot loading-skeleton
 * när man byter spelbok (?sheet=).
 */
export default async function SpelbokLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: sheets } = await supabase
    .from("sheets")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const sheetList = (sheets || []) as Sheet[];

  return (
    <div className="animate-sbfade">
      <div className="mb-[26px]">
        <AdSlot
          format="970x90"
          placement="sheet"
          className="hidden lg:flex"
        />
        <AdSlot
          format="320x100"
          placement="sheet"
          className="lg:hidden"
        />
      </div>

      {sheetList.length > 0 ? (
        <Suspense fallback={null}>
          <SpelbokSheetTabs
            sheets={sheetList}
            fallbackSheetId={sheetList[0]?.id ?? null}
          />
        </Suspense>
      ) : null}

      {children}
    </div>
  );
}
