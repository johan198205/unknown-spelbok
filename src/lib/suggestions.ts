/**
 * Delade typer och formattering för "Dagens matcher för dig".
 *
 * Client-safe: får inte dra in något server-only. Poängsättningen bor i
 * supabase/functions/_shared/suggest.ts och körs bara i Edge Functionen —
 * appen läser färdiga rader ur daily_suggestions.
 *
 * Copy-regel: allt här formuleras som "matchar din spelstil" eller
 * "värd att kolla upp". Aldrig "spela detta", aldrig utfallsprediktion.
 */

import type { Fixture, Tables } from "@/lib/types";

export type SuggestionReason = {
  type: "league" | "bet_type" | "sport" | "kickoff" | "team";
  label: string;
  weight: number;
};

export type DailySuggestion = Omit<Tables<"daily_suggestions">, "reasons"> & {
  reasons: SuggestionReason[];
};

/**
 * Kolumnerna klienten behöver — user_id och datum stannar på servern.
 *
 * En enda literal med `as const`: bryts strängen upp i konkatenering kan
 * inte supabase-js typa raderna, och select() faller tillbaka på
 * GenericStringError.
 */
export const SUGGESTION_COLUMNS =
  "id, fixture_id, sport, league_id, league_name, league_logo, home_team, home_team_id, home_logo, away_team, away_team_id, away_logo, kickoff, suggested_bet_type, match_score, reasons, clicked, dismissed, ai_reason, ai_generated_at" as const;

const REASON_TYPES = new Set([
  "league",
  "bet_type",
  "sport",
  "kickoff",
  "team",
]);

/** jsonb kommer tillbaka otypat — släpp igenom bara det UI:t kan rita. */
export function parseReasons(raw: unknown): SuggestionReason[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const { type, label, weight } = item as Record<string, unknown>;
    if (typeof type !== "string" || !REASON_TYPES.has(type)) return [];
    if (typeof label !== "string" || !label.trim()) return [];
    return [
      {
        type: type as SuggestionReason["type"],
        label: label.trim(),
        weight: Number(weight) || 0,
      },
    ];
  });
}

export function normalizeSuggestion(row: unknown): DailySuggestion {
  const record = (row ?? {}) as Record<string, unknown>;
  return {
    ...(record as unknown as DailySuggestion),
    reasons: parseReasons(record.reasons),
  };
}

/** Skälen kortet visar: tyngst först, max två (resten är brus i ett kort). */
export function topReasons(suggestion: DailySuggestion, limit = 2) {
  return [...suggestion.reasons]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit);
}

export function kickoffLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Stockholm",
  });
}

export function suggestionDateLabel(date = new Date()) {
  return date.toLocaleDateString("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Stockholm",
  });
}

/**
 * Syntetisk fixture-rad ur ett förslag, så klicket kan öppna kaskad-väljaren
 * förifylld utan att först slå mot /api/fixtures. Matchen har inte startat
 * (förslagen filtreras på kickoff framåt i tiden), därav status NS.
 */
export function fixtureFromSuggestion(suggestion: DailySuggestion): Fixture {
  return {
    fixture_id: suggestion.fixture_id,
    kickoff: suggestion.kickoff,
    status: "NS",
    sport: suggestion.sport === "hockey" ? "Ishockey" : "Fotboll",
    league_id: suggestion.league_id || null,
    league_name: suggestion.league_name,
    league_logo: suggestion.league_logo,
    home_team_id: suggestion.home_team_id,
    home_name: suggestion.home_team,
    home_logo: suggestion.home_logo,
    away_team_id: suggestion.away_team_id,
    away_name: suggestion.away_team,
    away_logo: suggestion.away_logo,
    home_score: null,
    away_score: null,
    elapsed: null,
    season: null,
    raw: null,
    updated_at: suggestion.kickoff,
  };
}
