"use server";

import { createClient } from "@/lib/supabase/server";

export async function logBannerClick(bannerId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("banner_events")
    .insert({ banner_id: bannerId, event: "click" });
  if (error) console.error("logBannerClick failed", error.message);
}
