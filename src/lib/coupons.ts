/**
 * Kuponger — rena hjälpare som delas av server och klient.
 *
 * Inget här får importera server-only-moduler: kortet, nedräkningen och
 * delningskortet kör samma funktioner i webbläsaren.
 *
 * Kupongens status räknas ALDRIG här. Den kommer från servern (triggern i
 * db/coupons.sql) och används bara för att välja etikett och färg.
 */

import type {
  Bookmaker,
  CouponLegResult,
  CouponLegRow,
  CouponRow,
  CouponStatus,
  Fixture,
} from "./types";

export const COUPON_PATH = "/kuponger";

export function couponPath(slug: string) {
  return `${COUPON_PATH}/${slug}`;
}

export function couponUrl(slug: string, origin?: string) {
  const base =
    origin || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}${couponPath(slug)}`;
}

// -------------------------------------------------------------
// Formen på datan som vyerna får
// -------------------------------------------------------------

export type CouponLegFixture = Pick<
  Fixture,
  | "fixture_id"
  | "kickoff"
  | "sport"
  | "league_id"
  | "league_name"
  | "league_logo"
  | "home_name"
  | "away_name"
  | "home_logo"
  | "away_logo"
  | "home_team_id"
  | "away_team_id"
>;

export type CouponLeg = CouponLegRow & {
  fixtures: CouponLegFixture | null;
};

export type CouponBookmaker = Pick<
  Bookmaker,
  "id" | "name" | "slug" | "logo_url" | "terms" | "tracking_url"
>;

export type Coupon = CouponRow & {
  legs: CouponLeg[];
  bookmakers: CouponBookmaker | null;
};

// -------------------------------------------------------------
// Status
// -------------------------------------------------------------

export const COUPON_STATUS_LABEL: Record<CouponStatus, string> = {
  open: "ÖPPEN",
  won: "VUNNEN",
  lost: "FÖRLORAD",
  void: "VOID",
};

/**
 * Färgerna per status. Cyan bara för öppet, grönt/rött bara för utfall,
 * gult bara för void — samma regel som resten av appen.
 */
export const COUPON_STATUS_TONE: Record<
  CouponStatus,
  { border: string; badgeBg: string; badgeFg: string }
> = {
  open: {
    border: "rgba(53,214,245,.28)",
    badgeBg: "rgba(53,214,245,.14)",
    badgeFg: "var(--cyan)",
  },
  won: {
    border: "rgba(102,227,138,.4)",
    badgeBg: "rgba(102,227,138,.16)",
    badgeFg: "var(--win)",
  },
  lost: {
    border: "rgba(255,92,108,.3)",
    badgeBg: "rgba(255,92,108,.16)",
    badgeFg: "var(--loss)",
  },
  void: {
    border: "var(--line)",
    badgeBg: "rgba(255,184,77,.16)",
    badgeFg: "var(--amber)",
  },
};

export const LEG_RESULT_MARK: Record<CouponLegResult, string> = {
  WIN: "W",
  LOSS: "L",
  PUSH: "P",
  VOID: "V",
};

export const LEG_RESULT_COLOR: Record<CouponLegResult, string> = {
  WIN: "var(--win)",
  LOSS: "var(--loss)",
  PUSH: "var(--amber)",
  VOID: "var(--amber)",
};

export function isSettled(coupon: Pick<CouponRow, "status">) {
  return coupon.status !== "open";
}

export const COUPON_TYPE_LABEL: Record<string, string> = {
  single: "Singel",
  combo: "Kombination",
};

// -------------------------------------------------------------
// Pengar
// -------------------------------------------------------------

/** Möjlig vinst på en öppen kupong: insatsen tillbaka räknas inte som vinst. */
export function possibleWin(coupon: Pick<CouponRow, "stake" | "total_odds">) {
  return round2(Number(coupon.stake) * Number(coupon.total_odds) - Number(coupon.stake));
}

/**
 * Utfallet. Speglar public.coupon_netto() i db/coupons.sql: pushade ben
 * räknas som odds 1,00, så en delvis pushad kombination inte överbetalas.
 * För en kupong där alla ben vann är produkten identisk med total_odds.
 */
export function couponNetto(coupon: Coupon) {
  if (coupon.status === "won") {
    const odds = coupon.legs
      .filter((l) => l.result === "WIN")
      .reduce((product, l) => product * Number(l.odds), 1);
    return round2(Number(coupon.stake) * odds - Number(coupon.stake));
  }
  if (coupon.status === "lost") return -Number(coupon.stake);
  return 0;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

/** Odds med svenskt decimalkomma. Alla siffror i vyn är tabular-nums. */
export function formatCouponOdds(value: number) {
  return Number(value).toFixed(2).replace(".", ",");
}

// -------------------------------------------------------------
// Tid
//
// Avsparkstiderna kommer från fixtures — aldrig från en offset räknad på
// Date.now(). En kupong som visar "om 6 timmar" mitt i natten är fel.
// -------------------------------------------------------------

const TZ = "Europe/Stockholm";

/** Tidigaste avspark bland benen, eller null när inget ben har en fixture. */
export function firstKickoff(legs: CouponLeg[]): string | null {
  const times = legs
    .map((l) => l.fixtures?.kickoff)
    .filter((k): k is string => !!k)
    .sort();
  return times[0] ?? null;
}

export type Countdown = {
  text: string;
  /** cyan = normalt, yellow = under en timme, muted = avspark passerad. */
  tone: "cyan" | "yellow" | "muted";
  started: boolean;
};

/**
 * Nedräkning till första avspark. Tickas var 30:e sekund i klienten —
 * en sekundvisare på ett dygn är bara batteri.
 */
export function countdownTo(kickoff: string | null, now = Date.now()): Countdown {
  if (!kickoff) {
    return { text: "Avspark saknas", tone: "muted", started: false };
  }

  const diffMin = Math.floor((new Date(kickoff).getTime() - now) / 60000);

  if (diffMin <= 0) {
    return { text: "Matcherna har startat", tone: "muted", started: true };
  }

  if (diffMin < 60) {
    return { text: `Avspark om ${diffMin} min`, tone: "yellow", started: false };
  }

  const hours = Math.floor(diffMin / 60);
  if (hours < 24) {
    const minutes = diffMin % 60;
    return {
      text: `Avspark om ${hours} tim ${minutes} min`,
      tone: "cyan",
      started: false,
    };
  }

  const days = Math.floor(hours / 24);
  return {
    text: `Avspark om ${days} ${days === 1 ? "dag" : "dagar"} ${hours % 24} tim`,
    tone: "cyan",
    started: false,
  };
}

/** Publiceringstid relativt nu: "Nu", "12 min sedan", "Igår 19:04", "3/8". */
export function publishedLabel(iso: string, now = Date.now()) {
  const then = new Date(iso).getTime();
  const minutes = Math.floor((now - then) / 60000);

  if (minutes < 1) return "Nu";
  if (minutes < 60) return `${minutes} min sedan`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24 && isSameStockholmDay(then, now)) {
    return `${hours} ${hours === 1 ? "timme" : "timmar"} sedan`;
  }

  const days = daysBetweenStockholm(then, now);
  if (days === 1) return `Igår ${stockholmTime(iso)}`;
  if (days < 7) return `${days} dagar sedan`;

  return stockholmDayMonth(iso);
}

function stockholmParts(value: string | number) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: get("hour"),
    minute: get("minute"),
  };
}

function isSameStockholmDay(a: number, b: number) {
  const x = stockholmParts(a);
  const y = stockholmParts(b);
  return x.year === y.year && x.month === y.month && x.day === y.day;
}

/** Skillnad i kalenderdygn i svensk tid — inte i 24-timmarsblock. */
function daysBetweenStockholm(a: number, b: number) {
  const x = stockholmParts(a);
  const y = stockholmParts(b);
  const from = Date.UTC(x.year, x.month - 1, x.day);
  const to = Date.UTC(y.year, y.month - 1, y.day);
  return Math.round((to - from) / 86400000);
}

export function stockholmTime(iso: string) {
  const p = stockholmParts(iso);
  return `${p.hour}:${p.minute}`;
}

export function stockholmDayMonth(iso: string) {
  const p = stockholmParts(iso);
  return `${p.day}/${p.month}`;
}

/** "27/8 19:00" — benets rad under lagnamnen. */
export function legWhen(kickoff: string | null | undefined) {
  if (!kickoff) return "Tid saknas";
  return `${stockholmDayMonth(kickoff)} ${stockholmTime(kickoff)}`;
}

/** "Rättad 25/8 · +288 kr" — raden under titeln på en avgjord kupong. */
export function settledLabel(coupon: Coupon, netto: string) {
  const when = coupon.settled_at ? stockholmDayMonth(coupon.settled_at) : "—";
  return `Rättad ${when} · ${netto}`;
}

// -------------------------------------------------------------
// Filter och vylägen
// -------------------------------------------------------------

export const COUPON_TABS = [
  "Alla",
  "Öppna",
  "Avgjorda",
  "Singel",
  "Kombination",
] as const;

export type CouponTab = (typeof COUPON_TABS)[number];

export function matchesTab(coupon: Coupon, tab: CouponTab) {
  switch (tab) {
    case "Öppna":
      return coupon.status === "open";
    case "Avgjorda":
      return coupon.status !== "open";
    case "Singel":
      return coupon.type === "single";
    case "Kombination":
      return coupon.type === "combo";
    default:
      return true;
  }
}

export const COUPON_VIEWS = [
  { key: "Lista", label: "Lista", help: "En kupong per rad" },
  { key: "2", label: "2", help: "Två kuponger per rad" },
] as const;

export type CouponView = (typeof COUPON_VIEWS)[number]["key"];

/** Standardläget är 2. Under 1240px finns växlaren inte alls. */
export const DEFAULT_COUPON_VIEW: CouponView = "2";

/**
 * Brytpunkten där två kuponger per rad får plats bredvid sidopanelen.
 * Under den gäller listläget — men panelen ligger kvar intill från 1080px
 * (se .kupong-layout i globals.css).
 */
export const COUPON_GRID_MIN_WIDTH = 1240;

export function columnsFor(view: CouponView) {
  return view === "2" ? 2 : 1;
}

/**
 * Måtten som måste följa kolumnantalet. Utan dem spränger CTA-loggan
 * kortet i 2-läget, där kortet är hälften så brett som i listläget.
 */
export function layoutFor(view: CouponView) {
  const columns = columnsFor(view);
  return {
    columns,
    proofWidth: columns > 1 ? "100%" : "186px",
    proofHeight: columns === 2 ? 220 : 248,
    ctaGap: "14px",
    ctaLogoWidth: columns === 2 ? "104px" : "124px",
    ctaLogoHeight: columns === 2 ? 48 : 56,
  };
}

// -------------------------------------------------------------
// Redaktionens facit
// -------------------------------------------------------------

export type CouponRecord = {
  total: number;
  won: number;
  lost: number;
  hitrate: number;
  netto: number;
  roi: number;
};

/**
 * Räknas på avgjorda kuponger med redaktionens rekommenderade insats.
 * Öppna kuponger ingår aldrig — varken i träffprocenten eller i ROI.
 * Void räknas som avgjord men påverkar varken netto eller träff.
 */
export function couponRecord(coupons: Coupon[]): CouponRecord {
  const settled = coupons.filter((c) => c.status !== "open");
  const graded = settled.filter((c) => c.status === "won" || c.status === "lost");
  const won = graded.filter((c) => c.status === "won").length;
  const lost = graded.filter((c) => c.status === "lost").length;
  const stake = graded.reduce((sum, c) => sum + Number(c.stake), 0);
  const netto = graded.reduce((sum, c) => sum + couponNetto(c), 0);

  return {
    total: settled.length,
    won,
    lost,
    hitrate: graded.length ? (won / graded.length) * 100 : 0,
    netto: round2(netto),
    roi: stake > 0 ? (netto / stake) * 100 : 0,
  };
}
