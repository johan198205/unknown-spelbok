import { NextRequest, NextResponse } from "next/server";
import { teamLogoUrl } from "@/lib/logos";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;

const CACHE = { "Cache-Control": "private, max-age=60" };
const MAX_LIMIT = 150;
const DEFAULT_LIMIT = 80;
const WINDOW_DAYS = 14;
const UPCOMING = ["NS", "TBD", "1H", "HT", "2H", "ET", "BT", "P", "LIVE", "PST"];

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
 *   from/to  ISO-datum för kickoff (default: nu → +14 dagar)
 *   q        sök lag/liga (bet-formuläret)
 *   status   kort status (default: kommande/pågående)
 *   limit    max rader (default 80, max 150)
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
  const limit = Math.min(
    Number(params.get("limit") || DEFAULT_LIMIT) || DEFAULT_LIMIT,
    MAX_LIMIT
  );

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

  if (from || to) {
    if (from) query = query.gte("kickoff", from);
    if (to) query = query.lt("kickoff", to);
  } else {
    const start = new Date();
    const end = new Date(start.getTime() + WINDOW_DAYS * 24 * 60 * 60 * 1000);
    query = query
      .gte("kickoff", start.toISOString())
      .lt("kickoff", end.toISOString());
  }

  if (status) {
    query = query.eq("status", status);
  } else {
    query = query.in("status", UPCOMING);
  }

  if (q) {
    query = query.or(
      `home_name.ilike.%${q}%,away_name.ilike.%${q}%,league_name.ilike.%${q}%`
    );
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const fixtures = (data ?? []).map((row) => ({
    ...row,
    home_logo: teamLogoUrl(row.home_logo, row.home_team_id, row.sport),
    away_logo: teamLogoUrl(row.away_logo, row.away_team_id, row.sport),
  }));

  return NextResponse.json({ fixtures, source: "cache" }, { headers: CACHE });
}
