/**
 * Popups — delad logik mellan server och klient.
 *
 * Ingenting här får importera supabase/admin eller next/headers: filen
 * används både i adminens editor, i serverläsningen och i renderaren som
 * körs i webbläsaren. Läsningen ligger i popups-server.ts.
 */

export const POPUP_TRIGGERS = ["load", "delay", "scroll", "exit"] as const;
export type PopupTrigger = (typeof POPUP_TRIGGERS)[number];

export const POPUP_SCOPES = ["all", "paths"] as const;
export type PopupScope = (typeof POPUP_SCOPES)[number];

export const POPUP_AUDIENCES = ["all", "auth", "anon"] as const;
export type PopupAudience = (typeof POPUP_AUDIENCES)[number];

export const POPUP_FREQUENCIES = ["once", "session", "daily", "always"] as const;
export type PopupFrequency = (typeof POPUP_FREQUENCIES)[number];

export type PopupEvent = "view" | "click" | "dismiss";

export type Popup = {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  button_label: string | null;
  button_url: string | null;
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

/** Kolumnlistan renderaren behöver. Håll den i synk med select(). */
export const POPUP_COLUMNS =
  "id, title, body, image_url, button_label, button_url, trigger_type, " +
  "trigger_value, target_scope, target_paths, audience, frequency, notify, " +
  "active, starts_at, ends_at, sort";

// -------------------------------------------------------------
// Etiketter
// -------------------------------------------------------------

export const TRIGGER_LABELS: Record<PopupTrigger, string> = {
  load: "När sidan öppnas",
  delay: "Efter antal sekunder",
  scroll: "Vid scrolldjup",
  exit: "När besökaren lämnar sidan",
};

export const TRIGGER_HINTS: Record<PopupTrigger, string> = {
  load: "Visas direkt när besökaren landar på sidan.",
  delay: "Visas när besökaren varit kvar på sidan i angivet antal sekunder.",
  scroll: "Visas när besökaren scrollat förbi angiven andel av sidan.",
  exit:
    "Visas när muspekaren lämnar fönstret uppåt, eller vid bakåtgest på mobil. " +
    "Sista chansen innan besökaren är borta.",
};

export const AUDIENCE_LABELS: Record<PopupAudience, string> = {
  all: "Alla besökare",
  auth: "Bara inloggade",
  anon: "Bara utloggade",
};

export const FREQUENCY_LABELS: Record<PopupFrequency, string> = {
  once: "En gång per besökare",
  session: "En gång per besök",
  daily: "En gång per dygn",
  always: "Varje gång",
};

/** Enheten på trigger_value. Null när triggern inte har någon. */
export function triggerUnit(trigger: PopupTrigger): "s" | "%" | null {
  if (trigger === "delay") return "s";
  if (trigger === "scroll") return "%";
  return null;
}

/** Kort sammanfattning för listan i admin: "Efter 5 s", "Vid 50 %". */
export function describeTrigger(popup: Pick<Popup, "trigger_type" | "trigger_value">) {
  switch (popup.trigger_type) {
    case "delay":
      return `Efter ${popup.trigger_value} s`;
    case "scroll":
      return `Vid ${popup.trigger_value} % scroll`;
    case "exit":
      return "Vid utgång";
    default:
      return "Vid sidladdning";
  }
}

export function describeScope(popup: Pick<Popup, "target_scope" | "target_paths">) {
  if (popup.target_scope === "all") return "Alla sidor";
  const paths = popup.target_paths ?? [];
  if (paths.length === 1) return paths[0];
  return `${paths.length} sidor`;
}

// -------------------------------------------------------------
// Sökvägar
//
// Matchningen sker i KLIENTEN, inte på servern: root-layouten renderas
// bara vid full sidladdning, så en popup som var bunden till sökvägen på
// serversidan hade aldrig triggat vid klientnavigering. Renderaren får
// alla aktiva rader och väljer själv.
// -------------------------------------------------------------

/**
 * Ytor som aldrig får en popup. Admin ska kunna jobba ostört, och en
 * kampanjruta över inloggningsformuläret stoppar det enda besökaren
 * försöker göra.
 */
const EXCLUDED_PREFIXES = [
  "/admin",
  "/login",
  "/registrera",
  "/auth",
  "/underhall",
  "/offline",
  "/go",
];

export function isPopupAllowedPath(pathname: string) {
  return !EXCLUDED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/** "/kuponger/" och "/kuponger" är samma sida. Rot förblir "/". */
export function normalizePath(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  // Behåll ett avslutande * — det är mönstret, inte en slask-slash.
  if (path.endsWith("*")) return path;
  return path.length > 1 ? path.replace(/\/+$/, "") : "/";
}

/**
 * Exakt match, eller prefixmatch när mönstret slutar på *.
 * `/kuponger*` träffar /kuponger och allt under /kuponger/.
 */
export function pathMatches(pattern: string, pathname: string) {
  const normalizedPattern = normalizePath(pattern);
  if (!normalizedPattern) return false;

  if (normalizedPattern.endsWith("*")) {
    const prefix = normalizedPattern.slice(0, -1).replace(/\/+$/, "");
    if (!prefix || prefix === "") return true;
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  }
  return normalizePath(pathname) === normalizedPattern;
}

/** Gäller popupen den här sidan och den här besökaren just nu? */
export function popupApplies(
  popup: Popup,
  ctx: { pathname: string; authed: boolean; now?: number }
) {
  if (!popup.active) return false;
  if (!isPopupAllowedPath(ctx.pathname)) return false;

  const now = ctx.now ?? Date.now();
  if (popup.starts_at && new Date(popup.starts_at).getTime() > now) return false;
  if (popup.ends_at && new Date(popup.ends_at).getTime() < now) return false;

  if (popup.audience === "auth" && !ctx.authed) return false;
  if (popup.audience === "anon" && ctx.authed) return false;

  if (popup.target_scope === "paths") {
    const paths = popup.target_paths ?? [];
    if (!paths.some((p) => pathMatches(p, ctx.pathname))) return false;
  }

  return true;
}

// -------------------------------------------------------------
// Frekvens
//
// Avgörs i webbläsaren. Servern kan inte veta något om en utloggad
// besökare mellan sidvisningar, och en inloggad ska inte behöva en
// databasskrivning per sidvisning för att slippa se samma ruta igen.
//
// Nyckeln bär popupens id — ändrar redaktionen innehållet i en befintlig
// rad får den som redan sett den INTE se den igen. Det är avsiktligt:
// en ny kampanj ska vara en ny rad.
// -------------------------------------------------------------

const STORAGE_PREFIX = "spelbok.popup.";

export function popupStorageKey(id: string) {
  return `${STORAGE_PREFIX}${id}`;
}

function store(frequency: PopupFrequency): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return frequency === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    // Privat läge eller blockerad lagring — visa hellre rutan än att krascha.
    return null;
  }
}

/** Har besökaren redan sett rutan så nyligen att den inte ska visas igen? */
export function popupAlreadySeen(popup: Popup) {
  if (popup.frequency === "always") return false;

  const storage = store(popup.frequency);
  if (!storage) return false;

  let raw: string | null = null;
  try {
    raw = storage.getItem(popupStorageKey(popup.id));
  } catch {
    return false;
  }
  if (!raw) return false;

  if (popup.frequency === "daily") {
    const seenAt = Number(raw);
    if (!Number.isFinite(seenAt)) return false;
    return Date.now() - seenAt < 86_400_000;
  }

  // once och session: raden finns = sedd.
  return true;
}

export function markPopupSeen(popup: Popup) {
  if (popup.frequency === "always") return;
  const storage = store(popup.frequency);
  if (!storage) return;
  try {
    storage.setItem(popupStorageKey(popup.id), String(Date.now()));
  } catch {
    /* full eller blockerad lagring — rutan visas igen, inget värre */
  }
}

// -------------------------------------------------------------
// Länkar
// -------------------------------------------------------------

/** Externa mål öppnas i ny flik, interna navigerar i appen. */
export function isExternalUrl(url: string) {
  return /^https?:\/\//i.test(url.trim());
}
