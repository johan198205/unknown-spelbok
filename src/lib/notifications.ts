/**
 * Notiser i appen — delad logik mellan server och klient.
 *
 * Ingenting här får importera supabase/admin eller next/headers: filen
 * används både i server-komponenter och i panelen som körs i webbläsaren.
 * Skrivningen ligger i notify-events.ts, som är server-only.
 */

import { formatPercent } from "@/lib/utils";

export const NOTIFICATION_TYPES = [
  "goal",
  "settled_win",
  "settled_loss",
  "coupon",
  "competition",
  "kickoff",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationTargetType = "sheet" | "comp" | "coupon" | "bet";
export type NotificationAmountKind = "netto" | "roi";

export type AppNotification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  created_at: string;
  read_at: string | null;
  amount: number | null;
  amount_kind: NotificationAmountKind | null;
  target_type: NotificationTargetType | null;
  target_id: string | null;
  dedupe_key: string;
};

/** Kolumnlistan panelen och räknaren läser. Håll den i synk med select(). */
export const NOTIFICATION_COLUMNS =
  "id, user_id, type, title, body, created_at, read_at, amount, amount_kind, target_type, target_id, dedupe_key";

/** Panelen hämtar en sida i taget och laddar fler vid scroll till botten. */
export const NOTIFICATION_PAGE_SIZE = 30;

export function isNotificationType(value: unknown): value is NotificationType {
  return (
    typeof value === "string" &&
    (NOTIFICATION_TYPES as readonly string[]).includes(value)
  );
}

// -------------------------------------------------------------
// Inställningar
//
// settled_win och settled_loss delar kategori: "spel rättat" är en sak
// att slå av, inte två.
// -------------------------------------------------------------
export const NOTIFICATION_CATEGORIES = [
  "goal",
  "kickoff",
  "settled",
  "coupon",
  "competition",
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  goal: "Mål i match",
  kickoff: "Avspark",
  settled: "Spel rättat",
  coupon: "Ny kupong",
  competition: "Tävlingsplacering",
};

export function categoryOf(type: NotificationType): NotificationCategory {
  if (type === "settled_win" || type === "settled_loss") return "settled";
  return type;
}

export type NotificationSettings = {
  [K in NotificationCategory as `${K}_in_app` | `${K}_email`]: boolean;
};

/**
 * Vad en användare utan rad i notification_settings ska få. Samma värden
 * som kolumndefaults i db/notifications.sql — allt på utom mejl vid
 * tävlingsplacering.
 */
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  goal_in_app: true,
  goal_email: true,
  kickoff_in_app: true,
  kickoff_email: true,
  settled_in_app: true,
  settled_email: true,
  coupon_in_app: true,
  coupon_email: true,
  competition_in_app: true,
  competition_email: false,
};

export const NOTIFICATION_SETTINGS_COLUMNS = [
  "user_id",
  ...NOTIFICATION_CATEGORIES.flatMap((c) => [`${c}_in_app`, `${c}_email`]),
].join(", ");

export function normalizeSettings(
  row: Partial<Record<string, unknown>> | null | undefined
): NotificationSettings {
  const out = { ...DEFAULT_NOTIFICATION_SETTINGS };
  if (!row) return out;
  for (const key of Object.keys(out) as (keyof NotificationSettings)[]) {
    if (typeof row[key] === "boolean") out[key] = row[key] as boolean;
  }
  return out;
}

// -------------------------------------------------------------
// Ikoner
//
// Rendereras som background-image på ett span, ALDRIG som <img src>.
// En literal src som pekar på ett värde som ännu inte finns startar en
// hämtning som failar; en bakgrundsbild gör inte det. Ikonerna ligger
// som data-URI:er så det aldrig blir en nätverkshämtning alls.
// -------------------------------------------------------------
function svgUrl(body: string, stroke: string) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" ` +
    `stroke="${stroke}" stroke-width="1.9" stroke-linecap="round" ` +
    `stroke-linejoin="round">${body}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const PATHS = {
  ball:
    '<circle cx="12" cy="12" r="9"/><path d="m12 7 4.2 3-1.6 5h-5.2L7.8 10z"/>' +
    '<path d="M12 3v4M4.2 9.2 7.8 10M19.8 9.2 16.2 10M7 19.6 9.4 15M17 19.6 14.6 15"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8.2 12.2 2.6 2.6 5-5.4"/>',
  ticket:
    '<path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h15A1.5 1.5 0 0 1 21 8.5v2a2 2 0 0 0 0 3.9v2a1.5 1.5 0 0 1-1.5 1.6h-15A1.5 1.5 0 0 1 3 16.5v-2a2 2 0 0 0 0-3.9z"/>' +
    '<path d="M14 7v2M14 15v2"/>',
  trophy:
    '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4.5v1A3.5 3.5 0 0 0 8 10.5M17 6h2.5v1a3.5 3.5 0 0 1-3.5 3.5"/>' +
    '<path d="M12 14v3M8.5 20h7l-.8-3h-5.4z"/>',
  clock:
    '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.4 2"/>',
} as const;

type TypeMeta = {
  /** Accentfärgen. Grön/röd bara för utfall, cyan för live/oläst, gult för tävling. */
  accent: string;
  icon: string;
};

export const NOTIFICATION_META: Record<NotificationType, TypeMeta> = {
  goal: { accent: "#35D6F5", icon: svgUrl(PATHS.ball, "#35D6F5") },
  settled_win: { accent: "#66E38A", icon: svgUrl(PATHS.check, "#66E38A") },
  settled_loss: { accent: "#FF5C6C", icon: svgUrl(PATHS.ticket, "#FF5C6C") },
  coupon: { accent: "#66E38A", icon: svgUrl(PATHS.ticket, "#66E38A") },
  competition: { accent: "#FFD166", icon: svgUrl(PATHS.trophy, "#FFD166") },
  kickoff: { accent: "#35D6F5", icon: svgUrl(PATHS.clock, "#35D6F5") },
};

/** 34px-plattan bakom ikonen: accentfärgen på 14 % opacitet. */
export function iconPlateColor(type: NotificationType) {
  const hex = NOTIFICATION_META[type].accent;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},.14)`;
}

