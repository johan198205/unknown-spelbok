import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { computeStats } from "@/lib/utils";
import type { Bet } from "@/lib/types";

export type AboutStats = {
  users: number;
  bets: number;
  publicSheets: number;
};

export type TeamMember = {
  name: string;
  role: string;
  bio: string;
  username: string;
  image: string;
  /** null = ingen publik spelbok (eller för få spel) — visa bara användarnamn */
  roi: number | null;
  isPublic: boolean;
};

const TEAM_SEED: Omit<TeamMember, "roi" | "isPublic">[] = [
  {
    name: "Johan Lind",
    role: "Grundare · produkt",
    bio: "Byggde det första kalkylarket 2024. Fotboll och hörnor, mest tidiga linjer.",
    username: "johanlind",
    image: "/img/team/johanlind.jpg",
  },
  {
    name: "Emma Sjöberg",
    role: "Medgrundare · data",
    bio: "Ansvarar för rättning, matchdata och statistiken. SHL-specialist.",
    username: "emmasjoberg",
    image: "/img/team/emmasjoberg.jpg",
  },
  {
    name: "Viktor Ahlgren",
    role: "Medgrundare · teknik",
    bio: "Bygger plattformen. Allsvenskan från läktarplats, låga odds och hög volym.",
    username: "viktorahlgren",
    image: "/img/team/viktorahlgren.jpg",
  },
];

/**
 * Aggregat för nyckeltal. Service role krävs så RLS inte räknar bara
 * publika spel — sidan ska visa plattformens verkliga volym.
 */
export async function fetchAboutStats(): Promise<AboutStats> {
  try {
    const admin = createAdminClient();
    const [users, bets, publicSheets] = await Promise.all([
      admin.from("profiles").select("*", { count: "exact", head: true }),
      admin.from("bets").select("*", { count: "exact", head: true }),
      admin
        .from("sheets")
        .select("*", { count: "exact", head: true })
        .eq("is_public", true),
    ]);
    return {
      users: users.count ?? 0,
      bets: bets.count ?? 0,
      publicSheets: publicSheets.count ?? 0,
    };
  } catch {
    const supabase = await createClient();
    const [users, bets, publicSheets] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("bets").select("*", { count: "exact", head: true }),
      supabase
        .from("sheets")
        .select("*", { count: "exact", head: true })
        .eq("is_public", true),
    ]);
    return {
      users: users.count ?? 0,
      bets: bets.count ?? 0,
      publicSheets: publicSheets.count ?? 0,
    };
  }
}

/**
 * ROI från personens publika spelbok(er). Privat bok → isPublic false och
 * roi null så UI:t bara visar @användarnamn.
 */
export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const supabase = await createClient();
  const usernames = TEAM_SEED.map((m) => m.username);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username")
    .in("username", usernames);

  const byUsername = new Map(
    (profiles ?? []).map((p) => [p.username, p.id as string])
  );

  const ids = [...byUsername.values()];
  const { data: sheets } =
    ids.length > 0
      ? await supabase
          .from("sheets")
          .select("id, user_id, is_public")
          .in("user_id", ids)
          .eq("is_public", true)
      : { data: [] as { id: string; user_id: string; is_public: boolean }[] };

  const publicSheetIds = (sheets ?? []).map((s) => s.id);
  const sheetsByUser = new Map<string, string[]>();
  for (const s of sheets ?? []) {
    const list = sheetsByUser.get(s.user_id) ?? [];
    list.push(s.id);
    sheetsByUser.set(s.user_id, list);
  }

  const { data: bets } =
    publicSheetIds.length > 0
      ? await supabase
          .from("bets")
          .select("sheet_id, stake, payout, result, odds, placed_at")
          .in("sheet_id", publicSheetIds)
      : { data: [] as Bet[] };

  const betsBySheet = new Map<string, Bet[]>();
  for (const b of bets ?? []) {
    const list = betsBySheet.get(b.sheet_id) ?? [];
    list.push(b as Bet);
    betsBySheet.set(b.sheet_id, list);
  }

  return TEAM_SEED.map((member) => {
    const userId = byUsername.get(member.username);
    if (!userId) {
      return { ...member, roi: null, isPublic: false };
    }
    const sheetIds = sheetsByUser.get(userId) ?? [];
    if (sheetIds.length === 0) {
      return { ...member, roi: null, isPublic: false };
    }
    const allBets = sheetIds.flatMap((id) => betsBySheet.get(id) ?? []);
    const stats = computeStats(allBets);
    return {
      ...member,
      isPublic: true,
      roi: stats.bets > 0 ? stats.roi : null,
    };
  });
}

/** Svenskt tusentalsavgränsning med mellanslag (NBSP). */
export function formatCount(n: number) {
  return n.toLocaleString("sv-SE").replace(/\u00A0/g, " ").replace(/,/g, " ");
}

/**
 * ROI för team-raden: "+5,4 %" / "−2,8 %" med mellanslag före %.
 * Minus-tecknet är typografiskt (−) som i designen.
 */
export function formatTeamRoi(roi: number) {
  const abs = Math.abs(roi).toLocaleString("sv-SE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  if (roi > 0) return `+${abs} %`;
  if (roi < 0) return `−${abs} %`;
  return `${abs} %`;
}
