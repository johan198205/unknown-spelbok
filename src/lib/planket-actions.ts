"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { displayPrefsFrom, stakeError } from "@/lib/display";
import { notifyPostBacked, notifyPostReaction } from "@/lib/planket-notify";
import {
  PLANKET_MAX_BODY,
  PLANKET_PATH,
  isPlanketFilter,
  isReportReason,
  parseRateLimit,
  rateLimitMessage,
  type PlanketFilter,
  type PlanketPost,
  type ReactionKind,
} from "@/lib/planket";
import {
  countNewPosts,
  fetchAttachableBets,
  fetchAttachableCoupons,
  fetchPlanketPage,
} from "@/lib/planket-server";
import { createClient } from "@/lib/supabase/server";

type Fail = { ok: false; error: string; code?: "auth" | "duplicate" | "rate" };

/**
 * Rate limit-triggern kastar 'planket_rate_limit:{minuter}'. Översätt till
 * meddelandet användaren ska läsa — aldrig råtexten från databasen.
 */
function toFailure(message: string | null | undefined, fallback: string): Fail {
  const minutes = parseRateLimit(message);
  if (minutes) return { ok: false, error: rateLimitMessage(minutes), code: "rate" };
  if (message && /duplicate|unique/i.test(message)) {
    return { ok: false, error: "Det där är redan gjort.", code: "duplicate" };
  }
  return { ok: false, error: message?.trim() || fallback };
}

// -------------------------------------------------------------
// Inlägg
// -------------------------------------------------------------

export type CreatePostInput = {
  body: string;
  attachmentType: "none" | "bet" | "coupon";
  betId?: string | null;
  couponId?: string | null;
};

