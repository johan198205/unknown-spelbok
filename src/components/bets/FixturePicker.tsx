"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Calendar } from "lucide-react";
import type { Fixture } from "@/lib/types";
import { FixtureMatch } from "@/components/bets/FixtureMatch";
import { LeagueLogo } from "@/components/bets/LeagueLogo";
import { TeamLogo } from "@/components/bets/TeamPair";
import { SearchDropdown, type DropdownOption } from "@/components/ui/SearchDropdown";
import { useLiveFixtures } from "@/hooks/useLiveFixtures";
import {
  finishedPickerMeta,
  isFinishedStatus,
  mergeLivePatch,
  needsLiveRefresh,
} from "@/lib/live-fixture";
import { teamLogoUrl } from "@/lib/logos";
import {
  addStockholmDays,
  fixtureDayChips,
  FIXTURE_PICKER_FUTURE_DAYS,
  stockholmYmd,
  type DayChip,
} from "@/lib/stockholm";
import { cn } from "@/lib/utils";

type Coverage = { from: string; to: string };

export type PickerFixture = Fixture & { venue?: string | null };

const PICKER_SPORTS = ["Fotboll", "Ishockey"] as const;
/** Sentinel — liga är valfritt filter, inte ett obligatoriskt steg */
const ALL_LEAGUES = "__all__";

type LeagueGroup = {
  key: string;
  name: string;
  logo: string | null;
  leagueId: number | null;
  sport: string | null;
  rows: PickerFixture[];
};

