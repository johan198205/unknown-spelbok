import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NewSheetForm } from "@/components/bets/NewSheetForm";
import { SpelbokLists } from "@/components/bets/SpelbokLists";
import { AdSlot } from "@/components/ui/AdSlot";
import { Badge, EmptyState, Kpi } from "@/components/ui/Panel";
import {
  computeStats,
  formatMoney,
  formatNumber,
  formatRoi,
  nettoColor,
} from "@/lib/utils";
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
  const { sheet: sheetParam } = await searchParams;
  const supabase = await createClient();

  const [{ data: sheets }, { data: bookmakers }] = await Promise.all([
    supabase
      .from("sheets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase.from("bookmakers").select("*").eq("active", true).order("rank"),
  ]);

  const sheetList = (sheets || []) as Sheet[];
  const activeSheet =
    sheetList.find((s) => s.id === sheetParam) || sheetList[0] || null;

  let bets: Bet[] = [];
  if (activeSheet) {
    const query = await supabase
      .from("bets")
      .select(
        "*, bookmakers(id, name, logo_url), fixtures:fixture_id(fixture_id, kickoff, status, elapsed, home_score, away_score, home_logo, away_logo, home_team_id, away_team_id, home_name, away_name, sport)"
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
  const stats = computeStats(bets);
  const bankroll = Number(activeSheet?.start_bankroll || 0) + stats.netto;

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
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-2xl font-semibold">
                  {activeSheet.name}
                </h2>
                <Badge tone={activeSheet.is_public ? "cyan" : "muted"}>
                  {activeSheet.is_public ? "Publik" : "Privat"}
                </Badge>
              </div>

              <div className="hidden gap-3 sm:grid-cols-2 lg:grid lg:grid-cols-4 xl:grid-cols-7">
                <Kpi
                  label="Netto"
                  value={formatMoney(stats.netto)}
                  color={nettoColor(stats.netto)}
                />
                <Kpi
                  label="ROI"
                  value={formatRoi(stats.roi)}
                  color={nettoColor(stats.roi)}
                />
                <Kpi
                  label="Hitrate"
                  value={`${formatNumber(stats.hitrate, 0)}%`}
                />
                <Kpi label="Spel" value={String(stats.bets)} />
                <Kpi label="Öppna" value={String(stats.open)} />
                <Kpi label="Snittodds" value={formatNumber(stats.avgOdds, 2)} />
                <Kpi
                  label="Bankroll"
                  value={formatMoney(bankroll).replace("+", "")}
                />
              </div>

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

              <SpelbokLists
                bets={bets}
                sheets={toPlain(sheetList)}
                bookmakers={toPlain((bookmakers || []) as Bookmaker[])}
                sheetId={activeSheet.id}
              />
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
