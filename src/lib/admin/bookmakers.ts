"use server";

import { revalidatePath } from "next/cache";
import { logAdmin } from "@/lib/admin/log";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import type { Bookmaker } from "@/lib/types";

const WINDOW_DAYS = 30;

export type BookmakerRow = Bookmaker & { clicks30: number };

export type ClickPoint = { date: string; count: number };

export type BookmakerInput = {
  id?: string | null;
  name: string;
  slug: string;
  logo_url: string | null;
  rating: number | null;
  rank?: number | null;
  bonus: string | null;
  bonus_value: number | null;
  terms: string | null;
  usp: string | null;
  review: string | null;
  plus: string[];
  minus: string[];
  payments: string[];
  fast_payout: boolean;
  tracking_url: string | null;
  active: boolean;
};

export type SaveResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Stockholm",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function dayKey(value: string | Date) {
  return dayFormat.format(new Date(value));
}

function windowStartIso() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - (WINDOW_DAYS - 1));
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function emptyDayCounts() {
  const counts = new Map<string, number>();
  for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    counts.set(dayKey(d), 0);
  }
  return counts;
}

function cleanList(values: string[] | null | undefined) {
  return (values ?? []).map((v) => v.trim()).filter(Boolean);
}

function textOrNull(value: string | null | undefined) {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : null;
}

function clampRating(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(Math.min(5, Math.max(0, value)) * 10) / 10;
}

function writeError(error: { code?: string; message: string }) {
  if (error.code === "23505") {
    return "Slugen används redan av ett annat spelbolag.";
  }
  return error.message;
}

function revalidateBookmakers() {
  revalidatePath("/admin/spelbolag");
  revalidatePath("/spelbolag");
}

export async function getBookmakersWithClicks(): Promise<BookmakerRow[]> {
  await requireAdmin();
  const supabase = await createClient();

  const [bookmakers, clicks] = await Promise.all([
    supabase.from("bookmakers").select("*").order("rank").order("name"),
    supabase
      .from("affiliate_clicks")
      .select("bookmaker_id")
      .gte("clicked_at", windowStartIso()),
  ]);

  if (bookmakers.error) throw new Error(bookmakers.error.message);

  const counts = new Map<string, number>();
  for (const click of clicks.data ?? []) {
    counts.set(click.bookmaker_id, (counts.get(click.bookmaker_id) ?? 0) + 1);
  }

  return (bookmakers.data ?? []).map((b) => ({
    ...b,
    clicks30: counts.get(b.id) ?? 0,
  }));
}

export async function getClicksSeries(
  bookmakerId: string
): Promise<ClickPoint[]> {
  await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("affiliate_clicks")
    .select("clicked_at")
    .eq("bookmaker_id", bookmakerId)
    .gte("clicked_at", windowStartIso());

  const counts = emptyDayCounts();
  for (const row of data ?? []) {
    const key = dayKey(row.clicked_at);
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()].map(([date, count]) => ({ date, count }));
}

export async function reorderBookmakers(ids: string[]) {
  await requireAdmin();
  if (!ids.length) return;

  const supabase = await createClient();
  const updatedAt = new Date().toISOString();

  const results = await Promise.all(
    ids.map((id, index) =>
      supabase
        .from("bookmakers")
        .update({ rank: index + 1, updated_at: updatedAt })
        .eq("id", id)
    )
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);

  await logAdmin("bookmaker.reordered", "rankordningen", { count: ids.length });
  revalidateBookmakers();
}

export async function saveBookmaker(input: BookmakerInput): Promise<SaveResult> {
  await requireAdmin();

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Namn krävs." };

  const logo = textOrNull(input.logo_url);
  if (!logo) return { ok: false, error: "Logotyp krävs." };

  const slug = slugify(input.slug?.trim() || name);
  if (!slug) return { ok: false, error: "Slug krävs." };

  const supabase = await createClient();
  const payload = {
    name,
    slug,
    logo_url: logo,
    rating: clampRating(input.rating),
    bonus: textOrNull(input.bonus),
    bonus_value: Math.max(0, Math.round(Number(input.bonus_value) || 0)),
    terms: textOrNull(input.terms),
    usp: textOrNull(input.usp),
    review: textOrNull(input.review),
    plus: cleanList(input.plus),
    minus: cleanList(input.minus),
    payments: cleanList(input.payments),
    fast_payout: !!input.fast_payout,
    tracking_url: textOrNull(input.tracking_url),
    active: input.active !== false,
    updated_at: new Date().toISOString(),
  };

  const wantedRank =
    input.rank != null && Number.isFinite(input.rank)
      ? Math.max(1, Math.round(input.rank))
      : null;

  if (input.id) {
    const { error } = await supabase
      .from("bookmakers")
      .update(wantedRank ? { ...payload, rank: wantedRank } : payload)
      .eq("id", input.id);
    if (error) return { ok: false, error: writeError(error) };

    await logAdmin("bookmaker.updated", `spelbolag ${name}`, {
      id: input.id,
      slug,
      active: payload.active,
    });
    revalidateBookmakers();
    return { ok: true, id: input.id };
  }

  const { data: last } = await supabase
    .from("bookmakers")
    .select("rank")
    .order("rank", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("bookmakers")
    .insert({ ...payload, rank: wantedRank ?? (last?.rank ?? 0) + 1 })
    .select("id")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error ? writeError(error) : "Kunde inte skapa spelbolaget.",
    };
  }

  await logAdmin("bookmaker.created", `spelbolag ${name}`, { id: data.id, slug });
  revalidateBookmakers();
  return { ok: true, id: data.id };
}

export async function toggleBookmakerActive(id: string, active: boolean) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("bookmakers")
    .select("name")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .from("bookmakers")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);

  await logAdmin(
    active ? "bookmaker.published" : "bookmaker.unpublished",
    `spelbolag ${row?.name ?? id}`,
    { id, active }
  );
  revalidateBookmakers();
}
