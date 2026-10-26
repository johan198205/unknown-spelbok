import Link from "next/link";
import { PageBodyContent, PageIntro } from "@/components/content/PageIntro";
import { Avatar } from "@/components/planket/Bits";
import { AdSlot } from "@/components/ui/AdSlot";
import { EmptyState, Panel } from "@/components/ui/Panel";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { getT } from "@/lib/texts/server";
import {
  computeStats,
  formatMoney,
  formatRoiOrDash,
  MIN_ROI_BETS,
  nettoColor,
} from "@/lib/utils";
import type { Bet } from "@/lib/types";
import { StickySelfRank } from "@/components/pwa/StickySelfRank";
import { TopListCard } from "@/components/topplista/TopListCard";
import {
  betCountList,
  compareByQualifiedRoi,
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
  const [profile, t] = await Promise.all([getProfile(), getT()]);
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
      t("topplista.unknownOwner"),
    ownerAvatar:
      (sheet.profiles as unknown as { avatar_url: string | null } | null)
        ?.avatar_url ?? null,
    userId: sheet.user_id as string,
    bets: (sheet.bets || []) as Bet[],
  }));

  const board = toplistSheets
    .map((sheet) => ({
      id: sheet.id,
      name: sheet.name,
      owner: sheet.owner,
      ownerAvatar: sheet.ownerAvatar,
      userId: sheet.userId,
      href: sheet.slug ? `/s/${sheet.slug}` : null,
      ...computeStats(sheet.bets),
    }))
    .sort(compareByQualifiedRoi);
  // Huvudlistan visar bara topp 10.
  const topBoard = board.slice(0, TOP_LIST_SIZE);

  const weekStart = +new Date(nowIso) - WEEK_MS;
  const topLists = [
    {
      title: t("topplista.lists.roi.title"),
      subtitle: t("topplista.lists.roi.subtitle", { min: MIN_BETS_TOTAL }),
      entries: sheetRoiList(toplistSheets),
      empty: t("topplista.lists.roi.empty"),
    },
    {
      title: t("topplista.lists.week.title"),
      subtitle: t("topplista.lists.week.subtitle", { min: MIN_BETS_WEEK }),
      entries: sheetRoiList(toplistSheets, {
        since: weekStart,
        minBets: MIN_BETS_WEEK,
      }),
      empty: t("topplista.lists.week.empty"),
    },
    {
      title: t("topplista.lists.netto.title"),
      subtitle: t("topplista.lists.netto.subtitle"),
      entries: sheetNettoList(toplistSheets, {}, t),
      empty: t("topplista.lists.netto.empty"),
    },
    {
      title: t("topplista.lists.count.title"),
      subtitle: t("topplista.lists.count.subtitle"),
      entries: betCountList(toplistSheets),
      empty: t("topplista.lists.count.empty"),
    },
    {
      title: t("topplista.lists.form.title"),
      subtitle: t("topplista.lists.form.subtitle", { min: MIN_WIN_STREAK }),
      entries: formList(toplistSheets, t),
      empty: t("topplista.lists.form.empty", { min: MIN_WIN_STREAK }),
    },
    {
      title: t("topplista.lists.odds.title"),
      subtitle: t("topplista.lists.odds.subtitle"),
      entries: highestWonOddsList(toplistSheets),
      empty: t("topplista.lists.odds.empty"),
    },
  ];

  const selfIndex = profile
    ? board.findIndex((r) => r.userId === profile.id)
    : -1;
  const selfRow =
    selfIndex >= 0 ? { ...board[selfIndex], rank: selfIndex + 1 } : null;

  const medal = rankColor;

  // Inloggade får app-chromets <main> med px-4 runt sidan; utloggade har
  // ingen padding i den publika layouten och behöver egen sidmarginal.
  return (
    <div
      className={`animate-sbfade mx-auto max-w-[1180px] py-2 lg:px-7 lg:py-10 ${
        profile ? "px-1" : "px-5"
      }`}
    >
      <PageIntro slug="topplista" className="mb-5 lg:mb-6" />

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
          <span>{t("topplista.table.rank")}</span>
          <span>{t("topplista.table.sheet")}</span>
          <span className="text-right">{t("topplista.table.bets")}</span>
          <span className="text-right">{t("topplista.table.roi")}</span>
          <span className="text-right">{t("topplista.table.netto")}</span>
        </div>
        {topBoard.length ? (
          topBoard.map((row, i) => (
            <RowLink
              key={row.id}
              href={row.href}
              className="grid grid-cols-[40px_1fr_80px_100px_100px] items-center gap-3 border-b border-[#2a2b33] px-5 py-3"
            >
              <span className={`font-display text-lg font-semibold ${medal(i)}`}>
                {i + 1}
              </span>
              <div className="flex min-w-0 items-center gap-3">
                <Link
                  href={profileHref(row.owner)}
                  aria-label={row.owner}
                  className="relative z-[1] shrink-0 no-underline hover:no-underline"
                >
                  <Avatar username={row.owner} src={row.ownerAvatar} size={30} />
                </Link>
                <div className="min-w-0">
                  <div className="truncate font-semibold">{row.name}</div>
                  <div className="text-[12.5px] text-muted">
                    <OwnerLink owner={row.owner} /> ·{" "}
                    {t("topplista.table.hitrate", { hitrate: row.hitrate.toFixed(0) })}
                  </div>
                </div>
              </div>
              <span className="text-right font-mono-num text-muted">
                {row.bets}
              </span>
              <span
                className={`text-right font-display text-[19px] font-semibold ${
                  row.bets >= MIN_ROI_BETS ? nettoColor(row.roi) : "text-faint"
                }`}
              >
                {formatRoiOrDash(row.roi, row.bets)}
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
            {t("topplista.table.empty")}
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
                  className="relative z-[1] shrink-0 no-underline hover:no-underline"
                >
                  <Avatar username={row.owner} src={row.ownerAvatar} size={36} />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">
                    <OwnerLink owner={row.owner} className="text-text" />
                    {isSelf ? ` · ${t("topplista.mobile.you")}` : ""}
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
          <EmptyState>{t("topplista.mobile.empty")}</EmptyState>
        )}
      </div>

      <section className="mt-6 pb-16 lg:mt-8">
        <h2 className="mb-1 font-display text-[20px] font-semibold lg:text-[24px]">
          {t("topplista.lists.title")}
        </h2>
        <p className="mb-4 text-[13.5px] text-muted">
          {t("topplista.lists.subtitle")}
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

      <PageBodyContent slug="topplista" className="mb-16" />

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
async function RowLink({
  href,
  className,
  children,
}: {
  href: string | null;
  className: string;
  children: React.ReactNode;
}) {
  if (!href) return <div className={className}>{children}</div>;
  const t = await getT();
  return (
    <div className={`relative ${className} transition-colors hover:bg-panel-2`}>
      <Link href={href} aria-label={t("topplista.table.rowAria")} className="absolute inset-0" />
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
