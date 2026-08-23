import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  fetchSheetStatsBundle,
  isStatsPeriod,
  type StatsPeriod,
} from "@/lib/bet-stats";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }

  const sheetId = request.nextUrl.searchParams.get("sheetId");
  const periodRaw = request.nextUrl.searchParams.get("period") || "all";
  if (!sheetId) {
    return NextResponse.json({ error: "sheetId saknas" }, { status: 400 });
  }
  if (!isStatsPeriod(periodRaw)) {
    return NextResponse.json({ error: "Ogiltig period" }, { status: 400 });
  }
  const period: StatsPeriod = periodRaw;

  const { data: sheet } = await supabase
    .from("sheets")
    .select("id, user_id")
    .eq("id", sheetId)
    .maybeSingle();

  if (!sheet || sheet.user_id !== user.id) {
    return NextResponse.json({ error: "Hittades inte" }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const unitSize =
    profile?.unit_size && profile.unit_size > 0 ? Number(profile.unit_size) : 100;

  const bundle = await fetchSheetStatsBundle(
    supabase,
    sheetId,
    period,
    unitSize
  );

  return NextResponse.json({
    period,
    stats: bundle.stats,
    leagues: bundle.leagues,
    breakdowns: bundle.breakdowns,
  });
}
