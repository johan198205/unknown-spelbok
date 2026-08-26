import { createHash } from "node:crypto";
import { fieldToHeader } from "@/lib/import/detect-columns";
import {
  DEFAULT_UNIT_VALUE,
  type ColumnMapping,
  type ImportRow,
  type ImportResultValue,
  type ImportedBet,
  type PreviewRow,
} from "@/lib/import/types";
import { MAX_UNITS_PER_BET } from "@/lib/display";
import { stockholmIso } from "@/lib/stockholm";

/**
 * Rådata + mappning → spel. Körs bara på servern: både /preview och /commit
 * går genom den här filen, så förhandsgranskningen och det som faktiskt
 * sparas kan aldrig glida isär. Klienten skickar rådata plus mappning,
 * aldrig färdignormaliserade spel.
 */

const ODDS_MIN = 1.01;
const ODDS_MAX = 1000;
/** Insatser i det här intervallet är units, inte kronor. */
const UNIT_RANGE: [number, number] = [0.1, 10];
const UNIT_MIN_SAMPLES = 3;

export function parseNumber(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/−/g, "-")
    .replace(/[^0-9.,+-]/g, "")
    .trim();
  if (!cleaned || !/[0-9]/.test(cleaned)) return null;

  let value = cleaned;
  const comma = value.lastIndexOf(",");
  const dot = value.lastIndexOf(".");
  if (comma !== -1 && dot !== -1) {
    // Det sista skiljetecknet är decimaltecknet, det andra är tusenavskiljare.
    value =
      comma > dot
        ? value.replace(/\./g, "").replace(",", ".")
        : value.replace(/,/g, "");
  } else if (comma !== -1) {
    value = value.replace(",", ".");
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const DATE_PATTERNS: Array<{
  re: RegExp;
  parts: (m: RegExpMatchArray) => { y: number; m: number; d: number };
}> = [
  {
    // 2026-01-15
    re: /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/,
    parts: (m) => ({ y: +m[1], m: +m[2], d: +m[3] }),
  },
  {
    // 15/01/2026, 15.01.2026, 15-01-2026
    re: /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/,
    parts: (m) => ({ y: +m[3], m: +m[2], d: +m[1] }),
  },
  {
    // 15/01/26
    re: /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})(?!\d)/,
    parts: (m) => ({ y: 2000 + +m[3], m: +m[2], d: +m[1] }),
  },
];

/**
 * Excels serienummer räknas från 1899-12-30 och saknar tidszon. Heltal =
 * bara datum → 12:00 svensk tid, decimaler = klockslag i svensk tid.
 */
function fromExcelSerial(serial: number): string | null {
  if (serial < 1 || serial > 60000) return null;
  const days = Math.floor(serial);
  const date = new Date(Date.UTC(1899, 11, 30) + days * 86400000);
  if (Number.isNaN(date.getTime())) return null;
  const ymd = date.toISOString().slice(0, 10);

  const fraction = serial - days;
  if (fraction <= 0) return stockholmIso(ymd, 12, 0);
  const minutes = Math.round(fraction * 1440);
  return stockholmIso(ymd, Math.floor(minutes / 60) % 24, minutes % 60);
}

export function parseImportDate(raw: string | undefined): string | null {
  const value = (raw || "").trim();
  if (!value) return null;

  // ISO med tid — kommer bl.a. från xlsx cellDates.
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const iso = new Date(value);
    return Number.isNaN(iso.getTime()) ? null : iso.toISOString();
  }

  if (/^\d+([.,]\d+)?$/.test(value)) {
    const serial = parseNumber(value);
    return serial == null ? null : fromExcelSerial(serial);
  }

  for (const { re, parts } of DATE_PATTERNS) {
    const match = value.match(re);
    if (!match) continue;
    const { y, m, d } = parts(match);
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    const ymd = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const time = value.slice(match[0].length).match(/(\d{1,2}):(\d{2})/);
    // Utan klockslag: 12:00 svensk tid — mitt i dygnet, aldrig fel datum.
    return stockholmIso(ymd, time ? +time[1] : 12, time ? +time[2] : 0);
  }

  return null;
}

export function normalizeSport(raw: string | undefined): string | null {
  const value = (raw || "").trim().toLowerCase();
  if (!value) return null;
  if (value.includes("hockey")) return "hockey";
  if (
    value.includes("fotboll") ||
    value.includes("football") ||
    value.includes("soccer")
  ) {
    return "football";
  }
  return "other";
}

/** "Liverpool vs Arsenal", "Liverpool - Arsenal" → "Liverpool – Arsenal". */
export function normalizeMatchLabel(raw: string | undefined): string | null {
  const value = (raw || "").trim().replace(/\s+/g, " ");
  if (!value) return null;
  return value
    .replace(/\s+(?:vs?\.?|mot)\s+/i, " – ")
    .replace(/\s+[-–—]\s+/, " – ");
}

