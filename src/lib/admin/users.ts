"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { logAdmin } from "@/lib/admin/log";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function setUserRole(userId: string, role: "user" | "admin") {
  await requireAdmin();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();

  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);
  if (error) throw new Error(error.message);

  await logAdmin("user.role_changed", `användare ${profile?.username ?? userId}`, {
    userId,
    role,
  });
  revalidatePath("/admin/anvandare");
}

export async function setUserBanned(userId: string, banned: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();

  const { error } = await supabase
    .from("profiles")
    .update({ banned })
    .eq("id", userId);
  if (error) throw new Error(error.message);

  await logAdmin(
    banned ? "user.banned" : "user.unbanned",
    `användare ${profile?.username ?? userId}`,
    { userId, banned }
  );
  revalidatePath("/admin/anvandare");
}

export type AdminUserRow = {
  id: string;
  username: string;
  avatar_url: string | null;
  role: string;
  banned: boolean;
  created_at: string;
  last_seen_at: string | null;
  email: string;
  bets: number;
  netto: number;
};

export async function getAdminUsers(opts: {
  q?: string;
  filter?: string;
  page?: number;
}): Promise<{ rows: AdminUserRow[]; total: number; page: number }> {
  await requireAdmin();
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = 20;
  const filter = opts.filter ?? "all";
  const q = (opts.q ?? "").trim().toLowerCase();

  const supabase = await createClient();
  const admin = createAdminClient();

  let query = supabase
    .from("profiles")
    .select("id, username, avatar_url, role, banned, created_at, last_seen_at", {
      count: "exact",
    });

  if (filter === "admins") query = query.eq("role", "admin");
  if (filter === "banned") query = query.eq("banned", true);
  if (q) query = query.ilike("username", `%${q}%`);

  const from = (page - 1) * pageSize;
  const { data: profiles, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) throw new Error(error.message);

  const emails = new Map<string, string>();
  try {
    const { data: listed } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    for (const u of listed?.users ?? []) {
      if (u.email) emails.set(u.id, u.email);
    }
  } catch (e) {
    console.error("listUsers failed", e);
  }

  const ids = (profiles ?? []).map((p) => p.id);
  const betMap = new Map<string, { bets: number; netto: number }>();

  if (ids.length) {
    const { data: bets } = await supabase
      .from("bets")
      .select("user_id, stake, payout, result, logged_before_kickoff")
      .in("user_id", ids);

    for (const b of bets ?? []) {
      const cur = betMap.get(b.user_id) ?? { bets: 0, netto: 0 };
      cur.bets += 1;
      if (b.result !== "open") {
        cur.netto += Number(b.payout) - Number(b.stake);
      }
      betMap.set(b.user_id, cur);
    }
  }

  let rows: AdminUserRow[] = (profiles ?? []).map((p) => {
    const stats = betMap.get(p.id) ?? { bets: 0, netto: 0 };
    return {
      ...p,
      email: emails.get(p.id) ?? "—",
      bets: stats.bets,
      netto: stats.netto,
    };
  });

  // Email search (service-side): filter in memory if q looks like email
  if (q.includes("@")) {
    rows = rows.filter(
      (r) =>
        r.email.toLowerCase().includes(q) ||
        r.username.toLowerCase().includes(q)
    );
  }

  return { rows, total: count ?? rows.length, page };
}

export async function getUserDetail(userId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return null;

  let email = "—";
  try {
    const { data } = await admin.auth.admin.getUserById(userId);
    email = data.user?.email ?? "—";
  } catch {
    /* ignore */
  }

  const [{ data: sheets }, { data: bets }] = await Promise.all([
    supabase
      .from("sheets")
      .select("id, name, is_public")
      .eq("user_id", userId)
      .order("created_at"),
    supabase
      .from("bets")
      .select(
        "id, match, pick, odds, stake, payout, result, placed_at, logged_before_kickoff"
      )
      .eq("user_id", userId)
      .order("placed_at", { ascending: false })
      .limit(5),
  ]);

  const { data: allBets } = await supabase
    .from("bets")
    .select("stake, payout, result, logged_before_kickoff")
    .eq("user_id", userId);

  const settled = (allBets ?? []).filter((b) => b.result !== "open");
  const netto = settled.reduce(
    (s, b) => s + Number(b.payout) - Number(b.stake),
    0
  );

  return {
    profile,
    email,
    sheets: sheets ?? [],
    bets: bets ?? [],
    betsCount: (allBets ?? []).length,
    netto,
  };
}
