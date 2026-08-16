"use server";

import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Update last_seen_at at most once per hour. */
export async function touchLastSeen() {
  const profile = await getProfile();
  if (!profile) return;

  const last = profile.last_seen_at
    ? new Date(profile.last_seen_at).getTime()
    : 0;
  if (Date.now() - last < 60 * 60 * 1000) return;

  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", profile.id);
}
