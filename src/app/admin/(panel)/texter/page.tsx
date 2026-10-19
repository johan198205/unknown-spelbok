import { TextsAdmin, type TextAreaView } from "@/components/admin/TextsAdmin";
import { getAdminTextOverrides } from "@/lib/admin/texts";
import { listPages } from "@/lib/admin/pages";
import { TEXT_AREAS } from "@/lib/texts/registry";

export const metadata = { title: "Texter" };

/** Områden vars huvudinnehåll redigeras som kärnsida under Sidor. */
const CMS_SLUGS: Record<string, string[]> = {
  landing: ["startsida"],
  kontakt: ["kontakt"],
  omoss: ["om-oss"],
  topplista: ["topplista"],
  planket: ["planket"],
  spelbolag: ["spelbolag"],
};

export default async function AdminTextsPage({
  searchParams,
}: {
  searchParams: Promise<{ omrade?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const [overrides, pages] = await Promise.all([
    getAdminTextOverrides(),
    listPages(),
  ]);
  const pageBySlug = new Map(pages.map((p) => [p.slug, p]));

  const areas: TextAreaView[] = TEXT_AREAS.map((area) => ({
    id: area.id,
    label: area.label,
    description: area.description ?? "",
    paths: area.paths ?? [],
    cmsPages: (CMS_SLUGS[area.id] ?? [])
      .map((slug) => pageBySlug.get(slug))
      .filter((p) => !!p)
      .map((p) => ({ id: p.id, title: p.title })),
    texts: Object.entries(area.texts as Record<string, string>).map(
      ([key, value]) => ({
        key,
        defaultValue: value,
        hint:
          (area.hints as Record<string, string | undefined> | undefined)?.[
            key
          ] ?? "",
      })
    ),
  }));

  return (
    <TextsAdmin
      areas={areas}
      overrides={overrides}
      initialArea={sp.omrade ?? null}
      initialQuery={sp.q ?? ""}
    />
  );
}
