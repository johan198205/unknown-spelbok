import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;

const CACHE = { "Cache-Control": "private, max-age=60" };

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
 * Läser lag ur Supabase-cachen. Anropar aldrig API-Sports.
 * Lag fylls av Edge Function `sync-fixtures` (en gång per säsong).
 *
 * Query: league (obligatorisk, t.ex. 113), season, sport
 */
export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const params = request.nextUrl.searchParams;
  const leagueRaw = params.get("league");
  const seasonRaw = params.get("season");
  const sport = params.get("sport") || "football";

  if (!leagueRaw) {
    return NextResponse.json(
      { error: "Parametern league krävs" },
      { status: 400 }
    );
  }

  const leagueId = Number(leagueRaw);
  if (!Number.isFinite(leagueId)) {
    return NextResponse.json({ error: "Ogiltig league" }, { status: 400 });
  }

  let membership = auth.supabase
    .from("team_leagues")
    .select("team_id")
    .eq("league_id", leagueId)
    .eq("sport", sport);

  if (seasonRaw) {
    const season = Number(seasonRaw);
    if (!Number.isFinite(season)) {
      return NextResponse.json({ error: "Ogiltig season" }, { status: 400 });
    }
    membership = membership.eq("season", season);
  }

  const { data: links, error: linkError } = await membership;
  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  const ids = [...new Set((links ?? []).map((row) => row.team_id as number))];
  if (!ids.length) {
    return NextResponse.json({ teams: [] }, { headers: CACHE });
  }

  const { data: teams, error } = await auth.supabase
    .from("teams")
    .select("id, sport, name, logo_url, updated_at")
    .eq("sport", sport)
    .in("id", ids)
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ teams: teams ?? [] }, { headers: CACHE });
}
