import { Suspense } from "react";
import Link from "next/link";
import { requireUser, getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NewSheetForm } from "@/components/bets/NewSheetForm";
import { SpelbokSheetView } from "@/components/bets/SpelbokSheetView";
import { AdSlot } from "@/components/ui/AdSlot";
import { EmptyState } from "@/components/ui/Panel";
import {
  fetchPublicSheetsLeaderboard,
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
      rank: b.rank,
      rating: b.rating,
      bonus_value: b.bonus_value,
      bonus: b.bonus,
      usp: b.usp,
      terms: b.terms,
    }));

  const [statsBundle, publicSheets] = await Promise.all([
    activeSheet
      ? fetchSheetStatsBundle(supabase, activeSheet.id, "all", unitSize)
      : Promise.resolve({
          stats: {
            antal_spel: 0,
            vinster: 0,
            forluster: 0,
            void: 0,
            oppna_spel: 0,
            oppen_risk: 0,
            oppen_potentiell_vinst: 0,
            insats: 0,
            vunnet: 0,
            forlorat: 0,
            netto: 0,
            roi: 0,
            unit_size: unitSize,
            unitnetto: 0,
            vinstprocent: 0,
            medelodds: 0,
            medelinsats: 0,
            medelvinst: 0,
          },
          leagues: [],
        }),
    fetchPublicSheetsLeaderboard(supabase, 5, user.id),
  ]);

  return (
    <div className="animate-sbfade space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[28px] font-semibold lg:text-[32px]">
            Spelboken
          </h1>
          <p className="text-muted">Bokför, sättla och följ varje spreadsheet.</p>
        </div>
        <div className="hidden lg:block">
          <NewSheetForm />
        </div>
      </div>

      {!sheetList.length ? (
        <EmptyState>
          Du har inga spreadsheets ännu. Skapa din första ovan.
          <div className="mt-4 lg:hidden">
            <NewSheetForm />
          </div>
        </EmptyState>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto sb-scroll pb-1 lg:flex-wrap">
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
                initialLeagues={toPlain(statsBundle.leagues)}
                affiliates={toPlain(affiliates)}
                publicSheets={toPlain(publicSheets)}
                unitSize={unitSize}
                isAuthenticated
                ads={
                  <>
                    <AdSlot
                      placement="sheet"
                      className="hidden h-[90px] lg:flex"
                      label="ANNONSPLATS 970×90"
                    />
                    <AdSlot
                      placement="sheet"
                      className="h-[100px] lg:hidden"
                      label="ANNONSPLATS 320×100"
                    />
                  </>
                }
              />
            </Suspense>
          ) : null}
        </>
      )}
    </div>
  );
}
