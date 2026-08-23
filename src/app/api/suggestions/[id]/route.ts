import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Uppföljningen: sätter clicked/dismissed på ett eget förslag.
 *
 * Bara de två fälten går att skriva. RLS-policyn "Users update own
 * suggestions" gör resten — eq() på user_id är bälte och hängslen, men
 * gör också att någon annans id ger 404 i stället för tyst 0 rader.
 */
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Ogiltigt id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }

  let body: { clicked?: unknown; dismissed?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 });
  }

  const patch: { clicked?: boolean; dismissed?: boolean } = {};
  if (typeof body.clicked === "boolean") patch.clicked = body.clicked;
  if (typeof body.dismissed === "boolean") patch.dismissed = body.dismissed;

  if (!Object.keys(patch).length) {
    return NextResponse.json(
      { error: "Ange clicked eller dismissed" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("daily_suggestions")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, clicked, dismissed")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Hittades inte" }, { status: 404 });
  }

  return NextResponse.json(data);
}
