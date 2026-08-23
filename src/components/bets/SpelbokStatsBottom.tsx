"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  STATS_PERIODS,
  formatRoiPlain,
  formatRoiStats,
  wageringLabel,
  type AffiliateTopRow,
  type BetStatsPayload,
  type LeagueStatRow,
  type PublicSheetLeaderboardRow,
  type SheetBreakdowns,
  type StatsPeriod,
} from "@/lib/bet-stats";
import { BreakdownCard } from "@/components/bets/BreakdownCard";
import { cn, formatMoney, formatNumber, nettoColor } from "@/lib/utils";

type Props = {
  sheetId: string;
  initialPeriod?: StatsPeriod;
  initialStats: BetStatsPayload;
  initialLeagues: LeagueStatRow[];
  initialBreakdowns: SheetBreakdowns;
  affiliates: AffiliateTopRow[];
  publicSheets: PublicSheetLeaderboardRow[];
};

export function SpelbokStatsBottom({
  sheetId,
  initialPeriod = "all",
  initialStats,
  initialLeagues,
  initialBreakdowns,
  affiliates,
  publicSheets,
}: Props) {
  const [period, setPeriod] = useState<StatsPeriod>(initialPeriod);
  const [stats, setStats] = useState(initialStats);
  const [leagues, setLeagues] = useState(initialLeagues);
  const [breakdowns, setBreakdowns] = useState(initialBreakdowns);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPeriod("all");
    setStats(initialStats);
    setLeagues(initialLeagues);
    setBreakdowns(initialBreakdowns);
  }, [initialStats, initialLeagues, initialBreakdowns, sheetId]);

  async function selectPeriod(next: StatsPeriod) {
    if (next === period || loading) return;
    setPeriod(next);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/sheets/stats?sheetId=${encodeURIComponent(sheetId)}&period=${next}`
      );
      if (!res.ok) return;
      const data = (await res.json()) as {
        stats: BetStatsPayload;
        leagues: LeagueStatRow[];
        breakdowns: SheetBreakdowns;
      };
      setStats(data.stats);
      setLeagues(data.leagues);
      setBreakdowns(data.breakdowns);
    } finally {
      setLoading(false);
    }
  }

  const emptyText =
    period === "all"
      ? "Inga avgjorda spel ännu."
      : "Inga avgjorda spel i perioden.";

  return (
    <div className="space-y-5">
      <StatsPanel
        period={period}
        onPeriodChange={selectPeriod}
        stats={stats}
        loading={loading}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <BreakdownCard
          title="Per spelbolag"
          rows={breakdowns.bookmakers}
          loading={loading}
          empty={emptyText}
        />
        <BreakdownCard
          title="Per spelform"
          rows={breakdowns.picks}
          loading={loading}
          empty={emptyText}
        />
        <BreakdownCard
          title="Per sport"
          rows={breakdowns.sports}
          loading={loading}
          empty={emptyText}
        />
      </div>
      <BottomGrid
        affiliates={affiliates}
        leagues={leagues}
        publicSheets={publicSheets}
        leaguesLoading={loading}
      />
    </div>
  );
}

function StatsPanel({
  period,
  onPeriodChange,
  stats,
  loading,
}: {
  period: StatsPeriod;
  onPeriodChange: (p: StatsPeriod) => void;
  stats: BetStatsPayload;
  loading: boolean;
}) {
  const groups: {
    title: string;
    rows: { label: string; value: string; color?: string }[];
  }[] = [
    {
      title: "Spel",
      rows: [
        { label: "Antal spel", value: String(stats.antal_spel) },
        { label: "Vinster", value: String(stats.vinster) },
        { label: "Förluster", value: String(stats.forluster) },
        { label: "Void", value: String(stats.void) },
        { label: "Öppna spel", value: String(stats.oppna_spel) },
        {
          label: "Öppen risk",
          value: formatMoney(stats.oppen_risk).replace("+", ""),
        },
        {
          label: "Öppen potentiell vinst",
          value: formatMoney(stats.oppen_potentiell_vinst).replace("+", ""),
        },
      ],
    },
    {
      title: "Pengar",
      rows: [
        {
          label: "Insats",
          value: formatMoney(stats.insats).replace("+", ""),
        },
        {
          label: "Vunnet",
          value: formatMoney(stats.vunnet),
          color: nettoColor(stats.vunnet),
        },
        {
          label: "Förlorat",
          value: formatMoney(stats.forlorat),
          color: nettoColor(stats.forlorat),
        },
        {
          label: "Netto",
          value: formatMoney(stats.netto),
          color: nettoColor(stats.netto),
        },
        {
          label: "ROI",
          value: formatRoiStats(stats.roi),
          color: nettoColor(stats.roi),
        },
        {
          label: "1 unit",
          value: formatMoney(stats.unit_size).replace("+", ""),
        },
        {
          label: "Unitnetto",
          value:
            (stats.unitnetto > 0 ? "+" : "") +
            formatNumber(stats.unitnetto, 2),
          color: nettoColor(stats.unitnetto),
        },
      ],
    },
    {
      title: "Snitt",
      rows: [
        {
          label: "Vinstprocent",
          value: `${formatNumber(stats.vinstprocent, 2)}%`,
        },
        { label: "Medelodds", value: formatNumber(stats.medelodds, 2) },
        {
          label: "Medelinsats",
          value: formatMoney(Math.round(stats.medelinsats)).replace("+", ""),
        },
        {
          label: "Medelvinst",
          value: formatMoney(stats.medelvinst),
          color: nettoColor(stats.medelvinst),
        },
      ],
    },
  ];

  return (
    <section className="overflow-hidden rounded-[var(--radius-panel)] border border-line bg-panel">
      <div className="flex flex-col gap-3 border-b border-line px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-display text-[17px] font-semibold uppercase tracking-[0.06em]">
          Statistik
        </h3>
        <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-[13px]">
          {STATS_PERIODS.map((p, i) => (
            <span key={p.value} className="flex items-center gap-1">
              {i > 0 ? (
                <span className="px-0.5 text-faint" aria-hidden>
                  |
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => onPeriodChange(p.value)}
                className={cn(
                  "border-b-2 pb-0.5 transition",
                  period === p.value
                    ? "border-win font-semibold text-win"
                    : "border-transparent text-muted hover:text-text"
                )}
              >
                {p.label}
              </button>
            </span>
          ))}
        </div>
      </div>

      <div
        className={cn(
          "grid gap-6 px-4 py-4 transition-opacity sm:grid-cols-2 lg:grid-cols-3",
          loading && "opacity-55"
        )}
      >
        {loading && !stats.antal_spel ? (
          <StatsSkeleton />
        ) : (
          groups.map((g) => (
            <div key={g.title} className="space-y-2">
              {g.rows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-baseline justify-between gap-3 text-[13.5px]"
                >
                  <span className="text-muted">{row.label}</span>
                  <span
                    className={cn(
                      "font-mono-num font-semibold tabular-nums",
                      row.color || "text-text"
                    )}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function StatsSkeleton() {
  return (
    <>
      {[0, 1, 2].map((col) => (
        <div key={col} className="space-y-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-4 animate-pulse rounded bg-panel-2"
            />
          ))}
        </div>
      ))}
    </>
  );
}

function BottomGrid({
  affiliates,
  leagues,
  publicSheets,
  leaguesLoading,
}: {
  affiliates: AffiliateTopRow[];
  leagues: LeagueStatRow[];
  publicSheets: PublicSheetLeaderboardRow[];
  leaguesLoading: boolean;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr_1.4fr]">
      <AffiliatesCard affiliates={affiliates} />
      <LeaguesCard leagues={leagues} loading={leaguesLoading} />
      <PublicSheetsCard sheets={publicSheets} />
    </div>
  );
}

function AffiliatesCard({ affiliates }: { affiliates: AffiliateTopRow[] }) {
  return (
    <section className="rounded-[var(--radius-panel)] border border-line bg-panel p-4">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h3 className="font-display text-[17px] font-semibold uppercase tracking-[0.05em]">
          Topp 3 spelbolag
        </h3>
        <Link
          href="/spelbolag"
          className="shrink-0 text-[13px] font-semibold text-cyan no-underline hover:text-[#7fe7fa] hover:underline"
        >
          Hela listan
        </Link>
      </div>
      <p className="mb-3 text-[11.5px] text-faint">Reklamlänkar · 18+</p>

      {!affiliates.length ? (
        <p className="py-6 text-center text-[13px] text-muted">
          Inga spelbolag just nu.
        </p>
      ) : (
        <div className="space-y-2.5">
          {affiliates.map((bm, i) => (
            <article
              key={bm.id}
              className="overflow-hidden rounded-[11px] border border-line-strong"
            >
              <div className="relative flex items-center gap-2 bg-[#152032] px-3 py-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] bg-[#0F1420] font-mono-num text-[12px] font-bold text-text">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate font-display text-[15px] font-semibold tracking-[0.02em]">
                  {bm.name}
                </span>
                {bm.rating != null ? (
                  <span className="shrink-0 rounded-full bg-[rgba(15,20,32,.72)] px-2 py-0.5 font-mono-num text-[11.5px] font-semibold text-[#FFD166]">
                    ★ {Number(bm.rating).toLocaleString("sv-SE", {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}
                  </span>
                ) : null}
              </div>
              <div className="bg-[#F4F6FA] px-3 py-3 text-center">
                <div className="font-mono-num text-[22px] font-bold leading-none text-[#12171F]">
                  {bm.bonus_value
                    ? `${bm.bonus_value.toLocaleString("sv-SE")} kr`
                    : bm.bonus || "—"}
                </div>
                <div className="mt-1 text-[11.5px] text-[#6B7688]">
                  {wageringLabel(bm)}
                </div>
              </div>
              <a
                href={`/go/${bm.slug}?src=spelbok_topp3`}
                target="_blank"
                rel="sponsored noopener"
                className="block bg-win px-3 py-2.5 text-center font-display text-[14px] font-bold tracking-[0.08em] text-win-ink no-underline hover:brightness-105 hover:no-underline"
              >
                HÄMTA BONUS
              </a>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function LeaguesCard({
  leagues,
  loading,
}: {
  leagues: LeagueStatRow[];
  loading: boolean;
}) {
  return (
    <section className="rounded-[var(--radius-panel)] border border-line bg-panel p-4">
      <h3 className="mb-3 font-display text-[17px] font-semibold uppercase tracking-[0.05em]">
        Bäst per liga
      </h3>
      <div className={cn("space-y-1", loading && "opacity-55")}>
        {loading && !leagues.length ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-9 animate-pulse rounded-[8px] bg-panel-2"
            />
          ))
        ) : leagues.length ? (
          leagues.map((row) => (
            <div
              key={row.league}
              className="flex items-center gap-3 rounded-[8px] px-1 py-2"
            >
              <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">
                {row.league}
              </span>
              <span className="shrink-0 font-mono-num text-[12.5px] text-muted">
                {row.bets} spel
              </span>
              <span
                className={cn(
                  "w-[7.5rem] shrink-0 text-right font-mono-num text-[13.5px] font-semibold",
                  nettoColor(row.netto)
                )}
              >
                {formatMoney(row.netto)}
              </span>
            </div>
          ))
        ) : (
          <p className="py-6 text-center text-[13px] text-muted">
            Inga avgjorda spel i perioden.
          </p>
        )}
      </div>
    </section>
  );
}

function PublicSheetsCard({
  sheets,
}: {
  sheets: PublicSheetLeaderboardRow[];
}) {
  return (
    <section className="rounded-[var(--radius-panel)] border border-line bg-panel p-4">
      <h3 className="mb-3 font-display text-[17px] font-semibold uppercase tracking-[0.05em]">
        Andra spelböcker
      </h3>
      <div className="space-y-1">
        {sheets.length ? (
          sheets.map((row) => (
            <Link
              key={row.sheet_id}
              href={
                row.sheet_slug
                  ? `/s/${encodeURIComponent(row.sheet_slug)}`
                  : `/profil/${encodeURIComponent(row.username)}`
              }
              className="flex items-center gap-3 rounded-[8px] px-1 py-2 text-text no-underline hover:bg-panel-2 hover:no-underline"
            >
              <span className="min-w-0 flex-1 truncate text-[14px]">
                <span className="font-semibold">{row.sheet_name}</span>
                <span className="text-muted"> · {row.username}</span>
              </span>
              <span
                className={cn(
                  "shrink-0 font-mono-num text-[13.5px] font-semibold",
                  nettoColor(row.roi)
                )}
              >
                {formatRoiPlain(row.roi, 1)}
              </span>
            </Link>
          ))
        ) : (
          <p className="py-6 text-center text-[13px] text-muted">
            Inga publika spelböcker med minst 10 spel ännu.
          </p>
        )}
      </div>
    </section>
  );
}