const RESULT_VALUES: Array<{ result: ImportResultValue; values: string[] }> = [
  {
    result: "win",
    values: ["vunnet", "vunnen", "vann", "vinst", "won", "win", "w", "1"],
  },
  {
    result: "loss",
    values: [
      "förlorat",
      "förlorad",
      "förlust",
      "forlorat",
      "lost",
      "loss",
      "lose",
      "l",
      "0",
    ],
  },
  {
    result: "void",
    values: [
      "void",
      "return",
      "returned",
      "push",
      "återbetalt",
      "återbetald",
      "aterbetalt",
      "refund",
      "annullerad",
    ],
  },
  {
    result: "halfwin",
    values: ["halvvinst", "halv vinst", "halfwin", "half win"],
  },
  {
    result: "halfloss",
    values: ["halvförlust", "halv förlust", "halfloss", "half loss"],
  },
  {
    result: "pending",
    values: [
      "ej rättat",
      "ej rattat",
      "orättat",
      "orattat",
      "pending",
      "open",
      "öppen",
      "oppen",
      "väntar",
      // Kalkylark skriver ofta status i beloppskolumnen för spel som
      // fortfarande rullar.
      "levande",
      "live",
      "pågår",
      "pagar",
    ],
  },
];

export function normalizeResult(raw: string | undefined): {
  result: ImportResultValue;
  unknown: boolean;
} {
  const value = (raw || "").trim().toLowerCase();
  if (!value) return { result: "pending", unknown: false };
  for (const { result, values } of RESULT_VALUES) {
    if (values.includes(value)) return { result, unknown: false };
  }
  return { result: "pending", unknown: true };
}

/** Samma payoutlogik som DB:ns genererade kolumn och manuell rättning. */
export function payoutForImport(
  result: ImportResultValue,
  stake: number,
  odds: number
): number | null {
  if (result === "win") return stake * odds;
  if (result === "halfwin") return (stake / 2) * odds + stake / 2;
  if (result === "void") return stake;
  if (result === "halfloss") return stake / 2;
  if (result === "loss") return 0;
  return null;
}

/**
 * Härleder rättningen ur ett belopp när filen saknar resultatkolumn — det
 * vanligaste fallet i egna kalkylark, där en netto- eller vinstkolumn bär
 * hela informationen.
 *
 * `kind: "netto"` = vinst/förlust (payout − insats), `"payout"` = utdelning.
 */
export function resultFromAmount(
  amount: number,
  kind: "netto" | "payout",
  stake: number,
  odds: number
): ImportResultValue | null {
  // Avrundning i källfilen får inte fälla matchningen.
  const tolerance = Math.max(1, stake * 0.005);

  const outcomes: ImportResultValue[] = [
    "win",
    "halfwin",
    "void",
    "halfloss",
    "loss",
  ];
  const scored = outcomes
    .map((outcome) => {
      const payout = payoutForImport(outcome, stake, odds);
      if (payout == null) return null;
      const expected = kind === "netto" ? payout - stake : payout;
      return { outcome, distance: Math.abs(amount - expected) };
    })
    .filter((c): c is { outcome: ImportResultValue; distance: number } => !!c)
    .sort((a, b) => a.distance - b.distance);

  const [best, runnerUp] = scored;
  if (!best || best.distance > tolerance) return null;
  // Vid låga odds ligger utfallen tätt. Hellre orättat än fel rättning.
  if (runnerUp && runnerUp.distance <= best.distance) return null;
  return best.outcome;
}

/**
 * Rättningen i prioritetsordning: explicit resultatkolumn, sedan text i en
 * beloppskolumn ("Void", "Levande"), sist själva summan.
 */
