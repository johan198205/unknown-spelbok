/**
 * Planket — läsning från servern.
 *
 * Flödet läser vyn planket_posts, inte tabellerna. Vyn är det som gör ett
 * postat spel ur en PRIVAT spelbok synligt just för det spelet — hade vi
 * läst bets direkt hade RLS gömt det för alla utom författaren.
 *
 * Verifierad-badgen och räknarna kommer färdiga ur vyn. Räkna dem aldrig
 * här och aldrig i klienten.
 */

import { cache } from "react";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CouponLegResult, CouponStatus } from "@/lib/types";
import {
  PLANKET_ATTACH_LIMIT,
  PLANKET_PAGE_SIZE,
  couponTotalOdds,
  type PlanketCoupon,
  type PlanketCouponLeg,
  type PlanketFilter,
  type PlanketPost,
  type PlanketPostRow,
  type ReactionKind,
} from "@/lib/planket";

const POST_COLUMNS = `
  id, author_id, body, attachment_type, bet_id, coupon_id, created_at, edited_at,
  author_username, author_avatar,
  sheet_id, sheet_name, sheet_bets_count, sheet_settled_bets, sheet_roi,
  bet_match, bet_pick, bet_odds, bet_stake, bet_result, bet_payout, bet_sport,
  bet_league, bet_league_id, bet_league_logo, bet_placed_at,
  bet_bookmaker_id, bet_bookmaker_name, bet_bookmaker_logo,
  fixture_id, kickoff, fixture_status,
  home_name, home_logo, home_team_id, away_name, away_logo, away_team_id,
  verified, fire_count, thumb_count, back_count, image_url
`;

/**
 * Chipparnas sportnamn → värdet i bets.sport.
 *
 * Sportfiltret gäller BIFOGADE SPEL. En kupong har inte en sport utan
 * fyra, en per ben, och att filtrera på "minst ett fotbollsben" hade
 * krävt att benen hämtades innan sidan kunde skäras — vilket bryter
 * pagineringen. Kupongerna når man via sitt eget chip.
 */
const SPORT_BY_FILTER: Partial<Record<PlanketFilter, string>> = {
  fotboll: "Fotboll",
  hockey: "Ishockey",
};

export type PlanketPage = {
  posts: PlanketPost[];
  /** created_at på sista inlägget — skickas tillbaka för nästa sida. */
  nextCursor: string | null;
  hasMore: boolean;
};

export async function fetchPlanketPage({
  filter = "alla",
  cursor = null,
  limit = PLANKET_PAGE_SIZE,
}: {
  filter?: PlanketFilter;
  cursor?: string | null;
  limit?: number;
} = {}): Promise<PlanketPage> {
  const supabase = await createClient();
  const user = await getSessionUser();

  // Redaktionens öppna spel ligger fästa överst och hoppas över i det
  // vanliga flödet, så de aldrig syns två gånger.
  const pinnedRows = await fetchPinnedRows();
  const pinnedIds = new Set(pinnedRows.map((r) => r.id));

  let query = supabase
    .from("planket_posts")
    .select(POST_COLUMNS)
    .order("created_at", { ascending: false })
    // En rad extra: finns den vet vi att det finns mer att hämta utan
    // ett separat count-anrop.
    .limit(limit + 1);

  if (pinnedIds.size) {
    query = query.not("id", "in", `(${[...pinnedIds].join(",")})`);
  }

  if (filter === "spel") query = query.eq("attachment_type", "bet");
  else if (filter === "kuponger") query = query.eq("attachment_type", "coupon");
  else if (SPORT_BY_FILTER[filter]) {
    query = query.eq("bet_sport", SPORT_BY_FILTER[filter]!);
  }

  if (cursor) query = query.lt("created_at", cursor);

  const { data, error } = await query;

  if (error) {
    console.error("planket: kunde inte läsa flödet", error.message);
    return { posts: [], nextCursor: null, hasMore: false };
  }

  const rows = (data ?? []) as unknown as PlanketPostRow[];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  // De fästa följer bara med första sidan.
  const pinned = cursor ? [] : pinnedRows;
  const posts = await decoratePosts([...pinned, ...page], user?.id ?? null, pinnedIds);

  return {
    posts,
    nextCursor: page.length ? page[page.length - 1]!.created_at : null,
    hasMore,
  };
}

/** Admin-konton. Deras inlägg är redaktionens. */
const fetchAdminIds = cache(async function fetchAdminIds() {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id").eq("role", "admin");
  return (data ?? []).map((r) => r.id as string);
});

