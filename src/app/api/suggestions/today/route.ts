import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stockholmYmd } from "@/lib/stockholm";
import { SUGGESTION_COLUMNS, normalizeSuggestion } from "@/lib/suggestions";

export const runtime = "nodejs";

/**
 * Dagens förslag för den inloggade användaren.
 *
 * RLS sköter filtreringen på user_id — routen behöver bara datumet och
 * dismissed-filtret. Aldrig cachad: clicked/dismissed ändras under sidans
 * livstid och en delad cache skulle läcka mellan konton.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("daily_suggestions")
    .select(SUGGESTION_COLUMNS)
    .eq("suggestion_date", stockholmYmd())
    .eq("dismissed", false)
    .order("match_score", { ascending: false })
    .order("kickoff", { ascending: true });

  if (error) {
    // Tabellen kan saknas innan migrationen körts — sektionen ska då bara
    // utebli, inte välta dashboarden.
    console.warn("suggestions/today", error.message);
    return NextResponse.json(
      { suggestions: [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    { suggestions: (data ?? []).map(normalizeSuggestion) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
