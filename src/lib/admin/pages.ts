"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { logAdmin } from "@/lib/admin/log";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import type { Page } from "@/lib/types";

export type PageListRow = {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  show_in_footer: boolean;
  updated_at: string;
  author: string;
};

export type PageDraft = {
  title: string;
  slug: string;
  content: string;
  seo_title: string;
  seo_description: string;
  show_in_footer: boolean;
};

/** Reserved routes that must not be shadowed by a CMS slug. */
const RESERVED_SLUGS = [
  "admin",
  "hem",
  "installningar",
  "login",
  "offline",
  "profil",
  "registrera",
  "spelbok",
  "spelbolag",
  "statistik",
  "tavlingar",
  "topplista",
];

async function uniqueSlug(base: string, ignoreId?: string) {
  const supabase = await createClient();
  const root = slugify(base) || "sida";
  let candidate = RESERVED_SLUGS.includes(root) ? `${root}-sida` : root;

  for (let i = 2; i < 100; i++) {
    const { data } = await supabase
      .from("pages")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data || data.id === ignoreId) return candidate;
    candidate = `${root}-${i}`;
  }
  return `${root}-${Date.now()}`;
}

function escapeFilter(value: string) {
  return value.replace(/[,()%]/g, " ").trim();
}

export async function listPages(q?: string): Promise<PageListRow[]> {
  await requireAdmin();
  const supabase = await createClient();

  let query = supabase
    .from("pages")
    .select(
      "id, title, slug, published, show_in_footer, updated_at, profiles:author_id(username)"
    )
    .order("updated_at", { ascending: false });

  const term = escapeFilter(q ?? "");
  if (term) query = query.or(`title.ilike.%${term}%,slug.ilike.%${term}%`);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    published: row.published,
    show_in_footer: row.show_in_footer,
    updated_at: row.updated_at,
    author: (row.profiles as { username?: string } | null)?.username ?? "—",
  }));
}

export async function getPage(id: string): Promise<Page | null> {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("pages")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as Page) ?? null;
}

export async function createPage() {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pages")
    .insert({
      title: "Ny sida",
      slug: await uniqueSlug("ny-sida"),
      content: "",
      published: false,
      author_id: profile.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/admin/sidor");
  redirect(`/admin/sidor/${data.id}`);
}

export async function savePage(id: string, draft: PageDraft) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: current } = await supabase
    .from("pages")
    .select("slug, published")
    .eq("id", id)
    .maybeSingle();
  if (!current) throw new Error("Sidan finns inte");

  const slug =
    slugify(draft.slug) === current.slug
      ? current.slug
      : await uniqueSlug(draft.slug || draft.title, id);
  const savedAt = new Date().toISOString();

  const { error } = await supabase
    .from("pages")
    .update({
      title: draft.title.trim() || "Namnlös sida",
      slug,
      content: draft.content,
      seo_title: draft.seo_title.trim() || null,
      seo_description: draft.seo_description.trim() || null,
      show_in_footer: draft.show_in_footer,
      updated_at: savedAt,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  if (current.published) {
    revalidatePath(`/${current.slug}`);
    if (slug !== current.slug) revalidatePath(`/${slug}`);
  }

  return { slug, savedAt };
}

export async function publishPage(id: string, published: boolean) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: page } = await supabase
    .from("pages")
    .select("slug, title")
    .eq("id", id)
    .maybeSingle();
  if (!page) throw new Error("Sidan finns inte");

  const { error } = await supabase
    .from("pages")
    .update({ published, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);

  await logAdmin(
    published ? "page.published" : "page.unpublished",
    `/${page.slug}`,
    { id, title: page.title }
  );

  revalidatePath("/admin/sidor");
  revalidatePath(`/${page.slug}`);
  revalidatePath("/", "layout");

  return { published };
}

export async function unpublishPage(id: string) {
  return publishPage(id, false);
}

export async function duplicatePage(id: string) {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const { data: page } = await supabase
    .from("pages")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!page) throw new Error("Sidan finns inte");

  const { data: copy, error } = await supabase
    .from("pages")
    .insert({
      title: `${page.title} (kopia)`,
      slug: await uniqueSlug(`${page.slug}-kopia`),
      content: page.content,
      seo_title: page.seo_title,
      seo_description: page.seo_description,
      show_in_footer: false,
      published: false,
      author_id: profile.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/admin/sidor");
  return { id: copy.id };
}

export async function deletePage(id: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: page } = await supabase
    .from("pages")
    .select("slug, title")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("pages").delete().eq("id", id);
  if (error) throw new Error(error.message);

  await logAdmin("page.deleted", `/${page?.slug ?? id}`, {
    id,
    title: page?.title,
  });

  revalidatePath("/admin/sidor");
  if (page?.slug) revalidatePath(`/${page.slug}`);
  revalidatePath("/", "layout");
}
