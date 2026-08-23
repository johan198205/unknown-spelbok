/**
 * Sanningskällan för bannerstatistik: en beacon till /api/banner-events som
 * skriver till Supabase. Helt fristående från dataLayer-pushen i
 * lib/analytics — blockeras GTM ska adminsiffrorna vara oförändrade.
 */

/** Databasens vokabulär. 'impression' accepteras av routen och normaliseras. */
export type BannerEvent = "view" | "click";

const ENDPOINT = "/api/banner-events";

export function sendBannerEvent(
  event: BannerEvent,
  bannerId: string,
  path: string
) {
  if (typeof window === "undefined") return;

  const body = JSON.stringify({ banner_id: bannerId, event, path });

  // sendBeacon överlever navigeringen som klicket startar. Returnerar false
  // när kön är full — då faller vi tillbaka på keepalive-fetch.
  try {
    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(ENDPOINT, blob)) return;
    }
  } catch {
    // Blob/sendBeacon saknas — fall igenom.
  }

  void fetch(ENDPOINT, {
    method: "POST",
    body,
    keepalive: true,
    headers: { "Content-Type": "application/json" },
  }).catch(() => undefined);
}
