import {
  IMPORT_FIELDS,
  type ColumnMapping,
  type ImportField,
} from "@/lib/import/types";

/**
 * Autodetektering av kolumnrubriker. Resultatet är ett förslag — modalens
 * mappningssteg visar alltid varje kolumn med en dropdown så användaren kan
 * rätta det som blev fel.
 */

const SYNONYMS: Record<ImportField, string[]> = {
  placed_at: ["datum", "date", "dag", "tid", "spelat", "placed"],
  sport: ["sport"],
  league: ["liga", "league", "turnering", "serie", "tävling"],
  match_label: ["match", "händelse", "event", "spelobjekt"],
  market: ["spel", "marknad", "market", "bet", "speltyp", "val"],
  odds: ["odds", "kurs"],
  stake: ["insats", "stake", "units", "unit", "belopp", "satsat"],
  bookmaker: ["bookmaker", "spelbolag", "bolag", "book", "site"],
  result: ["resultat", "status", "result", "utfall", "w/l"],
  payout: ["vinst", "utdelning", "payout", "retur", "return"],
  // Netto är vinst/förlust, inte utdelning — egna kalkylark har nästan
  // alltid den kolumnen i stället för en resultatkolumn.
  netto: ["netto", "net", "vinst/förlust", "p/l", "pl", "profit", "resultat kr"],
};

function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Högre poäng = säkrare träff. Exakt rubrik slår delsträng, och längre
 * synonym slår kortare — annars kapar "spel" åt sig "Spelbolag".
 */
function score(header: string, synonym: string): number {
  if (header === synonym) return 1000 + synonym.length;
  const boundary = new RegExp(`(^|[^a-zà-ÿ0-9])${escapeRe(synonym)}([^a-zà-ÿ0-9]|$)`);
  if (boundary.test(header)) return 100 + synonym.length;
  if (header.includes(synonym)) return 10 + synonym.length;
  return 0;
}

function escapeRe(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Greedy tilldelning: bästa (kolumn, fält)-paret först, sedan nästa som
 * varken har kolumnen eller fältet upptaget. Omatchade kolumner blir
 * "ignore" — filer utan igenkännbara rubriker mappas manuellt.
 */
export function detectColumns(headers: string[]): ColumnMapping {
  const candidates: Array<{
    header: string;
    field: ImportField;
    points: number;
  }> = [];

  for (const header of headers) {
    const normalized = normalizeHeader(header);
    if (!normalized) continue;
    for (const field of IMPORT_FIELDS) {
      const points = Math.max(
        ...SYNONYMS[field].map((synonym) => score(normalized, synonym))
      );
      if (points > 0) candidates.push({ header, field, points });
    }
  }

  candidates.sort((a, b) => b.points - a.points);

  const mapping: ColumnMapping = {};
  for (const header of headers) mapping[header] = "ignore";

  const usedFields = new Set<ImportField>();
  for (const candidate of candidates) {
    if (mapping[candidate.header] !== "ignore") continue;
    if (usedFields.has(candidate.field)) continue;
    mapping[candidate.header] = candidate.field;
    usedFields.add(candidate.field);
  }

  return mapping;
}

/** field → kolumnrubrik. Första förekomsten vinner. */
export function fieldToHeader(
  mapping: ColumnMapping
): Partial<Record<ImportField, string>> {
  const byField: Partial<Record<ImportField, string>> = {};
  for (const [header, field] of Object.entries(mapping)) {
    if (field === "ignore") continue;
    if (byField[field]) continue;
    byField[field] = header;
  }
  return byField;
}
