/**
 * Sanningskällan för popupstatistik: en beacon till /api/popup-events som
 * skriver till Supabase. Samma modell som lib/banner-events — helt
 * fristående från dataLayer, så adminsiffrorna står kvar även när GTM
 * blockeras.
 *
 * Routen skapar dessutom notisen i sidopanelen vid 'view'. Beaconen är
 * därför inte bara mätning: den är hur en visad popup blir läsbar historik.
 */

import type { PopupEvent } from "@/lib/popups";

const ENDPOINT = "/api/popup-events";

export function sendPopupEvent(
  event: PopupEvent,
  popupId: string,
  path: string
) {
  if (typeof window === "undefined") return;

  const body = JSON.stringify({ popup_id: popupId, event, path });

  // sendBeacon överlever navigeringen som ett knappklick startar.
  // Returnerar false när kön är full — då faller vi tillbaka på
  // keepalive-fetch.
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
