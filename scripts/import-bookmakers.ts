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

type DesignBookmaker = {
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
  brand?: string;
  wagering?: string;
  badge?: string;
  bonus2Label?: string;
  bonus2Value?: string;
  tags?: string[];
  license?: string;
};

function extractBookmakers(source: string): DesignBookmaker[] {
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

  const raw = source.slice(arrayStart, end);
  const fn = new Function(
    `function logo(text){ return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 44"><text x="120" y="32" text-anchor="middle" fill="#fff">' + text + '</text></svg>'); }
     return ${raw};`
  );
  const items = fn() as DesignBookmaker[];

  const EXTRA: Record<string, [string, string]> = {
    Unibet: ["#0F6B3D", "6x"],
    Bet365: ["#0E5C44", "4x"],
    Betsson: ["#20242B", "5x"],
    "Svenska Spel Sport & Casino": ["#002B57", "–"],
    LeoVegas: ["#1B1B1B", "8x"],
    ComeOn: ["#0B2A3A", "6x"],
    Expekt: ["#15161A", "5x"],
    Betfair: ["#1A1A1A", "–"],
    NordicBet: ["#0B2445", "6x"],
    Bethard: ["#0C0E13", "8x"],
  };

  const CARD: Record<string, [string, string, string, string[]]> = {
    Unibet: [
      "Toppval",
      "FREE BETS",
      "500 kr",
      ["Populära", "Livebetting"],
    ],
    Bet365: ["", "", "", ["Populära", "Livebetting"]],
    Betsson: [
      "Ny bonus",
      "ODDS BOOST",
      "25 %",
      ["Populära"],
    ],
    "Svenska Spel Sport & Casino": [
      "",
      "",
      "",
      ["Populära", "Livebetting"],
    ],
    LeoVegas: ["", "FREE BETS", "200 kr", ["Populära"]],
    ComeOn: [
      "Nytt 2026",
      "ODDS BOOST",
      "30 %",
      ["Nya spelbolag"],
    ],
    Expekt: ["", "", "", []],
    Betfair: ["", "", "", ["Populära", "Livebetting"]],
    NordicBet: ["", "FREE BETS", "100 kr", []],
    Bethard: ["Nytt 2026", "", "", ["Nya spelbolag"]],
  };

  return items.map((b) => {
    const e = EXTRA[b.name];
    const c = CARD[b.name];
    return {
      ...b,
      brand: e?.[0],
      wagering: e?.[1] === "–" ? "" : e?.[1],
      badge: c?.[0] || "",
      bonus2Label: c?.[1] || "",
      bonus2Value: c?.[2] || "",
      tags: c?.[3] || [],
      license: "Svensk licens, Spelinspektionen",
    };
  });
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
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
    brand_color: b.brand || null,
    wagering: b.wagering || null,
    badge: b.badge || null,
    bonus2_label: b.bonus2Label || null,
    bonus2_value: b.bonus2Value || null,
    tags: b.tags || [],
    license: b.license || "Svensk licens, Spelinspektionen",
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
