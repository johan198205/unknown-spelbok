import Link from "next/link";
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
  formList,
  highestWonOddsList,
  MIN_BETS_TOTAL,
  MIN_BETS_WEEK,
  MIN_WIN_STREAK,
  profileHref,
  rankColor,
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
  const { data: sheets } = await supabase
    .from("sheets")
    .select(
      "id, name, slug, user_id, currency, profiles(username, avatar_url), bets(stake, payout, result, odds, placed_at)"
    )
    .eq("is_public", true);

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
      href: sheet.slug ? `/s/${sheet.slug}` : null,
      ...computeStats(sheet.bets),
    }))
    .sort((a, b) => b.roi - a.roi);
  // Huvudlistan visar bara topp 10.
  const topBoard = board.slice(0, TOP_LIST_SIZE);

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
      title: "Topp 10 bäst form",
      subtitle: `Raka vinster just nu · minst ${MIN_WIN_STREAK} i rad`,
      entries: formList(toplistSheets),
      empty: `Ingen har ${MIN_WIN_STREAK} raka vinster just nu.`,
    },
    {
      title: "Topp 10 högsta vunna odds",
      subtitle: "Högsta odds på ett vunnet spel · singel eller kombination",
      entries: highestWonOddsList(toplistSheets),
      empty: "Inga vunna spel ännu.",
    },
  ];

  const selfIndex = profile
    ? board.findIndex((r) => r.userId === profile.id)
    : -1;
  const selfRow =
    selfIndex >= 0 ? { ...board[selfIndex], rank: selfIndex + 1 } : null;

  const medal = rankColor;

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
        className="mb-5 hidden lg:flex"
      />
      <AdSlot
        format="320x100"
        placement="topplista"
        className="mb-4 lg:hidden"
      />

      <Panel className="hidden overflow-hidden lg:block">
        <div className="grid grid-cols-[40px_1fr_80px_100px_100px] gap-3 border-b border-line bg-bg-soft px-5 py-3 text-[10.5px] font-semibold uppercase tracking-[0.11em] text-muted">
          <span>#</span>
          <span>Spreadsheet</span>
          <span className="text-right">Spel</span>
          <span className="text-right">ROI</span>
          <span className="text-right">Netto</span>
        </div>
        {topBoard.length ? (
          topBoard.map((row, i) => (
            <RowLink
              key={row.id}
              href={row.href}
              className="grid grid-cols-[40px_1fr_80px_100px_100px] items-center gap-3 border-b border-[#171E2C] px-5 py-3"
            >
              <span className={`font-display text-lg font-semibold ${medal(i)}`}>
                {i + 1}
              </span>
              <div className="min-w-0">
                <div className="truncate font-semibold">{row.name}</div>
                <div className="text-[12.5px] text-muted">
                  <OwnerLink owner={row.owner} /> · hitrate{" "}
                  {row.hitrate.toFixed(0)}%
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
            </RowLink>
          ))
        ) : (
          <EmptyState>
            Inga publika spreadsheets ännu. Markera din bok som publik under
            Spelbok.
          </EmptyState>
        )}
      </Panel>

      <div className="space-y-2 lg:hidden">
        {topBoard.length ? (
          topBoard.map((row, i) => {
            const isSelf = profile && row.userId === profile.id;
            return (
              <RowLink
                key={row.id}
                href={row.href}
                className={`flex items-center gap-3 rounded-[12px] border px-3 py-3 ${
                  isSelf ? "border-win/40 bg-win/10" : "border-line bg-panel"
                }`}
              >
                <span
                  className={`font-display w-6 text-lg font-semibold ${medal(i)}`}
                >
                  {i + 1}
                </span>
                <Link
                  href={profileHref(row.owner)}
                  aria-label={row.owner}
                  className="relative z-[1] flex h-9 w-9 items-center justify-center rounded-full border border-line-strong bg-panel-2 font-display text-sm font-semibold text-text no-underline hover:no-underline"
                >
                  {initialOf(row.owner)}
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">
                    <OwnerLink owner={row.owner} className="text-text" />
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
              </RowLink>
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

/**
 * Hela raden länkar till spelboken via ett osynligt lager, så att spelarens
 * namn och avatar ovanpå kan länka till profilen (länkar får inte nästlas).
 * Rader utan slug (äldre spelböcker) renderas som vanliga block.
 */
function RowLink({
  href,
  className,
  children,
}: {
  href: string | null;
  className: string;
  children: React.ReactNode;
}) {
  if (!href) return <div className={className}>{children}</div>;
  return (
    <div className={`relative ${className} transition-colors hover:bg-panel-2`}>
      <Link href={href} aria-label="Till spelboken" className="absolute inset-0" />
      {children}
    </div>
  );
}

function OwnerLink({ owner, className }: { owner: string; className?: string }) {
  return (
    <Link
      href={profileHref(owner)}
      className={`relative z-[1] no-underline hover:underline ${className ?? "text-muted"}`}
    >
      {owner}
    </Link>
  );
}
