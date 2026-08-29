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

export type PickerFixture = Fixture & {
  venue?: string | null;
  league_country?: string | null;
};

const PICKER_SPORTS = ["Fotboll", "Ishockey"] as const;
/** Sentinel — liga är valfritt filter, inte ett obligatoriskt steg */
const ALL_LEAGUES = "__all__";
/** Sidstorlek mot /api/fixtures — en dag rymmer långt fler matcher än så */
const PAGE_SIZE = 500;
/** Spärr mot ändlös bläddring om servern skulle svara oväntat */
const MAX_PAGES = 12;

type LeagueGroup = {
  key: string;
  name: string;
  logo: string | null;
  leagueId: number | null;
  sport: string | null;
  /** Land från API:t — särskiljer ligor med samma namn (t.ex. Premier League) */
  country: string | null;
  rows: PickerFixture[];
};

/** Vald liga lever kvar över datumbyten, även dagar utan matcher i ligan */
type LeagueSelection = Omit<LeagueGroup, "rows">;

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

function MatchDropdown({
  groups,
  showGrouped,
  loading,
  filling,
  emptyMessage,
  live,
  disabled,
  onPick,
}: {
  groups: LeagueGroup[];
  showGrouped: boolean;
  loading: boolean;
  filling: boolean;
  emptyMessage: string;
  live: ReturnType<typeof useLiveFixtures>;
  disabled?: boolean;
  onPick: (fixture: PickerFixture) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return groups;
    return groups
      .map((g) => ({
        ...g,
        rows: g.rows.filter(
          (f) =>
            (f.home_name || "").toLowerCase().includes(needle) ||
            (f.away_name || "").toLowerCase().includes(needle) ||
            (f.league_name || "").toLowerCase().includes(needle) ||
            (f.league_country || "").toLowerCase().includes(needle)
        ),
      }))
      .filter((g) => g.rows.length > 0);
  }, [groups, q]);

  const totalCount = useMemo(
    () => groups.reduce((n, g) => n + g.rows.length, 0),
    [groups]
  );
  const filteredCount = useMemo(
    () => filtered.reduce((n, g) => n + g.rows.length, 0),
    [filtered]
  );

  useEffect(() => {
    if (disabled && open) setOpen(false);
  }, [disabled, open]);

  useEffect(() => {
    if (!open) return;
    setQ("");
    const t = requestAnimationFrame(() => searchRef.current?.focus());
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(t);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const triggerLabel = loading
    ? "Hämtar matcher…"
    : totalCount === 0 && !filling
      ? "Inga matcher"
      : "Välj match …";

  return (
    <div ref={rootRef} className="relative">
      <div className="mb-1.5 text-[11px] uppercase tracking-[0.1em] text-muted">
        Match
      </div>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled || (loading && totalCount === 0)}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
        }}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-[9px] border bg-bg-soft px-3 py-2.5 text-left text-[14px] transition",
          open ? "border-blue" : "border-line hover:border-line-hover",
          "text-faint",
          (disabled || (loading && totalCount === 0)) &&
            "cursor-not-allowed opacity-45 hover:border-line"
        )}
      >
        <span className="min-w-0 flex-1 truncate">{triggerLabel}</span>
        <span className="text-[11px] font-normal text-faint">▾</span>
      </button>

      {open && !disabled ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1.5 flex max-h-80 flex-col rounded-[11px] border border-line-strong bg-panel-elevated shadow-[0_18px_50px_rgba(0,0,0,.6)]"
        >
          <div className="border-b border-line p-2">
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Sök lag…"
              className="w-full rounded-lg border border-line bg-bg-soft px-2.5 py-2 text-[13px] text-text outline-none placeholder:text-faint focus:border-blue"
            />
          </div>
          <div className="overflow-auto p-1.5">
            {loading && totalCount === 0 ? (
              <div className="px-2.5 py-3 text-[13px] text-faint">
                Hämtar matcher…
              </div>
            ) : filteredCount ? (
              filtered.map((group) => (
                <div key={group.key}>
                  {showGrouped ? (
                    <div className="flex items-center gap-2 px-2.5 pb-1 pt-2">
                      <LeagueLogo
                        src={group.logo}
                        leagueId={group.leagueId}
                        sport={group.sport}
                        name={group.name}
                        size={14}
                      />
                      <span className="min-w-0 flex-1 truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
                        {group.name}
                        {group.country ? ` · ${group.country}` : ""}
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
                        role="option"
                        onClick={() => {
                          setOpen(false);
                          onPick(merged);
                        }}
                        className="flex w-full items-center rounded-[7px] px-2.5 py-2 text-left text-sm transition hover:bg-[#1F293C]"
                      >
                        <PickerMatchOption fixture={merged} />
                      </button>
                    );
                  })}
                </div>
              ))
            ) : filling ? (
              <div className="px-2.5 py-3 text-[13px] text-faint">
                Hämtar matcher…
              </div>
            ) : (
              <div className="px-2.5 py-3 text-[13px] text-faint">
                {q.trim()
                  ? "Ingen match matchar. Prova ett annat namn."
                  : emptyMessage}
              </div>
            )}
            {filling && filteredCount > 0 ? (
              <div className="px-2.5 py-2 text-[13px] text-faint">
                Hämtar fler matcher…
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
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
  const [league, setLeague] = useState<LeagueSelection | null>(null);
  const [items, setItems] = useState<PickerFixture[]>([]);
  const [loading, setLoading] = useState(false);
  const [filling, setFilling] = useState(false);
  const [planLimited, setPlanLimited] = useState(false);

  function pickSport(next: string) {
    setSport(next);
    setLeague(null);
    onMetaChange?.({
      sport: next,
      league: null,
      leagueId: null,
      leagueLogo: null,
    });
  }

  function clearLeagueFilter() {
    setLeague(null);
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

    // Hämtar dagen sida för sida. Tidigare hämtades bara första 500 raderna,
    // och eftersom API:t sorterar på avspark föll kvällsmatcherna bort tyst.
    async function load(initial: boolean) {
      if (initial) setLoading(true);
      const all: PickerFixture[] = [];
      try {
        let stillFilling = false;

        for (let page = 0; page < MAX_PAGES; page++) {
          const params = new URLSearchParams({
            date: selectedYmd,
            sport: sportParam,
            limit: String(PAGE_SIZE),
            // Offset = antal rader vi redan har, inte sidnummer × sidstorlek.
            // Håller bläddringen rätt även om servern kortar av en sida.
            offset: String(all.length),
          });
          const res = await fetch(`/api/fixtures?${params}`, {
            cache: "no-store",
          });
          const json = await res.json();
          if (cancelled) return;

          if (json.coverage?.from && json.coverage?.to) {
            setCoverage(json.coverage);
          }
          if (page === 0) {
            setPlanLimited(json.reason === "plan");
            if (initial) setLoading(false);
          }

          all.push(...(json.fixtures || []));
          setItems([...all]);
          stillFilling = !!json.filling;

          if (!json.hasMore) break;
          // Fler sidor kvar — återanvänd "Hämtar fler matcher…" i listan
          setFilling(true);
        }

        setFilling(stillFilling);
        if (stillFilling) poll = setTimeout(() => load(false), 2500);
      } catch {
        if (cancelled) return;
        // Faller en senare sida bort behåller vi de matcher vi hann hämta
        if (!all.length) {
          setItems([]);
          setPlanLimited(false);
        }
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
        if (!existing.country && f.league_country) {
          existing.country = f.league_country;
        }
      } else {
        map.set(key, {
          key,
          name,
          logo: f.league_logo ?? null,
          leagueId: f.league_id ?? null,
          sport: f.sport ?? null,
          country: f.league_country ?? null,
          rows: [f],
        });
      }
    }
    return [...map.values()].sort(
      (a, b) =>
        a.name.localeCompare(b.name, "sv") ||
        (a.country || "").localeCompare(b.country || "", "sv")
    );
  }, [items]);

  // Vald liga ligger kvar över datumbyten — matchar dagens data när den finns
  const selectedLeague = useMemo(
    () => (league ? (byLeague.find((g) => g.key === league.key) ?? null) : null),
    [byLeague, league]
  );

  const leagueOptions = useMemo((): DropdownOption[] => {
    const toOption = (g: LeagueSelection): DropdownOption => ({
      value: g.key,
      label: g.name,
      meta: g.country,
      icon: (
        <LeagueLogo
          src={g.logo}
          leagueId={g.leagueId}
          sport={g.sport || sport}
          name={g.name}
          size={16}
        />
      ),
    });
    // Ligan utan matcher idag måste ändå finnas som val, annars tappar
    // dropdownen sin etikett och användaren kan inte bläddra vidare i datum
    const sticky = league && !byLeague.some((g) => g.key === league.key)
      ? [toOption(league)]
      : [];
    return [
      { value: ALL_LEAGUES, label: "Alla ligor" },
      ...sticky,
      ...byLeague.map(toOption),
    ];
  }, [byLeague, league, sport]);

  const visibleGroups = useMemo((): LeagueGroup[] => {
    if (league) return selectedLeague ? [selectedLeague] : [];
    return byLeague;
  }, [byLeague, league, selectedLeague]);

  const flatMatchRows = useMemo(
    () => visibleGroups.flatMap((g) => g.rows),
    [visibleGroups]
  );

  const emptyMessage = planLimited && coverage
    ? `API-planen visar bara matcher ${formatRange(coverage.from, coverage.to)}. Välj ett av de datumen, eller ange matchen manuellt.`
    : league
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

  const showGrouped = !league && visibleGroups.length > 1;

  return (
    <div>
      <div className="mb-1.5 text-[11px] uppercase tracking-[0.1em] text-muted">
        Datum
      </div>
      <DayStrip ymd={selectedYmd} onChange={setSelectedYmd} />
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
            value={league?.key ?? ALL_LEAGUES}
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
              if (!group) return;
              setLeague({
                key: group.key,
                name: group.name,
                logo: group.logo,
                leagueId: group.leagueId,
                sport: group.sport,
                country: group.country,
              });
              onMetaChange?.({
                sport: group.sport || sport,
                league: group.name,
                leagueId: group.leagueId,
                leagueLogo: group.logo,
              });
            }}
          />

          <MatchDropdown
            groups={visibleGroups}
            showGrouped={showGrouped}
            loading={loading}
            filling={filling}
            emptyMessage={emptyMessage}
            live={live}
            onPick={(merged) => {
              onMetaChange?.({
                sport: merged.sport,
                league: merged.league_name,
                leagueId: merged.league_id,
                leagueLogo: merged.league_logo,
              });
              onSelect(merged);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
