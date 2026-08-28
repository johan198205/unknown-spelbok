"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { logAdmin } from "@/lib/admin/log";
import {
  normalizePath,
  POPUP_AUDIENCES,
  POPUP_FREQUENCIES,
  POPUP_SCOPES,
  POPUP_TRIGGERS,
  type Popup,
  type PopupAudience,
  type PopupFrequency,
  type PopupScope,
  type PopupTrigger,
} from "@/lib/popups";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type PopupRow = Popup & {
  created_at: string;
  views: number;
  clicks: number;
  dismissals: number;
  ctr: number;
};

export type PopupDraft = {
  id?: string;
  title: string;
  body: string;
  image_url: string;
  button_label: string;
  button_url: string;
  trigger_type: PopupTrigger;
  trigger_value: number;
  target_scope: PopupScope;
  target_paths: string[];
  audience: PopupAudience;
  frequency: PopupFrequency;
  notify: boolean;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  sort: number;
};

const BUCKET = "popups";

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
  if (error) console.error("popup image remove failed", error.message);
}

/** Rutan kan trigga var som helst i appen, så purga hela trädet. */
function revalidatePopups() {
  revalidatePath("/admin/popups");
  revalidatePath("/", "layout");
}

export async function listPopups(): Promise<PopupRow[]> {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: popups, error }, { data: stats }] = await Promise.all([
    supabase
      .from("popups")
      .select("*")
      .order("sort", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase
      .from("popup_stats")
      .select("popup_id, views, clicks, dismissals, ctr"),
  ]);

  if (error) throw new Error(friendly(error.message));

  const byId = new Map(
    (stats ?? []).map((s) => [
      s.popup_id,
      {
        views: Number(s.views ?? 0),
        clicks: Number(s.clicks ?? 0),
        dismissals: Number(s.dismissals ?? 0),
        ctr: Number(s.ctr ?? 0),
      },
    ])
  );

  return ((popups ?? []) as unknown as (Popup & { created_at: string })[]).map(
    (p) => ({
      ...p,
      target_paths: p.target_paths ?? [],
      ...(byId.get(p.id) ?? { views: 0, clicks: 0, dismissals: 0, ctr: 0 }),
    })
  );
}

function oneOf<T extends string>(
  allowed: readonly T[],
  value: unknown,
  fallback: T
): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export async function savePopup(draft: PopupDraft) {
  await requireAdmin();
  const supabase = await createClient();

  const title = draft.title.trim();
  const body = draft.body.trim();
  const imageUrl = draft.image_url.trim();
  const buttonLabel = draft.button_label.trim();
  const buttonUrl = draft.button_url.trim();

  // Samma krav som popups_content_check i db/popups.sql, fast med ett
  // felmeddelande redaktionen förstår i stället för en constraint-text.
  if (!title && !body && !imageUrl) {
    throw new Error("Fyll i rubrik, text eller bild — rutan behöver innehåll");
  }
  if (!!buttonLabel !== !!buttonUrl) {
    throw new Error("Knappen behöver både text och länk");
  }

  const trigger = oneOf(POPUP_TRIGGERS, draft.trigger_type, "load");
  const scope = oneOf(POPUP_SCOPES, draft.target_scope, "all");

  // Sökvägarna städas här och inte i renderaren: "kuponger " och
  // "/kuponger/" ska bli samma rad i databasen, annars matchar den ena
  // och den andra inte, utan att någon ser varför.
  const paths =
    scope === "paths"
      ? [
          ...new Set(
            draft.target_paths.map((p) => normalizePath(p)).filter(Boolean)
          ),
        ]
      : [];

  if (scope === "paths" && !paths.length) {
    throw new Error("Ange minst en sökväg, t.ex. /kuponger");
  }

  // trigger_value bär bara mening för delay och scroll. Nolla den annars,
  // så en trigger som ändras från "efter 20 s" till "vid sidladdning"
  // inte lämnar kvar en siffra som ser ut att göra något.
  let triggerValue = 0;
  if (trigger === "delay") {
    triggerValue = Math.max(0, Math.round(draft.trigger_value || 0));
  } else if (trigger === "scroll") {
    triggerValue = Math.min(100, Math.max(1, Math.round(draft.trigger_value || 50)));
  }

  const payload = {
    title,
    body,
    image_url: imageUrl || null,
    button_label: buttonLabel || null,
    button_url: buttonUrl || null,
    trigger_type: trigger,
    trigger_value: triggerValue,
    target_scope: scope,
    target_paths: paths,
    audience: oneOf(POPUP_AUDIENCES, draft.audience, "all"),
    frequency: oneOf(POPUP_FREQUENCIES, draft.frequency, "once"),
    notify: !!draft.notify,
    active: !!draft.active,
    starts_at: draft.starts_at,
    ends_at: draft.ends_at,
    sort: Number.isFinite(draft.sort) ? draft.sort : 0,
    updated_at: new Date().toISOString(),
  };

  if (draft.id) {
    const { data: current } = await supabase
      .from("popups")
      .select("image_url")
      .eq("id", draft.id)
      .maybeSingle();

    const { error } = await supabase
      .from("popups")
      .update(payload)
      .eq("id", draft.id);
    if (error) throw new Error(friendly(error.message));

    if (current && current.image_url !== payload.image_url) {
      await removeStorageImage(current.image_url);
    }

    await logAdmin("popup.updated", `popup ${title || draft.id}`, {
      id: draft.id,
      trigger: payload.trigger_type,
      scope: payload.target_scope,
    });
    revalidatePopups();
    return { id: draft.id };
  }

  const { data, error } = await supabase
    .from("popups")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw new Error(friendly(error.message));

  await logAdmin("popup.created", `popup ${title || data.id}`, {
    id: data.id,
    trigger: payload.trigger_type,
    scope: payload.target_scope,
  });
  revalidatePopups();
  return { id: data.id };
}

export async function setPopupActive(id: string, active: boolean) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: popup } = await supabase
    .from("popups")
    .select("title")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("popups").update({ active }).eq("id", id);
  if (error) throw new Error(friendly(error.message));

  await logAdmin(
    active ? "popup.activated" : "popup.paused",
    `popup ${popup?.title || id}`,
    { id, active }
  );
  revalidatePopups();
  return { active };
}

export async function deletePopup(id: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: popup } = await supabase
    .from("popups")
    .select("title, image_url")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("popups").delete().eq("id", id);
  if (error) throw new Error(friendly(error.message));

  await removeStorageImage(popup?.image_url ?? null);

  await logAdmin("popup.deleted", `popup ${popup?.title || id}`, { id });
  revalidatePopups();
}

function friendly(message: string) {
  return /popups|popup_stats|schema cache|could not find/i.test(message)
    ? "Kör SQL-filen db/popups.sql i Supabase först."
    : message;
}