/**
 * Redaktionens spel som fortfarande är öppna (ej avgjorda), nyast först.
 * När spelet rättas släpper det och blir ett vanligt inlägg i flödet.
 */
async function fetchPinnedRows(): Promise<PlanketPostRow[]> {
  const adminIds = await fetchAdminIds();
  if (!adminIds.length) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("planket_posts")
    .select(POST_COLUMNS)
    .in("author_id", adminIds)
    .eq("attachment_type", "bet")
    .eq("bet_result", "open")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("planket: kunde inte läsa redaktionens spel", error.message);
    return [];
  }
  return (data ?? []) as unknown as PlanketPostRow[];
}

/**
 * Fyller på med det som inte får plats i vyn: kupongernas ben, och
 * betraktarens egna reaktioner och ryggningar.
 */
async function decoratePosts(
  rows: PlanketPostRow[],
  userId: string | null,
  pinnedIds: Set<string> = new Set()
): Promise<PlanketPost[]> {
  if (!rows.length) return [];

  const supabase = await createClient();
  const postIds = rows.map((r) => r.id);
  const couponIds = [
    ...new Set(rows.map((r) => r.coupon_id).filter((id): id is string => !!id)),
  ];
  const bookmakerIds = [
    ...new Set(
      rows.map((r) => r.bet_bookmaker_id).filter((id): id is string => !!id)
    ),
  ];

  const [coupons, reactions, backs, replies, slugs, adminIds] = await Promise.all([
    fetchCoupons(couponIds),
    userId
      ? supabase
          .from("post_reactions")
          .select("post_id, kind")
          .eq("user_id", userId)
          .in("post_id", postIds)
      : Promise.resolve({ data: [] as { post_id: string; kind: string }[] }),
    userId
      ? supabase
          .from("post_backs")
          .select("post_id")
          .eq("user_id", userId)
          .in("post_id", postIds)
      : Promise.resolve({ data: [] as { post_id: string }[] }),
    // Svarsantalet — räknas här så det syns direkt och efter omladdning.
    supabase.from("post_replies").select("post_id").in("post_id", postIds),
    bookmakerIds.length
      ? supabase.from("bookmakers").select("id, slug").in("id", bookmakerIds)
      : Promise.resolve({ data: [] as { id: string; slug: string }[] }),
    fetchAdminIds(),
  ]);

  const replyCount = new Map<string, number>();
  for (const row of replies.data ?? []) {
    replyCount.set(row.post_id, (replyCount.get(row.post_id) ?? 0) + 1);
  }
  const slugById = new Map(
    (slugs.data ?? []).map((b) => [b.id as string, b.slug as string])
  );
  const admins = new Set(adminIds);

  const mine = new Map<string, ReactionKind[]>();
  for (const row of reactions.data ?? []) {
    const list = mine.get(row.post_id) ?? [];
    list.push(row.kind as ReactionKind);
    mine.set(row.post_id, list);
  }

  const backed = new Set((backs.data ?? []).map((b) => b.post_id));

  return rows.map((row) => ({
    ...row,
    image_url: row.image_url ?? null,
    coupon: row.coupon_id ? (coupons.get(row.coupon_id) ?? null) : null,
    myReactions: mine.get(row.id) ?? [],
    backedByMe: backed.has(row.id),
    isAuthor: !!userId && row.author_id === userId,
    bet_bookmaker_slug: row.bet_bookmaker_id
      ? (slugById.get(row.bet_bookmaker_id) ?? null)
      : null,
    reply_count: replyCount.get(row.id) ?? 0,
    isEditorial: admins.has(row.author_id),
    pinned: pinnedIds.has(row.id),
  }));
}

/**
 * Kupongerna med sina ben. Kuponger är publika (RLS: published_at <= now())
 * så en vanlig läsning räcker — till skillnad från spelen behövs ingen vy.
 */
