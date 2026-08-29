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
  verified, fire_count, thumb_count, back_count
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

  let query = supabase
    .from("planket_posts")
    .select(POST_COLUMNS)
    .order("created_at", { ascending: false })
    // En rad extra: finns den vet vi att det finns mer att hämta utan
    // ett separat count-anrop.
    .limit(limit + 1);

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

  const posts = await decoratePosts(page, user?.id ?? null);

  return {
    posts,
    nextCursor: page.length ? page[page.length - 1]!.created_at : null,
    hasMore,
  };
}

/**
 * Fyller på med det som inte får plats i vyn: kupongernas ben, och
 * betraktarens egna reaktioner och ryggningar.
 */
async function decoratePosts(
  rows: PlanketPostRow[],
  userId: string | null
): Promise<PlanketPost[]> {
  if (!rows.length) return [];

  const supabase = await createClient();
  const postIds = rows.map((r) => r.id);
  const couponIds = [
    ...new Set(rows.map((r) => r.coupon_id).filter((id): id is string => !!id)),
  ];

  const [coupons, reactions, backs] = await Promise.all([
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
  ]);

  const mine = new Map<string, ReactionKind[]>();
  for (const row of reactions.data ?? []) {
    const list = mine.get(row.post_id) ?? [];
    list.push(row.kind as ReactionKind);
    mine.set(row.post_id, list);
  }

  const backed = new Set((backs.data ?? []).map((b) => b.post_id));

  return rows.map((row) => ({
    ...row,
    coupon: row.coupon_id ? (coupons.get(row.coupon_id) ?? null) : null,
    myReactions: mine.get(row.id) ?? [],
    backedByMe: backed.has(row.id),
    isAuthor: !!userId && row.author_id === userId,
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
      `id, slug, title, stake, total_odds,
       bookmakers:bookmaker_id(name, logo_url),
       coupon_legs(id, sort_order, pick, odds,
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
    stake: number;
    total_odds: number;
    bookmakers: { name: string; logo_url: string | null } | null;
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
      }));

    map.set(raw.id, {
      id: raw.id,
      slug: raw.slug,
      title: raw.title,
      stake: Number(raw.stake),
      // total_odds skrivs av triggern i db/coupons.sql. Finns benen räknar
      // vi om produkten så kortet aldrig visar en summa som inte stämmer
      // med raderna ovanför den.
      total_odds: legs.length ? couponTotalOdds(legs) : Number(raw.total_odds),
      bookmaker_name: raw.bookmakers?.name ?? null,
      bookmaker_logo: raw.bookmakers?.logo_url ?? null,
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
