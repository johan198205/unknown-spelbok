"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AccumulatedNettoChart } from "@/components/bets/AccumulatedNettoChart";
import { BetForm, BetsTable } from "@/components/bets/BetForm";
import { LeagueLogo } from "@/components/bets/LeagueLogo";
import { useRyggaFlow } from "@/components/bets/RyggaSpelModal";
import {
  FollowSheetButtonStub,
  ShareSheetButton,
  SheetPublicToggle,
} from "@/components/bets/ShareSheetControls";
import { SheetDescriptionEdit } from "@/components/bets/SheetDescriptionEdit";
import { MobileBetCards } from "@/components/pwa/MobileBetCards";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Input";
import { Kpi } from "@/components/ui/Panel";
import {
  PERIOD_FILTER_OPTIONS,
  RESULT_FILTER_OPTIONS,
  SPORT_FILTER_OPTIONS,
  distinctLeagues,
  filterSheetBets,
  parseSheetFilters,
  sheetFiltersToParams,
  type ChartPeriodFilter,
  type SheetFilterState,
  type SheetPeriodFilter,
  type SheetResultFilter,
  type SheetSportFilter,
  type SheetViewMode,
} from "@/lib/sheet-filters";
import { betLeagueLogo } from "@/lib/logos";
import type { Bet, Bookmaker, Sheet } from "@/lib/types";
import { SpelbokStatsBottom } from "@/components/bets/SpelbokStatsBottom";
import type {
  AffiliateTopRow,
  BetStatsPayload,
  LeagueStatRow,
  PublicSheetLeaderboardRow,
} from "@/lib/bet-stats";
import {
  cn,
  computeStats,
  formatMoney,
  formatNumber,
  formatRoi,
  nettoColor,
} from "@/lib/utils";