async function fetchCoupons(ids: string[]): Promise<Map<string, PlanketCoupon>> {
  const map = new Map<string, PlanketCoupon>();
  if (!ids.length) return map;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coupons")
    .select(
      `id, slug, title, status, settled_at, stake, total_odds,
       bookmakers:bookmaker_id(name, logo_url, slug),
       coupon_legs(id, sort_order, pick, odds, result,
         fixtures:fixture_id(kickoff, sport, league_id, league_name, league_logo,
                             home_name, away_name))`
    )
    .in("id", ids);

  if (error) {
    console.error("planket: kunde inte läsa kuponger", error.message);
    return map;
  }

  type LegRow = {
    id: string;
    sort_order: number;
    pick: string;
    odds: number;
    result: CouponLegResult | null;
    fixtures: {
      kickoff: string | null;
      sport: string | null;
      league_id: number | null;
      league_name: string | null;
      league_logo: string | null;
      home_name: string | null;
      away_name: string | null;
    } | null;
  };

  for (const raw of (data ?? []) as unknown as Array<{
    id: string;
    slug: string;
    title: string;
    status: CouponStatus;
    settled_at: string | null;
    stake: number;
    total_odds: number;
    bookmakers: { name: string; logo_url: string | null; slug: string | null } | null;
    coupon_legs: LegRow[];
  }>) {
    const legs: PlanketCouponLeg[] = [...(raw.coupon_legs ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((leg) => ({
        id: leg.id,
        pick: leg.pick,
        odds: Number(leg.odds),
        league: leg.fixtures?.league_name ?? null,
        league_id: leg.fixtures?.league_id ?? null,
        league_logo: leg.fixtures?.league_logo ?? null,
        sport: leg.fixtures?.sport ?? null,
        match:
          leg.fixtures?.home_name && leg.fixtures?.away_name
            ? `${leg.fixtures.home_name} – ${leg.fixtures.away_name}`
            : raw.title,
        kickoff: leg.fixtures?.kickoff ?? null,
        result: leg.result ?? null,
      }));

    map.set(raw.id, {
      id: raw.id,
      slug: raw.slug,
      title: raw.title,
      status: raw.status,
      settled_at: raw.settled_at ?? null,
      stake: Number(raw.stake),
      // total_odds skrivs av triggern i db/coupons.sql. Finns benen räknar
      // vi om produkten så kortet aldrig visar en summa som inte stämmer
      // med raderna ovanför den.
      total_odds: legs.length ? couponTotalOdds(legs) : Number(raw.total_odds),
      bookmaker_name: raw.bookmakers?.name ?? null,
      bookmaker_logo: raw.bookmakers?.logo_url ?? null,
      bookmaker_slug: raw.bookmakers?.slug ?? null,
      legs,
    });
  }

  return map;
}

// -------------------------------------------------------------
// Högerkolumnen
// -------------------------------------------------------------

export type TopBackedRow = {
  post_id: string;
  league: string | null;
  league_id: number | null;
  league_logo: string | null;
  sport: string | null;
  match: string;
  pick: string;
  odds: number;
  author_username: string;
  backed_today: number;
};

export const fetchTopBacked = cache(async function fetchTopBacked(limit = 3) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("planket_top_backed")
    .select(
      "post_id, league, league_id, league_logo, sport, match, pick, odds, author_username, backed_today"
    )
    .limit(limit);

  if (error) {
    console.error("planket: kunde inte läsa mest ryggade", error.message);
    return [] as TopBackedRow[];
  }
  return (data ?? []) as unknown as TopBackedRow[];
});

export type ActiveUser = {
  id: string;
  username: string;
  avatar_url: string | null;
};

export const fetchActiveUsers = cache(async function fetchActiveUsers(
  limit = 6
) {
  const supabase = await createClient();
  const { data, error, count } = await supabase
    .from("planket_active_users")
    .select("id, username, avatar_url", { count: "exact" })
    .limit(limit);

  if (error) {
    console.error("planket: kunde inte läsa aktiva", error.message);
    return { users: [] as ActiveUser[], overflow: 0 };
  }

  const users = (data ?? []) as unknown as ActiveUser[];
  return { users, overflow: Math.max(0, (count ?? users.length) - users.length) };
});

// -------------------------------------------------------------
// Bifoga-väljaren
// -------------------------------------------------------------

export type AttachableBet = {
  id: string;
  match: string;
  pick: string;
  odds: number;
  stake: number;
  league: string | null;
  league_id: number | null;
  league_logo: string | null;
  sport: string | null;
  kickoff: string | null;
  sheet_id: string;
  sheet_name: string;
  /** Privat spelbok — raden får den gula noten i väljaren. */
  sheet_private: boolean;
  /** Redan postat: markeras "Postad" och går inte att välja igen. */
  posted: boolean;
  /**
   * Får spelet Verifierad-badgen? Avgörs HÄR, på servern, av samma
   * jämförelse som vyn gör — aldrig av klienten med Date.now() under
   * render. Kolumnen bets.logged_before_kickoff är det slutgiltiga
   * svaret; det här är förhandsvisningen av det.
   */
  verified: boolean;
};

/**
 * Användarens senaste 20 spel ur ALLA egna spelböcker. Bara egna, och
 * bara böcker som finns kvar — raderas en spelbok cascade-raderas spelen
 * med den, så listan kan aldrig innehålla ett spel utan bok.
 */
export async function fetchAttachableBets(
  limit = PLANKET_ATTACH_LIMIT
): Promise<AttachableBet[]> {
  const user = await getSessionUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bets")
    .select(
      `id, match, pick, odds, stake, league, league_id, league_logo, sport, placed_at,
       sheets:sheet_id(id, name, is_public),
       fixtures:fixture_id(kickoff)`
    )
    .eq("user_id", user.id)
    .order("placed_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("planket: kunde inte läsa spel att bifoga", error.message);
    return [];
  }

  type Row = {
    id: string;
    match: string;
    pick: string;
    odds: number;
    stake: number;
    league: string | null;
    league_id: number | null;
    league_logo: string | null;
    sport: string | null;
    placed_at: string;
    sheets: { id: string; name: string; is_public: boolean } | null;
    fixtures: { kickoff: string | null } | null;
  };

  const rows = (data ?? []) as unknown as Row[];
  const ids = rows.map((r) => r.id);

  // Vilka av dem ligger redan i ett levande inlägg?
  const { data: posted } = await supabase
    .from("posts")
    .select("bet_id")
    .in("bet_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"])
    .is("deleted_at", null);

  const already = new Set((posted ?? []).map((p) => p.bet_id));
  const now = Date.now();

  return rows
    .filter((row) => row.sheets != null)
    .map((row) => ({
      id: row.id,
      match: row.match,
      pick: row.pick,
      odds: Number(row.odds),
      stake: Number(row.stake),
      league: row.league,
      league_id: row.league_id,
      league_logo: row.league_logo,
      sport: row.sport,
      kickoff: row.fixtures?.kickoff ?? null,
      sheet_id: row.sheets!.id,
      sheet_name: row.sheets!.name,
      sheet_private: !row.sheets!.is_public,
      posted: already.has(row.id),
      verified:
        !!row.fixtures?.kickoff &&
        now < new Date(row.fixtures.kickoff).getTime(),
    }));
}

