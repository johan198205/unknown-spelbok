import Link from "next/link";
import { AdSlot, EmptyState, Panel } from "@/components/ui/Panel";
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

export default async function TopplistaPage() {
  const profile = await getProfile();
  const supabase = await createClient();
  const { data: sheets } = await supabase
    .from("sheets")
    .select(
      "id, name, user_id, currency, profiles(username, avatar_url), bets(stake, payout, result, odds)"
    )
    .eq("is_public", true);

  const board = (sheets || [])
    .map((sheet) => {
      const bets = (sheet.bets || []) as Bet[];
      const stats = computeStats(bets);
      const owner =
        (sheet.profiles as unknown as { username: string } | null)?.username ||
        "Okänd";
      return {
        id: sheet.id,
        name: sheet.name,
        owner,
        userId: sheet.user_id as string,
        ...stats,
      };
    })
    .sort((a, b) => b.roi - a.roi);

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

      <div className="mb-4 flex gap-3 lg:hidden">
        <Link
          href="/topplista"
          className="rounded-full border border-win bg-win/10 px-3.5 py-1.5 text-sm font-semibold text-win no-underline"
        >
          Topplista
        </Link>
        <Link
          href="/tavlingar"
          className="rounded-full border border-line bg-panel px-3.5 py-1.5 text-sm font-semibold text-muted no-underline"
        >
          Tävlingar
        </Link>
      </div>

      <AdSlot
        className="mb-5 hidden h-[90px] lg:block"
        label="ANNONSPLATS 970×90"
      />
      <AdSlot className="mb-4 h-[100px] lg:hidden" label="ANNONSPLATS 320×100" />

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

      <div className="space-y-2 pb-16 lg:hidden">
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
