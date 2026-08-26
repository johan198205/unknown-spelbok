import { formatNumber } from "./utils";

/**
 * Visningsläge och valuta för belopp. Allt som visar pengar i appen går genom
 * formatAmount() med de här inställningarna — aldrig direkt mot toLocaleString.
 *
 * Valutan är en ren etikett. Beloppen växlas aldrig om: användaren bokför i
 * sin valuta och 250 är 250 oavsett om det står kr eller $. Det finns alltså
 * ingen kurskälla att hålla aktuell och inga historiska kurser att gissa.
 */

export const DISPLAY_MODES = ["money", "units"] as const;
export type DisplayMode = (typeof DISPLAY_MODES)[number];

export const CURRENCIES = [
  { code: "SEK", label: "Svenska kronor", suffix: "kr" },
  { code: "NOK", label: "Norska kronor", suffix: "NOK" },
  { code: "DKK", label: "Danska kronor", suffix: "DKK" },
  { code: "EUR", label: "Euro", suffix: "€" },
  { code: "USD", label: "US-dollar", suffix: "$" },
  { code: "GBP", label: "Brittiska pund", suffix: "£" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export const DEFAULT_CURRENCY: CurrencyCode = "SEK";
export const DEFAULT_UNIT_SIZE = 100;

/**
 * Taket för en enskild insats. Units finns för att göra insatser jämförbara
 * mellan spelböcker — utan tak säger "units" ingenting.
 */
export const MAX_UNITS_PER_BET = 10;

export type DisplayPrefs = {
  mode: DisplayMode;
  currency: CurrencyCode;
  /** 1 unit uttryckt i användarens valuta. Alltid > 0. */
  unitSize: number;
};

export const DEFAULT_DISPLAY_PREFS: DisplayPrefs = {
  mode: "money",
  currency: DEFAULT_CURRENCY,
  unitSize: DEFAULT_UNIT_SIZE,
};

export function isDisplayMode(value: unknown): value is DisplayMode {
  return DISPLAY_MODES.some((m) => m === value);
}

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return CURRENCIES.some((c) => c.code === value);
}

export function currencySuffix(code: CurrencyCode) {
  return CURRENCIES.find((c) => c.code === code)?.suffix ?? "kr";
}

/** Profilrad → prefs, med defaults för allt som saknas eller är trasigt. */
export function displayPrefsFrom(
  profile:
    | { display_mode?: unknown; currency?: unknown; unit_size?: unknown }
    | null
    | undefined
): DisplayPrefs {
  const unitSize = Number(profile?.unit_size);
  return {
    mode: isDisplayMode(profile?.display_mode) ? profile.display_mode : "money",
    currency: isCurrencyCode(profile?.currency) ? profile.currency : DEFAULT_CURRENCY,
    unitSize: Number.isFinite(unitSize) && unitSize > 0 ? unitSize : DEFAULT_UNIT_SIZE,
  };
}

export function unitSizeOf(prefs: DisplayPrefs) {
  return prefs.unitSize > 0 ? prefs.unitSize : DEFAULT_UNIT_SIZE;
}

/** Belopp → units. Avrundat till två decimaler så 33,333 inte läcker ut. */
export function toUnits(value: number, prefs: DisplayPrefs) {
  return Math.round((value / unitSizeOf(prefs)) * 100) / 100;
}

/** Units → belopp i användarens valuta. */
export function fromUnits(units: number, prefs: DisplayPrefs) {
  return Math.round(units * unitSizeOf(prefs) * 100) / 100;
}

/**
 * Ett belopp i det läge användaren valt. Ersätter formatMoney() överallt där
 * beloppet tillhör en enskild användare.
 *
 * `sign: false` ger talet utan inledande plus — för insats, omsättning och
 * annat som aldrig är negativt.
 */
export function formatAmount(
  value: number,
  prefs: DisplayPrefs = DEFAULT_DISPLAY_PREFS,
  opts?: { sign?: boolean }
) {
  const sign = opts?.sign === false ? "" : value > 0 ? "+" : "";

  if (prefs.mode === "units") {
    // Hårt mellanslag: "u" får aldrig hamna på egen rad i en trång kolumn.
    return `${sign}${formatNumber(toUnits(value, prefs), 2)} u`;
  }

  return `${sign}${value.toLocaleString("sv-SE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} ${currencySuffix(prefs.currency)}`;
}

/** Bara enheten — för fältetiketter som "Insats (kr)" / "Insats (units)". */
export function amountUnitLabel(prefs: DisplayPrefs) {
  return prefs.mode === "units" ? "units" : currencySuffix(prefs.currency);
}

/** Största tillåtna insats i användarens valuta. */
export function maxStake(prefs: DisplayPrefs) {
  return unitSizeOf(prefs) * MAX_UNITS_PER_BET;
}

/**
 * Validerar en insats mot unit-taket. Returnerar ett felmeddelande eller null.
 * Körs både i formuläret och i importen — taket ska hålla oavsett väg in.
 */
export function stakeError(stake: number, prefs: DisplayPrefs): string | null {
  if (!Number.isFinite(stake) || stake <= 0) return "Insatsen måste vara större än 0.";
  const units = stake / unitSizeOf(prefs);
  if (units > MAX_UNITS_PER_BET + 1e-9) {
    return `Max ${MAX_UNITS_PER_BET} units per spel — ${formatAmount(
      maxStake(prefs),
      { ...prefs, mode: "money" },
      { sign: false }
    )} med din unit-storlek.`;
  }
  return null;
}
