const LOGO_BUCKET = "bookmaker-logos";
/** Äldre uppladdningar ligger kvar i bucketen `logos`. */
const LEGACY_BUCKET = "logos";
const HERO_BUCKET = "bookmaker-heroes";

const PLACEHOLDER_VALUES = new Set(
  [
    "very good!",
    "very good",
    "nej",
    "ja",
    "n/a",
    "na",
    "-",
    "–",
    "—",
    "todo",
    "tbd",
    "placeholder",
  ].map((v) => v.toLowerCase())
);

/**
 * Bygger public URL från en Storage-path, eller returnerar full URL orörd.
 * Accepterar även legacy fulla URLs som redan sparats i `logo_url`.
 */
export function getBookmakerLogoUrl(
  logoPath: string | null | undefined
): string | null {
  if (!logoPath) return null;
  const trimmed = logoPath.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base) return null;

  const path = trimmed.replace(/^\//, "");
  if (path.startsWith(`${LOGO_BUCKET}/`) || path.startsWith(`${LEGACY_BUCKET}/`)) {
    return `${base}/storage/v1/object/public/${path}`;
  }
  return `${base}/storage/v1/object/public/${LOGO_BUCKET}/${path}`;
}

export function getBookmakerHeroUrl(
  heroPath: string | null | undefined
): string | null {
  if (!heroPath) return null;
  const trimmed = heroPath.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base) return null;

  const path = trimmed.replace(/^\//, "");
  if (path.startsWith(`${HERO_BUCKET}/`)) {
    return `${base}/storage/v1/object/public/${path}`;
  }
  return `${base}/storage/v1/object/public/${HERO_BUCKET}/${path}`;
}

export const BOOKMAKER_HERO_BUCKET = HERO_BUCKET;

/** Första bokstaven för platshållare när bookmaker_id saknas. */
export function bookmakerInitial(name: string | null | undefined) {
  const letter = (name || "").trim().charAt(0);
  return letter ? letter.toUpperCase() : "?";
}