export type AttachableCoupon = {
  id: string;
  slug: string;
  title: string;
  legs: number;
  total_odds: number;
  stake: number;
  bookmaker_name: string | null;
  posted: boolean;
};

/** Publicerade kuponger att bifoga. Öppna först — en avgjord kupong går inte att rygga. */
export async function fetchAttachableCoupons(
  limit = PLANKET_ATTACH_LIMIT
): Promise<AttachableCoupon[]> {
  const user = await getSessionUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coupons")
    .select(
      "id, slug, title, stake, total_odds, status, published_at, bookmakers:bookmaker_id(name), coupon_legs(id)"
    )
    .eq("status", "open")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("planket: kunde inte läsa kuponger att bifoga", error.message);
    return [];
  }

  type Row = {
    id: string;
    slug: string;
    title: string;
    stake: number;
    total_odds: number;
    bookmakers: { name: string } | null;
    coupon_legs: { id: string }[];
  };

  const rows = (data ?? []) as unknown as Row[];

  const { data: posted } = await supabase
    .from("posts")
    .select("coupon_id")
    .eq("author_id", user.id)
    .is("deleted_at", null)
    .not("coupon_id", "is", null);

  const already = new Set((posted ?? []).map((p) => p.coupon_id));

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    legs: row.coupon_legs?.length ?? 0,
    total_odds: Number(row.total_odds),
    stake: Number(row.stake),
    bookmaker_name: row.bookmakers?.name ?? null,
    posted: already.has(row.id),
  }));
}

// -------------------------------------------------------------
// "{n} nya inlägg"
// -------------------------------------------------------------

/**
 * Antal inlägg som tillkommit sedan senaste hämtning, exklusive
 * betraktarens egna — den som just postat ska inte få en banner om sitt
 * eget inlägg.
 */
export async function countNewPosts(sinceIso: string, filter: PlanketFilter) {
  const supabase = await createClient();
  const user = await getSessionUser();

  let query = supabase
    .from("planket_posts")
    .select("id", { count: "exact", head: true })
    .gt("created_at", sinceIso);

  if (user) query = query.neq("author_id", user.id);
  if (filter === "spel") query = query.eq("attachment_type", "bet");
  else if (filter === "kuponger") query = query.eq("attachment_type", "coupon");
  else if (SPORT_BY_FILTER[filter]) {
    query = query.eq("bet_sport", SPORT_BY_FILTER[filter]!);
  }

  const { count, error } = await query;
  if (error) {
    console.error("planket: kunde inte räkna nya inlägg", error.message);
    return 0;
  }
  return count ?? 0;
}
