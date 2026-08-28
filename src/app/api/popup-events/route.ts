import { NextRequest, NextResponse } from "next/server";
import { recordPopupNotification } from "@/lib/notify-events";
import { POPUP_COLUMNS, type Popup } from "@/lib/popups";
import { createClient } from "@/lib/supabase/server";

/**
 * Tar emot beacons från PopupRenderer (visning, klick, stängning).
 * Anropas från publika sidor, så ingen inloggning krävs — men
 * sessionskakan följer med på same-origin-beacons, vilket låter oss
 * stämpla user_id när den finns.
 *
 * Vid 'view' gör routen två saker, i den ordningen:
 *   1. loggar händelsen (statistik i /admin/popups)
 *   2. skapar notisen i sidopanelen, om popupen har notify = true och
 *      besökaren är inloggad
 *
 * Steg 2 läser popupen från databasen i stället för att lita på det
 * klienten skickar: rubrik, text och länk i en notis får aldrig komma
 * från en payload vem som helst kan posta.
 */

export const runtime = "nodejs";

const EVENTS = new Set(["view", "click", "dismiss"]);

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const body = (payload ?? {}) as Record<string, unknown>;
  const popupId = typeof body.popup_id === "string" ? body.popup_id : "";
  const rawEvent = typeof body.event === "string" ? body.event : "";
  const path = typeof body.path === "string" ? body.path.slice(0, 512) : null;

  if (!UUID.test(popupId) || !EVENTS.has(rawEvent)) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  const event = rawEvent as "view" | "click" | "dismiss";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("popup_events").insert({
    popup_id: popupId,
    event,
    path,
    user_id: user?.id ?? null,
  });

  // Beaconen läser aldrig svaret — logga i stället så felet syns i Vercel.
  if (error) console.error("popup-events insert failed", error.message);

  if (event === "view" && user) {
    // RLS släpper igenom aktiva rader för alla, så vanliga klienten räcker.
    const { data: popup } = await supabase
      .from("popups")
      .select(POPUP_COLUMNS)
      .eq("id", popupId)
      .maybeSingle();

    const row = popup as unknown as Popup | null;
    if (row?.notify) {
      try {
        await recordPopupNotification({
          userId: user.id,
          popupId: row.id,
          title: row.title,
          body: row.body,
          href: row.button_url?.trim() || null,
        });
      } catch (err) {
        // En trasig notis får aldrig se ut som en trasig popup för
        // besökaren — rutan är redan på skärmen när beaconen går.
        console.error(
          "popup-events: kunde inte skapa notis",
          err instanceof Error ? err.message : err
        );
      }
    }
  }

  return new NextResponse(null, { status: 204 });
}