/** Klockan i headern. Stroke byter färg när panelen är öppen. */
export function bellIcon(active: boolean) {
  return svgUrl(
    '<path d="M18 8.5a6 6 0 1 0-12 0c0 6-2 7.5-2 7.5h16s-2-1.5-2-7.5"/>' +
      '<path d="M13.7 20a2 2 0 0 1-3.4 0"/>',
    active ? "#E6EAF2" : "#C3CBDB"
  );
}

// -------------------------------------------------------------
// Navigering
// -------------------------------------------------------------

/**
 * Kupongsidan. Notisen pekar på ankaret för den enskilda kupongen i
 * listan — se src/lib/coupons.ts, som håller samma konstant för vyerna.
 */
export const COUPON_PATH = "/kuponger";

export function notificationHref(n: {
  target_type: NotificationTargetType | null;
  target_id: string | null;
}): string | null {
  if (!n.target_type) return null;
  switch (n.target_type) {
    case "sheet":
      return n.target_id ? `/spelbok?sheet=${n.target_id}` : "/spelbok";
    case "bet":
      // Spelboken slår upp vilket spreadsheet spelet ligger i och
      // markerar raden — därför räcker spelets id som mål.
      return n.target_id ? `/spelbok?bet=${n.target_id}` : "/spelbok";
    case "comp":
      return n.target_id ? `/tavlingar#tavling-${n.target_id}` : "/tavlingar";
    case "coupon":
      return n.target_id
        ? `${COUPON_PATH}#kupong-${n.target_id}`
        : COUPON_PATH;
    default:
      return null;
  }
}

// -------------------------------------------------------------
// Tid
// -------------------------------------------------------------

function clock(date: Date) {
  const p = (n: number) => (n < 10 ? "0" : "") + n;
  return `${p(date.getHours())}:${p(date.getMinutes())}`;
}

/**
 * Relativ tid på svenska. Räknas om var 30:e sekund medan panelen är
 * öppen, så "Nu" hinner aldrig bli gammalt på skärmen.
 */
export function relativeTime(iso: string, now = Date.now()) {
  const then = new Date(iso);
  const ms = then.getTime();
  if (!Number.isFinite(ms)) return "";

  const min = Math.round((now - ms) / 60000);
  if (min < 1) return "Nu";
  if (min < 60) return `${min} min sedan`;

  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "timme" : "timmar"} sedan`;

  const days = Math.round(hours / 24);
  if (days === 1) return `Igår ${clock(then)}`;
  if (days < 7) return `${days} dagar sedan`;

  return `${then.getDate()}/${then.getMonth() + 1}`;
}

export type NotificationGroup = {
  label: string;
  items: AppNotification[];
};

/** IDAG / TIDIGARE I VECKAN / ÄLDRE. Tomma grupper renderas inte. */
export function groupNotifications(
  items: AppNotification[],
  now = Date.now()
): NotificationGroup[] {
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const today = dayStart.getTime();
  const weekAgo = now - 7 * 86_400_000;

  const groups: NotificationGroup[] = [
    { label: "Idag", items: [] },
    { label: "Tidigare i veckan", items: [] },
    { label: "Äldre", items: [] },
  ];

  for (const item of items) {
    const ts = new Date(item.created_at).getTime();
    if (!Number.isFinite(ts)) continue;
    if (ts >= today) groups[0].items.push(item);
    else if (ts >= weekAgo) groups[1].items.push(item);
    else groups[2].items.push(item);
  }

  return groups.filter((g) => g.items.length > 0);
}

// -------------------------------------------------------------
// Belopp
// -------------------------------------------------------------

/**
 * Beloppet i notisen. Grönt och rött används BARA här — aldrig för
 * rubrik, ikon eller ram.
 */
export function formatNotificationAmount(
  amount: number,
  kind: NotificationAmountKind | null
) {
  const sign = amount > 0 ? "+" : amount < 0 ? "−" : "";
  const value = Math.abs(amount);
  if (kind === "roi") return `${sign}${formatPercent(value)}`;
  return `${sign}${Math.round(value).toLocaleString("sv-SE")} kr`;
}

export function amountColor(amount: number) {
  if (amount > 0) return "#66E38A";
  if (amount < 0) return "#FF5C6C";
  return "#8A94AB";
}
