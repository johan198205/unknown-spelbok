import { NextResponse } from "next/server";
import { notifyGoals, notifySettledBets } from "@/lib/send-push";

export const runtime = "nodejs";

function authorized(request: Request) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return false;
  const header = request.headers.get("authorization") || "";
  return header === `Bearer ${key}`;
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

