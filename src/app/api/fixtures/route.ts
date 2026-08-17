import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;

const CACHE = { "Cache-Control": "private, max-age=60" };
const MAX_LIMIT = 100;

function sanitizeIlike(raw: string) {
  return raw.replace(/[%_,()\\]/g, " ").trim().slice(0, 80);
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "Ej inloggad" }, { status: 401 }),
    };
  }
  return { supabase };
}

/**
 * Läser fixtures-cachen i Supabase. Anropar aldrig API-Sports.
 * Synk sker i Edge Function `sync-fixtures`.
 *
 * Query:
 *   league   league_id (t.ex. 113)
 *   from/to  ISO-datum för kickoff
 *   q        sök lag/liga (bet-formuläret)
 *   status   kort status (NS, FT, …)
 *   limit    max rader (default 50, max 100)
 */
export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const params = request.nextUrl.searchParams;
  const league = params.get("league");
  const from = params.get("from");
  const to = params.get("to");
  const status = params.get("status");
  const q = sanitizeIlike(params.get("q") ?? "");
  const limit = Math.min(Number(params.get("limit") || 50) || 50, MAX_LIMIT);

  let query = auth.supabase
    .from("fixtures")
    .select(
      "fixture_id, kickoff, status, sport, league_id, league_name, league_logo, home_team_id, home_name, home_logo, away_team_id, away_name, away_logo, home_score, away_score, season, updated_at"
    )
    .order("kickoff", { ascending: true })
    .limit(limit);

  if (league) {
    const id = Number(league);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Ogiltig league" }, { status: 400 });
    }
    query = query.eq("league_id", id);
  }

  if (from) query = query.gte("kickoff", from);
  if (to) query = query.lte("kickoff", to);
  if (status) query = query.eq("status", status);

  if (q) {
    query = query.or(
      `home_name.ilike.%${q}%,away_name.ilike.%${q}%,league_name.ilike.%${q}%`
    );
  } else if (!from && !to) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    query = query
      .gte("kickoff", start.toISOString())
      .lte("kickoff", end.toISOString());
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { fixtures: data ?? [], source: "cache" },
    { headers: CACHE }
  );
}
