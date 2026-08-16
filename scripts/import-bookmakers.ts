/**
 * Engångsimport av spelbolag från design/bookmakers.js
 *
 * Usage:
 *   cp .env.local.example .env.local   # fyll i nycklar
 *   npm run import:bookmakers
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import { config } from "dotenv";

config({ path: ".env.local" });

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function extractBookmakers(source: string) {
  const start = source.indexOf("window.SBBookmakers = [");
  if (start < 0) throw new Error("Could not find SBBookmakers array");
  const arrayStart = source.indexOf("[", start);
  let depth = 0;
  let end = -1;
  for (let i = arrayStart; i < source.length; i++) {
    if (source[i] === "[") depth++;
    if (source[i] === "]") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end < 0) throw new Error("Unclosed SBBookmakers array");

  // Evaluate in a sandbox-ish way: convert JS object literals to JSON-ish
  // by using Function — data is local trusted design file.
  const raw = source.slice(arrayStart, end);
  // logo() calls need a stub
  const fn = new Function(
    `function logo(text){ return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 44"><text x="120" y="32" text-anchor="middle" fill="#fff">' + text + '</text></svg>'); }
     return ${raw};`
  );
  return fn() as Array<{
    rank: number;
    name: string;
    logo: string;
    bonus: string;
    terms: string;
    usp: string;
    payments: string[];
    rating: number;
    fastPayout: boolean;
    bonusValue: number;
    trackingUrl: string;
    review: string;
    plus: string[];
    minus: string[];
  }>;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }

  const file = resolve(process.cwd(), "design/bookmakers.js");
  const source = readFileSync(file, "utf8");
  const items = extractBookmakers(source);

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const rows = items.map((b) => ({
    rank: b.rank,
    name: b.name,
    slug: slugify(b.name),
    logo_url: b.logo,
    bonus: b.bonus,
    bonus_value: b.bonusValue,
    terms: b.terms,
    usp: b.usp,
    payments: b.payments,
    rating: b.rating,
    fast_payout: b.fastPayout,
    tracking_url: b.trackingUrl,
    review: b.review,
    plus: b.plus,
    minus: b.minus,
    active: true,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("bookmakers").upsert(rows, {
    onConflict: "slug",
  });

  if (error) throw error;
  console.log(`Imported ${rows.length} bookmakers.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
