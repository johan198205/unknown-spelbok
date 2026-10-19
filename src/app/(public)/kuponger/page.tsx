import { redirect } from "next/navigation";
import { FEATURES } from "@/lib/features";
import type { Metadata } from "next";
import { CouponsView } from "@/components/coupons/CouponsView";
import { AdSlot } from "@/components/ui/AdSlot";
import { getSessionUser } from "@/lib/auth";
import type { AffiliateTopRow } from "@/lib/bet-stats";
import { couponRecord } from "@/lib/coupons";
import { copiedCouponIds, isEditor, listCoupons } from "@/lib/coupons-server";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/texts/server";
import type { Bookmaker } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("kuponger.meta.title"),
    description: t("kuponger.meta.description"),
  };
}

export default async function KupongerPage() {
  // Kuponger är avstängd tills vidare — speltipsen samlas på Planket.
  // Planket kräver inloggning, så utloggade skickas till startsidan.
  if (!FEATURES.coupons) redirect((await getSessionUser()) ? "/planket" : "/");
  const supabase = await createClient();

  const [coupons, user, editorMode, copied, { data: bookmakers }, t] =
    await Promise.all([
      listCoupons(),
      getSessionUser(),
      isEditor(),
      copiedCouponIds(),
      supabase
        .from("bookmakers")
        .select("*")
        .eq("active", true)
        .order("rank")
        .order("name"),
      getT(),
    ]);

  const affiliates: AffiliateTopRow[] = ((bookmakers || []) as Bookmaker[])
    .slice(0, 3)
    .map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      logo_url: b.logo_url,
      rank: b.rank,
      rating: b.rating,
      bonus_value: b.bonus_value,
      bonus: b.bonus,
      usp: b.usp,
      terms: b.terms,
    }));

  return (
    <div className="animate-sbfade mx-auto w-full max-w-[1360px] px-5 py-8">
      <AdSlot format="970x90" placement="kuponger" className="mb-6" />

      <header className="mb-[22px] max-w-[760px]">
        <h1 className="font-display mb-2 text-[34px] font-semibold uppercase tracking-[0.03em]">
          {t("kuponger.page.title")}
        </h1>
        <p className="text-[16px] leading-[1.6] text-muted [text-wrap:pretty]">
          {t("kuponger.page.intro")}
        </p>
      </header>

      <CouponsView
        coupons={coupons}
        record={couponRecord(coupons)}
        affiliates={affiliates}
        editorMode={editorMode}
        loggedIn={!!user}
        copiedIds={[...copied]}
      />
    </div>
  );
}