/** Tomma fält och kända platshållare ska aldrig synas i kortet. */
export function displayText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (PLACEHOLDER_VALUES.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

export function paymentsOf(payments: string[] | null | undefined) {
  return (payments ?? []).map((p) => p.trim()).filter(Boolean);
}

export function hasPayment(
  payments: string[] | null | undefined,
  name: string
) {
  const needle = name.toLowerCase();
  return paymentsOf(payments).some((p) => p.toLowerCase() === needle);
}

/** Swish om bolaget stödjer det, annars Trustly — samma regel som kortets betalpill. */
export function primaryPayment(
  payments: string[] | null | undefined
): "Swish" | "Trustly" | null {
  if (hasPayment(payments, "Swish")) return "Swish";
  if (hasPayment(payments, "Trustly")) return "Trustly";
  return null;
}

export function bonus2Kind(
  label: string | null | undefined
): "free-bets" | "odds-boost" | null {
  const t = displayText(label)?.toLowerCase() ?? "";
  if (!t) return null;
  if (t.includes("free")) return "free-bets";
  if (t.includes("odds") || t.includes("boost")) return "odds-boost";
  return null;
}

export function formatBonusLine(data: {
  bonus?: string | null;
  bonus_value?: number | null;
}): string | null {
  const bonus = displayText(data.bonus);
  if (bonus) return bonus;
  if (data.bonus_value != null && data.bonus_value > 0) {
    return `${data.bonus_value.toLocaleString("sv-SE")} kr`;
  }
  return null;
}

export function wageringParts(wagering: string | null | undefined): {
  label: string;
  value: string | null;
} {
  const raw = displayText(wagering);
  if (!raw || raw === "–" || raw === "-" || raw.toLowerCase() === "inget") {
    return { label: "Inget omsättningskrav", value: null };
  }
  return { label: "Omsättningskrav:", value: raw };
}

/**
 * Fem stjärnor som data-URI-SVG. Hexfärger (inte CSS-variabler) och
 * kodade parenteser så url() inte bryts. Mask utan delad clipPath-id.
 */
export function starRowDataUri(rating: number | null | undefined): string {
  const value = Math.max(0, Math.min(5, rating ?? 0));
  const pts =
    "10,1.5 12.6,7.3 18.9,8 14.2,12.2 15.5,18.4 10,15.2 4.5,18.4 5.8,12.2 1.1,8 7.4,7.3";
  let base = "";
  let fill = "";
  for (let i = 0; i < 5; i++) {
    base += `<polygon points="${pts}" transform="translate(${i * 21},0)" fill="#2A3346"/>`;
    fill += `<polygon points="${pts}" transform="translate(${i * 21},0)" fill="#FFD166"/>`;
  }
  const w = (value / 5) * 104;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 104 20">${base}` +
    `<mask id="m"><rect x="0" y="0" width="${w.toFixed(1)}" height="20" fill="white"/></mask>` +
    `<g mask="url(#m)">${fill}</g></svg>`;
  // encodeURIComponent + explicit parenteser — url() bryts annars i CSS.
  return (
    "data:image/svg+xml," +
    encodeURIComponent(svg).replace(/\(/g, "%28").replace(/\)/g, "%29")
  );
}

export function ratingTitle(rating: number | null | undefined): string {
  const value = Math.max(0, Math.min(5, rating ?? 0));
  const short = value.toFixed(1).replace(".", ",");
  return `${short} av 5 — vägt på odds, utbud, betalningar och support.`;
}

/** Betalningsmärken — samma SVG:er som i design/marks.js. */
export const PAYMENT_MARKS: Record<string, string> = {
  Swish:
    "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22%23E6007E%22%3E%3Ccircle%20cx%3D%2212%22%20cy%3D%2212%22%20r%3D%2210%22%2F%3E%3Ctext%20x%3D%2212%22%20y%3D%2217%22%20font-family%3D%22Helvetica%2CArial%2Csans-serif%22%20font-size%3D%2213%22%20font-weight%3D%22700%22%20text-anchor%3D%22middle%22%20fill%3D%22%23FFFFFF%22%3ES%3C%2Ftext%3E%3C%2Fsvg%3E",
  Trustly:
    "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22%230EAE5B%22%3E%3Cpolygon%20points%3D%223%2C5%2021%2C5%2021%2C10%2015%2C10%2015%2C19%209%2C19%209%2C10%203%2C10%22%2F%3E%3C%2Fsvg%3E",
  BankID:
    "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22%23193E4F%22%3E%3Crect%20x%3D%222%22%20y%3D%224%22%20width%3D%2220%22%20height%3D%2216%22%20rx%3D%223%22%2F%3E%3Ctext%20x%3D%2212%22%20y%3D%2216%22%20font-family%3D%22Helvetica%2CArial%2Csans-serif%22%20font-size%3D%229%22%20font-weight%3D%22700%22%20text-anchor%3D%22middle%22%20fill%3D%22%23FFFFFF%22%3EiD%3C%2Ftext%3E%3C%2Fsvg%3E",
  Licens:
    "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22%231E8E4E%22%3E%3Cpath%20d%3D%22M12%202%204%205v7c0%205%203.5%208.4%208%2010%204.5-1.6%208-5%208-10V5l-8-3z%22%2F%3E%3Cpath%20d%3D%22M10.6%2015.2%207%2011.6l1.6-1.6%202%202%204.8-4.8L17%208.8z%22%20fill%3D%22%23FFFFFF%22%2F%3E%3C%2Fsvg%3E",
};

export const BOOK_FILTER_PILLS = [
  "Populära",
  "Nya spelbolag",
  "Bonus",
  "Free bets",
  "Snabba uttag",
  "Med Swish",
  "Livebetting",
  "Odds boost",
] as const;

export type BookFilterPill = (typeof BOOK_FILTER_PILLS)[number];

export type BookSortOption = "Vårt betyg" | "Högst bonus" | "A–Ö";

export function bookmakerMatchesFilter(
  b: {
    tags?: string[] | null;
    bonus?: string | null;
    bonus_value?: number | null;
    bonus2_label?: string | null;
    bonus2_value?: string | null;
    payments?: string[] | null;
    fast_payout?: boolean;
  },
  pill: string
): boolean {
  switch (pill) {
    case "Free bets":
      return (
        bonus2Kind(b.bonus2_label) === "free-bets" &&
        !!displayText(b.bonus2_value)
      );
    case "Odds boost":
      return (
        bonus2Kind(b.bonus2_label) === "odds-boost" &&
        !!displayText(b.bonus2_value)
      );
    case "Med Swish":
      return hasPayment(b.payments, "Swish");
    case "Snabba uttag":
      return !!b.fast_payout;
    case "Bonus":
      return !!formatBonusLine(b);
    case "Populära":
    case "Nya spelbolag":
    case "Livebetting":
      return (b.tags ?? []).includes(pill);
    default:
      return (b.tags ?? []).includes(pill);
  }
}

/** Visa bara filter som motsvarar något kortet faktiskt visar. */
export function availableBookFilters<T extends Parameters<typeof bookmakerMatchesFilter>[0]>(
  bookmakers: T[]
): BookFilterPill[] {
  return BOOK_FILTER_PILLS.filter((pill) =>
    bookmakers.some((b) => bookmakerMatchesFilter(b, pill))
  );
}
