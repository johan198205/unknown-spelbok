"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BetForm } from "@/components/bets/BetForm";
import {
  DistributionCard,
  type DistributionGroups,
} from "@/components/bets/DistributionCard";
import { ImportBetsButton } from "@/components/bets/ImportBetsModal";
import { useRyggaFlow } from "@/components/bets/RyggaSpelModal";
import {
  FollowSheetButtonStub,
  ShareSheetButton,
  SheetVisibilityBadge,
} from "@/components/bets/ShareSheetControls";
import { SheetAffiliateTop3 } from "@/components/bets/SheetAffiliateTop3";
import { SheetBetCards } from "@/components/bets/SheetBetCards";
import { SheetBetsTable } from "@/components/bets/SheetBetsTable";
import { SheetDescriptionEdit } from "@/components/bets/SheetDescriptionEdit";
import { SheetFilterBar } from "@/components/bets/SheetFilterBar";
import { SheetKpiStrip } from "@/components/bets/SheetKpiStrip";
import { SheetNettoChart } from "@/components/bets/SheetNettoChart";
import { SheetPagination } from "@/components/bets/SheetPagination";
import { SheetStatsPanel } from "@/components/bets/SheetStatsPanel";
import { DailySuggestions } from "@/components/suggestions/DailySuggestions";
import { MobileBetCards } from "@/components/pwa/MobileBetCards";
import { useLiveFixtures } from "@/hooks/useLiveFixtures";
import { track } from "@/lib/analytics";
import type { AffiliateTopRow, BetStatsPayload } from "@/lib/bet-stats";
import {
  bookmakerKey,
  categoryKey,
  groupBets,
  leagueKey,
  oddsKey,
  pickKey,
  sportKey,
} from "@/lib/breakdowns";
import { applyLiveToBet, needsLiveRefresh } from "@/lib/live-fixture";
import {
  DEFAULT_SHEET_SORT,
  distinctBookmakers,
  distinctCategories,
  distinctLeagues,
  filterSheetBets,
  parseSheetFilters,
  periodLabel,
  sheetFiltersToParams,
  sortSheetBets,
  type SheetFilterState,
  type SheetSortKey,
} from "@/lib/sheet-filters";
import { createClient } from "@/lib/supabase/client";
import type { DailySuggestion } from "@/lib/suggestions";
import type { Bet, Bookmaker, Sheet } from "@/lib/types";
import { computeStats } from "@/lib/utils";

const PAGE_SIZE = 25;

