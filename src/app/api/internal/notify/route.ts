import { NextResponse } from "next/server";
import { notifyGoals, notifySettledBets } from "@/lib/send-push";

export const runtime = "nodejs";

/**
 * Anropas av Edge Functions (poll-live / settle-results) via site-notify.ts.
 *
 * Godtar INTERNAL_NOTIFY_SECRET i första hand. Service role-nyckeln finns
 * kvar som fallback, men duger inte ensam: Supabase injicerar sin egen
 * SUPABASE_SERVICE_ROLE_KEY i Edge Functions, och på projekt med nya
 * nyckelsystemet är den inte samma sträng som Vercel har.
 */
function authorized(request: Request) {
  const header = request.headers.get("authorization") || "";
  const accepted = [
    process.env.INTERNAL_NOTIFY_SECRET,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  ].filter((k): k is string => !!k);

  if (!accepted.length) {
    console.error("notify: varken INTERNAL_NOTIFY_SECRET eller service role satt");
    return false;
  }
  const ok = accepted.some((key) => header === `Bearer ${key}`);
  if (!ok) console.warn("notify: avvisade anrop med fel nyckel");
  return ok;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Förbjudet" }, { status: 403 });
  }

  let body: {
    kind?: unknown;
    betIds?: unknown;
    fixtureId?: unknown;
    homeName?: unknown;
    awayName?: unknown;
    homeScore?: unknown;
    awayScore?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 });
  }

  try {
    if (body.kind === "goal") {
      const fixtureId = Number(body.fixtureId);
      if (!Number.isFinite(fixtureId) || fixtureId <= 0) {
        return NextResponse.json({ error: "Ogiltig match" }, { status: 400 });
      }
      await notifyGoals({
        fixtureId,
        homeName: typeof body.homeName === "string" ? body.homeName : "Hemma",
        awayName: typeof body.awayName === "string" ? body.awayName : "Borta",
        homeScore: Number(body.homeScore) || 0,
        awayScore: Number(body.awayScore) || 0,
      });
      return NextResponse.json({ ok: true });
    }

    const betIds = Array.isArray(body.betIds)
      ? body.betIds.filter((id): id is string => typeof id === "string")
      : [];
    if (!betIds.length) {
      return NextResponse.json({ ok: true, skipped: true });
    }
    await notifySettledBets(betIds);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kunde inte skicka";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

