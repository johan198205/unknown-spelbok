import { cache } from "react";
import { getProfile } from "./auth";
import { createClient } from "./supabase/server";
import type { Coupon } from "./coupons";

/**
 * Fälten kupongsidan behöver, i ett anrop. Benen bär sin fixture — det är
 * DÄR avsparkstiden bor, kupongen har ingen egen tid att räkna på.
 */
const COUPON_SELECT = `
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

function sortLegs(coupons: Coupon[]) {
  for (const coupon of coupons) {
    coupon.legs.sort((a, b) => a.sort_order - b.sort_order);
  }
  return coupons;
}

/**
 * Alla publicerade kuponger, nyast först.
 *
 * RLS filtrerar bort framtida published_at, så en köad kupong är osynlig
 * även om någon frågar direkt mot API:et. Vi upprepar inte filtret här —
 * ett filter på två ställen är ett filter som glider isär.
 *
 * Redaktionen ser sina egna okompletta kuponger via samma policy och får
 * därför en förhandsvy utan extra route.
 */
export const listCoupons = cache(async function listCoupons(): Promise<Coupon[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coupons")
    .select(COUPON_SELECT)
    .order("published_at", { ascending: false });

  if (error) {
    console.error("kuponger: kunde inte läsa listan", error.message);
    return [];
  }

  return sortLegs((data ?? []) as unknown as Coupon[]);
});

export const getCouponBySlug = cache(async function getCouponBySlug(
  slug: string
): Promise<Coupon | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coupons")
    .select(COUPON_SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return null;
  return sortLegs([data as unknown as Coupon])[0];
});

/** Får publicera och ladda upp spelbevis. Speglar public.is_editor(). */
export const isEditor = cache(async function isEditor() {
  const profile = await getProfile();
  return profile?.role === "admin" || profile?.role === "editor";
});

/**
 * Kupongerna den inloggade redan bokfört. Knappen visar "Redan bokförd"
 * i stället för att låta någon dubbelbokföra samma spel.
 */
export const copiedCouponIds = cache(async function copiedCouponIds(): Promise<
  Set<string>
> {
  const profile = await getProfile();
  if (!profile) return new Set();

  const supabase = await createClient();
  const { data } = await supabase
    .from("bets")
    .select("source_coupon_id")
    .eq("user_id", profile.id)
    .not("source_coupon_id", "is", null);

  return new Set(
    (data ?? [])
      .map((row) => row.source_coupon_id)
      .filter((id): id is string => !!id)
  );
});
