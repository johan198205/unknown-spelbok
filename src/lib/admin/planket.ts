"use server";

import { revalidatePath } from "next/cache";
import { logAdmin } from "@/lib/admin/log";
import { requireAdmin } from "@/lib/auth";
import { PLANKET_PATH } from "@/lib/planket";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Modereringen av Planket.
 *
 * Läser vyn planket_reported_posts, som är återkallad för både anon och
 * authenticated — den innehåller vem som anmält vad och får bara läsas med
 * service role härifrån.
 */

export type ReportedPost = {
  post_id: string;
  body: string;
  attachment_type: string;
  created_at: string;
  hidden_at: string | null;
  deleted_at: string | null;
  author_id: string;
  author_username: string;
  author_banned: boolean;
  report_count: number;
  open_reports: number;
  reasons: string[];
  last_reported_at: string;
};

export async function listReportedPosts(): Promise<ReportedPost[]> {
  await requireAdmin();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("planket_reported_posts")
    .select("*")
    .limit(200);

  if (error) {
    console.error("admin/planket: kunde inte läsa anmälningar", error.message);
    return [];
  }
  return (data ?? []) as unknown as ReportedPost[];
}

/**
 * BEHÅLL — inlägget får ligga kvar. Tar bort en eventuell automatisk
 * döljning och stänger anmälningarna så raden lämnar kön.
 */
export async function keepPost(postId: string) {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("posts")
    .update({ hidden_at: null })
    .eq("id", postId);
  if (error) return { ok: false as const, error: error.message };

  await closeReports(postId);
  await logAdmin("planket.keep", `inlägg ${postId}`, { postId });

  revalidatePath("/admin/planket");
  revalidatePath(PLANKET_PATH);
  return { ok: true as const };
}

/** DÖLJ — inlägget försvinner ur flödet men ligger kvar för författaren. */
export async function hidePost(postId: string) {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("posts")
    .update({ hidden_at: new Date().toISOString() })
    .eq("id", postId);
  if (error) return { ok: false as const, error: error.message };

  await closeReports(postId);
  await logAdmin("planket.hide", `inlägg ${postId}`, { postId });

  revalidatePath("/admin/planket");
  revalidatePath(PLANKET_PATH);
  return { ok: true as const };
}

/**
 * STÄNG AV FÖRFATTAREN — samma banned-flagga som i användarvyn. Inlägget
 * döljs samtidigt; att stänga av någon och låta inlägget ligga kvar vore
 * halvmesyr.
 */
export async function banAuthor(postId: string, authorId: string) {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({ banned: true })
    .eq("id", authorId);
  if (error) return { ok: false as const, error: error.message };

  await admin
    .from("posts")
    .update({ hidden_at: new Date().toISOString() })
    .eq("id", postId);
  await closeReports(postId);
  await logAdmin("planket.ban_author", `användare ${authorId}`, {
    postId,
    authorId,
  });

  revalidatePath("/admin/planket");
  revalidatePath("/admin/anvandare");
  revalidatePath(PLANKET_PATH);
  return { ok: true as const };
}

async function closeReports(postId: string) {
  const admin = createAdminClient();
  await admin
    .from("post_reports")
    .update({ handled_at: new Date().toISOString() })
    .eq("post_id", postId)
    .is("handled_at", null);
}
