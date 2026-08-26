"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "./auth";
import { COUPON_PATH } from "./coupons";
import { isEditor } from "./coupons-server";
import { createClient } from "./supabase/server";
import type { CouponLegRow } from "./types";

type CopyResult =
  | { ok: true; message: string; sheetId: string }
  | { ok: false; message: string; needsLogin?: boolean };

type LegForCopy = Pick<CouponLegRow, "pick" | "odds" | "fixture_id" | "sort_order"> & {
  fixtures: {
    kickoff: string;
    sport: string;
    league_id: number | null;
    league_name: string | null;
    league_logo: string | null;
    home_name: string | null;
    away_name: string | null;
  } | null;
};

function matchLabel(leg: LegForCopy) {
  const home = leg.fixtures?.home_name?.trim();
  const away = leg.fixtures?.away_name?.trim();
  if (home && away) return `${home} – ${away}`;
  return "Okänd match";
}

/**
 * Kopiera kupongen till användarens spelbok.
 *
 * Fördelningen: en singel får hela insatsen. En kombination bokförs som ETT
 * spel med produktodds — inte som ett spel per ben. Delar man upp den blir
 * risken fel: en kombination förlorar allt på ett enda missat ben, och fyra
 * separata rader hade sett ut som fyra oberoende spel i statistiken.
 *
 * Kombinationen får fixture_id null med flit. Sättlingsjobbet rättar spel
 * per match, och en kombination som pekar på sitt första ben hade rättats
 * på fel underlag.
 */
export async function copyCouponToSheet(
  couponId: string,
  sheetId?: string
): Promise<CopyResult> {
  const user = await getSessionUser();
  if (!user) {
    return {
      ok: false,
      needsLogin: true,
      message: "Logga in för att kopiera kupongen till din spelbok.",
    };
  }

  const supabase = await createClient();

  const { data: coupon, error } = await supabase
    .from("coupons")
    .select(
      `id, title, type, stake, total_odds, bookmaker_id,
       legs:coupon_legs (
         sort_order, pick, odds, fixture_id,
         fixtures ( kickoff, sport, league_id, league_name, league_logo, home_name, away_name )
       )`
    )
    .eq("id", couponId)
    .maybeSingle();

  if (error || !coupon) {
    return { ok: false, message: "Kupongen finns inte längre." };
  }

  const legs = ((coupon.legs ?? []) as unknown as LegForCopy[]).sort(
    (a, b) => a.sort_order - b.sort_order
  );
  if (!legs.length) {
    return { ok: false, message: "Kupongen saknar objekt." };
  }

  // Dubblettspärren finns också som unikt index i databasen. Den här
  // kontrollen är till för meddelandet, inte för säkerheten.
  const { data: existing } = await supabase
    .from("bets")
    .select("id")
    .eq("user_id", user.id)
    .eq("source_coupon_id", couponId)
    .maybeSingle();

  if (existing) {
    return { ok: false, message: "Redan bokförd" };
  }

  const { data: sheets } = await supabase
    .from("sheets")
    .select("id, name")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const sheet = sheetId
    ? (sheets ?? []).find((s) => s.id === sheetId)
    : (sheets ?? [])[0];

  if (!sheet) {
    return { ok: false, message: "Skapa en spelbok först." };
  }

  const stake = Number(coupon.stake);
  const single = legs.length === 1;
  const first = legs[0];

  const row = single
    ? {
        user_id: user.id,
        sheet_id: sheet.id,
        source_coupon_id: couponId,
        match: matchLabel(first),
        pick: first.pick,
        odds: Number(first.odds),
        stake,
        bookmaker_id: coupon.bookmaker_id,
        fixture_id: first.fixture_id,
        sport: first.fixtures?.sport ?? null,
        league: first.fixtures?.league_name ?? null,
        league_id: first.fixtures?.league_id ?? null,
        league_logo: first.fixtures?.league_logo ?? null,
        placed_at: new Date().toISOString(),
      }
    : {
        user_id: user.id,
        sheet_id: sheet.id,
        source_coupon_id: couponId,
        match: legs.map(matchLabel).join(" + "),
        pick: legs.map((l) => l.pick).join(" + "),
        odds: Number(coupon.total_odds),
        stake,
        bookmaker_id: coupon.bookmaker_id,
        fixture_id: null,
        sport: first.fixtures?.sport ?? null,
        league: null,
        league_id: null,
        league_logo: null,
        placed_at: new Date().toISOString(),
      };

  const { error: insertError } = await supabase.from("bets").insert(row);

  if (insertError) {
    if (/duplicate|unique/i.test(insertError.message)) {
      return { ok: false, message: "Redan bokförd" };
    }
    return { ok: false, message: insertError.message };
  }

  revalidatePath(COUPON_PATH);
  revalidatePath("/spelbok");

  return {
    ok: true,
    sheetId: sheet.id,
    message: `Kupongen är bokförd i ${sheet.name}.`,
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Mejllistan för nya kuponger. Ett mejl per kupong, inget annat. */
export async function subscribeToCoupons(email: string) {
  const clean = email.trim();
  if (!EMAIL_RE.test(clean)) {
    return { ok: false as const, message: "Skriv en giltig e-postadress." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("coupon_subscribers")
    .insert({ email: clean });

  // Redan anmäld är inte ett fel för den som anmäler sig — svaret ska se
  // likadant ut oavsett, annars går listan att avlyssna adress för adress.
  if (error && !/duplicate|unique/i.test(error.message)) {
    return { ok: false as const, message: "Kunde inte spara adressen." };
  }

  return { ok: true as const, message: "Anmäld ✓" };
}

/**
 * Spelbeviset. Bilden laddas upp direkt till Storage från redaktionens
 * webbläsare; det här skriver bara URL:en på kupongen.
 */
export async function saveCouponProof(couponId: string, proofUrl: string) {
  if (!(await isEditor())) {
    return { ok: false as const, message: "Saknar behörighet." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("coupons")
    .update({ proof_url: proofUrl.trim() || null })
    .eq("id", couponId);

  if (error) return { ok: false as const, message: error.message };

  revalidatePath(COUPON_PATH, "layout");
  return { ok: true as const, message: "Spelbeviset sparat." };
}
