import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stockholmYmd } from "@/lib/stockholm";
import { SUGGESTION_COLUMNS, normalizeSuggestion } from "@/lib/suggestions";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Dagens förslag för den inloggade användaren.
 *
 * RLS sköter filtreringen på user_id — routen behöver bara datumet och
 * dismissed-filtret. Aldrig cachad: clicked/dismissed ändras under sidans
 * livstid och en delad cache skulle läcka mellan konton.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }

  // ?sheet=<id> ger spelbokens egna förslag; utan parametern kontots.
  const sheet = request.nextUrl.searchParams.get("sheet");
  if (sheet && !UUID.test(sheet)) {
    return NextResponse.json({ error: "Ogiltigt sheet-id" }, { status: 400 });
  }

  let query = supabase
    .from("daily_suggestions")
    .select(SUGGESTION_COLUMNS)
    .eq("suggestion_date", stockholmYmd())
    .eq("dismissed", false);

  query = sheet ? query.eq("sheet_id", sheet) : query.is("sheet_id", null);

  const { data, error } = await query
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
