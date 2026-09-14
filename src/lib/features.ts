/**
 * Kill-switches för fas-1-feedback. Sätt till true för att återaktivera.
 * Håll synkad med prompts/feedback-deck.md (prompt 01–02).
 */
export const FEATURES = {
  /** AI-rekommendationer / MatchesForYou / DailySuggestions i UI */
  aiSuggestionsUi: false,
  /**
   * Automatisk rättning via live-poll och settle-cron.
   * Manuell sättling i sheet/admin påverkas inte.
   */
  autoSettle: false,
} as const;
