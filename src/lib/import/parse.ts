import {
  MAX_IMPORT_BYTES,
  MAX_IMPORT_ROWS,
  type ImportRow,
  type ParsedFile,
} from "@/lib/import/types";

/**
 * Filparsning i webbläsaren. Själva filen laddas aldrig upp — bara rådata
 * som JSON går vidare till /api/import/*.
 *
 * SheetJS och papaparse importeras dynamiskt: de behövs bara när någon
 * faktiskt öppnar importmodalen och ska inte ligga i huvudbundlen.
 */

export class ImportParseError extends Error {}

/** Rubrikraden är första raden med minst så här många ifyllda celler. */
const HEADER_MIN_CELLS = 3;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/**
 * Datumceller skickas vidare som väggklocka, inte som ISO-instant. Excel
 * lagrar ingen tidszon, så en ISO-konvertering här hade låst datumet till
 * webbläsarens zon — normalize.ts tolkar i stället allt i svensk tid.
 */
function dateToWallClock(value: Date): string {
  const ymd = `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(
    value.getDate()
  )}`;
  if (!value.getHours() && !value.getMinutes()) return ymd;
  return `${ymd} ${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function cellToString(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : dateToWallClock(value);
  }
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  return String(value).trim();
}

function isFilled(value: string) {
  return value.length > 0;
}

/** Rubriker måste vara unika — de är nycklar i mappningen och i raddatan. */
function uniqueHeaders(raw: string[]): string[] {
  const seen = new Map<string, number>();
  return raw.map((header, i) => {
    const base = header || `Kolumn ${i + 1}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base} (${count + 1})`;
  });
}

/**
 * Matris → rubriker + rader. Titelrader ovanför rubrikraden hoppas över.
 */
function tableFromMatrix(matrix: string[][]): {
  headers: string[];
  rows: ImportRow[];
} {
  const headerIndex = matrix.findIndex(
    (row) => row.filter(isFilled).length >= HEADER_MIN_CELLS
  );
  if (headerIndex === -1) return { headers: [], rows: [] };

  const headers = uniqueHeaders(matrix[headerIndex].map((h) => h.trim()));
  const rows: ImportRow[] = [];

  for (const cells of matrix.slice(headerIndex + 1)) {
    if (!cells.some(isFilled)) continue;
    const row: ImportRow = {};
    headers.forEach((header, i) => {
      row[header] = cells[i] ?? "";
    });
    rows.push(row);
  }

  return { headers, rows };
}

async function hashFile(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 12);
}

async function parseXlsx(
  buffer: ArrayBuffer,
  notices: string[]
): Promise<string[][]> {
  const XLSX = await import("xlsx");
  let workbook;
  try {
    // cellDates gör att Excels serienummer redan är Date här.
    workbook = XLSX.read(buffer, { cellDates: true });
  } catch {
    throw new ImportParseError("Filen kunde inte läsas.");
  }

  const names = workbook.SheetNames;
  if (!names.length) throw new ImportParseError("Filen kunde inte läsas.");
  if (names.length > 1) notices.push("Endast första bladet importeras.");

  const sheet = workbook.Sheets[names[0]];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: "",
  });
  return matrix.map((row) => row.map(cellToString));
}

function decodeCsv(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    // Svenska Excel-exporter är ofta Latin-1 — annars tappas å, ä och ö.
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

async function parseCsv(buffer: ArrayBuffer): Promise<string[][]> {
  const Papa = (await import("papaparse")).default;
  const text = decodeCsv(buffer);
  const result = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: "greedy",
    // Tom delimiter = papaparse autodetekterar (, ; \t |).
    delimiter: "",
  });
  if (!result.data.length) return [];
  return result.data.map((row) =>
    (Array.isArray(row) ? row : [row]).map((cell) => cellToString(cell))
  );
}

export async function parseBetFile(file: File): Promise<ParsedFile> {
  if (file.size > MAX_IMPORT_BYTES) {
    throw new ImportParseError("För stor fil (max 2 MB).");
  }

  const lower = file.name.toLowerCase();
  const isCsv = lower.endsWith(".csv");
  const isXlsx = lower.endsWith(".xlsx");
  if (!isCsv && !isXlsx) {
    throw new ImportParseError("Välj en .xlsx- eller .csv-fil.");
  }

  const buffer = await file.arrayBuffer();
  const notices: string[] = [];
  const matrix = isXlsx
    ? await parseXlsx(buffer, notices)
    : await parseCsv(buffer);

  const { headers, rows } = tableFromMatrix(matrix);
  if (!headers.length || !rows.length) {
    throw new ImportParseError("Inga spel hittades i filen.");
  }

  let kept = rows;
  if (rows.length > MAX_IMPORT_ROWS) {
    // Exporter ligger i kronologisk ordning — de sista raderna är de senaste.
    kept = rows.slice(-MAX_IMPORT_ROWS);
    notices.push(
      `Filen har ${rows.length} rader. De ${MAX_IMPORT_ROWS} senaste importeras.`
    );
  }

  return {
    filename: file.name,
    fileHash: await hashFile(buffer),
    headers,
    rows: kept,
    notices,
  };
}