export function SpelbokSheetView({
  sheet,
  bets,
  sheets,
  bookmakers,
  username,
  initialStats,
  initialLeagues,
  affiliates,
  publicSheets,
  mode = "owner",
  viewerSheets,
  unitSize = 100,
  isAuthenticated = true,
  ads,
}: {
  sheet: Sheet;
  bets: Bet[];
  sheets: Sheet[];
  bookmakers: Bookmaker[];
  username: string;
  initialStats: BetStatsPayload;
  initialLeagues: LeagueStatRow[];
  affiliates: AffiliateTopRow[];
  publicSheets: PublicSheetLeaderboardRow[];
  /** owner = egen spelbok; public = read-only delad vy */
  mode?: "owner" | "public";
  /** Visarens egna sheets (för Rygga) — särskilt på publika sidor */
  viewerSheets?: Sheet[];
  unitSize?: number;
  isAuthenticated?: boolean;
  /** Server-rendered AdSlots passed as children of the client boundary */
  ads?: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isOwner = mode === "owner";
  const ryggaSheets = viewerSheets ?? sheets;
  const { openRygga, modal: ryggaModal } = useRyggaFlow({
    sheets: ryggaSheets,
    unitSize,
    isAuthenticated,
  });

  const filters = useMemo(
    () => parseSheetFilters(searchParams),
    [searchParams]
  );

  const leagues = useMemo(() => distinctLeagues(bets), [bets]);
  const filtered = useMemo(
    () => filterSheetBets(bets, filters),
    [bets, filters]
  );
  const stats = useMemo(() => computeStats(filtered), [filtered]);

  function patchFilters(patch: Partial<SheetFilterState>) {
    const next = sheetFiltersToParams(
      { ...filters, ...patch },
      searchParams
    );
    const sheetId = searchParams.get("sheet");
    if (sheetId) next.set("sheet", sheetId);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="space-y-5">
      {ryggaModal}
      {ads}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="font-display text-[28px] font-semibold lg:text-[32px]">
              {sheet.name}
            </h2>
            <Badge
              tone={sheet.is_public ? "public" : "private"}
              className={
                sheet.is_public
                  ? "border border-win/45 bg-transparent"
                  : undefined
              }
            >
              {sheet.is_public ? "PUBLIK" : "PRIVAT"}
            </Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-1 text-[14px]">
            <span className="text-muted">av</span>
            <Link
              href={`/profil/${encodeURIComponent(username)}`}
              className="font-semibold text-blue no-underline hover:underline"
            >
              {username}
            </Link>
            <span className="text-muted">·</span>
            <SheetDescriptionEdit
              sheetId={sheet.id}
              description={sheet.description}
              canEdit={isOwner}
            />
          </div>
          {isOwner ? (
            <div className="mt-3 max-w-md space-y-2">
              <SheetPublicToggle
                sheetId={sheet.id}
                isPublic={sheet.is_public}
                slug={sheet.slug}
              />
              {sheet.is_public && sheet.slug ? (
                <div className="lg:hidden">
                  <ShareSheetButton slug={sheet.slug} />
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <FollowSheetButtonStub />
              {sheet.slug ? <ShareSheetButton slug={sheet.slug} /> : null}
            </div>
          )}
        </div>
        <div className="hidden shrink-0 items-start gap-2 lg:flex">
          {isOwner && sheet.is_public && sheet.slug ? (
            <ShareSheetButton slug={sheet.slug} />
          ) : null}
          {isOwner ? (
            <BetForm
              sheets={sheets}
              bookmakers={bookmakers}
              defaultSheetId={sheet.id}
            />
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <Kpi label="SPEL" value={String(filtered.length)} />
        <Kpi
          label="OMSÄTTNING"
          value={formatMoney(stats.stake).replace("+", "")}
        />
        <Kpi
          label="NETTO"
          value={formatMoney(stats.netto)}
          color={nettoColor(stats.netto)}
        />
        <Kpi
          label="ROI"
          value={formatRoi(stats.roi)}
          color={nettoColor(stats.roi)}
        />
        <Kpi label="HITRATE" value={`${formatNumber(stats.hitrate, 1)}%`} />
        <Kpi label="SNITTODDS" value={formatNumber(stats.avgOdds, 2)} />
        <Kpi
          label="SNITTINSATS"
          value={formatMoney(Math.round(stats.avgStake)).replace("+", "")}
        />
      </div>

      <AccumulatedNettoChart
        bets={filtered}
        period={filters.chart}
        onPeriodChange={(chart: ChartPeriodFilter) => patchFilters({ chart })}
      />

      <SheetFilterBar
        filters={filters}
        leagues={leagues}
        filteredCount={filtered.length}
        totalCount={bets.length}
        onChange={patchFilters}
      />

      {filters.view === "table" ? (
        <div className="hidden lg:block">
          <BetsTable
            bets={filtered}
            canEdit={isOwner}
            canRygga
            onRygga={openRygga}
          />
        </div>
      ) : (
        <div className="hidden lg:block">
          <DesktopBetCards bets={filtered} />
        </div>
      )}

      <MobileBetCards
        bets={filtered}
        sheetId={sheet.id}
        canEdit={isOwner}
        canRygga
        onRygga={openRygga}
        hideChrome
      />

      <SpelbokStatsBottom
        sheetId={sheet.id}
        initialStats={initialStats}
        initialLeagues={initialLeagues}
        affiliates={affiliates}
        publicSheets={publicSheets}
      />
    </div>
  );
}

function SheetFilterBar({
  filters,
  leagues,
  filteredCount,
  totalCount,
  onChange,
}: {
  filters: SheetFilterState;
  leagues: ReturnType<typeof distinctLeagues>;
  filteredCount: number;
  totalCount: number;
  onChange: (patch: Partial<SheetFilterState>) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Select
        label="Sport"
        value={filters.sport}
        onChange={(e) =>
          onChange({ sport: e.target.value as SheetSportFilter })
        }
        className="min-w-[150px] py-2.5"
      >
        {SPORT_FILTER_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>

      <LeagueSelect
        value={filters.league}
        leagues={leagues}
        onChange={(league) => onChange({ league })}
      />

      <Select
        label="Rättning"
        value={filters.result}
        onChange={(e) =>
          onChange({ result: e.target.value as SheetResultFilter })
        }
        className="min-w-[150px] py-2.5"
      >
        {RESULT_FILTER_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>

      <Select
        label="Period"
        value={filters.period}
        onChange={(e) =>
          onChange({ period: e.target.value as SheetPeriodFilter })
        }
        className="min-w-[150px] py-2.5"
      >
        {PERIOD_FILTER_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>

      <div className="ml-auto flex flex-wrap items-end gap-3 pb-0.5">
        <span className="pb-2.5 font-mono-num text-[13px] text-muted">
          {filteredCount} av {totalCount} spel
        </span>
        <div className="hidden flex-col gap-1 lg:flex">
          <div className="text-[10px] uppercase tracking-[0.12em] text-muted">
            Vy
          </div>
          <div className="flex gap-[3px] rounded-[9px] border border-[#1C2333] bg-bg p-[3px]">
            {(
              [
                { value: "table" as const, label: "Tabell" },
                { value: "cards" as const, label: "Kort" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ view: opt.value as SheetViewMode })}
                className={cn(
                  "rounded-[7px] px-3 py-1.5 text-[13px] font-semibold transition",
                  filters.view === opt.value
                    ? "bg-[#1B2436] text-text"
                    : "bg-transparent text-muted hover:text-text"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LeagueSelect({
  value,
  leagues,
  onChange,
}: {
  value: string;
  leagues: ReturnType<typeof distinctLeagues>;
  onChange: (league: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = leagues.find((l) => l.name === value);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className="relative min-w-[170px]">
      <div className="mb-1.5 text-[11px] uppercase tracking-[0.12em] text-muted">
        Liga
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full min-w-[170px] items-center gap-2 rounded-[9px] border border-line bg-bg-soft px-3 py-2.5 text-left text-[15px] text-text"
      >
        {selected ? (
          <LeagueLogo
            src={selected.logo}
            leagueId={selected.leagueId}
            sport={selected.sport}
            name={selected.name}
            size={18}
          />
        ) : null}
        <span className="flex-1 truncate">
          {selected?.name || "Alla ligor"}
        </span>
        <span className="text-[11px] text-faint">▾</span>
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-30 mt-1.5 max-h-[300px] min-w-full overflow-auto rounded-[11px] border border-line-strong bg-panel-elevated p-1.5 shadow-[0_18px_50px_rgba(0,0,0,.6)]">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className={cn(
              "flex w-full items-center gap-2 rounded-[7px] px-2.5 py-2 text-left text-[13.5px]",
              !value
                ? "bg-[#1F293C] text-text"
                : "text-[#C3CBDB] hover:bg-[#1F293C]"
            )}
          >
            Alla ligor
          </button>
          {leagues.map((l) => (
            <button
              key={l.name}
              type="button"
              onClick={() => {
                onChange(l.name);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-[7px] px-2.5 py-2 text-left text-[13.5px]",
                value === l.name
                  ? "bg-[#1F293C] text-text"
                  : "text-[#C3CBDB] hover:bg-[#1F293C]"
              )}
            >
              <LeagueLogo
                src={l.logo}
                leagueId={l.leagueId}
                sport={l.sport}
                name={l.name}
                size={18}
              />
              <span className="truncate">{l.name}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DesktopBetCards({ bets }: { bets: Bet[] }) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {bets.map((bet) => {
        const netto =
          bet.result === "open"
            ? null
            : Number(bet.payout) - Number(bet.stake);
        return (
          <div
            key={bet.id}
            className="rounded-[12px] border border-line bg-panel px-3.5 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-semibold">{bet.match}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-muted">
                  {bet.league ? (
                    <LeagueLogo
                      src={betLeagueLogo(bet)}
                      leagueId={bet.league_id ?? bet.fixtures?.league_id}
                      sport={bet.sport ?? bet.fixtures?.sport}
                      name={bet.league}
                      size={14}
                    />
                  ) : null}
                  <span>
                    {bet.league || "—"} · {bet.pick} ·{" "}
                    {Number(bet.odds).toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-mono-num text-[13px] text-muted">
                  {formatMoney(Number(bet.stake)).replace("+", "")}
                </div>
                <div
                  className={`font-mono-num text-sm font-semibold ${
                    netto == null ? "text-muted" : nettoColor(netto)
                  }`}
                >
                  {netto == null ? "—" : formatMoney(netto)}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      {!bets.length ? (
        <div className="col-span-full rounded-[12px] border border-line bg-panel px-4 py-10 text-center text-muted">
          Inga spel ännu.
        </div>
      ) : null}
    </div>
  );
}
