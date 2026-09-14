/**
 * Kontaktformulär — topic → inkorg och mejl via Resend (valfritt).
 *
 * Utan RESEND_API_KEY sparas raden i contact_messages ändå; mejlet loggas
 * som misslyckat så supporten kan läsa i admin/DB.
 */

import type { ContactTopic } from "@/lib/contact";

export const TOPIC_INBOX: Record<ContactTopic, string> = {
  Support: "hej@spelbok.se",
  "Konto och data": "hej@spelbok.se",
  Spelbolagslistan: "hej@spelbok.se",
  Annonsering: "partner@spelbok.se",
  Press: "press@spelbok.se",
  Annat: "hej@spelbok.se",
};

const FROM =
  process.env.CONTACT_FROM_EMAIL || "Spelbok <noreply@spelbok.se>";

export async function sendContactEmails(input: {
  name: string;
  email: string;
  topic: ContactTopic;
  message: string;
}): Promise<{ ok: boolean; reason?: string }> {
  const to = TOPIC_INBOX[input.topic];
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn(
      "[contact] RESEND_API_KEY saknas — meddelandet sparades men mejl skickades inte."
    );
    return { ok: false, reason: "missing_api_key" };
  }

  const subject = `[Spelbok · ${input.topic}] Meddelande från ${input.name}`;
  const text = [
    `Namn: ${input.name}`,
    `E-post: ${input.email}`,
    `Ärende: ${input.topic}`,
    "",
    input.message,
  ].join("\n");

  const copyText = [
    "Tack för ditt meddelande till Spelbok.",
    "Vi svarar inom 24 timmar på vardagar.",
    "",
    "— Din kopia —",
    "",
    text,
  ].join("\n");

  try {
    const [inbox, copy] = await Promise.all([
      resendSend({
        apiKey: key,
        from: FROM,
        to: [to],
        replyTo: input.email,
        subject,
        text,
      }),
      resendSend({
        apiKey: key,
        from: FROM,
        to: [input.email],
        subject: `Kopia: ${subject}`,
        text: copyText,
      }),
    ]);

    if (!inbox.ok || !copy.ok) {
      return {
        ok: false,
        reason: inbox.error || copy.error || "send_failed",
      };
    }
    return { ok: true };
  } catch (err) {
    console.error("[contact] mail failed", err);
    return { ok: false, reason: "send_failed" };
  }
}

async function resendSend(opts: {
  apiKey: string;
  from: string;
  to: string[];
  subject: string;
  text: string;
  replyTo?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: opts.from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[contact] resend", res.status, body);
    return { ok: false, error: `resend_${res.status}` };
  }
  return { ok: true };
}
