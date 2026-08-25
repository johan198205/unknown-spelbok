import { Suspense } from "react";
import Link from "next/link";
import { requireUser, getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NewSheetForm } from "@/components/bets/NewSheetForm";
import { SpelbokSheetView } from "@/components/bets/SpelbokSheetView";
import { AdSlot } from "@/components/ui/AdSlot";
import { EmptyState } from "@/components/ui/Panel";
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
  searchParams: Promise<{ sheet?: string }>;
}) {
  const user = await requireUser();
  const profile = await getProfile();
  const { sheet: sheetParam } = await searchParams;
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
  const activeSheet =
    sheetList.find((s) => s.id === sheetParam) || sheetList[0] || null;

  let bets: Bet[] = [];
  if (activeSheet) {
    const query = await supabase
      .from("bets")
      .select(
        "*, bookmakers(id, name, logo_url), fixtures:fixture_id(fixture_id, kickoff, status, elapsed, home_score, away_score, home_logo, away_logo, home_team_id, away_team_id, home_name, away_name, sport, league_id, league_logo)"
      )
      .eq("sheet_id", activeSheet.id)
      .order("placed_at", { ascending: false });

    if (query.error) {
      const fallback = await supabase
        .from("bets")
        .select(
          "*, bookmakers(id, name, logo_url), fixtures:fixture_id(fixture_id, kickoff, status, home_score, away_score, home_logo, away_logo, home_team_id, away_team_id, home_name, away_name, sport)"
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
  const unitSize =
    profile?.unit_size && profile.unit_size > 0 ? Number(profile.unit_size) : 100;

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

  return (
    <div className="animate-sbfade">
      <div className="mb-[26px]">
        <AdSlot
          format="970x90"
          placement="sheet"
          className="hidden h-[90px] lg:flex"
        />
        <AdSlot
          format="320x100"
          placement="sheet"
          className="h-[100px] lg:hidden"
        />
      </div>

      {!sheetList.length ? (
        <EmptyState>
          Du har inga spreadsheets ännu. Skapa din första nedan.
          <div className="mt-4 flex justify-center">
            <NewSheetForm />
          </div>
        </EmptyState>
      ) : (
        <>
          <div className="mb-[18px] flex flex-wrap items-center gap-2 sb-scroll">
            {sheetList.map((s) => (
              <Link
                key={s.id}
                href={`/spelbok?sheet=${s.id}`}
                className={`shrink-0 rounded-[9px] border px-3.5 py-2 text-sm font-semibold no-underline ${
                  activeSheet?.id === s.id
                    ? "border-win bg-win/10 text-win"
                    : "border-line bg-panel text-muted hover:text-text"
                }`}
              >
                {s.name}
              </Link>
            ))}
            <NewSheetForm buttonLabel="+ Ny" />
          </div>

          {activeSheet ? (
            <Suspense
              fallback={
                <div className="py-10 text-center text-muted">Laddar…</div>
              }
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
                unitSize={unitSize}
                isAuthenticated
              />
            </Suspense>
          ) : null}
        </>
      )}
    </div>
  );
}
