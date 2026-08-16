"use server";

import { createClient } from "@/lib/supabase/server";

export type AdminSearchHit = {
  type: "profile" | "bookmaker" | "page";
  id: string;
  label: string;
  href: string;
  detail?: string;
};

export type AdminSearchGroups = {
  profiles: AdminSearchHit[];
  bookmakers: AdminSearchHit[];
  pages: AdminSearchHit[];
};

export async function adminGlobalSearch(
  query: string
): Promise<AdminSearchGroups> {
  const q = query.trim();
  const empty: AdminSearchGroups = {
    profiles: [],
    bookmakers: [],
    pages: [],
  };
  if (q.length < 2) return empty;

  const pattern = `%${q}%`;
  const supabase = await createClient();

  const [profilesRes, bookmakersRes, pagesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username")
      .ilike("username", pattern)
      .limit(8),
    supabase
      .from("bookmakers")
      .select("id, name, slug")
      .ilike("name", pattern)
      .limit(8),
    supabase
      .from("pages")
      .select("id, title, slug")
      .or(`title.ilike.%${q}%,slug.ilike.%${q}%`)
      .limit(8),
  ]);

  return {
    profiles: (profilesRes.data ?? []).map((p) => ({
      type: "profile" as const,
      id: p.id,
      label: p.username,
      href: `/admin/anvandare?q=${encodeURIComponent(p.username)}`,
      detail: "Användare",
    })),
    bookmakers: (bookmakersRes.data ?? []).map((b) => ({
      type: "bookmaker" as const,
      id: b.id,
      label: b.name,
      href: `/admin/spelbolag?id=${b.id}`,
      detail: b.slug,
    })),
    pages: (pagesRes.data ?? []).map((p) => ({
      type: "page" as const,
      id: p.id,
      label: p.title,
      href: `/admin/sidor/${p.id}`,
      detail: `/${p.slug}`,
    })),
  };
}
