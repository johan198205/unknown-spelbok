import type { BetResult } from "@/lib/types";

/**
 * dataLayer-spåret är enbart för marknadsföring (GTM → GA4). Adminstatistiken
 * läser alltid Supabase — inget här får bli en förutsättning för den, eftersom
 * GTM blockeras av adblockers.
 *
 * Ingen PII: skicka aldrig e-post, användarnamn eller user_id hit in.
 */
export type AnalyticsEvent =
  | { event: "sign_up"; method: string }
  | { event: "login"; method: string }
  | { event: "create_spelbok" }
  | { event: "view_spelbok"; slug: string; is_owner: boolean }
  | { event: "create_bet"; sport: string; liga: string; odds: number; insats: number }
  | { event: "settle_bet"; outcome: "win" | "loss" | "void" | "push" }
  | { event: "rygga_spel"; source_slug: string }
  | { event: "affiliate_click"; bookmaker: string }
  | { event: "banner_impression"; banner_id: string; placement: string }
  | { event: "banner_click"; banner_id: string; placement: string }
  | { event: "push_subscribe" };

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/** Säker att kalla även när GTM inte är laddat — då växer bara arrayen. */
export function track(payload: AnalyticsEvent): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
}

export type SettleOutcome = Extract<
  AnalyticsEvent,
  { event: "settle_bet" }
>["outcome"];

/**
 * Appens BetResult är bredare än utfallen GA4 vill se. Halva vinster och
 * förluster räknas till sin huvudriktning; 'push' finns i katalogen men
 * skrivs aldrig till databasen (UI:t sparar push som 'void').
 */
const SETTLE_OUTCOMES: Partial<Record<BetResult, SettleOutcome>> = {
  win: "win",
  halfwin: "win",
  loss: "loss",
  halfloss: "loss",
  void: "void",
};

/** null = inget att spåra, t.ex. när en rättning ångras tillbaka till 'open'. */
export function settleOutcome(result: BetResult): SettleOutcome | null {
  return SETTLE_OUTCOMES[result] ?? null;
}