export function SpelbokSheetView({
  sheet,
  bets,
  sheets,
  bookmakers,
  username,
  initialStats,
  affiliates,
  mode = "owner",
  viewerSheets,
  unitSize = 100,
  isAuthenticated = true,
  suggestions,
}: {
  sheet: Sheet;
  bets: Bet[];
  sheets: Sheet[];
  bookmakers: Bookmaker[];
  username: string;
  initialStats: BetStatsPayload;
  affiliates: AffiliateTopRow[];
  /** owner = egen spelbok; public = read-only delad vy */
  mode?: "owner" | "public";
  /** Visarens egna sheets (för Rygga) — särskilt på publika sidor */
  viewerSheets?: Sheet[];
  unitSize?: number;
  isAuthenticated?: boolean;
  /**
   * Spelbokens egna dagsförslag. Skickas bara för ägaren — den publika
   * vyn ska inte avslöja vad någon annans historik matchar mot.
   */
  suggestions?: DailySuggestion[];
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

  // En view per spelbok och sidvisning. Filterbyten skriver om URL:en med
  // router.replace, så effekten får inte hänga på pathname/searchParams.
  const viewedRef = useRef<string | null>(null);
  useEffect(() => {
    const slug = sheet.slug ?? sheet.id;
    if (viewedRef.current === slug) return;
    viewedRef.current = slug;
    track({ event: "view_spelbok", slug, is_owner: isOwner });
  }, [sheet.slug, sheet.id, isOwner]);

  const leagues = useMemo(() => distinctLeagues(bets), [bets]);
  const categories = useMemo(() => distinctCategories(bets), [bets]);
  const bookmakerOptions = useMemo(() => distinctBookmakers(bets), [bets]);
  const filtered = useMemo(
    () => filterSheetBets(bets, filters),
    [bets, filters]
  );
  const stats = useMemo(() => computeStats(filtered), [filtered]);

  const [sort, setSort] = useState(DEFAULT_SHEET_SORT);

  // Filterbyte får aldrig lämna kvar sida 7 av 3 — sidan hör ihop med det
  // urval den bläddrar i, så den nollställs när urvalet byts.
  const filterKey = `${sheet.id}|${filters.sport}|${filters.league}|${filters.category}|${filters.bookmaker}|${filters.result}|${filters.period}`;
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = (next: number) => setPageState({ key: filterKey, page: next });

  const sorted = useMemo(
    () => sortSheetBets(filtered, sort.key, sort.dir),
    [filtered, sort]
  );
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageBets = useMemo(
    () => sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [sorted, currentPage]
  );

  const live = useLiveFixtures(
    pageBets.map((b) => b.fixture_id).filter((id): id is number => id != null),
    {
      hasLive: pageBets.some((b) =>
        needsLiveRefresh(b.fixtures?.status, b.fixtures?.kickoff)
      ),
      onSettled: () => router.refresh(),
    }
  );
  const rows = useMemo(
    () => pageBets.map((bet) => applyLiveToBet(bet, live)),
    [pageBets, live]
  );

  const groups: DistributionGroups = useMemo(() => {
    const settled = filtered.filter((b) => b.result !== "open");
    return {
      liga: groupBets(settled, leagueKey),
      kategori: groupBets(settled, categoryKey),
      spelform: groupBets(settled, pickKey),
      spelbolag: groupBets(settled, bookmakerKey),
      sport: groupBets(settled, sportKey),
      odds: groupBets(settled, oddsKey),
    };
  }, [filtered]);

  function patchFilters(patch: Partial<SheetFilterState>) {
    const next = sheetFiltersToParams({ ...filters, ...patch }, searchParams);
    const sheetId = searchParams.get("sheet");
    if (sheetId) next.set("sheet", sheetId);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function toggleSort(key: SheetSortKey) {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "date" ? "desc" : "asc" }
    );
  }

  async function removeBet(bet: Bet) {
    if (!confirm("Ta bort spelet?")) return;
    const supabase = createClient();
    await supabase.from("bets").delete().eq("id", bet.id);
    router.refresh();
  }

  const listProps = {
    bets: rows,
    canEdit: isOwner,
    canRygga: true,
    onRygga: openRygga,
    onRemove: isOwner ? removeBet : undefined,
    density: filters.density,
  };

  return (
    <div>
      {ryggaModal}

      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-[28px] font-semibold lg:text-[32px]">
              {sheet.name}
            </h1>
            <SheetVisibilityBadge
              sheetId={sheet.id}
              isPublic={sheet.is_public}
              slug={sheet.slug}
              canEdit={isOwner}
            />
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
        </div>

        <div className="flex shrink-0 flex-wrap items-start gap-2">
          {sheet.is_public && sheet.slug ? (
            <ShareSheetButton slug={sheet.slug} />
          ) : null}
          {isOwner ? (
            <>
              <ImportBetsButton sheetId={sheet.id} />
              <BetForm
                sheets={sheets}
                bookmakers={bookmakers}
                defaultSheetId={sheet.id}
              />
            </>
          ) : (
            <FollowSheetButtonStub />
          )}
        </div>
      </div>

      {isOwner && suggestions?.length ? (
        <div className="mb-[26px]">
          <DailySuggestions initial={suggestions} scope="sheet" />
        </div>
      ) : null}

      <div className="mb-[26px]">
        <SheetKpiStrip stats={stats} betCount={filtered.length} />
      </div>

      <div className="mb-[26px]">
        <SheetNettoChart
          bets={filtered}
          periodLabel={periodLabel(filters.period)}
        />
      </div>

      <div className="mb-4">
        <SheetFilterBar
          filters={filters}
          leagues={leagues}
          categories={categories}
          bookmakers={bookmakerOptions}
          filteredCount={filtered.length}
          totalCount={bets.length}
          onChange={patchFilters}
        />
      </div>

      {/* ≥1180px: tabell eller kort, användarens val. */}
      <div className="hidden sheet:block">
        {filters.view === "table" ? (
          <SheetBetsTable
            {...listProps}
            sortKey={sort.key}
            sortDir={sort.dir}
            onSort={toggleSort}
          />
        ) : (
          <SheetBetCards {...listProps} />
        )}
      </div>

      {/* 1024–1179px: tabellen får inte plats, kortvyn tar över. */}
      <div className="hidden lg:block sheet:hidden">
        <SheetBetCards {...listProps} />
      </div>

      {/* Under 1024px: PWA-korten med swipe och offline-kö. */}
      <MobileBetCards
        bets={rows}
        sheetId={sheet.id}
        canEdit={isOwner}
        canRygga
        onRygga={openRygga}
        hideChrome
      />

      {pageCount > 1 ? (
        <div className="mb-[26px] mt-[22px]">
          <SheetPagination
            page={currentPage}
            pageCount={pageCount}
            onPage={setPage}
          />
        </div>
      ) : (
        <div className="mb-[26px]" />
      )}

      <div className="mb-[26px]">
        <SheetStatsPanel sheetId={sheet.id} initialStats={initialStats} />
      </div>

      <div className="grid items-start gap-[18px] lg:grid-cols-[minmax(0,1fr)_320px]">
        <DistributionCard groups={groups} size="regular" />
        <SheetAffiliateTop3 affiliates={affiliates} />
      </div>
    </div>
  );
}
