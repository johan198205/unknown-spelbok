import Link from "next/link";
import { requireUser, getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdSlot } from "@/components/ui/AdSlot";
import { Badge } from "@/components/ui/Panel";
import { NettoChart } from "@/components/bets/NettoChart";
import {
  betNetto,
  computeStats,
  cumulativeNetto,
  formatMoney,
  formatRoi,
  initialOf,
  nettoColor,
} from "@/lib/utils";
import type { Bet, Sheet } from "@/lib/types";

export default async function HemPage() {
  const user = await requireUser();
  const profile = await getProfile();
  const supabase = await createClient();

  const [{ data: sheets }, { data: betsData }] = await Promise.all([
    supabase
      .from("sheets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("bets")
      .select(
        "*, bookmakers(id, name, logo_url), fixtures:fixture_id(fixture_id, kickoff, status, elapsed, home_score, away_score, home_logo, away_logo, home_team_id, away_team_id, home_name, away_name, sport)"
      )
      .eq("user_id", user.id)
      .order("placed_at", { ascending: false }),
  ]);

  const sheetList = (sheets || []) as Sheet[];
  const bets = (betsData || []) as Bet[];
  const stats = computeStats(bets);
  const series = cumulativeNetto(bets);
  const openToday = bets.filter((b) => {
    if (b.result !== "open") return false;
    const d = new Date(b.placed_at).toDateString();
    return d === new Date().toDateString();
  });
  const recent = bets.filter((b) => b.result !== "open").slice(0, 5);

  const sheetStats = sheetList.map((s) => {
    const sb = bets.filter((b) => b.sheet_id === s.id);
    const st = computeStats(sb);
    return { sheet: s, stats: st };
  });

  return (
    <div className="animate-sbfade space-y-5 lg:mx-auto lg:max-w-[720px]">
      <div className="flex items-start justify-between gap-3 px-1">
        <div>
          <div className="text-[14px] text-muted">
            Hej {profile?.username || "spelare"}
          </div>
          <div
            className={`font-mono-num text-[38px] font-semibold leading-[1.1] tracking-[-0.02em] ${nettoColor(stats.netto)}`}
          >
            {formatMoney(stats.netto)}
          </div>
          <div className="font-mono-num text-[13px] text-faint">
            totalt netto · {sheetList.length} spreadsheets
          </div>
        </div>
        <Link
          href="/installningar"
          className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-line-strong bg-panel-2 font-display text-lg font-semibold text-text no-underline"
        >
          {initialOf(profile?.username || "?")}
        </Link>
      </div>

      <div className="rounded-[16px] border border-line bg-panel px-3.5 pb-2.5 pt-3.5">
        {series.length ? (
          <NettoChart points={series} compact />
        ) : (
          <div className="py-10 text-center text-sm text-muted">
            Grafen fylls när du sätter resultat.
          </div>
        )}
      </div>

      <div className="flex gap-2.5 overflow-x-auto sb-scroll snap-x snap-mandatory pb-1">
        {[
          { label: "Netto", value: formatMoney(stats.netto), color: nettoColor(stats.netto) },
          { label: "ROI", value: formatRoi(stats.roi), color: nettoColor(stats.roi) },
          {
            label: "Hitrate",
            value: `${stats.hitrate.toFixed(1)}%`,
            color: "text-text",
          },
          {
            label: "Spel",
            value: String(stats.bets),
            color: "text-text",
          },
          {
            label: "Levande",
            value: String(stats.open),
            color: "text-cyan",
          },
        ].map((k) => (
          <div
            key={k.label}
            className="min-w-[104px] snap-start rounded-[13px] border border-line bg-panel px-[13px] py-3"
          >
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.11em] text-muted">
              {k.label}
            </div>
            <div className={`mt-1 font-mono-num text-[17px] font-semibold ${k.color}`}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="font-display text-[17px] font-semibold uppercase tracking-[0.04em]">
            Mina spreadsheets
          </h2>
          <Link href="/spelbok" className="text-sm font-semibold text-cyan no-underline">
            Alla
          </Link>
        </div>
        <div className="space-y-2">
          {sheetStats.map(({ sheet, stats: st }) => (
            <Link
              key={sheet.id}
              href={`/spelbok?sheet=${sheet.id}`}
              className="flex items-center gap-3 rounded-[12px] border border-line bg-panel px-3.5 py-3 text-text no-underline"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold">{sheet.name}</span>
                  <Badge tone={sheet.is_public ? "win" : "muted"}>
                    {sheet.is_public ? "PUBLIK" : "PRIVAT"}
                  </Badge>
                </div>
                <div className="mt-0.5 text-[12.5px] text-muted">
                  {st.bets} spel · ROI {formatRoi(st.roi)}
                </div>
              </div>
              <span className={`font-mono-num font-semibold ${nettoColor(st.netto)}`}>
                {formatMoney(st.netto)}
              </span>
            </Link>
          ))}
          {!sheetStats.length ? (
            <div className="rounded-[12px] border border-line bg-panel px-4 py-8 text-center text-muted">
              Skapa din första spelbok under Böcker.
            </div>
          ) : null}
        </div>
      </div>

      <AdSlot
        placement="home"
        className="h-[100px]"
        label="ANNONSPLATS 320×100"
      />

      {openToday.length ? (
        <div>
          <h2 className="mb-2.5 font-display text-[17px] font-semibold uppercase tracking-[0.04em]">
            Dagens öppna spel
          </h2>
          <div className="space-y-2">
            {openToday.slice(0, 5).map((b) => (
              <div
                key={b.id}
                className="rounded-[12px] border border-line bg-panel px-3.5 py-3"
              >
                <div className="text-[12px] text-faint">{b.league || "Match"}</div>
                <div className="font-semibold">{b.match}</div>
                <div className="text-sm text-muted">
                  {b.pick} @ {Number(b.odds).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {recent.length ? (
        <div>
          <h2 className="mb-2.5 font-display text-[17px] font-semibold uppercase tracking-[0.04em]">
            Senaste resultat
          </h2>
          <div className="space-y-2">
            {recent.map((b) => {
              const n = betNetto(b);
              return (
                <div
                  key={b.id}
                  className="flex items-center gap-3 rounded-[12px] border border-line bg-panel px-3.5 py-3"
                >
                  <span
                    className={`h-2 w-2 rounded-full ${n >= 0 ? "bg-win" : "bg-loss"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{b.match}</div>
                    <div className="truncate text-[12.5px] text-muted">
                      {b.pick} @ {Number(b.odds).toFixed(2)}
                    </div>
                  </div>
                  <span className={`font-mono-num font-semibold ${nettoColor(n)}`}>
                    {formatMoney(n)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
