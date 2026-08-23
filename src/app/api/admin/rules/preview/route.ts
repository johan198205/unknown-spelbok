import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/admin/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { evaluateRule, type SignalMetrics } from "@/lib/signals/evaluate";
import { fieldErrors, previewRuleSchema } from "@/lib/signals/schema";
import { stockholmYmd } from "@/lib/stockholm";

export const runtime = "nodejs";

const MAX_HITS = 25;

type SignalRow = {
  fixture_id: number;
  sport: string;
  metrics: SignalMetrics;
  home_matches_played: number;
  away_matches_played: number;
};

type FixtureRow = {
  fixture_id: number;
  home_name: string | null;
  away_name: string | null;
  league_name: string | null;
  kickoff: string;
};

/**
 * Evaluerar en regel mot dagens beräknade signaler utan att spara något.
 *
 * Poängen är att svara på "varför träffar den inte?" innan regeln aktiveras.
 * Därför returneras varje villkor med sitt faktiska värde, inte bara ett
 * ja/nej per match — ett villkor som missar med marginal och ett som missar
 * på tredje decimalen kräver helt olika åtgärder.
 */
export async function POST(request: Request) {
  const auth = await requireApiAdmin();
  if ("error" in auth) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 });
  }

  const parsed = previewRuleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Valideringsfel", fields: fieldErrors(parsed.error) },
      { status: 422 }
    );
  }
  const rule = parsed.data;

  const admin = createAdminClient();
  const ymd = stockholmYmd();

  const { data: signalRows, error } = await admin
    .from("fixture_signals")
    .select("fixture_id, sport, metrics, home_matches_played, away_matches_played")
    .eq("signal_date", ymd)
    .eq("sport", rule.sport);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const signals = (signalRows ?? []) as SignalRow[];
  if (!signals.length) {
    // Tomt är inte ett fel — cron kanske inte kört, eller så har ingen
    // användare historik i någon liga som spelar idag.
    return NextResponse.json({
      date: ymd,
      total: 0,
      hits: 0,
      matches: [],
      empty: true,
    });
  }

  const { data: fixtureRows } = await admin
    .from("fixtures")
    .select("fixture_id, home_name, away_name, league_name, kickoff")
    .in("fixture_id", signals.map((s) => s.fixture_id));

  const fixtures = new Map(
    ((fixtureRows ?? []) as FixtureRow[]).map((f) => [f.fixture_id, f])
  );

  const evaluated = signals.map((signal) => {
    const result = evaluateRule(
      rule,
      signal.metrics ?? {},
      signal.home_matches_played,
      signal.away_matches_played
    );
    const fixture = fixtures.get(signal.fixture_id);
    return {
      fixture_id: signal.fixture_id,
      match: fixture
        ? `${fixture.home_name ?? "?"} – ${fixture.away_name ?? "?"}`
        : String(signal.fixture_id),
      league: fixture?.league_name ?? null,
      kickoff: fixture?.kickoff ?? null,
      home_matches_played: signal.home_matches_played,
      away_matches_played: signal.away_matches_played,
      hit: result.hit,
      skipped: result.skipped ?? null,
      label: result.label ?? null,
      conditions: result.conditions,
    };
  });

  // Träffar först, sedan de som var närmast — en match där bara ett villkor
  // missar säger mer om tröskeln än en som missar allt.
  evaluated.sort((a, b) => {
    if (a.hit !== b.hit) return a.hit ? -1 : 1;
    const missA = a.conditions.filter((c) => !c.hit).length;
    const missB = b.conditions.filter((c) => !c.hit).length;
    return missA - missB;
  });

  return NextResponse.json({
    date: ymd,
    total: evaluated.length,
    hits: evaluated.filter((m) => m.hit).length,
    matches: evaluated.slice(0, MAX_HITS),
    truncated: evaluated.length > MAX_HITS,
  });
}
