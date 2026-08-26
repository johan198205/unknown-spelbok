"use server";

import { revalidatePath } from "next/cache";
import { logAdmin } from "@/lib/admin/log";
import { requireAdmin } from "@/lib/auth";
import { COUPON_PATH } from "@/lib/coupons";
import { recordCouponNotifications } from "@/lib/notify-events";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";
import type { Coupon } from "@/lib/coupons";
import type { CouponLegResult, CouponStatus } from "@/lib/types";

export type CouponLegDraft = {
  id?: string;
  fixture_id: number | null;
  pick: string;
  odds: number;
  result: CouponLegResult | null;
};

export type CouponDraft = {
  id?: string;
  slug: string;
  title: string;
  kicker: string;
  body: string;
  stake: number;
  bookmaker_id: string | null;
  bookmaker_reason: string;
  proof_url: string;
  /** ISO. Framtida tid köar kupongen — RLS döljer den tills klockan passerat. */
  published_at: string;
  legs: CouponLegDraft[];
};

const ADMIN_SELECT = `
  *,
  bookmakers ( id, name, slug, logo_url, terms, tracking_url ),
  legs:coupon_legs (
    id, coupon_id, sort_order, fixture_id, pick, odds, result,
    fixtures (
      fixture_id, kickoff, sport, league_id, league_name, league_logo,
      home_name, away_name, home_logo, away_logo, home_team_id, away_team_id
    )
  )
`;

function revalidateCoupons(slug?: string) {
  revalidatePath("/admin/kuponger");
  revalidatePath(COUPON_PATH);
  if (slug) revalidatePath(`${COUPON_PATH}/${slug}`);
}

export async function listAdminCoupons(): Promise<Coupon[]> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("coupons")
    .select(ADMIN_SELECT)
    .order("published_at", { ascending: false });

  if (error) throw new Error(error.message);

  const coupons = (data ?? []) as unknown as Coupon[];
  for (const coupon of coupons) {
    coupon.legs.sort((a, b) => a.sort_order - b.sort_order);
  }
  return coupons;
}

/**
 * Skapar eller uppdaterar en kupong med sina ben.
 *
 * type härleds ur antalet ben i stället för att vara ett eget val: en
 * kupong med ett ben ÄR en singel, och två fält som kan säga emot varandra
 * blir förr eller senare motsägelsefulla.
 *
 * total_odds och status rörs aldrig här — de skrivs av triggern i
 * db/coupons.sql när benen ändras.
 */
export async function saveCoupon(draft: CouponDraft) {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const title = draft.title.trim();
  if (!title) throw new Error("Titel krävs");

  const legs = draft.legs.filter((leg) => leg.pick.trim() && leg.odds >= 1);
  if (!legs.length) throw new Error("Kupongen behöver minst ett objekt");

  const slug = (draft.slug.trim() || slugify(title)).slice(0, 80);
  if (!slug) throw new Error("Slug krävs");

  const payload = {
    slug,
    title,
    kicker: draft.kicker.trim(),
    type: legs.length === 1 ? "single" : "combo",
    body: draft.body.trim(),
    stake: Number.isFinite(draft.stake) ? draft.stake : 0,
    bookmaker_id: draft.bookmaker_id,
    bookmaker_reason: draft.bookmaker_reason.trim(),
    proof_url: draft.proof_url.trim() || null,
    published_at: draft.published_at,
  };

  let couponId = draft.id;

  if (couponId) {
    const { error } = await supabase
      .from("coupons")
      .update(payload)
      .eq("id", couponId);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase
      .from("coupons")
      .insert({ ...payload, author_id: admin.id })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    couponId = data.id;
  }

  // Ben som redaktören tagit bort ska bort. Raderas de INTE först räknar
  // triggern fortfarande med dem i totaloddset.
  const keep = legs.map((leg) => leg.id).filter(Boolean) as string[];
  let stale = supabase.from("coupon_legs").delete().eq("coupon_id", couponId);
  if (keep.length) stale = stale.not("id", "in", `(${keep.join(",")})`);
  const { error: deleteError } = await stale;
  if (deleteError) throw new Error(deleteError.message);

  const { error: legError } = await supabase.from("coupon_legs").upsert(
    legs.map((leg, index) => ({
      ...(leg.id ? { id: leg.id } : {}),
      coupon_id: couponId,
      sort_order: index,
      fixture_id: leg.fixture_id,
      pick: leg.pick.trim(),
      odds: leg.odds,
      result: leg.result,
    }))
  );
  if (legError) throw new Error(legError.message);

  await logAdmin(draft.id ? "coupon.updated" : "coupon.created", `kupong ${title}`, {
    id: couponId,
    slug,
    legs: legs.length,
  });

  // Notisen är idempotent på dedupe_key coupon:{id} — den kan alltså
  // skickas om vid varje spara utan att någon får två.
  if (new Date(payload.published_at).getTime() <= Date.now()) {
    const { data: fresh } = await supabase
      .from("coupons")
      .select("total_odds")
      .eq("id", couponId)
      .maybeSingle();

    await recordCouponNotifications({
      id: couponId!,
      title,
      legs: legs.length,
      totalOdds: Number(fresh?.total_odds ?? 1),
    });
  }

  revalidateCoupons(slug);
  return { id: couponId!, slug };
}

