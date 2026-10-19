import type { Metadata } from "next";
import { FEATURES } from "@/lib/features";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CouponCard } from "@/components/coupons/CouponCard";
import { CouponSidebar } from "@/components/coupons/CouponSidebar";
import { getSessionUser } from "@/lib/auth";
import type { AffiliateTopRow } from "@/lib/bet-stats";
import { couponRecord, couponTypeLabel, formatCouponOdds } from "@/lib/coupons";
import {
  copiedCouponIds,
  getCouponBySlug,
  isEditor,
  listCoupons,
} from "@/lib/coupons-server";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/texts/server";
import type { Bookmaker } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [coupon, t] = await Promise.all([getCouponBySlug(slug), getT()]);
  if (!coupon) return { title: t("kuponger.detail.metaNotFound") };

  const description =
    coupon.body.slice(0, 180) ||
    t("kuponger.detail.metaDescription", {
      type: couponTypeLabel(coupon.type, t),
      odds: formatCouponOdds(coupon.total_odds),
    });

  // Samma bild som "Ladda ner PNG" i delningskortet — en enda renderare,
  // så förhandsvisningen på Facebook och filen användaren laddar ner kan
  // inte glida isär.
  const image = `/api/kuponger/${coupon.slug}/delningskort`;

  return {
    title: coupon.title,
    description,
    openGraph: {
      title: coupon.title,
      description,
      type: "article",
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: coupon.title,
      description,
      images: [image],
    },
  };
}

export default async function KupongPage({ params }: Props) {
  // Kuponger är avstängd tills vidare — speltipsen samlas på Planket.
  // Planket kräver inloggning, så utloggade skickas till startsidan.
  if (!FEATURES.coupons) redirect((await getSessionUser()) ? "/planket" : "/");
  const { slug } = await params;
  const supabase = await createClient();

  const [coupon, user, editorMode, copied, all, { data: bookmakers }, t] =
    await Promise.all([
      getCouponBySlug(slug),
      getSessionUser(),
      isEditor(),
      copiedCouponIds(),
      listCoupons(),
      supabase
        .from("bookmakers")
        .select("*")
        .eq("active", true)
        .order("rank")
        .order("name"),
      getT(),
    ]);

  if (!coupon) notFound();

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
      <Link
        href="/kuponger"
        className="mb-4 inline-block text-[13.5px] font-semibold text-cyan no-underline hover:underline"
      >
        {t("kuponger.detail.back")}
      </Link>

      {/* En kupong visas alltid i listläget: full bredd, sidopanel intill. */}
      <div className="kupong-layout" data-view="Lista">
        <div className="kupong-grid min-w-0" data-view="Lista">
          <CouponCard
            coupon={coupon}
            editorMode={editorMode}
            loggedIn={!!user}
            alreadyCopied={copied.has(coupon.id)}
          />
        </div>
        <CouponSidebar record={couponRecord(all)} affiliates={affiliates} />
      </div>
    </div>
  );
}
