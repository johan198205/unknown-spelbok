import Anthropic from "@anthropic-ai/sdk";

/**
 * AI-motivering på ett förslag (Nivå 2).
 *
 * Server-only: nyckeln lämnar aldrig noden. Modulen får bara importeras
 * från route handlers.
 *
 * Ansvarsgränsen är tre lager av samma skydd: systemprompten (saklig ton,
 * förbjudna ord), efterkontrollen här nedan (kasserar allt som bryter mot
 * reglerna) och AI-badgen i UI:t. Hellre ingen text än fel text — vid
 * minsta tveksamhet kastas svaret och inget sparas.
 */

/** Haiku räcker: två meningar, låg kostnad. Overridas per miljö vid behov. */
const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";
const MAX_TOKENS = 300;
const TIMEOUT_MS = 10_000;
/** Systemprompten säger 220; efterkontrollen har marginal för ett tecken över. */
export const MAX_REASON_LENGTH = 240;
export const DAILY_AI_LIMIT = 10;

/**
 * Versionshanterad i koden, inte i databasen. Ändras den ska den ändras
 * här — texterna som redan genererats står kvar som de var.
 */
export const AI_REASON_SYSTEM_PROMPT = `Du skriver korta motiveringar på svenska för en sportspels-statistikapp.
Du får en användares spelstatistik och en match som matchats mot den.

Regler, absoluta:
- Max 2 meningar, max 220 tecken
- Förklara ENDAST varför matchen matchar användarens historik och spelstil
- Referera konkret till användarens egna siffror (hitrate, ROI, antal spel)
- Förutsäg ALDRIG matchutfall, nämn aldrig vilket lag som vinner
- Uppmana ALDRIG till spel. Förbjudna ord: "spela", "satsa", "bör", "rekommenderar", "vinnare", "säkert"
- Ton: saklig, statistisk, som en analytiker – inte som en tipster
- Svara med enbart motiveringstexten, ingen inledning, inga citattecken`;

/**
 * Ordfiltret matchar på ordstam med ordgräns, så att "spela", "spelar",
 * "spelat" och "satsa"/"satsar" fastnar — men inte "spelform", "spelstil"
 * eller "spelbok", som prompten uppmuntrar och som är ofarliga.
 */
const FORBIDDEN = [
  /\bspela(r|t|de|s)?\b/i,
  /\bsatsa(r|t|de|s)?\b/i,
  /\bbör\b/i,
  /\brekommendera(r|t|s|de)?\b/i,
  /\bvinnare\b/i,
  /\bsäkert?\b/i,
];

export class AiReasonError extends Error {}

export type AiReasonInput = {
  fixture: {
    sport: string;
    league: string;
    home: string;
    away: string;
    kickoff: string;
  };
  suggestedBetType: string | null;
  matchScore: number;
  reasons: { type: string; label: string; weight: number }[];
  /** Endast aggregat — aldrig hela spelhistoriken. */
  segments: {
    liga: string;
    spelform: string;
    antal_spel: number;
    hitrate: number | null;
    roi: number | null;
    snittodds: number | null;
  }[];
};

/** Kasserar svar som bryter mot reglerna. Returnerar null = använd inte. */
export function validateAiReason(raw: string): string | null {
  const text = raw.trim().replace(/^["'`]+|["'`]+$/g, "").trim();
  if (!text) return null;
  if (text.length > MAX_REASON_LENGTH) return null;
  if (FORBIDDEN.some((pattern) => pattern.test(text))) return null;
  return text;
}

function client() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AiReasonError("ANTHROPIC_API_KEY saknas");
  return new Anthropic({ apiKey, timeout: TIMEOUT_MS, maxRetries: 1 });
}

/**
 * Genererar en motivering. Kastar AiReasonError vid API-fel, tomt svar
 * eller svar som inte klarar efterkontrollen — anroparen ska då returnera
 * 502 och spara ingenting.
 */
export async function generateAiReason(input: AiReasonInput): Promise<string> {
  const response = await client().messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: AI_REASON_SYSTEM_PROMPT,
    messages: [{ role: "user", content: JSON.stringify(input) }],
  });

  if (response.stop_reason === "refusal") {
    throw new AiReasonError("Modellen avböjde");
  }

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();

  const validated = validateAiReason(text);
  if (!validated) {
    // Ingen automatisk omgenerering: ett svar som bryter mot ordfiltret är
    // ett innehållsfel, och att försöka igen kostar bara pengar.
    throw new AiReasonError("Svaret klarade inte efterkontrollen");
  }
  return validated;
}