export async function createPost(
  input: CreatePostInput
): Promise<{ ok: true; postId: string } | Fail> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Du måste vara inloggad.", code: "auth" };

  const body = input.body.trim();
  if (body.length > PLANKET_MAX_BODY) {
    return { ok: false, error: `Max ${PLANKET_MAX_BODY} tecken.` };
  }

  // Ett inlägg har antingen ett spel eller en kupong — aldrig båda. Samma
  // regel som constraintet posts_attachment_shape; den här kontrollen är
  // till för meddelandet, inte för säkerheten.
  const betId = input.attachmentType === "bet" ? (input.betId ?? null) : null;
  const couponId =
    input.attachmentType === "coupon" ? (input.couponId ?? null) : null;

  if (input.attachmentType === "bet" && !betId) {
    return { ok: false, error: "Välj ett spel att bifoga." };
  }
  if (input.attachmentType === "coupon" && !couponId) {
    return { ok: false, error: "Välj en kupong att bifoga." };
  }
  if (!body && input.attachmentType === "none") {
    return { ok: false, error: "Skriv något eller bifoga ett spel." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .insert({
      author_id: user.id,
      body,
      attachment_type: input.attachmentType,
      bet_id: betId,
      coupon_id: couponId,
    })
    .select("id")
    .maybeSingle();

  if (error) return toFailure(error.message, "Kunde inte posta.");
  if (!data) return { ok: false, error: "Kunde inte posta." };

  revalidatePath(PLANKET_PATH);
  return { ok: true, postId: data.id };
}

export async function editPost(postId: string, body: string) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Du måste vara inloggad." };

  const clean = body.trim();
  if (clean.length > PLANKET_MAX_BODY) {
    return { ok: false as const, error: `Max ${PLANKET_MAX_BODY} tecken.` };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("posts")
    .update({ body: clean, edited_at: new Date().toISOString() })
    .eq("id", postId)
    .eq("author_id", user.id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(PLANKET_PATH);
  return { ok: true as const };
}

/**
 * Soft delete. Aldrig hård radering — reaktioner och ryggningar i
 * historiken behåller sin referens.
 */
export async function deletePost(postId: string) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Du måste vara inloggad." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("posts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", postId)
    .eq("author_id", user.id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(PLANKET_PATH);
  return { ok: true as const };
}

// -------------------------------------------------------------
// Reaktioner
//
// Klienten uppdaterar optimistiskt och rullar tillbaka om det här
// svarar nej. Servern är den som bestämmer.
// -------------------------------------------------------------

export async function toggleReaction(
  postId: string,
  kind: ReactionKind,
  on: boolean
): Promise<{ ok: true } | Fail> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Du måste vara inloggad.", code: "auth" };

  const supabase = await createClient();

  if (!on) {
    const { error } = await supabase
      .from("post_reactions")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .eq("kind", kind);
    if (error) return toFailure(error.message, "Kunde inte ta bort reaktionen.");
    return { ok: true };
  }

  const { error } = await supabase
    .from("post_reactions")
    .insert({ post_id: postId, user_id: user.id, kind });

  if (error) {
    // Redan reagerat är inte ett fel för användaren — knappen visar ju
    // redan rätt läge efter den optimistiska uppdateringen.
    if (/duplicate|unique/i.test(error.message)) return { ok: true };
    return toFailure(error.message, "Kunde inte spara reaktionen.");
  }

  const { data: post } = await supabase
    .from("posts")
    .select("author_id")
    .eq("id", postId)
    .maybeSingle();

  if (post) {
    await notifyPostReaction({
      postId,
      authorId: post.author_id,
      reactorId: user.id,
    });
  }

  return { ok: true };
}

// -------------------------------------------------------------
// Rygga
// -------------------------------------------------------------

export type BackPostResult =
  | { ok: true; sheetId: string; sheetName: string; betId: string }
  | Fail
  | { ok: false; error: string; code: "started" };

/**
 * Bokför inläggets spel i användarens egen spelbok och skriver raden i
 * post_backs.
 *
 * En KUPONG blir ETT spel med produktodds, aldrig ett spel per ben. Delar
 * man upp den blir risken fel: en kombination förlorar allt på ett enda
 * missat ben, och fyra separata rader hade sett ut som fyra oberoende spel
 * i statistiken.
 */
export async function backPost({
  postId,
  sheetId,
  stake,
}: {
  postId: string;
  sheetId: string;
  stake: number;
}): Promise<BackPostResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Du måste vara inloggad.", code: "auth" };

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_mode, currency, unit_size")
    .eq("id", user.id)
    .maybeSingle();

  const amount = Number(stake);
  const prefs = displayPrefsFrom(profile);
  const problem = stakeError(amount, { ...prefs, mode: "money" });
  if (problem) return { ok: false, error: problem };

  const { data: sheet } = await supabase
    .from("sheets")
    .select("id, name, slug")
    .eq("id", sheetId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sheet) return { ok: false, error: "Välj en av dina egna spelböcker." };

  const { data: post } = await supabase
    .from("planket_posts")
    .select(
      `id, author_id, author_username, attachment_type, bet_id, coupon_id,
       bet_match, bet_pick, bet_odds, bet_sport, bet_league, bet_league_id,
       bet_league_logo, bet_bookmaker_id, fixture_id, kickoff, fixture_status,
       bet_result`
    )
    .eq("id", postId)
    .maybeSingle();

  if (!post) return { ok: false, error: "Inlägget finns inte längre." };
  if (post.attachment_type === "none") {
    return { ok: false, error: "Inlägget har inget spel att rygga." };
  }

  // Dubblettspärren är det unika indexet post_backs(post_id, user_id).
  // Den här kontrollen finns för meddelandet, inte för säkerheten.
  const { data: already } = await supabase
    .from("post_backs")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (already) {
    return { ok: false, error: "Du har redan ryggat det här inlägget.", code: "duplicate" };
  }

  const now = new Date().toISOString();
  let betRow: Record<string, unknown>;
  let notifyMatch = "";
  let notifyPick = "";
  let notifyOdds = 0;

  if (post.attachment_type === "bet") {
    if (post.bet_result && post.bet_result !== "open") {
      return { ok: false, error: "Spelet är redan rättat.", code: "started" };
    }
    if (post.kickoff && Date.now() >= new Date(post.kickoff).getTime()) {
      return { ok: false, error: "Avspark passerad", code: "started" };
    }

    notifyMatch = post.bet_match ?? "";
    notifyPick = post.bet_pick ?? "";
    notifyOdds = Number(post.bet_odds ?? 0);

    betRow = {
      user_id: user.id,
      sheet_id: sheet.id,
      source_post_id: postId,
      copied_from_bet_id: post.bet_id,
      copied_from_user_id: post.author_id,
      fixture_id: post.fixture_id,
      sport: post.bet_sport,
      league: post.bet_league,
      league_id: post.bet_league_id,
      league_logo: post.bet_league_logo,
      match: post.bet_match,
      pick: post.bet_pick,
      bookmaker_id: post.bet_bookmaker_id,
      odds: notifyOdds,
      stake: amount,
      result: "open",
      placed_at: now,
    };
  } else {
    const { data: coupon } = await supabase
      .from("coupons")
      .select(
        `id, title, total_odds, bookmaker_id,
         coupon_legs(sort_order, pick, odds,
           fixtures:fixture_id(kickoff, sport, home_name, away_name))`
      )
      .eq("id", post.coupon_id!)
      .maybeSingle();

    if (!coupon) return { ok: false, error: "Kupongen finns inte längre." };

    type Leg = {
      sort_order: number;
      pick: string;
      odds: number;
      fixtures: {
        kickoff: string | null;
        sport: string | null;
        home_name: string | null;
        away_name: string | null;
      } | null;
    };

    const legs = ((coupon.coupon_legs ?? []) as unknown as Leg[]).sort(
      (a, b) => a.sort_order - b.sort_order
    );
    if (!legs.length) return { ok: false, error: "Kupongen saknar spel." };

    const firstKickoff = legs
      .map((l) => l.fixtures?.kickoff)
      .filter((k): k is string => !!k)
      .sort()[0];
    if (firstKickoff && Date.now() >= new Date(firstKickoff).getTime()) {
      return { ok: false, error: "Avspark passerad", code: "started" };
    }

    const label = (leg: Leg) =>
      leg.fixtures?.home_name && leg.fixtures?.away_name
        ? `${leg.fixtures.home_name} – ${leg.fixtures.away_name}`
        : coupon.title;

    const product =
      Math.round(legs.reduce((acc, l) => acc * Number(l.odds), 1) * 100) / 100;

    notifyMatch = legs.map(label).join(" + ");
    notifyPick = legs.map((l) => l.pick).join(" + ");
    notifyOdds = product;

    betRow = {
      user_id: user.id,
      sheet_id: sheet.id,
      source_post_id: postId,
      source_coupon_id: coupon.id,
      copied_from_user_id: post.author_id,
      // Kombinationen får fixture_id null med flit: sättlingsjobbet rättar
      // spel per match, och en kombination som pekar på sitt första ben
      // hade rättats på fel underlag.
      fixture_id: null,
      sport: legs[0]?.fixtures?.sport ?? null,
      league: null,
      match: notifyMatch,
      pick: notifyPick,
      bookmaker_id: coupon.bookmaker_id,
      odds: product,
      stake: amount,
      result: "open",
      placed_at: now,
    };
  }

  const { data: bet, error: betError } = await supabase
    .from("bets")
    .insert(betRow)
    .select("id")
    .maybeSingle();

  if (betError || !bet) {
    if (betError && /duplicate|unique/i.test(betError.message)) {
      return {
        ok: false,
        error: "Du har redan bokfört det här spelet.",
        code: "duplicate",
      };
    }
    return toFailure(betError?.message, "Kunde inte lägga spelet i spelboken.");
  }

  const { data: back, error: backError } = await supabase
    .from("post_backs")
    .insert({ post_id: postId, user_id: user.id, bet_id: bet.id, stake: amount })
    .select("id")
    .maybeSingle();

  if (backError || !back) {
    // Spelet är bokfört men ryggningen kunde inte registreras. Rulla
    // tillbaka spelet så räknaren och spelboken inte hamnar i otakt.
    await supabase.from("bets").delete().eq("id", bet.id);
    if (backError && /duplicate|unique/i.test(backError.message)) {
      return {
        ok: false,
        error: "Du har redan ryggat det här inlägget.",
        code: "duplicate",
      };
    }
    return toFailure(backError?.message, "Kunde inte registrera ryggningen.");
  }

  await notifyPostBacked({
    postId,
    postBackId: back.id,
    authorId: post.author_id,
    backerId: user.id,
    backerUsername: profile?.username ?? "Någon",
    match: notifyMatch,
    pick: notifyPick,
    odds: notifyOdds,
  });

  revalidatePath(PLANKET_PATH);
  revalidatePath("/spelbok");

  return { ok: true, sheetId: sheet.id, sheetName: sheet.name, betId: bet.id };
}