function resolveResult(args: {
  resultRaw: string;
  nettoRaw: string;
  payoutRaw: string;
  stake: number | null;
  odds: number | null;
}): { result: ImportResultValue; unknown: boolean } {
  if (args.resultRaw) {
    const direct = normalizeResult(args.resultRaw);
    if (!direct.unknown) return direct;
  }

  const amounts = [
    { raw: args.nettoRaw, kind: "netto" as const },
    { raw: args.payoutRaw, kind: "payout" as const },
  ];

  for (const { raw, kind } of amounts) {
    if (!raw) continue;
    const amount = parseNumber(raw);
    if (amount == null) {
      // Ren text i beloppskolumnen. Siffror får aldrig gå den här vägen:
      // "0" i en nettokolumn är void, inte förlust.
      const text = normalizeResult(raw);
      if (!text.unknown) return text;
      continue;
    }
    if (args.stake == null || args.odds == null) continue;
    const derived = resultFromAmount(amount, kind, args.stake, args.odds);
    if (derived) return { result: derived, unknown: false };
  }

  return { result: "pending", unknown: !!args.resultRaw };
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function rowHash(input: string) {
  return createHash("sha256").update(input).digest("hex").slice(0, 12);
}

export type NormalizeArgs = {
  rows: ImportRow[];
  mapping: ColumnMapping;
  fileHash: string;
  unitValue?: number;
  /** gemener namn → bookmakers.id, för logga i spelboken */
  bookmakerIndex?: Map<string, string>;
};

export type NormalizeResult = {
  rows: PreviewRow[];
  unitDetected: boolean;
};

/**
 * Unitdetektering: rubriken nämner units, eller så ligger alla insatser i
 * ett intervall där kronor vore orimligt (0,1–10).
 */
function detectUnits(header: string | undefined, values: number[]): boolean {
  if (header && /\bunits?\b/i.test(header)) return true;
  if (values.length < UNIT_MIN_SAMPLES) return false;
  return values.every((v) => v >= UNIT_RANGE[0] && v <= UNIT_RANGE[1]);
}

export function normalizeRows({
  rows,
  mapping,
  fileHash,
  unitValue = DEFAULT_UNIT_VALUE,
  bookmakerIndex,
}: NormalizeArgs): NormalizeResult {
  const header = fieldToHeader(mapping);
  const cell = (row: ImportRow, field: keyof typeof header) => {
    const key = header[field];
    return key ? (row[key] ?? "").trim() : "";
  };

  const rawStakes = rows
    .map((row) => parseNumber(cell(row, "stake")))
    .filter((v): v is number => v != null && v > 0);
  const unitDetected = detectUnits(header.stake, rawStakes);
  const unit = unitDetected && unitValue > 0 ? unitValue : 1;

  const seenHashes = new Map<string, number>();
  const out: PreviewRow[] = [];

  rows.forEach((row, index) => {
    const placedAt = parseImportDate(cell(row, "placed_at"));
    const matchLabel = normalizeMatchLabel(cell(row, "match_label"));
    const odds = parseNumber(cell(row, "odds"));
    const rawStake = parseNumber(cell(row, "stake"));
    const payoutRaw = cell(row, "payout");
    const nettoRaw = cell(row, "netto");
    const rawPayout = parseNumber(payoutRaw);
    const rawNetto = parseNumber(nettoRaw);
    // Beloppen jämförs mot filens råa insats, före unitkonvertering — allt
    // i samma fil ligger i samma skala.
    const { result, unknown } = resolveResult({
      resultRaw: cell(row, "result"),
      nettoRaw,
      payoutRaw,
      stake: rawStake,
      odds,
    });

    // Radhashen bygger på filens råa insats, inte den unitkonverterade —
    // annars skulle external_id ändras när användaren justerar unitvärdet.
    const hashInput = [
      placedAt ?? "",
      (matchLabel ?? "").toLowerCase(),
      odds ?? "",
      rawStake ?? "",
    ].join("|");
    const base = rowHash(hashInput);
    const occurrence = (seenHashes.get(base) ?? 0) + 1;
    seenHashes.set(base, occurrence);
    // Genuint upprepade rader i samma fil får egna id:n i stället för att
    // tyst slås ihop av dubblettskyddet.
    const rowKey = occurrence === 1 ? base : `${base}#${occurrence}`;

    const stake = rawStake == null ? null : round2(rawStake * unit);
    const bookmaker = cell(row, "bookmaker") || null;
    const bookmakerId =
      bookmaker && bookmakerIndex
        ? (bookmakerIndex.get(bookmaker.toLowerCase()) ?? null)
        : null;

    let reason: string | null = null;
    if (!matchLabel) reason = "Saknar match";
    else if (odds == null) reason = "Saknar odds";
    else if (odds < ODDS_MIN || odds > ODDS_MAX) reason = "Ogiltigt odds";
    else if (stake == null) reason = "Saknar insats";
    else if (stake <= 0) reason = "Ogiltig insats";

    // Taket gäller nya spel, inte historik. En importerad 15u-satsning är
    // ett faktum som redan hänt — flagga den, kasta den inte.
    const overCap =
      stake != null &&
      unitValue > 0 &&
      stake / unitValue > MAX_UNITS_PER_BET + 1e-9;

    const netto = rawNetto == null ? null : round2(rawNetto * unit);
    let payout: number | null = null;
    if (stake != null && odds != null) {
      if (rawPayout != null) payout = round2(rawPayout * unit);
      else if (netto != null) payout = round2(stake + netto);
      else payout = payoutForImport(result, stake, odds);
    }

    const bet: ImportedBet = {
      external_id: `file:${fileHash}:${rowKey}`,
      placed_at: placedAt,
      sport: normalizeSport(cell(row, "sport")),
      league: cell(row, "league") || null,
      match_label: matchLabel,
      market: cell(row, "market") || null,
      odds,
      stake,
      bookmaker,
      result,
      payout,
      netto,
    };

    out.push({
      index,
      bet,
      valid: reason == null,
      reason,
      stake_units: unitDetected && rawStake != null ? rawStake : null,
      bookmaker_id: bookmakerId,
      warning: unknown
        ? "Okänt resultatvärde — tolkas som orättat"
        : overCap
          ? `Över ${MAX_UNITS_PER_BET} units — importeras ändå`
          : null,
    });
  });

  return { rows: out, unitDetected };
}

/** Radhashen utan filprefix — används för mjuk dubblettmatchning. */
export function rowKeyOf(externalId: string): string {
  const parts = externalId.split(":");
  return parts.length > 2 ? parts.slice(2).join(":") : externalId;
}
