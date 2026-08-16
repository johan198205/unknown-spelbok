import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const CACHE_MINUTES = 10;

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() || "";
  const limit = Math.min(
    Number(request.nextUrl.searchParams.get("limit") || 20),
    50
  );

  async function loadFixtures() {
    const supabase = await createClient();
    let query = supabase
      .from("fixtures")
      .select("*")
      .order("kickoff", { ascending: true })
      .limit(limit);

    if (q) {
      query = query.or(
        `home_name.ilike.%${q}%,away_name.ilike.%${q}%,league_name.ilike.%${q}%`
      );
    } else {
      const from = new Date();
      from.setHours(0, 0, 0, 0);
      const to = new Date(from);
      to.setDate(to.getDate() + 7);
      query = query
        .gte("kickoff", from.toISOString())
        .lte("kickoff", to.toISOString());
    }

    return query;
  }

  const { data: cached } = await loadFixtures();
  const oldest =
    cached?.reduce((min, f) => {
      const t = +new Date(f.updated_at);
      return t < min ? t : min;
    }, Date.now()) ?? 0;

  const stale =
    !cached?.length || Date.now() - oldest > CACHE_MINUTES * 60 * 1000;

  if (stale && process.env.APIFOOTBALL_KEY) {
    try {
      await refreshFixtures();
      const { data: refreshed } = await loadFixtures();
      return NextResponse.json({ fixtures: refreshed || [], source: "api" });
    } catch (err) {
      console.error("fixtures refresh failed", err);
    }
  }

  return NextResponse.json({
    fixtures: cached || [],
    source: "cache",
  });
}

async function refreshFixtures() {
  const key = process.env.APIFOOTBALL_KEY!;
  const today = new Date();
  const date = today.toISOString().slice(0, 10);

  const res = await fetch(
    `https://v3.football.api-sports.io/fixtures?date=${date}`,
    {
      headers: {
        "x-apisports-key": key,
      },
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) {
    throw new Error(`API-Football ${res.status}`);
  }

  const json = await res.json();
  const rows = (json.response || []).map(
    (item: {
      fixture: { id: number; date: string; status: { short: string } };
      league: { id: number; name: string; logo: string };
      teams: {
        home: { id: number; name: string; logo: string };
        away: { id: number; name: string; logo: string };
      };
      goals: { home: number | null; away: number | null };
    }) => ({
      fixture_id: item.fixture.id,
      kickoff: item.fixture.date,
      status: item.fixture.status.short,
      sport: "Fotboll",
      league_id: item.league.id,
      league_name: item.league.name,
      league_logo: item.league.logo,
      home_team_id: item.teams.home.id,
      home_name: item.teams.home.name,
      home_logo: item.teams.home.logo,
      away_team_id: item.teams.away.id,
      away_name: item.teams.away.name,
      away_logo: item.teams.away.logo,
      home_score: item.goals.home,
      away_score: item.goals.away,
      updated_at: new Date().toISOString(),
    })
  );

  if (!rows.length) return;

  const admin = createAdminClient();
  const { error } = await admin.from("fixtures").upsert(rows, {
    onConflict: "fixture_id",
  });
  if (error) throw error;
}
