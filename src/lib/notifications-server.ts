import { cache } from "react";
import { getSessionUser } from "@/lib/auth";
import {
  normalizeSettings,
  NOTIFICATION_SETTINGS_COLUMNS,
  type NotificationSettings,
} from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";

/**
 * Antal olästa för den inloggade. Serverrenderas i headern så klockan
 * har rätt siffra vid första målningen — realtime tar över därefter.
 *
 * head: true hämtar bara count, aldrig raderna. Panelen laddar listan
 * först när den öppnas.
 */
export const getUnreadNotificationCount = cache(
  async function getUnreadNotificationCount(): Promise<number> {
    const user = await getSessionUser();
    if (!user) return 0;

    const supabase = await createClient();
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null);

    if (error) {
      // Tabellen saknas (db/notifications.sql inte körd) ska inte krascha
      // headern på varje sida — klockan visas bara utan siffra.
      console.warn("notiser: kunde inte räkna olästa", error.message);
      return 0;
    }
    return count ?? 0;
  }
);

/** Användarens notisinställningar, med defaults när raden saknas. */
export const getNotificationSettings = cache(
  async function getNotificationSettings(): Promise<NotificationSettings> {
    const user = await getSessionUser();
    if (!user) return normalizeSettings(null);

    const supabase = await createClient();
    const { data } = await supabase
      .from("notification_settings")
      .select(NOTIFICATION_SETTINGS_COLUMNS)
      .eq("user_id", user.id)
      .maybeSingle();

    return normalizeSettings(data as Record<string, unknown> | null);
  }
);
