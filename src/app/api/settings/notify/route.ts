import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function missingColumn(message: string) {
  const text = message.toLowerCase();
  return (
    text.includes("notify_settle") ||
    text.includes("schema cache") ||
    text.includes("could not find")
  );
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }

  const [{ data: profile, error: profileError }, { count, error: pushError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("notify_settle")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("push_subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

  if (profileError) {
    return NextResponse.json(
      {
        error: missingColumn(profileError.message)
          ? "Kör SQL-filen notify-settings i Supabase först."
          : profileError.message,
      },
      { status: missingColumn(profileError.message) ? 409 : 500 }
    );
  }

  if (pushError) {
    return NextResponse.json({ error: pushError.message }, { status: 500 });
  }

  return NextResponse.json({
    notify_settle: profile?.notify_settle !== false,
    persisted: typeof profile?.notify_settle === "boolean",
    push_subscribed: (count ?? 0) > 0,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }

  let body: { notify_settle?: unknown };
  try {
    body = (await request.json()) as { notify_settle?: unknown };
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 });
  }

  if (typeof body.notify_settle !== "boolean") {
    return NextResponse.json({ error: "Ogiltigt värde" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ notify_settle: body.notify_settle })
    .eq("id", user.id)
    .select("notify_settle")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        error: missingColumn(error.message)
          ? "Kör SQL-filen notify-settings i Supabase först."
          : error.message,
      },
      { status: missingColumn(error.message) ? 409 : 500 }
    );
  }

  if (!data || data.notify_settle !== body.notify_settle) {
    return NextResponse.json(
      { error: "Värdet skrevs inte till databasen." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    notify_settle: data.notify_settle,
    persisted: true,
  });
}
