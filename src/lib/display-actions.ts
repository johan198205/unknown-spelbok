"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import {
  isCurrencyCode,
  isDisplayMode,
  type CurrencyCode,
  type DisplayMode,
} from "@/lib/display";
import { createClient } from "@/lib/supabase/server";

export type DisplayPrefsResult = { ok: true } | { ok: false; error: string };

/**
 * Toggeln i headern. Läget sparas på profilen — det ska följa med mellan
 * mobil och desktop och gälla alla spelböcker, inte bara den flik man råkar
 * stå i.
 */
export async function setDisplayMode(mode: DisplayMode): Promise<DisplayPrefsResult> {
  if (!isDisplayMode(mode)) return { ok: false, error: "Ogiltigt visningsläge." };

  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Du är inte inloggad." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_mode: mode })
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };

  // Belopp renderas på servern i stort sett varje vy — hela trädet måste om.
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setDisplayPrefs(input: {
  currency: CurrencyCode;
  unitSize: number;
}): Promise<DisplayPrefsResult> {
  if (!isCurrencyCode(input.currency)) return { ok: false, error: "Ogiltig valuta." };

  const unitSize = Number(input.unitSize);
  if (!Number.isFinite(unitSize) || unitSize <= 0) {
    return { ok: false, error: "Unit-storleken måste vara större än 0." };
  }

  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Du är inte inloggad." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      currency: input.currency,
      unit_size: Math.round(unitSize * 100) / 100,
    })
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
