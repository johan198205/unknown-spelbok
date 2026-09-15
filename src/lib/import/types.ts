/**
 * Delade typer för filimport av spel.
 *
 * Modellen är generisk med avsikt: `import_source` + `import_external_id`
 * räcker även för länkimport (Sharps m.fl.) och bildimport utan ny
 * migration — bara prefixet i external_id byts ut
 * ('file:' → 'image:' / 'sharps:').
 */

/** Proveniens som sparas i bets.import_source. */
export type ImportSource = "file" | "image";

export type ImportResultValue =
  | "win"
  | "loss"
  | "void"
  | "halfwin"
  | "halfloss"
  | "pending";

export type ImportedBet = {
  /** '{source}:{filhash}:{radhash}' — dedupnyckel mot bets.import_external_id */
  external_id: string;
  placed_at: string | null;
  sport: string | null;
  league: string | null;
  match_label: string | null;
  market: string | null;
  odds: number | null;
  stake: number | null;
  bookmaker: string | null;
  result: ImportResultValue | null;
  /** utdelning: insats × odds vid vinst */
  payout: number | null;
  /** vinst/förlust: payout − insats. Vanligaste kolumnen i egna kalkylark. */
  netto: number | null;
};

/** Fälten en kolumn kan mappas till. external_id räknas alltid fram. */
export type ImportField = Exclude<keyof ImportedBet, "external_id">;

export const IMPORT_FIELDS: ImportField[] = [
  "placed_at",
  "sport",
  "league",
  "match_label",
  "market",
  "odds",
  "stake",
  "bookmaker",
  "result",
  "payout",
  "netto",
];

export const IMPORT_FIELD_LABELS: Record<ImportField, string> = {
  placed_at: "Datum",
  sport: "Sport",
  league: "Liga",
  match_label: "Match",
  market: "Spel",
  odds: "Odds",
  stake: "Insats",
  bookmaker: "Spelbolag",
  result: "Resultat",
  payout: "Vinst (utdelning)",
  netto: "Netto (vinst/förlust)",
};

/** Utan dessa går det inte att skapa ett spel. */
export const REQUIRED_IMPORT_FIELDS: ImportField[] = [
  "match_label",
  "odds",
  "stake",
];

/** nyckel = kolumnrubrik i filen */
export type ColumnMapping = Record<string, ImportField | "ignore">;

export type ImportRow = Record<string, string>;

export type ParsedFile = {
  filename: string;
  /** sha256 av filinnehållet, kortad till 12 tecken */
  fileHash: string;
  headers: string[];
  rows: ImportRow[];
  /** t.ex. "Endast första bladet importeras" */
  notices: string[];
};

/** En rad i förhandsgranskningen — spelet plus allt UI:t behöver. */
export type PreviewRow = {
  /** radens plats i filen, 0-baserad */
  index: number;
  bet: ImportedBet;
  valid: boolean;
  /** orsak när valid = false, t.ex. "Saknar odds" */
  reason: string | null;
  /**
   * Insatsen tolkad som units. Satt först när unitdetektering slagit till —
   * klienten räknar då om insatskolumnen live mot unitvärdet.
   */
  stake_units: number | null;
  bookmaker_id: string | null;
  /** t.ex. okänt resultatvärde som tolkats som orättat */
  warning: string | null;
};

export type ImportPreviewResponse = {
  bets: PreviewRow[];
  /** external_id som redan finns hos användaren */
  duplicates: string[];
  /** external_id vars radhash matchar ett spel importerat från annan fil */
  soft_duplicates: string[];
  unit_detected: boolean;
};

export type ImportCommitResponse = { imported: number; skipped: number };

/**
 * Svar från /api/import/from-image. Klienten skickar rows + mapping vidare
 * till /preview och /commit utan kolumnmappningssteget.
 */
export type ImportFromImageResponse = {
  rows: ImportRow[];
  mapping: ColumnMapping;
  filename: string;
  file_hash: string;
  notices: string[];
  import_source: "image";
};

export const MAX_IMPORT_ROWS = 1000;
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
/** Skärmdumpar är ofta tyngre än Excel-filer. */
export const MAX_IMPORT_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMPORT_IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export type AllowedImportImageMime =
  (typeof ALLOWED_IMPORT_IMAGE_MIMES)[number];

/** Kanoniska rubriker som Vision skriver — 1:1 mot ImportField. */
export const IMAGE_CANONICAL_HEADERS = [
  "Datum",
  "Sport",
  "Liga",
  "Match",
  "Spel",
  "Odds",
  "Insats",
  "Spelbolag",
  "Resultat",
  "Vinst",
  "Netto",
] as const;

export const IMAGE_COLUMN_MAPPING: ColumnMapping = {
  Datum: "placed_at",
  Sport: "sport",
  Liga: "league",
  Match: "match_label",
  Spel: "market",
  Odds: "odds",
  Insats: "stake",
  Spelbolag: "bookmaker",
  Resultat: "result",
  Vinst: "payout",
  Netto: "netto",
};

export const DEFAULT_UNIT_VALUE = 100;
/** Max AI-bildtolkningar per användare och dygn (minnesbaserat). */
export const DAILY_IMAGE_IMPORT_LIMIT = 20;
