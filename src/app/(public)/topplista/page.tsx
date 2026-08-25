import { AdSlot } from "@/components/ui/AdSlot";
import { EmptyState, Panel } from "@/components/ui/Panel";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import {
  computeStats,
  formatMoney,
  formatRoi,
  initialOf,
  nettoColor,
} from "@/lib/utils";
import type { Bet } from "@/lib/types";
import { StickySelfRank } from "@/components/pwa/StickySelfRank";
import { TopListCard } from "@/components/topplista/TopListCard";
import {
  betCountList,
  MIN_BETS_TOTAL,
  MIN_BETS_WEEK,
  ryggadList,
  sheetNettoList,
  sheetRoiList,
  TOP_LIST_SIZE,
  WEEK_MS,
  type ToplistSheet,
} from "@/lib/toplists";

export default async function TopplistaPage() {
  const profile = await getProfile();
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  // Tävlingar är steg 2 och visas inte här — sidan är enbart topplistor.
  const [{ data: sheets }, { data: ryggade }] = await Promise.all([
    supabase
      .from("sheets")
      .select(
        "id, name, slug, user_id, currency, profiles(username, avatar_url), bets(stake, payout, result, odds, placed_at)"
      )
      .eq("is_public", true),
    supabase
      .from("bets")
      .select("copied_from_user_id")
      .not("copied_from_user_id", "is", null)
      .limit(5000),
  ]);

  const toplistSheets: ToplistSheet[] = (sheets || []).map((sheet) => ({
    id: sheet.id,
    name: sheet.name,
    slug: (sheet.slug as string | null) ?? null,
    owner:
      (sheet.profiles as unknown as { username: string } | null)?.username ||
      "Okänd",
    userId: sheet.user_id as string,
    bets: (sheet.bets || []) as Bet[],
  }));

  const board = toplistSheets
    .map((sheet) => ({
      id: sheet.id,
      name: sheet.name,
      owner: sheet.owner,
      userId: sheet.userId,
      ...computeStats(sheet.bets),
    }))
    .sort((a, b) => b.roi - a.roi);

  // Antal ryggningar per originalspelare — namnen slås upp separat eftersom
  // en ryggad spelare inte behöver ha en publik spelbok.
  const ryggaCounts = new Map<string, number>();
  for (const row of (ryggade || []) as Array<{
    copied_from_user_id: string | null;
  }>) {
    const id = row.copied_from_user_id;
    if (!id) continue;
    ryggaCounts.set(id, (ryggaCounts.get(id) || 0) + 1);
  }

  const ryggaNames = new Map<string, string>();
  if (ryggaCounts.size) {
    const topIds = [...ryggaCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_LIST_SIZE)
      .map(([id]) => id);
    const { data: ryggaProfiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", topIds);
    for (const p of (ryggaProfiles || []) as Array<{
      id: string;
      username: string;
    }>) {
      ryggaNames.set(p.id, p.username);
    }
  }

  const weekStart = +new Date(nowIso) - WEEK_MS;
  const topLists = [
    {
      title: "Topp 10 spelböcker",
      subtitle: `ROI · minst ${MIN_BETS_TOTAL} avgjorda spel`,
      entries: sheetRoiList(toplistSheets),
      empty: "Inga spelböcker kvalar in ännu.",
    },
    {
      title: "Topp 10 senaste veckan",
      subtitle: `ROI 7 dagar · minst ${MIN_BETS_WEEK} avgjorda spel`,
      entries: sheetRoiList(toplistSheets, {
        since: weekStart,
        minBets: MIN_BETS_WEEK,
      }),
      empty: "Inga avgjorda spel den senaste veckan.",
    },
    {
      title: "Topp 10 största netto",
      subtitle: "Netto i kronor · alla tider",
      entries: sheetNettoList(toplistSheets),
      empty: "Inga spelböcker kvalar in ännu.",
    },
    {
      title: "Topp 10 flest spel",
      subtitle: "Loggade spel i publika spelböcker",
      entries: betCountList(toplistSheets),
      empty: "Inga loggade spel ännu.",
    },
    {
      title: "Mest ryggad",
      subtitle: "Antal gånger andra kopierat spelen",
      entries: ryggadList(ryggaCounts, ryggaNames),
      empty: "Inga ryggade spel ännu.",
    },
  ];

  const selfIndex = profile
    ? board.findIndex((r) => r.userId === profile.id)
    : -1;
  const selfRow =
    selfIndex >= 0 ? { ...board[selfIndex], rank: selfIndex + 1 } : null;

  const medal = (i: number) =>
    i === 0
      ? "text-[#FFD166]"
      : i === 1
        ? "text-[#C3CBDB]"
        : i === 2
          ? "text-[#E0A070]"
          : "text-muted";

  return (
    <div className="animate-sbfade mx-auto max-w-[1180px] px-1 py-2 lg:px-7 lg:py-10">
      <div className="mb-5 lg:mb-6">
        <h1 className="font-display text-[28px] font-semibold lg:text-[34px]">
          Topplista
        </h1>
        <p className="text-muted">Alla publika spreadsheets</p>
      </div>

      <AdSlot
        format="970x90"
        placement="topplista"
        className="mb-5 hidden h-[90px] lg:flex"
      />
      <AdSlot
        format="320x100"
        placement="topplista"
        className="mb-4 h-[100px] lg:hidden"
      />

      <Panel className="hidden overflow-hidden lg:block">
        <div className="grid grid-cols-[40px_1fr_80px_100px_100px] gap-3 border-b border-line bg-bg-soft px-5 py-3 text-[10.5px] font-semibold uppercase tracking-[0.11em] text-muted">
          <span>#</span>
          <span>Spreadsheet</span>
          <span className="text-right">Spel</span>
          <span className="text-right">ROI</span>
          <span className="text-right">Netto</span>
        </div>
        {board.length ? (
          board.map((row, i) => (
            <div
              key={row.id}
              className="grid grid-cols-[40px_1fr_80px_100px_100px] items-center gap-3 border-b border-[#171E2C] px-5 py-3"
            >
              <span className={`font-display text-lg font-semibold ${medal(i)}`}>
                {i + 1}
              </span>
              <div className="min-w-0">
                <div className="truncate font-semibold">{row.name}</div>
                <div className="text-[12.5px] text-muted">
                  {row.owner} · hitrate {row.hitrate.toFixed(0)}%
                </div>
              </div>
              <span className="text-right font-mono-num text-muted">
                {row.bets}
              </span>
              <span
                className={`text-right font-display text-[19px] font-semibold ${nettoColor(row.roi)}`}
              >
                {formatRoi(row.roi)}
              </span>
              <span
                className={`text-right font-mono-num font-semibold ${nettoColor(row.netto)}`}
              >
                {formatMoney(row.netto)}
              </span>
            </div>
          ))
        ) : (
          <EmptyState>
            Inga publika spreadsheets ännu. Markera din bok som publik under
            Spelbok.
          </EmptyState>
        )}
      </Panel>

      <div className="space-y-2 lg:hidden">
        {board.length ? (
          board.map((row, i) => {
            const isSelf = profile && row.userId === profile.id;
            return (
              <div
                key={row.id}
                className={`flex items-center gap-3 rounded-[12px] border px-3 py-3 ${
                  isSelf ? "border-win/40 bg-win/10" : "border-line bg-panel"
                }`}
              >
                <span
                  className={`font-display w-6 text-lg font-semibold ${medal(i)}`}
                >
                  {i + 1}
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-line-strong bg-panel-2 font-display text-sm font-semibold">
                  {initialOf(row.owner)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">
                    {row.owner}
                    {isSelf ? " · Du" : ""}
                  </div>
                  <div className="truncate text-[12px] text-muted">
                    {row.name}
                  </div>
                </div>
                <span
                  className={`font-mono-num text-sm font-semibold ${nettoColor(row.netto)}`}
                >
                  {formatMoney(row.netto)}
                </span>
              </div>
            );
          })
        ) : (
          <EmptyState>Inga publika spreadsheets ännu.</EmptyState>
        )}
      </div>

      <section className="mt-6 pb-16 lg:mt-8">
        <h2 className="mb-1 font-display text-[20px] font-semibold lg:text-[24px]">
          Topplistor
        </h2>
        <p className="mb-4 text-[13.5px] text-muted">
          Baserat på publika spelböcker
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {topLists.map((list) => (
            <TopListCard
              key={list.title}
              title={list.title}
              subtitle={list.subtitle}
              entries={list.entries}
              empty={list.empty}
            />
          ))}
        </div>
      </section>

      {selfRow && selfIndex >= 5 ? (
        <StickySelfRank
          rank={selfRow.rank}
          name={selfRow.owner}
          netto={selfRow.netto}
        />
      ) : null}
    </div>
  );
}
