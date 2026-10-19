"use server";

import { revalidatePath, updateTag } from "next/cache";
import { logAdmin } from "@/lib/admin/log";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  parseTextOverrides,
  TEXTS_CACHE_TAG,
  TEXTS_SETTINGS_KEY,
  type TextOverrides,
} from "@/lib/texts";
import { isTextKey } from "@/lib/texts/registry";
import type { Json } from "@/lib/types";

const MAX_TEXT_LENGTH = 10_000;

async function readStored(): Promise<TextOverrides> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", TEXTS_SETTINGS_KEY)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return parseTextOverrides((data as { value: unknown } | null)?.value);
}

/** Färska överskrivningar för admin — läses förbi cachen. */
export async function getAdminTextOverrides(): Promise<TextOverrides> {
  await requireAdmin();
  return readStored();
}

/**
 * Sparar ändrade texter. `null` tar bort överskrivningen så standardtexten i
 * koden gäller igen. Returnerar alla överskrivningar efter sparningen.
 */
export async function saveTextOverrides(
  changes: Record<string, string | null>
): Promise<TextOverrides> {
  await requireAdmin();

  const next = await readStored();
  const changed: string[] = [];
  for (const [key, value] of Object.entries(changes)) {
    if (!isTextKey(key)) continue;
    if (value === null) {
      if (key in next) {
        delete next[key];
        changed.push(key);
      }
      continue;
    }
    if (typeof value !== "string") continue;
    next[key] = value.slice(0, MAX_TEXT_LENGTH);
    changed.push(key);
  }

  if (!changed.length) return next;

  const supabase = await createClient();
  const { error } = await supabase.from("app_settings").upsert(
    {
      key: TEXTS_SETTINGS_KEY,
      value: next as unknown as Json,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
  if (error) throw new Error(error.message);

  await logAdmin(
    "texts.updated",
    changed.length === 1 ? changed[0] : `${changed.length} texter`,
    { keys: changed }
  );

  // Rot-layouten och getT() läser genom unstable_cache — updateTag gör nästa
  // sidvisning färsk direkt i stället för efter cachetiden.
  updateTag(TEXTS_CACHE_TAG);
  revalidatePath("/", "layout");
  return next;
}
