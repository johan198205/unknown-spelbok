import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import {
  ALLOWED_IMPORT_IMAGE_MIMES,
  IMAGE_CANONICAL_HEADERS,
  IMAGE_COLUMN_MAPPING,
  MAX_IMPORT_ROWS,
  type AllowedImportImageMime,
  type ColumnMapping,
  type ImportFromImageResponse,
  type ImportRow,
} from "@/lib/import/types";

/**
 * AI-bildtolkning för import. Server-only — nyckeln lämnar aldrig noden.
 *
 * Extraherar spelrader från skärmdumpar av tabeller/kalkylark eller
 * kuponger från spelbolag till samma kanoniska kolumner som Excel-mallen.
 */

const MODEL =
  process.env.ANTHROPIC_VISION_MODEL ||
  process.env.ANTHROPIC_MODEL ||
  "claude-sonnet-4-5";
const MAX_TOKENS = 8192;
const TIMEOUT_MS = 60_000;

export class ImportVisionError extends Error {}

export const IMAGE_IMPORT_SYSTEM_PROMPT = `Du extraherar sportspel från en bild till en spelbok.

Bilden kan vara:
1. En skärmdump av en speltabell / kalkylark med många rader
2. En kupong / kvitto från ett spelbolag med ett eller några spel

Svara ENDAST med giltig JSON (ingen markdown, inga code fences) på formen:
{"bets":[{"date":"","sport":"","league":"","match":"","market":"","odds":"","stake":"","bookmaker":"","result":"","payout":"","netto":""}]}

Fält per spel (alla strängar; tom sträng om osäkert eller saknas):
- date: datum/tid som syns (t.ex. 2025-02-16 15:00 eller 16/02/2025)
- sport: t.ex. Fotboll, Ishockey
- league: liganamn
- match: matchen (hemma vs borta). Om match och spel är i samma cell, lägg lagen i match och marknaden i market
- market: vad som spelats (1, X, Över 2.5, ö1.5 MÅL 2A HL, Asian, osv.)
- odds: decimalodds som syns (behåll komma eller punkt som i bilden)
- stake: insats / units som syns
- bookmaker: spelbolag om synligt
- result: vinst/förlust/void/orättat/WIN/LOSS/PUSH/Levande m.m. som syns
- payout: utdelning om synlig (inte netto)
- netto: vinst/förlust om synlig (+/−)

Regler, absoluta:
- Inventera ALDRIG odds eller insats. Hellre tomt än gissat.
- Ta med varje synlig spelrad; hoppa över rubriker, summeringar och tomma rader
- Behåll svenska decimaltecken om bilden använder dem (1,85)
- Max ${MAX_IMPORT_ROWS} spel
- Om bilden inte innehåller några spel: {"bets":[]}`;

function client() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new ImportVisionError("ANTHROPIC_API_KEY saknas");
  return new Anthropic({ apiKey, timeout: TIMEOUT_MS, maxRetries: 1 });
}

export function isAllowedImageMime(
  mime: string
): mime is AllowedImportImageMime {
  return (ALLOWED_IMPORT_IMAGE_MIMES as readonly string[]).includes(mime);
}

export function hashImageBytes(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex").slice(0, 12);
}

type RawBet = {
  date?: unknown;
  sport?: unknown;
  league?: unknown;
  match?: unknown;
  market?: unknown;
  odds?: unknown;
  stake?: unknown;
  bookmaker?: unknown;
  result?: unknown;
  payout?: unknown;
  netto?: unknown;
};

function asCell(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "string") return value.trim().slice(0, 500);
  return String(value).trim().slice(0, 500);
}

function rawToRow(raw: RawBet): ImportRow {
  return {
    Datum: asCell(raw.date),
    Sport: asCell(raw.sport),
    Liga: asCell(raw.league),
    Match: asCell(raw.match),
    Spel: asCell(raw.market),
    Odds: asCell(raw.odds),
    Insats: asCell(raw.stake),
    Spelbolag: asCell(raw.bookmaker),
    Resultat: asCell(raw.result),
    Vinst: asCell(raw.payout),
    Netto: asCell(raw.netto),
  };
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new ImportVisionError("AI returnerade ogiltig JSON");
  }
}

export function parseVisionBets(text: string): ImportRow[] {
  const parsed = extractJsonObject(text);
  if (!parsed || typeof parsed !== "object") {
    throw new ImportVisionError("AI returnerade ogiltig JSON");
  }
  const bets = (parsed as { bets?: unknown }).bets;
  if (!Array.isArray(bets)) {
    throw new ImportVisionError("AI returnerade inga spel");
  }

  const rows: ImportRow[] = [];
  for (const item of bets.slice(0, MAX_IMPORT_ROWS)) {
    if (!item || typeof item !== "object") continue;
    const row = rawToRow(item as RawBet);
    // Hoppa över helt tomma rader.
    if (!IMAGE_CANONICAL_HEADERS.some((h) => row[h])) continue;
    rows.push(row);
  }
  return rows;
}

export async function extractBetsFromImage(args: {
  bytes: Buffer;
  mime: AllowedImportImageMime;
  filename: string;
}): Promise<ImportFromImageResponse> {
  const response = await client().messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: IMAGE_IMPORT_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: args.mime,
              data: args.bytes.toString("base64"),
            },
          },
          {
            type: "text",
            text: "Extrahera alla synliga spel från bilden till JSON enligt instruktionerna.",
          },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new ImportVisionError("Modellen avböjde att tolka bilden");
  }

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();

  if (!text) {
    throw new ImportVisionError("Tomt svar från AI");
  }

  const rows = parseVisionBets(text);
  const notices: string[] = [];
  if (!rows.length) {
    notices.push("Inga spel kunde läsas från bilden.");
  } else if (rows.length >= MAX_IMPORT_ROWS) {
    notices.push(`Max ${MAX_IMPORT_ROWS} rader — överskjutande rader hoppades över.`);
  }

  const mapping: ColumnMapping = { ...IMAGE_COLUMN_MAPPING };

  return {
    rows,
    mapping,
    filename: args.filename.slice(0, 200) || "bildimport",
    file_hash: hashImageBytes(args.bytes),
    notices,
    import_source: "image",
  };
}
