import Link from "next/link";
import { requireUser, getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdSlot } from "@/components/ui/AdSlot";
import { Badge } from "@/components/ui/Panel";
import { AddBetButton } from "@/components/bets/AddBetButton";
import {
  DashboardNettoChart,
  type ChartEntry,
} from "@/components/bets/DashboardNettoChart";
import {
  DistributionCard,
  type DistributionGroups,
} from "@/components/bets/DistributionCard";
import { MatchLine } from "@/components/bets/TeamPair";
import {
  MatchesForYou,
  type MatchForYou,
} from "@/components/suggestions/MatchesForYou";
import { formatPick } from "@/lib/picks";
import { stockholmYmd } from "@/lib/stockholm";
import { SUGGESTION_COLUMNS, normalizeSuggestion } from "@/lib/suggestions";
import {
  bookmakerKey,
  categoryKey,
  groupBets,
  leagueKey,
  oddsKey,
  pickKey,
  sportKey,
} from "@/lib/breakdowns";
import { parseMatchSides } from "@/lib/logos";
import {
  MIN_ROI_BETS,
  betNetto,
  cn,
  computeStats,
  formatMoney,
  formatPercent,
  formatRoiOrDash,
  nettoColor,
} from "@/lib/utils";
import type { Bet, Sheet } from "@/lib/types";

/** Under den här gränsen är ROI och hitrate brus — säg det i stället för att dölja det. */
const THIN_SAMPLE = 20;

/** Lagloggor från kopplad fixture, annars initialer ur matchsträngen. */
function BetMatchLine({ bet }: { bet: Bet }) {
  const f = bet.fixtures;
  if (f?.home_name && f?.away_name) {
    return (
      <MatchLine
        homeName={f.home_name}
        awayName={f.away_name}
        homeLogo={f.home_logo}
        awayLogo={f.away_logo}
        homeTeamId={f.home_team_id}
        awayTeamId={f.away_team_id}
        sport={f.sport ?? bet.sport}
      />
    );
  }
  const sides = parseMatchSides(bet.match);
  if (!sides) return <span className="min-w-0 truncate">{bet.match}</span>;
  return <MatchLine homeName={sides.home} awayName={sides.away} />;
}

