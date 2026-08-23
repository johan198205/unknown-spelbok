"use server";

import { revalidatePath } from "next/cache";
import { logAdmin } from "@/lib/admin/log";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  parseSiteSettings,
  SITE_SETTINGS_KEY,
  type SiteSettings,
} from "@/lib/site-settings";
import type { Json } from "@/lib/types";

export type NotifyChannel = "email" | "none";

export type NotifySettings = {
  new_user: NotifyChannel;
  manual_settle: NotifyChannel;
  api_quota: NotifyChannel;
  competition_entry: NotifyChannel;
};

const NOTIFY_KEY = "notify";

const NOTIFY_DEFAULTS: NotifySettings = {
  new_user: "email",
  manual_settle: "email",
  api_quota: "email",
  competition_entry: "none",
};

const LOGS_PAGE_SIZE = 50;

function parseNotify(value: unknown): NotifySettings {
  const raw = (value ?? {}) as Record<string, unknown>;
  const channel = (v: unknown, fallback: NotifyChannel): NotifyChannel =>
    v === "email" || v === "none" ? v : fallback;

  return {
    new_user: channel(raw.new_user, NOTIFY_DEFAULTS.new_user),
    manual_settle: channel(raw.manual_settle, NOTIFY_DEFAULTS.manual_settle),
    api_quota: channel(raw.api_quota, NOTIFY_DEFAULTS.api_quota),
    competition_entry: channel(
      raw.competition_entry,
      NOTIFY_DEFAULTS.competition_entry
    ),
  };
}

export async function getAdminSettings(): Promise<{
  site: SiteSettings;
  notify: NotifySettings;
}> {
  await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", [SITE_SETTINGS_KEY, NOTIFY_KEY]);

  const rows = new Map(
    ((data ?? []) as { key: string; value: unknown }[]).map((r) => [
      r.key,
      r.value,
    ])
  );

  return {
    site: parseSiteSettings(rows.get(SITE_SETTINGS_KEY)),
    notify: parseNotify(rows.get(NOTIFY_KEY)),
  };
}

export async function saveSiteSettings(input: SiteSettings) {
  await requireAdmin();
  const supabase = await createClient();

  const value = parseSiteSettings(input);
  const { error } = await supabase.from("app_settings").upsert(
    {
      key: SITE_SETTINGS_KEY,
      value: value as unknown as Json,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
  if (error) throw new Error(error.message);

  await logAdmin("settings.site_updated", `sajtinställningar ${value.name}`, {
    registrations_open: value.registrations_open,
    maintenance: value.maintenance,
    competitions_enabled: value.competitions_enabled,
    currency: value.currency,
  });

  revalidatePath("/admin/installningar");
  revalidatePath("/registrera");
  revalidatePath("/", "layout");
  return value;
}

/**
 * Tävlingsväxeln sitter på /admin/tavlingar och rör bara ett fält — läs in
 * resten av 'site' först så inga andra inställningar skrivs över.
 */
export async function setCompetitionsEnabled(enabled: boolean) {
  await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", SITE_SETTINGS_KEY)
    .maybeSingle();

  const current = parseSiteSettings((data as { value: unknown } | null)?.value);
  const value: SiteSettings = { ...current, competitions_enabled: enabled };

  const { error } = await supabase.from("app_settings").upsert(
    {
      key: SITE_SETTINGS_KEY,
      value: value as unknown as Json,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
  if (error) throw new Error(error.message);

  await logAdmin(
    "settings.competitions_toggled",
    enabled ? "tävlingar påslagna" : "tävlingar avstängda",
    { competitions_enabled: enabled }
  );

  revalidatePath("/admin/tavlingar");
  revalidatePath("/admin/installningar");
  revalidatePath("/tavlingar");
  revalidatePath("/topplista");
  revalidatePath("/", "layout");
  return value;
}

export async function getSiteSettings(): Promise<SiteSettings> {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", SITE_SETTINGS_KEY)
    .maybeSingle();
  return parseSiteSettings((data as { value: unknown } | null)?.value);
}

export async function saveNotifySettings(input: NotifySettings) {
  await requireAdmin();
  const supabase = await createClient();

  const value = parseNotify(input);
  const { error } = await supabase.from("app_settings").upsert(
    {
      key: NOTIFY_KEY,
      value: value as unknown as Json,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
  if (error) throw new Error(error.message);

  await logAdmin("settings.notify_updated", "notisinställningar", { ...value });

  revalidatePath("/admin/installningar");
  return value;
}

export async function getApiKeyStatus(): Promise<{
  configured: boolean;
  serviceRoleConfigured: boolean;
  lastSync: string | null;
}> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sync_log")
    .select("started_at, ok")
    .eq("ok", true)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const last =
    error || !data
      ? null
      : (data as { started_at: string; ok: boolean });

  return {
    // Nyckeln ligger i Edge Function secrets — Next.js ser den aldrig.
    // En lyckad synk är signalen att den är konfigurerad.
    configured: !!last,
    serviceRoleConfigured: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    lastSync: last?.started_at ?? null,
  };
}

export type AdminLogRow = {
  id: string;
  createdAt: string;
  admin: string;
  action: string;
  target: string | null;
};

export async function getAdminLogs(opts: {
  action?: string;
  page?: number;
}): Promise<{
  rows: AdminLogRow[];
  total: number;
  page: number;
  pageSize: number;
  actions: string[];
}> {
  await requireAdmin();
  const supabase = await createClient();

  const page = Math.max(1, opts.page ?? 1);
  const action = opts.action && opts.action !== "all" ? opts.action : null;
  const from = (page - 1) * LOGS_PAGE_SIZE;

  let query = supabase
    .from("admin_logs")
    .select("id, action, target, created_at, profiles:admin_id(username)", {
      count: "exact",
    });

  if (action) query = query.eq("action", action);

  const [{ data, count, error }, { data: actionRows }] = await Promise.all([
    query.order("created_at", { ascending: false }).range(from, from + LOGS_PAGE_SIZE - 1),
    supabase
      .from("admin_logs")
      .select("action")
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);

  if (error) throw new Error(error.message);

  const rows: AdminLogRow[] = (
    (data ?? []) as unknown as {
      id: string;
      action: string;
      target: string | null;
      created_at: string;
      profiles: { username: string } | null;
    }[]
  ).map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    admin: row.profiles?.username ?? "system",
    action: row.action,
    target: row.target,
  }));

  const actions = [
    ...new Set(((actionRows ?? []) as { action: string }[]).map((r) => r.action)),
  ].sort();

  return {
    rows,
    total: count ?? rows.length,
    page,
    pageSize: LOGS_PAGE_SIZE,
    actions,
  };
}
