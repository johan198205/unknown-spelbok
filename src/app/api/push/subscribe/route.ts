import { NextResponse } from "next/server";
import { isHttpsUrl } from "@/lib/push";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/texts/server";

type PushBody = {
  endpoint?: unknown;
  keys?: {
    p256dh?: unknown;
    auth?: unknown;
  };
};

function parseEndpoint(value: unknown) {
  if (typeof value !== "string" || !isHttpsUrl(value)) return null;
  return value;
}

export async function POST(request: Request) {
  const [supabase, t] = await Promise.all([createClient(), getT()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: t("notiser.api.notSignedIn") }, { status: 401 });
  }

  let body: PushBody;
  try {
    body = (await request.json()) as PushBody;
  } catch {
    return NextResponse.json({ error: t("notiser.api.invalidJson") }, { status: 400 });
  }

  const endpoint = parseEndpoint(body.endpoint);
  const p256dh =
    typeof body.keys?.p256dh === "string" ? body.keys.p256dh : "";
  const auth = typeof body.keys?.auth === "string" ? body.keys.auth : "";

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json(
      { error: t("notiser.api.invalidSubscription") },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint,
        keys_p256dh: p256dh,
        keys_auth: auth,
        user_agent: request.headers.get("user-agent"),
      },
      { onConflict: "endpoint" }
    )
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data?.id) {
    return NextResponse.json(
      { error: t("notiser.api.subscriptionNotSaved") },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, id: data.id });
}

export async function DELETE(request: Request) {
  const [supabase, t] = await Promise.all([createClient(), getT()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: t("notiser.api.notSignedIn") }, { status: 401 });
  }

  let body: { endpoint?: unknown };
  try {
    body = (await request.json()) as { endpoint?: unknown };
  } catch {
    return NextResponse.json({ error: t("notiser.api.invalidJson") }, { status: 400 });
  }

  const endpoint = parseEndpoint(body.endpoint);
  if (!endpoint) {
    return NextResponse.json({ error: t("notiser.api.invalidEndpoint") }, { status: 400 });
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
