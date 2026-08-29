/**
 * Planket — rena hjälpare som delas av server och klient.
 *
 * Inget här får importera server-only-moduler (supabase/admin, next/headers):
 * flödet, composern och rygga-arket kör samma funktioner i webbläsaren.
 *
 * Två saker räknas ALDRIG här: verifierad-badgen och räknarna. Båda kommer
 * färdiga från vyerna i db/planket.sql.
 *
 * COPY-REGEL för hela funktionen: aldrig "tips", "rekommendation" eller
 * "prediktion". Det heter spel, kupong och rygga.
 */

import { formatNumber } from "@/lib/utils";

// -------------------------------------------------------------
// Gränser
// -------------------------------------------------------------

/** Samma tak som posts_body_len i databasen och teckenräknaren i composern. */
export const PLANKET_MAX_BODY = 500;

/** Räknaren byter färg här: gult som varning, rött vid taket. */
export const PLANKET_BODY_WARN = 450;

/**
 * Under så här många rättade spel visas ingen ROI-badge alls. En ROI på
 * fem spel säger ingenting om träffsäkerhet — då är ingen siffra ärligare
 * än en dålig siffra.
 */
export const PLANKET_MIN_ROI_BETS = 20;

/** Flödet hämtar 20 inlägg och laddar fler vid scroll till botten. */
export const PLANKET_PAGE_SIZE = 20;

/** Bifoga-väljaren listar användarens senaste 20 spel. */
export const PLANKET_ATTACH_LIMIT = 20;

// -------------------------------------------------------------
// Filter
// -------------------------------------------------------------

export const PLANKET_FILTERS = [
  { key: "alla", label: "Alla" },
  { key: "spel", label: "Spel" },
  { key: "kuponger", label: "Kuponger" },
  { key: "fotboll", label: "Fotboll" },
  { key: "hockey", label: "Hockey" },
] as const;

export type PlanketFilter = (typeof PLANKET_FILTERS)[number]["key"];

export function isPlanketFilter(value: unknown): value is PlanketFilter {
  return PLANKET_FILTERS.some((f) => f.key === value);
}

// -------------------------------------------------------------
// Formen på datan vyerna levererar
// -------------------------------------------------------------

export type PostAttachmentType = "none" | "bet" | "coupon";

export type PlanketPostRow = {
  id: string;
  author_id: string;
  body: string;
  attachment_type: PostAttachmentType;
  bet_id: string | null;
  coupon_id: string | null;
  created_at: string;
  edited_at: string | null;

  author_username: string;
  author_avatar: string | null;

  sheet_id: string | null;
  sheet_name: string | null;
  sheet_bets_count: number | null;
  sheet_settled_bets: number | null;
  sheet_roi: number | null;

  bet_match: string | null;
  bet_pick: string | null;
  bet_odds: number | null;
  bet_stake: number | null;
  bet_result: string | null;
  bet_payout: number | null;
  bet_sport: string | null;
  bet_league: string | null;
  bet_league_id: number | null;
  bet_league_logo: string | null;
  bet_placed_at: string | null;
  bet_bookmaker_id: string | null;
  bet_bookmaker_name: string | null;
  bet_bookmaker_logo: string | null;

  fixture_id: number | null;
  kickoff: string | null;
  fixture_status: string | null;
  home_name: string | null;
  home_logo: string | null;
  home_team_id: number | null;
  away_name: string | null;
  away_logo: string | null;
  away_team_id: number | null;

  /** Härlett i vyn: bets.placed_at < fixtures.kickoff. Aldrig skrivbart. */
  verified: boolean;

  fire_count: number;
  thumb_count: number;
  back_count: number;
};

/** Kupongens ben, hämtade separat — kuponger är publika och lyder RLS. */
export type PlanketCouponLeg = {
  id: string;
  pick: string;
  odds: number;
  league: string | null;
  league_id: number | null;
  league_logo: string | null;
  sport: string | null;
  match: string;
  kickoff: string | null;
};

export type PlanketCoupon = {
  id: string;
  slug: string;
  title: string;
  stake: number;
  total_odds: number;
  bookmaker_name: string | null;
  bookmaker_logo: string | null;
  legs: PlanketCouponLeg[];
};

/** Ett inlägg så som korten faktiskt tar emot det. */
export type PlanketPost = PlanketPostRow & {
  coupon: PlanketCoupon | null;
  /** Betraktarens egna reaktioner. Tom lista för utloggad. */
  myReactions: ReactionKind[];
  /** Har betraktaren redan ryggat inlägget? */
  backedByMe: boolean;
  /** Är betraktaren författare? Styr Redigera/Ta bort i ···-menyn. */
  isAuthor: boolean;
};

export const REACTION_KINDS = ["fire", "thumb"] as const;
export type ReactionKind = (typeof REACTION_KINDS)[number];

export const REACTION_ICON: Record<ReactionKind, string> = {
  fire: "🔥",
  thumb: "👍",
};

