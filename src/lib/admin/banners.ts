"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { logAdmin } from "@/lib/admin/log";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Banner, BannerFormat, BannerPlacement } from "@/lib/types";

export type BannerRow = Banner & {
  views: number;
  clicks: number;
  ctr: number;
};

export type BannerDraft = {
  id?: string;
  title: string;
  image_url: string;
  link_url: string;
  placement: BannerPlacement;
  format: BannerFormat;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
  sort: number;
};

const BUCKET = "banners";

/** Public storage URLs look like /storage/v1/object/public/<bucket>/<path>. */
function storagePathFromUrl(url: string | null) {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const at = url.indexOf(marker);
  if (at === -1) return null;
  const path = url.slice(at + marker.length).split("?")[0];
  return path ? decodeURIComponent(path) : null;
}

async function removeStorageImage(url: string | null) {
  const path = storagePathFromUrl(url);
  if (!path) return;
  const { error } = await createAdminClient().storage.from(BUCKET).remove([path]);
  if (error) console.error("banner image remove failed", error.message);
}

/** Public pages read banners on every placement, so purge the whole tree. */
function revalidateBanners() {
  revalidatePath("/admin/banners");
  revalidatePath("/", "layout");
}

export async function listBanners(): Promise<BannerRow[]> {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: banners, error }, { data: stats }] = await Promise.all([
    supabase
      .from("banners")
      .select("*")
      .order("sort", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase.from("banner_stats").select("banner_id, views, clicks, ctr"),
  ]);

  if (error) throw new Error(error.message);

  const byId = new Map(
    (stats ?? []).map((s) => [
      s.banner_id,
      {
        views: Number(s.views ?? 0),
        clicks: Number(s.clicks ?? 0),
        ctr: Number(s.ctr ?? 0),
      },
    ])
  );

  return ((banners ?? []) as Banner[]).map((b) => ({
    ...b,
    ...(byId.get(b.id) ?? { views: 0, clicks: 0, ctr: 0 }),
  }));
}

export async function saveBanner(draft: BannerDraft) {
  await requireAdmin();
  const supabase = await createClient();

  const title = draft.title.trim();
  if (!title) throw new Error("Titel krävs");
  if (!draft.image_url.trim()) throw new Error("Bild krävs");

  const payload = {
    title,
    image_url: draft.image_url.trim(),
    link_url: draft.link_url.trim() || null,
    placement: draft.placement,
    format: draft.format,
    starts_at: draft.starts_at,
    ends_at: draft.ends_at,
    active: draft.active,
    sort: Number.isFinite(draft.sort) ? draft.sort : 0,
  };

  if (draft.id) {
    const { data: current } = await supabase
      .from("banners")
      .select("image_url")
      .eq("id", draft.id)
      .maybeSingle();

    const { error } = await supabase
      .from("banners")
      .update(payload)
      .eq("id", draft.id);
    if (error) throw new Error(error.message);

    if (current && current.image_url !== payload.image_url) {
      await removeStorageImage(current.image_url);
    }

    await logAdmin("banner.updated", `banner ${title}`, {
      id: draft.id,
      placement: payload.placement,
    });
    revalidateBanners();
    return { id: draft.id };
  }

  const { data, error } = await supabase
    .from("banners")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await logAdmin("banner.created", `banner ${title}`, {
    id: data.id,
    placement: payload.placement,
  });
  revalidateBanners();
  return { id: data.id };
}

export async function setBannerActive(id: string, active: boolean) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: banner } = await supabase
    .from("banners")
    .select("title")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .from("banners")
    .update({ active })
    .eq("id", id);
  if (error) throw new Error(error.message);

  await logAdmin(
    active ? "banner.activated" : "banner.paused",
    `banner ${banner?.title ?? id}`,
    { id, active }
  );
  revalidateBanners();
  return { active };
}

export async function deleteBanner(id: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: banner } = await supabase
    .from("banners")
    .select("title, image_url")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("banners").delete().eq("id", id);
  if (error) throw new Error(error.message);

  await removeStorageImage(banner?.image_url ?? null);

  await logAdmin("banner.deleted", `banner ${banner?.title ?? id}`, { id });
  revalidateBanners();
}