/**
 * Rättar ett ben. Kupongens status skrivs av triggern, inte här — och
 * därefter rättas de spel användarna kopierat från kupongen, så att en
 * kopierad kombination inte ligger öppen för evigt.
 */
export async function setCouponLegResult(
  legId: string,
  result: CouponLegResult | null
) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: leg, error } = await supabase
    .from("coupon_legs")
    .update({ result })
    .eq("id", legId)
    .select("coupon_id")
    .single();

  if (error) throw new Error(error.message);

  await settleCopiedBets(leg.coupon_id);
  await logAdmin("coupon.leg_settled", `ben ${legId}`, { result });

  revalidateCoupons();
  return { ok: true };
}

export async function deleteCoupon(id: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: coupon } = await supabase
    .from("coupons")
    .select("title, slug")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("coupons").delete().eq("id", id);
  if (error) throw new Error(error.message);

  await logAdmin("coupon.deleted", `kupong ${coupon?.title ?? id}`, { id });
  revalidateCoupons(coupon?.slug);
}

/**
 * Rättar användarnas kopior när kupongen fått sitt utfall.
 *
 * Kombinationer bokförs med fixture_id null (se copyCouponToSheet), så det
 * vanliga sättlingsjobbet — som rättar per match — rör dem aldrig. Utan
 * det här skulle en kopierad kombination bli en permanent öppen rad i
 * användarens statistik.
 *
 * Utbetalningen räknas ur kupongens egen kvot netto/insats i stället för
 * ur radens odds: pushade ben räknas som 1,00 i kupongens netto, och
 * radens sparade totalodds känner inte till det.
 */
async function settleCopiedBets(couponId: string) {
  const admin = createAdminClient();

  const { data: coupon } = await admin
    .from("coupons")
    .select("status, stake")
    .eq("id", couponId)
    .maybeSingle();

  if (!coupon) return;

  const status = coupon.status as CouponStatus;
  if (status === "open") return;

  const { data: netto } = await admin.rpc("coupon_netto", {
    p_coupon_id: couponId,
  });

  const stake = Number(coupon.stake);
  const ratio = stake > 0 ? 1 + Number(netto ?? 0) / stake : 1;

  const { data: bets } = await admin
    .from("bets")
    .select("id, stake")
    .eq("source_coupon_id", couponId)
    .eq("result", "open");

  if (!bets?.length) return;

  const settledAt = new Date().toISOString();
  for (const bet of bets) {
    const betStake = Number(bet.stake);
    const payout =
      status === "won"
        ? Math.round(betStake * ratio * 100) / 100
        : status === "void"
          ? betStake
          : 0;

    await admin
      .from("bets")
      .update({
        result: status === "won" ? "win" : status === "lost" ? "loss" : "void",
        payout,
        settled_at: settledAt,
        settled_by: "auto",
      })
      .eq("id", bet.id);
  }
}
