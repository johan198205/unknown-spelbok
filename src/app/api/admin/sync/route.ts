import { NextResponse } from "next/server";
import { logAdmin } from "@/lib/admin/log";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const JOBS = ["sync-fixtures", "settle-results"] as const;
type Job = (typeof JOBS)[number];

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

/**
 * Triggar Edge Function sync-fixtures / settle-results via service role.
 * Next.js pratar aldrig med API-Sports — bara med Supabase Functions.
 */
export async function POST(request: Request) {
  const auth = await requireApiAdmin();
  if ("error" in auth) return auth.error;

  let body: { job?: unknown };
  try {
    body = (await request.json()) as { job?: unknown };
  } catch {
    body = {};
  }

  const job = (typeof body.job === "string" ? body.job : "sync-fixtures") as Job;
  if (!JOBS.includes(job)) {
    return NextResponse.json({ error: "Ogiltigt jobb" }, { status: 400 });
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) {
    return NextResponse.json(
      { error: "Supabase-nycklar saknas på servern" },
      { status: 500 }
    );
  }

  const res = await fetch(`${base}/functions/v1/${job}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: "{}",
    cache: "no-store",
  });

  const text = await res.text();
  let payload: unknown = text;
  try {
    payload = JSON.parse(text) as unknown;
  } catch {
    /* råtext */
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: "Edge Function misslyckades", status: res.status, payload },
      { status: 502 }
    );
  }

  await logAdmin("fixtures.synced", job, { job, payload });

  return NextResponse.json({ ok: true, job, payload });
}
