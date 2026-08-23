import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stockholmDayBounds, stockholmYmd } from "@/lib/stockholm";
import { parseReasons } from "@/lib/suggestions";
import {
  DAILY_AI_LIMIT,
  generateAiReason,
  type AiReasonInput,
} from "@/lib/ai-reason";

export const runtime = "nodejs";
export const maxDuration = 30;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ProfileSegment = {
  league_name: string;
  bet_type: string;
  bets: number;
  hitrate: number | string | null;
  roi: number | string | null;
  avg_odds: number | string | null;
  established: boolean;
};

function num(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Genererar en AI-motivering för ett förslag — endast på användarens
 * begäran, aldrig automatiskt.
 *
 * Flöde: äga förslaget → gäller idag → cache → rate limit → generera →
 * spara. Går något fel efter cachekollen sparas ingenting.
 */
export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Ogiltigt id" }, { status: 400 });
  }

  const user = await requireUser();
  const supabase = await createClient();

  // RLS begränsar redan till egna rader; eq() gör att någon annans id ger
  // 404 i stället för en tom rad.
  const { data: suggestion, error } = await supabase
    .from("daily_suggestions")
    .select(
      "id, suggestion_date, sport, league_id, league_name, home_team, away_team, kickoff, suggested_bet_type, match_score, reasons, ai_reason"
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!suggestion) {
    return NextResponse.json({ error: "Hittades inte" }, { status: 404 });
  }
  if (suggestion.suggestion_date !== stockholmYmd()) {
    return NextResponse.json(
      { error: "Förslaget gäller inte idag" },
      { status: 400 }
    );
  }

  // Cache: generera aldrig om. Texten ska vara stabil, och en andra
  // generering hade dessutom dragit av kvoten utan att ge något nytt.
  if (suggestion.ai_reason) {
    return NextResponse.json({ reason: suggestion.ai_reason, cached: true });
  }

  const { from, to } = stockholmDayBounds(stockholmYmd());
  const { count } = await supabase
    .from("ai_generation_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", from)
    .lt("created_at", to);

  if ((count ?? 0) >= DAILY_AI_LIMIT) {
    return NextResponse.json(
      {
        error: `Dagens AI-analyser är slut (${DAILY_AI_LIMIT}/dag)`,
        limit: DAILY_AI_LIMIT,
      },
      { status: 429 }
    );
  }

  // Bara segmentets aggregat går ut — aldrig hela spelhistoriken.
  const { data: profileRows } = await supabase.rpc(
    "get_user_betting_profile",
    { p_user_id: user.id }
  );

  const segments = ((profileRows ?? []) as ProfileSegment[])
    .filter(
      (row) =>
        row.established &&
        row.league_name.trim().toLowerCase() ===
          suggestion.league_name.trim().toLowerCase()
    )
    .slice(0, 5)
    .map((row) => ({
      liga: row.league_name,
      spelform: row.bet_type,
      antal_spel: row.bets,
      hitrate: num(row.hitrate),
      roi: num(row.roi),
      snittodds: num(row.avg_odds),
    }));

  const input: AiReasonInput = {
    fixture: {
      sport: suggestion.sport === "hockey" ? "Ishockey" : "Fotboll",
      league: suggestion.league_name,
      home: suggestion.home_team,
      away: suggestion.away_team,
      kickoff: suggestion.kickoff,
    },
    suggestedBetType: suggestion.suggested_bet_type,
    matchScore: Number(suggestion.match_score),
    reasons: parseReasons(suggestion.reasons),
    segments,
  };

  let reason: string;
  try {
    reason = await generateAiReason(input);
  } catch (err) {
    // Generiskt utåt: modellfel, timeout och kasserad text ska inte gå att
    // skilja åt från klienten.
    console.warn(
      "ai-reason:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json(
      { error: "Kunde inte generera just nu" },
      { status: 502 }
    );
  }

  const admin = createAdminClient();
  const generatedAt = new Date().toISOString();

  const { error: saveError } = await admin
    .from("daily_suggestions")
    .update({ ai_reason: reason, ai_generated_at: generatedAt })
    .eq("id", id)
    .eq("user_id", user.id);

  if (saveError) {
    return NextResponse.json({ error: saveError.message }, { status: 500 });
  }

  // Loggen skrivs efter sparningen: kvoten ska dras för texter användaren
  // faktiskt fick, inte för anrop som föll på ordfiltret.
  const { error: logError } = await admin
    .from("ai_generation_log")
    .insert({ user_id: user.id, suggestion_id: id });
  if (logError) {
    console.warn("ai-reason: kunde inte logga förbrukning", logError.message);
  }

  return NextResponse.json({ reason, cached: false });
}
