// Anropas bara från servern (app-layouten). Inget "use server" — vi vill inte
// exponera en action-endpoint som tar emot en profil utifrån.
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/**
 * Update last_seen_at at most once per hour.
 *
 * Skicka in profilen när anroparen redan har den — körs detta via after() finns
 * inte React-cachen kvar, och ett getProfile() här hade kostat två extra
 * nätverksanrop i onödan.
 */
export async function touchLastSeen(known?: Profile | null) {
  const profile = known ?? (await getProfile());
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