// -------------------------------------------------------------
// Anmälan
// -------------------------------------------------------------

export async function reportPost(postId: string, reason: string) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Du måste vara inloggad." };
  if (!isReportReason(reason)) {
    return { ok: false as const, error: "Välj en anledning." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("post_reports")
    .insert({ post_id: postId, reporter_id: user.id, reason });

  // Redan anmäld ser likadant ut som en ny anmälan. Annars går det att
  // avlyssna vem som anmält vad genom att prova.
  if (error && !/duplicate|unique/i.test(error.message)) {
    return { ok: false as const, error: "Kunde inte skicka anmälan." };
  }

  return { ok: true as const };
}

// -------------------------------------------------------------
// Paginering och nya inlägg
// -------------------------------------------------------------

export async function loadMorePosts(
  filter: string,
  cursor: string
): Promise<{ posts: PlanketPost[]; nextCursor: string | null; hasMore: boolean }> {
  const safe: PlanketFilter = isPlanketFilter(filter) ? filter : "alla";
  return fetchPlanketPage({ filter: safe, cursor });
}

/** Banner-räknaren. Klienten pollar den här, aldrig tabellen direkt. */
export async function checkNewPosts(filter: string, sinceIso: string) {
  const safe: PlanketFilter = isPlanketFilter(filter) ? filter : "alla";
  return countNewPosts(sinceIso, safe);
}

/** Hämtar om första sidan när användaren klickar "Visa" i bannern. */
export async function refreshFeed(filter: string) {
  const safe: PlanketFilter = isPlanketFilter(filter) ? filter : "alla";
  return fetchPlanketPage({ filter: safe });
}

// -------------------------------------------------------------
// Bifoga-väljaren
//
// Hämtas när panelen öppnas, inte med sidan: de flesta besök på Planket
// slutar utan ett inlägg, och listan är dyrare än den ser ut.
// -------------------------------------------------------------

export async function listAttachableBets() {
  return fetchAttachableBets();
}

export async function listAttachableCoupons() {
  return fetchAttachableCoupons();
}
