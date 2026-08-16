import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, Kpi, Panel } from "@/components/ui/Panel";
import {
  computeStats,
  formatMoney,
  formatNumber,
  formatRoi,
  nettoColor,
  cumulativeNetto,
} from "@/lib/utils";
import type { Bet } from "@/lib/types";
import { NettoChart } from "@/components/bets/NettoChart";
import { StatsAccordion } from "@/components/pwa/StatsAccordion";
import { MonthlyBars } from "@/components/pwa/MonthlyBars";

export default async function StatistikPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: betsData } = await supabase
    .from("bets")
    .select("*, bookmakers(id, name)")
    .eq("user_id", user.id)
    .order("placed_at", { ascending: true });

  const bets = (betsData || []) as Bet[];
  const stats = computeStats(bets);
  const series = cumulativeNetto(bets);

  const byLeague = Object.values(
    bets
      .filter((b) => b.result !== "open")
      .reduce<Record<string, { name: string; stake: number; payout: number; n: number }>>(
        (acc, b) => {
          const key = b.league || "Övrigt";
          if (!acc[key]) acc[key] = { name: key, stake: 0, payout: 0, n: 0 };
          acc[key].stake += Number(b.stake);
          acc[key].payout += Number(b.payout);
          acc[key].n += 1;
          return acc;
        },
        {}
      )
  )
    .map((r) => ({
      ...r,
      netto: r.payout - r.stake,
      roi: r.stake > 0 ? ((r.payout - r.stake) / r.stake) * 100 : 0,
    }))
    .sort((a, b) => b.netto - a.netto);

  const byBook = Object.values(
    bets
      .filter((b) => b.result !== "open")
      .reduce<Record<string, { name: string; stake: number; payout: number; n: number }>>(
        (acc, b) => {
          const key = b.bookmakers?.name || "Okänt";
          if (!acc[key]) acc[key] = { name: key, stake: 0, payout: 0, n: 0 };
          acc[key].stake += Number(b.stake);
          acc[key].payout += Number(b.payout);
          acc[key].n += 1;
          return acc;
        },
        {}
      )
  )
    .map((r) => ({
      ...r,
      netto: r.payout - r.stake,
      roi: r.stake > 0 ? ((r.payout - r.stake) / r.stake) * 100 : 0,
    }))
    .sort((a, b) => b.netto - a.netto);

  const byOdds = Object.values(
    bets
      .filter((b) => b.result !== "open")
      .reduce<Record<string, { name: string; stake: number; payout: number; n: number }>>(
        (acc, b) => {
          const o = Number(b.odds);
          const key =
            o < 1.5
              ? "< 1.50"
              : o < 2
                ? "1.50–1.99"
                : o < 3
                  ? "2.00–2.99"
                  : "3.00+";
          if (!acc[key]) acc[key] = { name: key, stake: 0, payout: 0, n: 0 };
          acc[key].stake += Number(b.stake);
          acc[key].payout += Number(b.payout);
          acc[key].n += 1;
          return acc;
        },
        {}
      )
  ).map((r) => ({
    ...r,
    netto: r.payout - r.stake,
    roi: r.stake > 0 ? ((r.payout - r.stake) / r.stake) * 100 : 0,
  }));

  const byMonth = Object.values(
    bets
      .filter((b) => b.result !== "open")
      .reduce<Record<string, { key: string; label: string; netto: number }>>(
        (acc, b) => {
          const d = new Date(b.placed_at);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          if (!acc[key]) {
            acc[key] = {
              key,
              label: d.toLocaleDateString("sv-SE", {
                month: "short",
                year: "2-digit",
              }),
              netto: 0,
            };
          }
          acc[key].netto += Number(b.payout) - Number(b.stake);
          return acc;
        },
        {}
      )
  ).sort((a, b) => a.key.localeCompare(b.key));

  return (
    <div className="animate-sbfade space-y-5">
      <div>
        <h1 className="font-display text-[28px] font-semibold lg:text-[32px]">
          Statistik
        </h1>
        <p className="text-muted">Över alla dina spreadsheets</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
        <Kpi label="Hitrate" value={`${formatNumber(stats.hitrate, 1)}%`} />
        <Kpi
          label="Omsättning"
          value={formatMoney(stats.stake).replace("+", "")}
        />
        <div className="lg:hidden">
          <Kpi label="Spel" value={String(stats.bets)} />
        </div>
        <div className="lg:hidden">
          <Kpi label="Öppna" value={String(stats.open)} />
        </div>
      </div>

      <Panel className="p-4">
        <div className="font-display mb-3 text-[17px] font-semibold">
          Ackumulerat netto
        </div>
        {series.length ? (
          <NettoChart points={series} />
        ) : (
          <EmptyState>
            Inga satta spel ännu — grafen fylls när du sätter resultat.
          </EmptyState>
        )}
      </Panel>

      {byMonth.length ? (
        <div className="lg:hidden">
          <Panel className="p-4">
            <div className="font-display mb-3 text-[17px] font-semibold">
              Netto per månad
            </div>
            <MonthlyBars months={byMonth} />
          </Panel>
        </div>
      ) : null}

      <StatsAccordion title="Per liga" rows={byLeague} />
      <StatsAccordion title="Per bolag" rows={byBook} />
      <StatsAccordion title="Per oddsintervall" rows={byOdds} />

      <div className="hidden gap-4 md:grid-cols-2 lg:grid">
        <Panel className="overflow-hidden">
          <div className="border-b border-line px-4 py-3 font-display text-[17px] font-semibold">
            Per liga
          </div>
          {byLeague.length ? (
            byLeague.map((r) => (
              <div
                key={r.name}
                className="flex items-center gap-3 border-b border-line-soft px-4 py-3 text-sm"
              >
                <div className="flex-1">
                  <div className="font-semibold">{r.name}</div>
                  <div className="text-[12px] text-muted">{r.n} spel</div>
                </div>
                <span
                  className={`font-mono-num font-semibold ${nettoColor(r.roi)}`}
                >
                  {formatRoi(r.roi)}
                </span>
                <span
                  className={`min-w-[88px] text-right font-mono-num font-semibold ${nettoColor(r.netto)}`}
                >
                  {formatMoney(r.netto)}
                </span>
              </div>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-muted">Ingen data</div>
          )}
        </Panel>

        <Panel className="overflow-hidden">
          <div className="border-b border-line px-4 py-3 font-display text-[17px] font-semibold">
            Per spelbolag
          </div>
          {byBook.length ? (
            byBook.map((r) => (
              <div
                key={r.name}
                className="flex items-center gap-3 border-b border-line-soft px-4 py-3 text-sm"
              >
                <div className="flex-1">
                  <div className="font-semibold">{r.name}</div>
                  <div className="text-[12px] text-muted">{r.n} spel</div>
                </div>
                <span
                  className={`font-mono-num font-semibold ${nettoColor(r.roi)}`}
                >
                  {formatRoi(r.roi)}
                </span>
                <span
                  className={`min-w-[88px] text-right font-mono-num font-semibold ${nettoColor(r.netto)}`}
                >
                  {formatMoney(r.netto)}
                </span>
              </div>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-muted">Ingen data</div>
          )}
        </Panel>
      </div>
    </div>
  );
}
