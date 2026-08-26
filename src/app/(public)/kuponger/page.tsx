import type { Metadata } from "next";
import { CouponsView } from "@/components/coupons/CouponsView";
import { AdSlot } from "@/components/ui/AdSlot";
import { getSessionUser } from "@/lib/auth";
import type { AffiliateTopRow } from "@/lib/bet-stats";
import { couponRecord } from "@/lib/coupons";
import { copiedCouponIds, isEditor, listCoupons } from "@/lib/coupons-server";
import { createClient } from "@/lib/supabase/server";
import type { Bookmaker } from "@/lib/types";

export const metadata: Metadata = {
  title: "Kuponger",
  description:
    "Redaktionens spelförslag med motivering, insats och rekommenderat spelbolag.",
};

export default async function KupongerPage() {
  const supabase = await createClient();

  const [coupons, user, editorMode, copied, { data: bookmakers }] =
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
      <AdSlot format="970x90" placement="kuponger" className="mb-6 h-[90px]" />

      <header className="mb-[22px] max-w-[760px]">
        <h1 className="font-display mb-2 text-[34px] font-semibold uppercase tracking-[0.03em]">
          Kuponger
        </h1>
        <p className="mb-2.5 text-[16px] leading-[1.6] text-muted [text-wrap:pretty]">
          Redaktionens spelförslag med motivering, insats och rekommenderat
          spelbolag. Varje kupong går att kopiera rakt in i din egen spelbok och
          dela vidare i sin helhet.
        </p>
        <div className="flex flex-wrap items-center gap-2.5 text-[12.5px] text-faint">
          <span className="font-display rounded-[5px] border border-line-strong px-[7px] py-0.5 font-semibold text-muted">
            18+
          </span>
          <span>
            Reklamlänkar · Spela ansvarsfullt ·{" "}
            <a href="https://stodlinjen.se" target="_blank" rel="noopener noreferrer">
              Stödlinjen
            </a>{" "}
            ·{" "}
            <a href="https://spelpaus.se" target="_blank" rel="noopener noreferrer">
              Spelpaus
            </a>
          </span>
        </div>
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
