import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

export type SyncLogMeta = Record<string, unknown>;

export function createServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY saknas");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function startSyncLog(
  supabase: SupabaseClient,
  job: string,
  sport: string
) {
  const { data, error } = await supabase
    .from("sync_log")
    .insert({ job, sport })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function finishSyncLog(
  supabase: SupabaseClient,
  id: string,
  patch: {
    ok: boolean;
    requests?: number;
    upserted?: number;
    settled?: number;
    error?: string | null;
    meta?: SyncLogMeta;
  }
) {
  const { error } = await supabase
    .from("sync_log")
    .update({
      finished_at: new Date().toISOString(),
      ok: patch.ok,
      requests: patch.requests ?? 0,
      upserted: patch.upserted ?? 0,
      settled: patch.settled ?? 0,
      error: patch.error ?? null,
      meta: patch.meta ?? {},
    })
    .eq("id", id);
  if (error) console.error("sync_log update misslyckades", error.message);
}
