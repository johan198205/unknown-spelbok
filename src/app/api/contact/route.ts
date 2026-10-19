import { NextRequest, NextResponse } from "next/server";
import { CONTACT_TOPICS, type ContactTopic } from "@/lib/contact";
import { sendContactEmails } from "@/lib/contact-mail";
import { rateLimit } from "@/lib/import/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { getT } from "@/lib/texts/server";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MSG = 2000;

function clientIp(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: NextRequest) {
  const t = await getT();
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: t("kontakt.errors.badRequest") }, { status: 400 });
  }

  const body = (payload ?? {}) as Record<string, unknown>;

  // Honeypot — botar fyller ofta "website". Tyst 200 så de inte retry:ar.
  if (typeof body.website === "string" && body.website.trim()) {
    return NextResponse.json({ ok: true });
  }

  const ip = clientIp(request);
  const limit = rateLimit(`contact:${ip}`, 5, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: t("kontakt.errors.rateLimit") },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfter) },
      }
    );
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const topicRaw = typeof body.topic === "string" ? body.topic : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const consent = body.consent === true;

  if (!name || !email) {
    return NextResponse.json(
      { error: t("kontakt.errors.nameEmail") },
      { status: 400 }
    );
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: t("kontakt.errors.email") },
      { status: 400 }
    );
  }
  if (!CONTACT_TOPICS.includes(topicRaw as ContactTopic)) {
    return NextResponse.json({ error: t("kontakt.errors.topic") }, { status: 400 });
  }
  const topic = topicRaw as ContactTopic;
  if (!message) {
    return NextResponse.json(
      { error: t("kontakt.errors.message") },
      { status: 400 }
    );
  }
  if (message.length > MAX_MSG) {
    return NextResponse.json(
      { error: t("kontakt.errors.tooLong") },
      { status: 400 }
    );
  }
  if (!consent) {
    return NextResponse.json(
      {
        error: t("kontakt.errors.consent"),
      },
      { status: 400 }
    );
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("contact_messages").insert({
      name: name.slice(0, 200),
      email: email.slice(0, 320),
      topic,
      message,
    });
    if (error) {
      console.error("[contact] insert failed", error.message);
      return NextResponse.json(
        { error: t("kontakt.errors.saveFailed") },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("[contact] admin client", err);
    return NextResponse.json(
      { error: t("kontakt.errors.saveFailed") },
      { status: 500 }
    );
  }

  // Mejl är best-effort — raden finns redan. Misslyckat mejl ska inte
  // få användaren att skicka igen och skapa dubbletter.
  await sendContactEmails({ name, email, topic, message });

  return NextResponse.json({ ok: true });
}
