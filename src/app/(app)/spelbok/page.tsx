import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireUser, getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NewSheetForm } from "@/components/bets/NewSheetForm";
import { SpelbokSheetView } from "@/components/bets/SpelbokSheetView";
import { EmptyState } from "@/components/ui/Panel";
import { getDisplayPrefs } from "@/lib/display-prefs";
import { stockholmYmd } from "@/lib/stockholm";
import { SUGGESTION_COLUMNS, normalizeSuggestion } from "@/lib/suggestions";
import {
  emptyStatsBundle,
  fetchSheetStatsBundle,
  type AffiliateTopRow,
} from "@/lib/bet-stats";
import type { Bet, Bookmaker, Sheet } from "@/lib/types";

function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function SpelbokPage({
  searchParams,
}: {
  searchParams: Promise<{ sheet?: string; bet?: string }>;
}) {
  const user = await requireUser();
  const profile = await getProfile();
  const { sheet: sheetParam, bet: betParam } = await searchParams;
  const supabase = await createClient();

  const [{ data: sheets }, { data: bookmakers }] = await Promise.all([
    supabase
      .from("sheets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("bookmakers")
      .select("*")
      .eq("active", true)
      .order("rank")
      .order("name"),
  ]);

  const sheetList = (sheets || []) as Sheet[];

  /*
    En notis om ett enskilt spel länkar hit med bara ?bet=… — spelets id
    är det enda notisen bär. Canonical URL inkluderar ?sheet= så flikarna
    i layouten markerar rätt bok.
  */
  if (betParam && !sheetParam) {
    const { data: betRow } = await supabase
      .from("bets")
      .select("sheet_id")
      .eq("id", betParam)
      .eq("user_id", user.id)
      .maybeSingle();
    if (betRow?.sheet_id) {
      redirect(
        `/spelbok?sheet=${encodeURIComponent(betRow.sheet_id)}&bet=${encodeURIComponent(betParam)}`
      );
    }
  }

  const activeSheet =
    sheetList.find((s) => s.id === sheetParam) || sheetList[0] || null;

  let bets: Bet[] = [];
  if (activeSheet) {
    const query = await supabase
      .from("bets")
      .select(
        "*, bookmakers(id, name, logo_url, brand_color), fixtures:fixture_id(fixture_id, kickoff, status, elapsed, extra, home_score, away_score, home_logo, away_logo, home_team_id, away_team_id, home_name, away_name, sport, league_id, league_logo, league_name)"
      )
      .eq("sheet_id", activeSheet.id)
      .order("placed_at", { ascending: false });

    if (query.error) {
      const fallback = await supabase
        .from("bets")
        .select(
          "*, bookmakers(id, name, logo_url, brand_color), fixtures:fixture_id(fixture_id, kickoff, status, home_score, away_score, home_logo, away_logo, home_team_id, away_team_id, home_name, away_name, sport, league_id, league_logo, league_name)"
        )
        .eq("sheet_id", activeSheet.id)
        .order("placed_at", { ascending: false });
      bets = (fallback.data || []) as Bet[];
    } else {
      bets = (query.data || []) as Bet[];
    }
  }

  bets = toPlain(bets).map((bet) => ({
    ...bet,
    bookmakers: asOne(bet.bookmakers),
    fixtures: asOne(bet.fixtures),
  }));

  const username = profile?.username || "användare";
  // Statistik-RPC:n räknar unitnetto och behöver storleken i klartext.
  const unitSize = (await getDisplayPrefs()).unitSize;

  const affiliates: AffiliateTopRow[] = ((bookmakers || []) as Bookmaker[])
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 3)
    .map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      logo_url: b.logo_url,
      rank: b.rank,
      rating: b.rating,
      bonus_value: b.bonus_value,
      bonus: b.bonus,
      usp: b.usp,
      terms: b.terms,
    }));

  const [statsBundle, { data: suggestionRows }] = await Promise.all([
    activeSheet
      ? fetchSheetStatsBundle(supabase, activeSheet.id, "all", unitSize)
      : Promise.resolve(emptyStatsBundle(unitSize)),
    // Spelbokens egna förslag, inte kontots. Utan aktiv spelbok finns
    // inget att hämta — .eq() på tom sträng hade gett ett fel.
    activeSheet
      ? supabase
          .from("daily_suggestions")
          .select(SUGGESTION_COLUMNS)
          .eq("user_id", user.id)
          .eq("sheet_id", activeSheet.id)
          .eq("suggestion_date", stockholmYmd())
          .eq("dismissed", false)
          .order("match_score", { ascending: false })
          .order("kickoff", { ascending: true })
      : Promise.resolve({ data: null }),
  ]);

  const suggestions = (suggestionRows ?? []).map(normalizeSuggestion);

  if (!sheetList.length) {
    return (
      <EmptyState>
        Du har inga spreadsheets ännu. Skapa din första nedan.
        <div className="mt-4 flex justify-center">
          <NewSheetForm />
        </div>
      </EmptyState>
    );
  }

  if (!activeSheet) return null;

  return (
    <Suspense
      fallback={<div className="py-10 text-center text-muted">Laddar…</div>}
    >
      <SpelbokSheetView
        sheet={toPlain(activeSheet)}
        bets={bets}
        sheets={toPlain(sheetList)}
        bookmakers={toPlain((bookmakers || []) as Bookmaker[])}
        username={username}
        initialStats={toPlain(statsBundle.stats)}
        suggestions={toPlain(suggestions)}
        affiliates={toPlain(affiliates)}
        isAuthenticated
      />
    </Suspense>
  );
}