function formatRange(from: string, to: string) {
  const fmt = (ymd: string) => {
    const [year, month, day] = ymd.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("sv-SE", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  };
  return `${fmt(from)} – ${fmt(to)}`;
}

function chipLabel(chip: DayChip) {
  if (chip.isToday) return "Idag";
  if (chip.isTomorrow) return "Imorgon";
  if (chip.isYesterday) return "Igår";
  return chip.weekday;
}

export function DayStrip({
  ymd,
  onChange,
}: {
  ymd: string;
  onChange: (ymd: string) => void;
}) {
  const chips = useMemo(() => fixtureDayChips(), []);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const today = stockholmYmd();
  const inStrip = chips.some((chip) => chip.ymd === ymd);
  const maxYmd = addStockholmDays(today, FIXTURE_PICKER_FUTURE_DAYS);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const selected = scroller.querySelector<HTMLElement>(`[data-ymd="${ymd}"]`);
    if (!selected) return;
    const left =
      selected.offsetLeft - scroller.clientWidth / 2 + selected.offsetWidth / 2;
    scroller.scrollLeft = Math.max(0, left);
  }, [ymd]);

  return (
    <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 sb-scroll" ref={scrollerRef}>
      <label
        className={cn(
          "sticky left-0 z-10 mr-0.5 flex shrink-0 cursor-pointer flex-col items-center justify-center rounded-[10px] border px-2.5 py-2",
          !inStrip
            ? "border-win bg-win/10 text-win"
            : "border-line bg-panel text-muted hover:text-text"
        )}
      >
        <Calendar className="size-3.5" strokeWidth={2.25} />
        <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.08em]">
          Datum
        </span>
        <input
          type="date"
          value={ymd}
          max={maxYmd}
          onChange={(event) => {
            const next = event.target.value;
            if (/^\d{4}-\d{2}-\d{2}$/.test(next)) onChange(next);
          }}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Välj datum"
        />
      </label>
      {chips.map((chip) => {
        const selected = chip.ymd === ymd;
        return (
          <button
            key={chip.ymd}
            type="button"
            data-ymd={chip.ymd}
            onClick={() => onChange(chip.ymd)}
            className={cn(
              "shrink-0 rounded-[10px] border px-2.5 py-2 text-center",
              selected
                ? "border-win bg-win/10 text-win"
                : "border-line bg-bg-soft text-muted hover:text-text"
            )}
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em]">
              {chipLabel(chip)}
            </div>
            <div className="font-mono-num text-[13px] font-semibold leading-tight">
              {chip.day}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function FinishedPickerOption({ fixture }: { fixture: PickerFixture }) {
  const row = finishedPickerMeta(fixture);
  if (!row) return null;
  return (
    <span className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-[13px] leading-snug text-text">
      <TeamLogo
        src={teamLogoUrl(fixture.home_logo, fixture.home_team_id, fixture.sport)}
        size={18}
        initial={row.home}
      />
      <span className="min-w-0 truncate font-semibold">{row.home}</span>
      <span className="shrink-0 text-faint">–</span>
      <TeamLogo
        src={teamLogoUrl(fixture.away_logo, fixture.away_team_id, fixture.sport)}
        size={18}
        initial={row.away}
      />
      <span className="min-w-0 truncate font-semibold">{row.away}</span>
      <span className="shrink-0 font-mono-num font-semibold">{row.score}</span>
      {row.meta ? (
        <span className="min-w-0 truncate text-faint">· {row.meta}</span>
      ) : null}
    </span>
  );
}

function PickerMatchOption({ fixture }: { fixture: PickerFixture }) {
  if (finishedPickerMeta(fixture)) {
    return <FinishedPickerOption fixture={fixture} />;
  }
  return <FixtureMatch fixture={fixture} />;
}

export function FixturePicker({
  onSelect,
  onMetaChange,
  active = true,
  ymd,
  onYmdChange,
}: {
  onSelect: (fixture: PickerFixture) => void;
  onMetaChange?: (meta: {
    sport?: string | null;
    league?: string | null;
    leagueId?: number | null;
    leagueLogo?: string | null;
  }) => void;
  active?: boolean;
  ymd?: string;
  onYmdChange?: (ymd: string) => void;
}) {
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [internalYmd, setInternalYmd] = useState(stockholmYmd());
  const selectedYmd = ymd ?? internalYmd;
  const setSelectedYmd = onYmdChange ?? setInternalYmd;
  const [sport, setSport] = useState<string | null>(null);
  const [leagueKey, setLeagueKey] = useState(ALL_LEAGUES);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<PickerFixture[]>([]);
  const [loading, setLoading] = useState(false);
  const [filling, setFilling] = useState(false);
  const [planLimited, setPlanLimited] = useState(false);

  function pickSport(next: string) {
    setSport(next);
    setLeagueKey(ALL_LEAGUES);
    setQ("");
    onMetaChange?.({
      sport: next,
      league: null,
      leagueId: null,
      leagueLogo: null,
    });
  }

  function changeYmd(next: string) {
    setSelectedYmd(next);
    setLeagueKey(ALL_LEAGUES);
    setQ("");
  }

  function clearLeagueFilter() {
    setLeagueKey(ALL_LEAGUES);
    onMetaChange?.({
      sport,
      league: null,
      leagueId: null,
      leagueLogo: null,
    });
  }

  useEffect(() => {
    if (!active || !sport) {
      setItems([]);
      setLoading(false);
      setFilling(false);
      return;
    }
    const sportParam = sport;
    let cancelled = false;
    let poll: ReturnType<typeof setTimeout> | undefined;

    async function load(initial: boolean) {
      if (initial) setLoading(true);
      try {
        const params = new URLSearchParams({
          date: selectedYmd,
          sport: sportParam,
          limit: "500",
        });
        const res = await fetch(`/api/fixtures?${params}`, { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        if (json.coverage?.from && json.coverage?.to) {
          setCoverage(json.coverage);
        }
        setPlanLimited(json.reason === "plan");
        setItems(json.fixtures || []);
        const more = !!json.filling;
        setFilling(more);
        if (more) poll = setTimeout(() => load(false), 2500);
      } catch {
        if (cancelled) return;
        setItems([]);
        setPlanLimited(false);
        setFilling(false);
      } finally {
        if (initial && !cancelled) setLoading(false);
      }
    }

    void load(true);
    return () => {
      cancelled = true;
      if (poll) clearTimeout(poll);
    };
  }, [selectedYmd, sport, active]);

  const byLeague = useMemo((): LeagueGroup[] => {
    const map = new Map<string, LeagueGroup>();
    for (const f of items) {
      const name = f.league_name || "Övrigt";
      const key =
        f.league_id != null ? `id:${f.league_id}` : `name:${name.toLowerCase()}`;
      const existing = map.get(key);
      if (existing) {
        existing.rows.push(f);
        if (!existing.logo && f.league_logo) existing.logo = f.league_logo;
        if (existing.leagueId == null && f.league_id != null) {
          existing.leagueId = f.league_id;
        }
        if (!existing.sport && f.sport) existing.sport = f.sport;
      } else {
        map.set(key, {
          key,
          name,
          logo: f.league_logo ?? null,
          leagueId: f.league_id ?? null,
          sport: f.sport ?? null,
          rows: [f],
        });
      }
    }
    return [...map.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "sv")
    );
  }, [items]);

  // Om vald liga försvinner (nytt datum) → tillbaka till alla
  useEffect(() => {
    if (leagueKey === ALL_LEAGUES) return;
    if (!byLeague.some((g) => g.key === leagueKey)) {
      setLeagueKey(ALL_LEAGUES);
    }
  }, [byLeague, leagueKey]);

  const selectedLeague = useMemo(
    () => byLeague.find((g) => g.key === leagueKey) ?? null,
    [byLeague, leagueKey]
  );

  const leagueOptions = useMemo((): DropdownOption[] => {
    return [
      { value: ALL_LEAGUES, label: "Alla ligor" },
      ...byLeague.map((g) => ({
        value: g.key,
        label: g.name,
        icon: (
          <LeagueLogo
            src={g.logo}
            leagueId={g.leagueId}
            sport={g.sport || sport}
            name={g.name}
            size={16}
          />
        ),
      })),
    ];
  }, [byLeague, sport]);

  const visibleGroups = useMemo((): LeagueGroup[] => {
    if (selectedLeague) return [selectedLeague];
    return byLeague;
  }, [byLeague, selectedLeague]);

  const matchGroups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return visibleGroups;
    return visibleGroups
      .map((g) => ({
        ...g,
        rows: g.rows.filter(
          (f) =>
            (f.home_name || "").toLowerCase().includes(needle) ||
            (f.away_name || "").toLowerCase().includes(needle) ||
            (f.league_name || "").toLowerCase().includes(needle)
        ),
      }))
      .filter((g) => g.rows.length > 0);
  }, [visibleGroups, q]);

  const flatMatchRows = useMemo(
    () => matchGroups.flatMap((g) => g.rows),
    [matchGroups]
  );

  const emptyMessage = planLimited && coverage
    ? `API-planen visar bara matcher ${formatRange(coverage.from, coverage.to)}. Välj ett av de datumen, eller ange matchen manuellt.`
    : q.trim()
      ? selectedLeague
        ? "Inget matchar i den här ligan. Prova ett annat namn."
        : "Ingen match matchar. Prova ett annat namn."
      : selectedLeague
        ? "Inga matcher i den här ligan den här dagen."
        : "Inga matcher den här dagen. Välj ett annat datum.";

  const live = useLiveFixtures(
    flatMatchRows.map((f) => f.fixture_id),
    {
      hasLive: flatMatchRows.some(
        (f) =>
          !isFinishedStatus(f.status) && needsLiveRefresh(f.status, f.kickoff)
      ),
    }
  );

  const showGrouped = !selectedLeague && matchGroups.length > 1;

  return (
    <div>
      <div className="mb-1.5 text-[11px] uppercase tracking-[0.1em] text-muted">
        Datum
      </div>
      <DayStrip ymd={selectedYmd} onChange={changeYmd} />
      {coverage ? (
        <p className="mb-3 text-[12px] leading-snug text-faint">
          Matchlistan täcker {formatRange(coverage.from, coverage.to)} med
          nuvarande API-plan.
        </p>
      ) : null}

      <div className="mb-1.5 text-[11px] uppercase tracking-[0.1em] text-muted">
        Sport
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {PICKER_SPORTS.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => pickSport(label)}
            className={cn(
              "rounded-[10px] border px-3.5 py-2.5 text-[14px] font-semibold",
              sport === label
                ? "border-win bg-win/10 text-win"
                : "border-line bg-bg-soft text-text hover:border-blue hover:bg-panel-2"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {sport ? (
        <div className="space-y-3">
          <SearchDropdown
            label="Liga"
            value={leagueKey}
            placeholder="Filtrera liga…"
            searchPlaceholder="Sök liga…"
            options={leagueOptions}
            disabled={loading && !byLeague.length}
            onChange={(next) => {
              if (next === ALL_LEAGUES) {
                clearLeagueFilter();
                return;
              }
              const group = byLeague.find((g) => g.key === next);
              setLeagueKey(next);
              if (group) {
                onMetaChange?.({
                  sport: group.sport || sport,
                  league: group.name,
                  leagueId: group.leagueId,
                  leagueLogo: group.logo,
                });
              }
            }}
          />

          <div>
            <div className="mb-1.5 text-[11px] uppercase tracking-[0.1em] text-muted">
              Match
            </div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Sök lag…"
              className="mb-2 w-full rounded-[10px] border border-line bg-bg-soft px-3 py-3 text-[15px] text-text outline-none placeholder:text-faint focus:border-blue"
            />
            <div className="max-h-72 overflow-auto rounded-[11px] border border-line bg-bg-soft">
              {loading && !flatMatchRows.length ? (
                <div className="px-3 py-3 text-sm text-faint">Hämtar matcher…</div>
              ) : flatMatchRows.length ? (
                <>
                  {matchGroups.map((group) => (
                    <div key={group.key}>
                      {showGrouped ? (
                        <div className="sticky top-0 z-[1] flex items-center gap-2 border-b border-line-soft bg-panel-2 px-3 py-1.5">
                          <LeagueLogo
                            src={group.logo}
                            leagueId={group.leagueId}
                            sport={group.sport || sport}
                            name={group.name}
                            size={14}
                          />
                          <span className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                            {group.name}
                          </span>
                          <span className="shrink-0 font-mono-num text-[11px] text-faint">
                            {group.rows.length}
                          </span>
                        </div>
                      ) : null}
                      {group.rows.map((f) => {
                        const merged = mergeLivePatch(f, live[f.fixture_id]);
                        return (
                          <button
                            key={f.fixture_id}
                            type="button"
                            onClick={() => {
                              onMetaChange?.({
                                sport: merged.sport,
                                league: merged.league_name,
                                leagueId: merged.league_id,
                                leagueLogo: merged.league_logo,
                              });
                              onSelect(merged);
                            }}
                            className="flex w-full items-center border-b border-line-soft px-3 py-2 text-left text-sm last:border-0 hover:bg-panel-2"
                          >
                            <PickerMatchOption fixture={merged} />
                          </button>
                        );
                      })}
                    </div>
                  ))}
                  {filling ? (
                    <div className="px-3 py-2 text-sm text-faint">
                      Hämtar fler matcher…
                    </div>
                  ) : null}
                </>
              ) : filling ? (
                <div className="px-3 py-3 text-sm text-faint">Hämtar matcher…</div>
              ) : (
                <div className="px-3 py-3 text-sm text-faint">{emptyMessage}</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
