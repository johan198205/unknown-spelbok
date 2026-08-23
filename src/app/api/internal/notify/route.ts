import { NextResponse } from "next/server";
import {
  notifyDailySuggestions,
  notifyFulltime,
  notifyGoals,
  notifySettledBets,
  notifySettleReminders,
  type FinishedMatch,
} from "@/lib/send-push";

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

function parseMatches(value: unknown): FinishedMatch[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const m = row as Record<string, unknown>;
    const fixtureId = Number(m.fixtureId);
    if (!Number.isFinite(fixtureId) || fixtureId <= 0) return [];
    return [
      {
        fixtureId,
        homeName: typeof m.homeName === "string" ? m.homeName : "Hemma",
        awayName: typeof m.awayName === "string" ? m.awayName : "Borta",
        homeScore: Number(m.homeScore) || 0,
        awayScore: Number(m.awayScore) || 0,
      },
    ];
  });
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Förbjudet" }, { status: 403 });
  }

  let body: {
    kind?: unknown;
    betIds?: unknown;
    fixtureId?: unknown;
    teamId?: unknown;
    elapsed?: unknown;
    homeName?: unknown;
    awayName?: unknown;
    homeScore?: unknown;
    awayScore?: unknown;
    matches?: unknown;
    users?: unknown;
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
        teamId: Number.isFinite(Number(body.teamId))
          ? Number(body.teamId)
          : null,
        elapsed: Number.isFinite(Number(body.elapsed))
          ? Number(body.elapsed)
          : null,
        homeName: typeof body.homeName === "string" ? body.homeName : "Hemma",
        awayName: typeof body.awayName === "string" ? body.awayName : "Borta",
        homeScore: Number(body.homeScore) || 0,
        awayScore: Number(body.awayScore) || 0,
      });
      return NextResponse.json({ ok: true });
    }

    if (body.kind === "fulltime" || body.kind === "settle-reminder") {
      const matches = parseMatches(body.matches);
      if (!matches.length) {
        return NextResponse.json({ ok: true, skipped: true });
      }
      if (body.kind === "fulltime") {
        await notifyFulltime(matches);
      } else {
        await notifySettleReminders(matches);
      }
      return NextResponse.json({ ok: true, matches: matches.length });
    }

    if (body.kind === "suggestions") {
      const entries = Array.isArray(body.users)
        ? body.users.flatMap((row) => {
            if (!row || typeof row !== "object") return [];
            const { userId, count } = row as Record<string, unknown>;
            const n = Number(count);
            if (typeof userId !== "string" || !Number.isFinite(n) || n <= 0) {
              return [];
            }
            return [{ userId, count: Math.round(n) }];
          })
        : [];
      if (!entries.length) {
        return NextResponse.json({ ok: true, skipped: true });
      }
      await notifyDailySuggestions(entries);
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

