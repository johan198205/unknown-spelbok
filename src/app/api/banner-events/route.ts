import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Tar emot beacons från BannerLink (visning + klick). Anropas från publika
 * sidor, så ingen inloggning krävs — men sessionskakan följer med på
 * same-origin-beacons, vilket låter oss stämpla user_id när den finns.
 *
 * Håll handlern minimal: den anropas en gång per banner och sidvisning.
 */

const EVENTS: Record<string, "view" | "click"> = {
  view: "view",
  impression: "view",
  click: "click",
};

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
  const bannerId = typeof body.banner_id === "string" ? body.banner_id : "";
  const rawEvent =
    typeof body.event === "string"
      ? body.event
      : typeof body.event_type === "string"
        ? body.event_type
        : "";
  const event = EVENTS[rawEvent];
  const path = typeof body.path === "string" ? body.path.slice(0, 512) : null;

  if (!UUID.test(bannerId) || !event) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("banner_events").insert({
    banner_id: bannerId,
    event,
    path,
    user_id: user?.id ?? null,
  });

  // Beaconen läser aldrig svaret — logga i stället så felet syns i Vercel.
  if (error) console.error("banner-events insert failed", error.message);

  return new NextResponse(null, { status: 204 });
}
