"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { logAdmin } from "@/lib/admin/log";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Adminens egen inloggning. Allt här körs från sidor under /admin, så
 * createClient() läser och skriver adminsessionen — inte spelbokens.
 */

export type AdminAuthState = { error: string | null; email?: string };

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function safeNext(next: FormDataEntryValue | null) {
  const value = typeof next === "string" ? next : "";
  return value.startsWith("/admin") && !value.startsWith("//") ? value : "/admin";
}

export async function adminSignIn(
  _prev: AdminAuthState,
  formData: FormData
): Promise<AdminAuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Fyll i e-post och lösenord.", email };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user) return { error: "Fel e-post eller lösenord.", email };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, banned")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profile?.role !== "admin" || profile.banned) {
    await supabase.auth.signOut();
    return { error: "Kontot har ingen adminbehörighet.", email };
  }

  redirect(safeNext(formData.get("next")));
}

export async function adminSignOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

/** Öppen inbjudan för en token, eller null. Används av registreringssidan. */
export async function findOpenInvite(token: string) {
  if (!token) return null;
  const { data } = await createAdminClient()
    .from("admin_invites")
    .select("id, email")
    .eq("token_hash", hashToken(token))
    .is("used_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return data as { id: string; email: string } | null;
}

export async function registerAdmin(
  _prev: AdminAuthState,
  formData: FormData
): Promise<AdminAuthState> {
  const token = String(formData.get("token") ?? "");
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (username.length < 3 || username.length > 30) {
    return { error: "Användarnamnet ska vara 3–30 tecken." };
  }
  if (password.length < 8) {
    return { error: "Lösenordet ska vara minst 8 tecken." };
  }

  const admin = createAdminClient();

  const { data: taken } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (taken) return { error: "Användarnamnet är upptaget." };

  // Förbruka inbjudan först, villkorat, så att samma länk inte kan användas
  // två gånger samtidigt. Släpps igen om kontot inte går att skapa.
  const { data: invite } = await admin
    .from("admin_invites")
    .update({ used_at: new Date().toISOString() })
    .eq("token_hash", hashToken(token))
    .is("used_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("id, email")
    .maybeSingle();
  if (!invite) {
    return { error: "Inbjudan är ogiltig, redan använd eller har gått ut." };
  }

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email: invite.email,
      password,
      email_confirm: true,
      user_metadata: { username },
    });

  if (createError || !created.user) {
    await admin
      .from("admin_invites")
      .update({ used_at: null })
      .eq("id", invite.id);
    const exists = /already|registered|exists/i.test(createError?.message ?? "");
    return {
      error: exists
        ? "E-postadressen har redan ett konto. Be om en inbjudan till en annan adress."
        : "Kontot kunde inte skapas. Försök igen.",
    };
  }

  const userId = created.user.id;
  await admin.from("profiles").update({ role: "admin" }).eq("id", userId);
  await admin
    .from("admin_invites")
    .update({ used_by: userId })
    .eq("id", invite.id);
  await admin.from("admin_logs").insert({
    admin_id: userId,
    action: "admin.registered",
    target: `admin ${username}`,
    meta: { invite_id: invite.id },
  });

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: invite.email,
    password,
  });
  if (signInError) redirect("/admin/login");

  redirect("/admin");
}

export type AdminInviteRow = {
  id: string;
  email: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
};

export async function getAdminInvites(): Promise<AdminInviteRow[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("admin_invites")
    .select("id, email, created_at, expires_at, used_at, revoked_at")
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []) as AdminInviteRow[];
}

/** Skapar en inbjudan och returnerar token. Den visas bara den här gången. */
export async function createAdminInvite(
  email: string
): Promise<{ token: string } | { error: string }> {
  const profile = await requireAdmin();
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { error: "Ange en giltig e-postadress." };
  }

  const token = randomBytes(32).toString("base64url");
  const supabase = await createClient();
  const { error } = await supabase.from("admin_invites").insert({
    email: normalized,
    token_hash: hashToken(token),
    created_by: profile.id,
  });
  if (error) return { error: error.message };

  await logAdmin("admin.invited", normalized);
  revalidatePath("/admin/anvandare");
  return { token };
}

export async function revokeAdminInvite(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("admin_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .is("used_at", null)
    .select("email")
    .maybeSingle();
  if (data) await logAdmin("admin.invite_revoked", data.email);
  revalidatePath("/admin/anvandare");
}
