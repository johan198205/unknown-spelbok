"use server";

import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/types";

export async function logAdmin(
  action: string,
  target: string,
  meta?: Record<string, unknown>
) {
  const profile = await getProfile();
  if (!profile) return;

  const supabase = await createClient();
  const { error } = await supabase.from("admin_logs").insert({
    admin_id: profile.id,
    action,
    target,
    meta: (meta ?? {}) as Json,
  });

  if (error) {
    console.error("logAdmin failed", error.message);
  }
}
