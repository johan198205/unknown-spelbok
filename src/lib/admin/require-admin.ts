import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Adminkontroll för API-routes.
 *
 * Samma mekanism som /admin-sidorna använder via requireAdmin() — rollen
 * läses ur profiles, inte ur något parallellt system. Skillnaden är att
 * routes ska svara med status, inte redirecta.
 */
export async function requireApiAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "Ej inloggad" }, { status: 401 }),
    } as const;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return {
      error: NextResponse.json({ error: "Förbjudet" }, { status: 403 }),
    } as const;
  }

  return { user, supabase } as const;
}
