/**
 * Seedar demokreativ för Betsson, Unibet och Expekt i alla annonsytor.
 *
 * Bilderna i design/demo-banners/ är MOCKUPS — egna kompositioner i
 * spelbolagens färger, inte deras riktiga kampanjassets. Byt dem mot skarpa
 * filer och länkarna mot spårningslänkar innan något går live på riktigt.
 *
 * Kör db/banner-format.sql först.
 *
 * Usage:
 *   npm run seed:banners
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Saknar NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

const BUCKET = "banners";
/** Titelprefix som gör seedade rader återkörbara — de rensas före insert. */
const PREFIX = "Demo:";
/** Höjs när kreativen ritas om: publika Storage-URL:er cachas hårt. */
const VERSION = "v2";

type Format = "970x90" | "320x100" | "300x250";
type Placement = "home" | "sheet" | "topplista" | "spelbolag";

const BRANDS = [
  { key: "betsson", name: "Betsson", link: "https://www.betsson.se/", sort: 10 },
  { key: "unibet", name: "Unibet", link: "https://www.unibet.se/", sort: 20 },
  { key: "expekt", name: "Expekt", link: "https://www.expekt.se/", sort: 30 },
] as const;

/** Måste spegla annonsytorna i sidorna — se FORMATS_BY_PLACEMENT i admin. */
const PLACEMENTS: { value: Placement; label: string; formats: Format[] }[] = [
  {
    value: "home",
    label: "Startsida",
    formats: ["970x90", "320x100", "300x250"],
  },
  { value: "sheet", label: "Spelboken", formats: ["970x90", "320x100"] },
  { value: "topplista", label: "Topplista", formats: ["970x90", "320x100"] },
  { value: "spelbolag", label: "Spelbolag", formats: ["970x90"] },
];

async function ensureBucket() {
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (data) return;
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
  });
  if (error) throw new Error(`Kunde inte skapa bucket: ${error.message}`);
  console.log(`Skapade bucket ${BUCKET}`);
}

async function upload(brand: string, format: Format) {
  const file = `${brand}-${format}.jpg`;
  const body = readFileSync(resolve("design/demo-banners", file));
  const path = `demo/${brand}-${format}-${VERSION}.jpg`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, body, { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error(`Upload ${path}: ${error.message}`);

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

async function main() {
  await ensureBucket();

  const images = new Map<string, string>();
  for (const brand of BRANDS) {
    for (const format of ["970x90", "320x100", "300x250"] as Format[]) {
      images.set(`${brand.key}-${format}`, await upload(brand.key, format));
    }
  }
  console.log(`Laddade upp ${images.size} bilder till ${BUCKET}/demo/`);

  // Kreativ från tidigare versioner ligger kvar på egna paths.
  const { data: stale } = await supabase.storage.from(BUCKET).list("demo");
  const drop = (stale ?? [])
    .filter((f) => !f.name.includes(`-${VERSION}.`))
    .map((f) => `demo/${f.name}`);
  if (drop.length) {
    await supabase.storage.from(BUCKET).remove(drop);
    console.log(`Rensade ${drop.length} gamla bilder`);
  }

  const rows = PLACEMENTS.flatMap((placement) =>
    placement.formats.flatMap((format) =>
      BRANDS.map((brand) => ({
        title: `${PREFIX} ${brand.name} ${format.replace("x", "×")} · ${
          placement.label
        }`,
        image_url: images.get(`${brand.key}-${format}`)!,
        link_url: brand.link,
        placement: placement.value,
        format,
        active: true,
        sort: brand.sort,
      }))
    )
  );

  const { error: delError } = await supabase
    .from("banners")
    .delete()
    .like("title", `${PREFIX}%`);
  if (delError) throw new Error(`Rensning: ${delError.message}`);

  const { error } = await supabase.from("banners").insert(rows);
  if (error) {
    if (error.message.includes("format")) {
      console.error(
        "Kolumnen banners.format saknas — kör db/banner-format.sql i Supabase SQL-editorn först."
      );
    }
    throw new Error(error.message);
  }

  console.log(`Seedade ${rows.length} banners:`);
  for (const p of PLACEMENTS) {
    console.log(
      `  ${p.label.padEnd(10)} ${p.formats.join(", ")} × ${BRANDS.length} bolag`
    );
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