export default async function HemPage() {
  const user = await requireUser();
  const profile = await getProfile();
  const supabase = await createClient();

  const [{ data: sheets }, { data: betsData }, { data: suggestionRows }] =
    await Promise.all([
      supabase
        .from("sheets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("bets")
        .select(
          "*, bookmakers(id, name, logo_url), fixtures:fixture_id(fixture_id, kickoff, status, elapsed, home_score, away_score, home_logo, away_logo, home_team_id, away_team_id, home_name, away_name, sport, league_id, league_logo, league_name)"
        )
        .eq("user_id", user.id)
        .order("placed_at", { ascending: false }),
      // Serverrenderat: sektionen ska inte blinka in efter laddning. Saknas
      // tabellen (migrationen inte körd) blir data null och sektionen uteblir.
      //
      // sheet_id is null = kontots förslag. Spelbökernas egna rader ligger i
      // samma tabell men hämtas på /spelbok.
      supabase
        .from("daily_suggestions")
        .select(SUGGESTION_COLUMNS)
        .eq("user_id", user.id)
        .is("sheet_id", null)
        .eq("suggestion_date", stockholmYmd())
        .eq("dismissed", false)
        .order("match_score", { ascending: false })
        .order("kickoff", { ascending: true }),
    ]);

  const sheetList = (sheets || []) as Sheet[];
  const bets = (betsData || []) as Bet[];
  const settled = bets.filter((b) => b.result !== "open");
  const stats = computeStats(bets);

  const chartEntries: ChartEntry[] = settled.map((b) => ({
    sheetId: b.sheet_id,
    ts: +new Date(b.placed_at),
    netto: betNetto(b),
  }));

  const sheetRows = sheetList.map((sheet) => {
    const own = bets.filter((b) => b.sheet_id === sheet.id);
    return { sheet, all: own.length, stats: computeStats(own) };
  });

  const groups: DistributionGroups = {
    liga: groupBets(settled, leagueKey),
    kategori: groupBets(settled, categoryKey),
    spelform: groupBets(settled, pickKey),
    spelbolag: groupBets(settled, bookmakerKey),
    sport: groupBets(settled, sportKey),
    odds: groupBets(settled, oddsKey),
  };

  const recent = settled.slice(0, 8);

  // Matchningen ska motiveras med användarens egen historik, inte med en
  // naken poäng. Ligastatistiken räknas på rättade spel — öppna spel säger
  // inget om hur det har gått.
  const leagueHistory = new Map<string, { bets: number; netto: number }>();
  for (const bet of settled) {
    const key = leagueKey(bet);
    const cur = leagueHistory.get(key) ?? { bets: 0, netto: 0 };
    cur.bets += 1;
    cur.netto += betNetto(bet);
    leagueHistory.set(key, cur);
  }

  const seenMatch = new Set<string>();
  const matches: MatchForYou[] = (suggestionRows ?? [])
    .map(normalizeSuggestion)
    .filter((s) => {
      const key = `${s.home_team} – ${s.away_team}`.toLowerCase();
      if (seenMatch.has(key)) return false;
      seenMatch.add(key);
      return true;
    })
    .slice(0, 3)
    .map((suggestion) => {
      const league = suggestion.league_name || "ligan";
      const history = leagueHistory.get(league);
      return {
        suggestion,
        note: history
          ? `${history.bets} tidigare spel i ${league} · netto ${formatMoney(history.netto)}`
          : `Ny liga för dig · ${league}`,
      };
    });

  const kpis = [
    {
      label: "Netto",
      value: formatMoney(stats.netto),
      color: nettoColor(stats.netto),
    },
    {
      label: "ROI",
      value: formatRoiOrDash(stats.roi, stats.bets),
      color: stats.bets >= MIN_ROI_BETS ? nettoColor(stats.roi) : "text-faint",
      note: stats.bets < THIN_SAMPLE ? "litet underlag" : null,
    },
    {
      label: "Hitrate",
      value: formatPercent(stats.hitrate),
      color: "text-text",
      note: stats.bets < THIN_SAMPLE ? `${stats.bets} rättade` : null,
    },
    {
      label: "Omsättning",
      value: formatMoney(stats.stake).replace("+", ""),
      color: "text-text",
    },
    // Alla spel, inte bara rättade: annars kan "Levande" visa fler spel än
    // "Spel", vilket är obegripligt.
    { label: "Spel", value: String(bets.length), color: "text-text" },
    {
      label: "Levande",
      value: String(stats.open),
      color: stats.open > 0 ? "text-cyan" : "text-muted",
    },
  ];

  return (
    <div className="animate-sbfade min-[1080px]:pb-8">
      <div className="mb-[18px] flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[14px] text-muted">
            Hej {profile?.username || "spelare"}
          </div>
          <div
            className={cn(
              "font-mono-num text-[44px] font-semibold leading-[1.08] tracking-[-0.02em]",
              nettoColor(stats.netto)
            )}
          >
            {formatMoney(stats.netto)}
          </div>
          <div className="font-mono-num text-[13px] text-faint">
            totalt netto · {sheetList.length} spreadsheets · {bets.length} spel
          </div>
        </div>
        <AddBetButton />
      </div>

      <div className="mb-[18px] grid grid-cols-[repeat(auto-fit,minmax(152px,1fr))] gap-3">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-[12px] border border-line bg-panel px-[15px] py-[14px]"
          >
            <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.13em] text-muted">
              {k.label}
            </div>
            <div
              className={cn(
                "whitespace-nowrap font-mono-num text-[23px] font-semibold",
                k.color
              )}
            >
              {k.value}
            </div>
            {k.note ? (
              <div className="mt-0.5 text-[11.5px] text-faint">{k.note}</div>
            ) : null}
          </div>
        ))}
      </div>

      {/* Grafen ligger utanför grid:en och går i full bredd — kurvan behöver
          upplösning på x-axeln. Kolumnerna börjar först under den, så "Mina
          spreadsheets" och "Senaste resultat" toppar på samma höjd. */}
      <div className="mb-[18px]">
        <DashboardNettoChart
          entries={chartEntries}
          sheets={sheetList.map((s) => ({ id: s.id, name: s.name }))}
        />
      </div>

      <div className="grid items-start gap-[18px] min-[1080px]:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-[18px]">
          <section>
            <div className="mb-2.5 flex items-baseline justify-between gap-3">
              <h2 className="font-display text-[15px] font-semibold uppercase tracking-[0.09em]">
                Mina spreadsheets
              </h2>
              <Link href="/installningar" className="text-[13px] font-semibold">
                Hantera
              </Link>
            </div>
            <div className="space-y-2.5">
              {sheetRows.map(({ sheet, all, stats: st }) => (
                <Link
                  key={sheet.id}
                  href={`/spelbok?sheet=${sheet.id}`}
                  className="flex cursor-pointer flex-wrap items-center justify-end gap-x-3 gap-y-2 rounded-[13px] border border-line bg-panel px-4 py-3.5 text-text no-underline transition-colors duration-150 hover:border-line-hover hover:no-underline sm:gap-x-3.5"
                >
                  {/* basis-full på smal skärm: annars klämmer de tre fasta
                      sifferkolumnerna namnet till noll bredd. */}
                  <span className="min-w-0 grow basis-full sm:basis-0">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-display text-[17px] font-semibold">
                        {sheet.name}
                      </span>
                      <Badge tone={sheet.is_public ? "public" : "private"}>
                        {sheet.is_public ? "Publik" : "Låst"}
                      </Badge>
                    </span>
                    {sheet.description ? (
                      <span className="mt-0.5 block truncate text-[13px] text-muted">
                        {sheet.description}
                      </span>
                    ) : null}
                  </span>

                  <SheetStat label="ROI" width="w-[84px]">
                    <span
                      className={cn(
                        "font-mono-num text-[15px] font-semibold",
                        st.bets >= MIN_ROI_BETS
                          ? nettoColor(st.roi)
                          : "text-faint"
                      )}
                    >
                      {formatRoiOrDash(st.roi, st.bets)}
                    </span>
                  </SheetStat>
                  <SheetStat label="Spel" width="w-[74px]">
                    <span className="font-mono-num text-[15px] font-semibold text-text-soft">
                      {all}
                    </span>
                  </SheetStat>
                  <SheetStat label="Netto" width="w-[132px]">
                    <span
                      className={cn(
                        "whitespace-nowrap font-mono-num text-[19px] font-semibold",
                        nettoColor(st.netto)
                      )}
                    >
                      {formatMoney(st.netto)}
                    </span>
                  </SheetStat>
                </Link>
              ))}
              {!sheetRows.length ? (
                <div className="rounded-[13px] border border-line bg-panel px-4 py-8 text-center text-muted">
                  Skapa din första spelbok under Spelboken.
                </div>
              ) : null}
            </div>
          </section>

          <DistributionCard groups={groups} />
        </div>

        <div className="min-w-0 space-y-[18px]">
          <section>
            <h2 className="mb-2.5 font-display text-[15px] font-semibold uppercase tracking-[0.09em]">
              Senaste resultat
            </h2>
            <div className="overflow-hidden rounded-[13px] border border-line bg-panel">
              {recent.map((bet) => {
                const netto = betNetto(bet);
                const home = bet.fixtures?.home_score;
                const away = bet.fixtures?.away_score;
                const score =
                  home == null || away == null ? "–" : `${home}–${away}`;
                return (
                  <div
                    key={bet.id}
                    className="flex items-center gap-2.5 border-b border-line-row px-[13px] py-[9px] text-[13px] last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <BetMatchLine bet={bet} />
                        <span className="ml-1 shrink-0 rounded-[5px] bg-panel-2 px-1.5 py-px font-mono-num text-[12px] font-semibold text-text-soft">
                          {score}
                        </span>
                      </div>
                      <div className="mt-[5px] truncate text-[12px] text-[#A9B4C7]">
                        {formatPick(bet.pick)}{" "}
                        <span className="font-mono-num text-muted">
                          @ {Number(bet.odds).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 whitespace-nowrap font-mono-num font-semibold",
                        nettoColor(netto)
                      )}
                    >
                      {formatMoney(netto)}
                    </span>
                  </div>
                );
              })}
              {!recent.length ? (
                <p className="px-4 py-8 text-center text-[13px] text-muted">
                  Inga rättade spel ännu.
                </p>
              ) : null}
            </div>
          </section>

          <MatchesForYou items={matches} dateLabel={stockholmYmd()} />
        </div>
      </div>

      <AdSlot
        format="320x100"
        placement="home"
        className="mt-[18px] h-[100px] min-[1080px]:hidden"
      />
      <AdSlot
        format="970x90"
        placement="home"
        className="mt-[18px] hidden h-[90px] min-[1080px]:flex"
      />
    </div>
  );
}

/** Högerställd sifferkolumn med etikett — fast bredd så raderna linjerar. */
function SheetStat({
  label,
  width,
  children,
}: {
  label: string;
  width: string;
  children: React.ReactNode;
}) {
  return (
    <span className={cn("shrink-0 text-right font-mono-num", width)}>
      <span className="mb-0.5 block font-sans text-[10px] uppercase tracking-[0.12em] text-faint">
        {label}
      </span>
      {children}
    </span>
  );
}
