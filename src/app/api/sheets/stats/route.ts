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
    .select("id, user_id, is_public")
    .eq("id", sheetId)
    .maybeSingle();

  // Publika spelböcker får läsas av alla, även utloggade (samma som /s/<slug>).
  // Privata bara av ägaren — 404 så att existensen inte läcker.
  const isOwner = !!user && sheet?.user_id === user.id;
  if (!sheet || (!sheet.is_public && !isOwner)) {
    return NextResponse.json({ error: "Hittades inte" }, { status: 404 });
  }

  // Unit-storleken är betraktarens, inte ägarens; utloggade får 100.
  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

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