export const REACTION_LABEL: Record<ReactionKind, string> = {
  fire: "Het",
  thumb: "Tummen upp",
};

// -------------------------------------------------------------
// Moderering
// -------------------------------------------------------------

export const REPORT_REASONS = [
  { key: "spam", label: "Spam" },
  { key: "offensive", label: "Kränkande" },
  { key: "misleading", label: "Vilseledande" },
  { key: "bad_link", label: "Fel spelbolagslänk" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["key"];

export function isReportReason(value: unknown): value is ReportReason {
  return REPORT_REASONS.some((r) => r.key === value);
}

export function reportReasonLabel(reason: string) {
  return REPORT_REASONS.find((r) => r.key === reason)?.label ?? reason;
}

/** Så många anmälningar döljer inlägget automatiskt (triggern i db/planket.sql). */
export const PLANKET_AUTOHIDE_REPORTS = 5;

// -------------------------------------------------------------
// Rate limit
//
// Triggern kastar 'planket_rate_limit:{minuter}'. Klienten ska aldrig
// räkna gränsen själv — den läser bara ut siffran ur felet.
// -------------------------------------------------------------

export const PLANKET_RATE_LIMIT_PREFIX = "planket_rate_limit:";

/** Minuter kvar, eller null om felet är något annat. */
export function parseRateLimit(message: string | null | undefined) {
  if (!message) return null;
  const match = new RegExp(`${PLANKET_RATE_LIMIT_PREFIX}(\\d+)`).exec(message);
  if (!match) return null;
  const minutes = Number(match[1]);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : 1;
}

export function rateLimitMessage(minutes: number) {
  return `Du har postat mycket på kort tid. Försök igen om ${minutes} ${
    minutes === 1 ? "minut" : "minuter"
  }.`;
}

// -------------------------------------------------------------
// Format
//
// Allt tal på Planket är svenskt: decimalkomma, tunt mellanrum i
// tusental, mellanslag före procenttecknet. Odds skrivs 2,15 — inte
// 2.15 som formatOdds() i resten av appen, som är en kvarleva.
// -------------------------------------------------------------

/** Odds med två decimaler och svenskt decimalkomma: 2,15. */
export function planketOdds(value: number | string | null | undefined) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return formatNumber(n, 2);
}

/** Belopp i hela kronor: 1 240 kr. `sign` ger ledande + eller −. */
export function planketKr(
  value: number,
  opts?: { sign?: boolean; currency?: string }
) {
  const currency = opts?.currency ?? "kr";
  const abs = Math.abs(Math.round(value));
  const sign = opts?.sign ? (value < 0 ? "−" : "+") : value < 0 ? "−" : "";
  // Hårt mellanslag före valutan: summan får aldrig brytas så "kr"
  // hamnar på egen rad i en trång kolumn.
  return `${sign}${abs.toLocaleString("sv-SE")} ${currency}`;
}

/**
 * ROI-badgen: "+12,4 %" med svenskt decimalkomma och mellanslag före
 * procenttecknet. Minus skrivs med minustecken (−), inte bindestreck.
 */
export function planketRoi(value: number) {
  const sign = value < 0 ? "−" : "+";
  return `${sign}${formatNumber(Math.abs(value), 1)} %`;
}

/** Visas ROI-badgen alls? Under 20 rättade spel: nej. */
export function showRoiBadge(settledBets: number | null | undefined) {
  return (settledBets ?? 0) >= PLANKET_MIN_ROI_BETS;
}

const TZ = "Europe/Stockholm";

function sameStockholmDay(a: Date, b: Date) {
  const fmt = new Intl.DateTimeFormat("sv-SE", { timeZone: TZ });
  return fmt.format(a) === fmt.format(b);
}

/** Klockslag i svensk tid: 14:30. */
export function planketTime(iso: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

/**
 * Avsparkstiden i kortets överrad: "Idag 19:00", "Imorgon 15:00" eller
 * "Sön 15:00". Aldrig ett datum — matcher längre bort än en vecka
 * skrivs med dag och månad.
 */
export function planketKickoff(
  iso: string | null | undefined,
  now = Date.now()
) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const time = planketTime(iso);
  const today = new Date(now);
  const tomorrow = new Date(now + 86_400_000);

  if (sameStockholmDay(date, today)) return `Idag ${time}`;
  if (sameStockholmDay(date, tomorrow)) return `Imorgon ${time}`;

  const days = Math.abs(date.getTime() - now) / 86_400_000;
  if (days < 7) {
    const weekday = new Intl.DateTimeFormat("sv-SE", {
      timeZone: TZ,
      weekday: "short",
    }).format(date);
    // "sön" → "Sön". Intl ger gemener på svenska.
    return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1).replace(/\.$/, "")} ${time}`;
  }

  const dayMonth = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
  }).format(date);
  return `${dayMonth} ${time}`;
}

/**
 * Inläggets ålder i huvudet: "för 14 min", "för 1 timme", "för 2 timmar".
 * Äldre än ett dygn skrivs som datum — "för 38 timmar" säger inget.
 */
export function postAge(iso: string, now = Date.now()) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";

  const min = Math.max(0, Math.round((now - then) / 60_000));
  if (min < 1) return "just nu";
  if (min < 60) return `för ${min} min`;

  const hours = Math.round(min / 60);
  if (hours < 24) return `för ${hours} ${hours === 1 ? "timme" : "timmar"}`;

  const days = Math.round(hours / 24);
  if (days < 7) return `för ${days} ${days === 1 ? "dag" : "dagar"}`;

  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

// -------------------------------------------------------------
// Spel och kupong
// -------------------------------------------------------------

/**
 * Kantlinjen på spelkortet bär statusen. Orättat är samma linje som
 * kortet självt — färg bara när det finns ett utfall.
 */
export function betBorderColor(result: string | null | undefined) {
  if (result === "win" || result === "halfwin") return "rgba(102,227,138,.4)";
  if (result === "loss" || result === "halfloss") return "rgba(232,105,122,.35)";
  return "#232B3E";
}

export function isSettledBet(result: string | null | undefined) {
  return !!result && result !== "open";
}

/** "Vinst +1 196 kr" eller "Förlust −1 300 kr". Null när spelet är öppet. */
export function settledOutcome(post: {
  bet_result: string | null;
  bet_stake: number | null;
  bet_payout: number | null;
}) {
  if (!isSettledBet(post.bet_result)) return null;
  const netto = Number(post.bet_payout ?? 0) - Number(post.bet_stake ?? 0);
  if (post.bet_result === "void") {
    return { label: `Void ${planketKr(0)}`, color: "#8A94AB" };
  }
  return {
    label: `${netto >= 0 ? "Vinst" : "Förlust"} ${planketKr(netto, { sign: true })}`,
    color: netto >= 0 ? "#66E38A" : "#E8697A",
  };
}

/**
 * Totalodds = produkten av benens odds, avrundad till två decimaler.
 * Räknas här och inte i klientens huvud — kupongens egen total_odds
 * skrivs av triggern i db/coupons.sql och används när benen finns med.
 */
export function couponTotalOdds(legs: Array<{ odds: number }>) {
  if (!legs.length) return 1;
  const product = legs.reduce((acc, leg) => acc * Number(leg.odds || 1), 1);
  return Math.round(product * 100) / 100;
}

/** "4 spel · Kombination" i kupongkortets överrad. */
export function couponMeta(legs: unknown[]) {
  const n = legs.length;
  return `${n} spel · ${n > 1 ? "Kombination" : "Enkel"}`;
}

/** Möjlig vinst på en kupong: insats × (totalodds − 1). */
export function couponPossibleWin(stake: number, totalOdds: number) {
  return Math.round(stake * (totalOdds - 1));
}

// -------------------------------------------------------------
// Rygga
// -------------------------------------------------------------

/** Ett spel kan inte ryggas efter att matchen börjat. */
export function kickoffPassed(
  kickoff: string | null | undefined,
  status?: string | null,
  now = Date.now()
) {
  if (status && /^(1H|2H|HT|ET|BT|P|LIVE|FT|AET|PEN|AWD|WO)$/i.test(status)) {
    return status.toUpperCase() !== "NS";
  }
  if (!kickoff) return false;
  const start = new Date(kickoff).getTime();
  return Number.isFinite(start) && now >= start;
}

/**
 * Kan inlägget ryggas? Bilaga krävs, matchen får inte ha startat, och
 * ett rättat spel är per definition färdigspelat.
 */
export function canBackPost(post: PlanketPost, now = Date.now()) {
  if (post.attachment_type === "none") return false;
  if (post.attachment_type === "bet") {
    if (isSettledBet(post.bet_result)) return false;
    return !kickoffPassed(post.kickoff, post.fixture_status, now);
  }
  // Kupong: tidigaste avspark bland benen sätter gränsen.
  const first = post.coupon?.legs
    .map((l) => l.kickoff)
    .filter((k): k is string => !!k)
    .sort()[0];
  return !kickoffPassed(first, null, now);
}

/** Snabbknapparna vid insatsfältet: 100, originalinsatsen och 1 000. */
export function stakePresets(original: number) {
  const rounded = Math.round(original);
  const presets = [100, rounded, 1000];
  // Är originalinsatsen redan 100 eller 1 000 blir det två likadana
  // knappar. Unik lista, i stigande ordning.
  return [...new Set(presets.filter((n) => n > 0))].sort((a, b) => a - b);
}

// -------------------------------------------------------------
// Länkar
// -------------------------------------------------------------

export const PLANKET_PATH = "/planket";

export function postPath(postId: string) {
  return `${PLANKET_PATH}#inlagg-${postId}`;
}

export function postUrl(postId: string, origin?: string) {
  const base =
    origin || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}${postPath(postId)}`;
}
