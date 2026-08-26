"use server";

import { getSessionUser } from "@/lib/auth";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  type NotificationSettings,
} from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";

export type NotificationSettingResult = { ok: true } | { ok: false; error: string };

const KEYS = Object.keys(DEFAULT_NOTIFICATION_SETTINGS) as (keyof NotificationSettings)[];

function isKey(value: unknown): value is keyof NotificationSettings {
  return typeof value === "string" && KEYS.includes(value as keyof NotificationSettings);
}

/**
 * Sparar en enskild toggle. Inställningen gäller FRAMÅT — befintliga
 * notiser av typen ligger kvar i panelen, det är historik.
 *
 * Update först, insert bara om raden saknas. En upsert med hela
 * defaultobjektet hade nollställt de nio andra togglarna varje gång
 * användaren rörde den tionde.
 */
export async function setNotificationSetting(
  key: string,
  value: boolean
): Promise<NotificationSettingResult> {
  if (!isKey(key)) return { ok: false, error: "Okänd inställning." };
  if (typeof value !== "boolean") return { ok: false, error: "Ogiltigt värde." };

  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Du är inte inloggad." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notification_settings")
    .update({ [key]: value, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .select("user_id")
    .maybeSingle();

  if (error) return { ok: false, error: friendly(error.message) };
  if (data) return { ok: true };

  // Konto registrerat innan triggern fanns: skapa raden med defaults.
  const { error: insertError } = await supabase
    .from("notification_settings")
    .insert({
      user_id: user.id,
      ...DEFAULT_NOTIFICATION_SETTINGS,
      [key]: value,
    });

  if (insertError) return { ok: false, error: friendly(insertError.message) };
  return { ok: true };
}

function friendly(message: string) {
  return /notification_settings|schema cache|could not find/i.test(message)
    ? "Kör SQL-filen db/notifications.sql i Supabase först."
    : message;
}
