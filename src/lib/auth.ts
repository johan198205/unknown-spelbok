import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "./supabase/server";
import type { Profile } from "./types";

/**
 * getUser() går mot Supabase Auth över nätet. Utan memoisering gjorde en enda
 * navigering 4–5 sådana anrop i serie (layout + header + requireUser +
 * getProfile). cache() gör att varje request bara betalar för ett.
 */
export const getSessionUser = cache(async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getProfile = cache(async function getProfile(): Promise<Profile | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return data as Profile | null;
});

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** Körs under /admin, där getProfile() läser adminsessionen (se supabase/scope.ts). */
export async function requireAdmin() {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") redirect("/admin/login");
  return profile;
}

/** Superadmin: får skapa konton, bjuda in admins och ändra roller. */
export async function requireSuperadmin() {
  const profile = await requireAdmin();
  if (!profile.is_superadmin) {
    throw new Error("Bara superadmin kan göra det här.");
  }
  return profile;
}
