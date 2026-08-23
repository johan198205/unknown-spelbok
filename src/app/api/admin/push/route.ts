import { NextResponse } from "next/server";
import { sendNotification, setVapidDetails, WebPushError } from "web-push";
import { chunkArray, normalizePushPath } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { PushSubscriptionRow } from "@/lib/types";

export const runtime = "nodejs";

const TITLE_MAX = 60;
const BODY_MAX = 160;
const BATCH_SIZE = 100;
const PAGE_SIZE = 1000;

async function requireApiAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Ej inloggad" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return {
      error: NextResponse.json({ error: "Förbjudet" }, { status: 403 }),
    };
  }

  return { user };
}

async function loadSubscriptions(admin: ReturnType<typeof createAdminClient>) {
  const rows: PushSubscriptionRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await admin
      .from("push_subscriptions")
      .select("*")
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data?.length) break;

    rows.push(...(data as PushSubscriptionRow[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  // En endpoint = en enhet. Dubbletter i tabellen ger annars flera identiska
  // notiser på samma telefon.
  const byEndpoint = new Map<string, PushSubscriptionRow>();
  for (const row of rows) {
    if (!byEndpoint.has(row.endpoint)) byEndpoint.set(row.endpoint, row);
  }
  return [...byEndpoint.values()];
}

export async function GET() {
  const auth = await requireApiAdmin();
  if ("error" in auth) return auth.error;

  const admin = createAdminClient();
  const { count, error } = await admin
    .from("push_subscriptions")
    .select("*", { count: "exact", head: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ count: count ?? 0 });
}

export async function POST(request: Request) {
  const auth = await requireApiAdmin();
  if ("error" in auth) return auth.error;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@spelbok.se";

  if (!publicKey || !privateKey) {
    return NextResponse.json(
      { error: "VAPID-nycklar saknas på servern" },
      { status: 500 }
    );
  }

  let body: { title?: unknown; body?: unknown; url?: unknown };
  try {
    body = (await request.json()) as {
      title?: unknown;
      body?: unknown;
      url?: unknown;
    };
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const message = typeof body.body === "string" ? body.body.trim() : "";
  const url = normalizePushPath(body.url);

  if (!title || title.length > TITLE_MAX) {
    return NextResponse.json(
      { error: `Rubrik krävs (max ${TITLE_MAX} tecken)` },
      { status: 400 }
    );
  }
  if (!message || message.length > BODY_MAX) {
    return NextResponse.json(
      { error: `Meddelande krävs (max ${BODY_MAX} tecken)` },
      { status: 400 }
    );
  }
  if (!url) {
    return NextResponse.json(
      { error: "Länken måste vara en relativ sökväg, t.ex. /tavlingar" },
      { status: 400 }
    );
  }

  setVapidDetails(subject, publicKey, privateKey);

  const admin = createAdminClient();
  let subscriptions: PushSubscriptionRow[];
  try {
    subscriptions = await loadSubscriptions(admin);
  } catch (err) {
    const messageText =
      err instanceof Error ? err.message : "Kunde inte läsa prenumerationer";
    return NextResponse.json({ error: messageText }, { status: 500 });
  }

  const payload = JSON.stringify({ title, body: message, url });
  let sent = 0;
  let failed = 0;
  const staleEndpoints: string[] = [];

  for (const batch of chunkArray(subscriptions, BATCH_SIZE)) {
    const results = await Promise.allSettled(
      batch.map((row) =>
        sendNotification(
          {
            endpoint: row.endpoint,
            keys: {
              p256dh: row.keys_p256dh,
              auth: row.keys_auth,
            },
          },
          payload
        )
      )
    );

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        sent += 1;
        return;
      }

      const err = result.reason;
      const statusCode =
        err instanceof WebPushError
          ? err.statusCode
          : typeof err === "object" &&
              err &&
              "statusCode" in err &&
              typeof (err as { statusCode: unknown }).statusCode === "number"
            ? (err as { statusCode: number }).statusCode
            : undefined;
      if (statusCode === 404 || statusCode === 410) {
        staleEndpoints.push(batch[index].endpoint);
        return;
      }
      failed += 1;
    });
  }

  let removed = 0;
  if (staleEndpoints.length) {
    const { error, count } = await admin
      .from("push_subscriptions")
      .delete({ count: "exact" })
      .in("endpoint", staleEndpoints);
    if (!error) removed = count ?? staleEndpoints.length;
  }

  return NextResponse.json({ sent, failed, removed });
}
