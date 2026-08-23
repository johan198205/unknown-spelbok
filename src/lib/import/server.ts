import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_UNIT_VALUE,
  IMPORT_FIELDS,
  MAX_IMPORT_ROWS,
  REQUIRED_IMPORT_FIELDS,
  type ColumnMapping,
  type ImportField,
  type ImportRow,
} from "@/lib/import/types";

/** Gemensam validering och uppslag för /api/import-rutterna. */

export type ImportRequestBody = {
  rows: ImportRow[];
  mapping: ColumnMapping;
  filename: string;
  file_hash: string;
  unit_value: number;
};

export class ImportRequestError extends Error {}

function asString(value: unknown, max = 300): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

export function parseImportBody(body: unknown): ImportRequestBody {
  if (!body || typeof body !== "object") {
    throw new ImportRequestError("Trasig data.");
  }
  const raw = body as Record<string, unknown>;

  if (!Array.isArray(raw.rows) || !raw.rows.length) {
    throw new ImportRequestError("Inga spel hittades i filen.");
  }
  if (raw.rows.length > MAX_IMPORT_ROWS) {
    throw new ImportRequestError(`Max ${MAX_IMPORT_ROWS} rader per import.`);
  }
  if (!raw.mapping || typeof raw.mapping !== "object") {
    throw new ImportRequestError("Kolumnmappning saknas.");
  }

  const rows: ImportRow[] = raw.rows.map((row) => {
    if (!row || typeof row !== "object") {
      throw new ImportRequestError("Trasig data.");
    }
    const out: ImportRow = {};
    for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
      out[key] = asString(value, 500);
    }
    return out;
  });

  const allowed = new Set<string>(IMPORT_FIELDS);
  const mapping: ColumnMapping = {};
  for (const [header, field] of Object.entries(
    raw.mapping as Record<string, unknown>
  )) {
    if (field === "ignore") {
      mapping[header] = "ignore";
      continue;
    }
    if (typeof field !== "string" || !allowed.has(field)) {
      throw new ImportRequestError("Ogiltig kolumnmappning.");
    }
    mapping[header] = field as ImportField;
  }

  const mapped = new Set(Object.values(mapping));
  const missing = REQUIRED_IMPORT_FIELDS.filter((field) => !mapped.has(field));
  if (missing.length) {
    throw new ImportRequestError(
      "Match, Odds och Insats måste vara mappade innan import."
    );
  }

  const fileHash = asString(raw.file_hash, 64);
  if (!/^[a-f0-9]{6,64}$/i.test(fileHash)) {
    throw new ImportRequestError("Trasig data.");
  }

  const unitRaw = Number(raw.unit_value);
  const unitValue =
    Number.isFinite(unitRaw) && unitRaw > 0 ? unitRaw : DEFAULT_UNIT_VALUE;

  return {
    rows,
    mapping,
    filename: asString(raw.filename, 200) || "import",
    file_hash: fileHash,
    unit_value: unitValue,
  };
}

/** Gemener bookmakernamn → id, för att importerade spel får rätt logga. */
export async function loadBookmakerIndex(
  supabase: SupabaseClient
): Promise<Map<string, string>> {
  const { data } = await supabase
    .from("bookmakers")
    .select("id, name")
    .eq("active", true);
  const index = new Map<string, string>();
  for (const row of (data ?? []) as Array<{ id: string; name: string }>) {
    index.set(row.name.trim().toLowerCase(), row.id);
  }
  return index;
}

/**
 * Alla external_id användaren redan importerat. Kolumnen kan saknas innan
 * migrationen körts — då är listan tom och inget flaggas som dubblett.
 */
export async function loadExistingExternalIds(
  supabase: SupabaseClient,
  userId: string
): Promise<{ ids: string[]; available: boolean }> {
  const { data, error } = await supabase
    .from("bets")
    .select("import_external_id")
    .eq("user_id", userId)
    .not("import_external_id", "is", null)
    .limit(10000);

  if (error) {
    console.warn("import: kunde inte läsa import_external_id", error.message);
    return { ids: [], available: false };
  }

  return {
    ids: (data ?? [])
      .map((row) => (row as { import_external_id: string | null }).import_external_id)
      .filter((id): id is string => !!id),
    available: true,
  };
}
