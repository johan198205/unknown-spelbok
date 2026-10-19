"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, Search } from "lucide-react";
import type { PickerFixture } from "@/components/bets/FixturePicker";
import { LeagueLogo } from "@/components/bets/LeagueLogo";
import { TeamLogo } from "@/components/bets/TeamPair";
import { SPORTS } from "@/lib/picks";
import { SPORT_LABELS } from "@/lib/sports";
import { isFinishedStatus, isInPlayStatus } from "@/lib/live-fixture";
import {
  addStockholmDays,
  FIXTURE_PICKER_FUTURE_DAYS,
  stockholmDayBounds,
  stockholmYmd,
} from "@/lib/stockholm";
import { cn } from "@/lib/utils";
import { useT } from "@/components/TextsProvider";
import type { TextKey, TFunction } from "@/lib/texts";

const MIN_CHARS = 2;
const DEBOUNCE_MS = 250;
const RESULT_LIMIT = 40;
/** Pågående matcher ska gå att hitta — avspark upp till så här långt bak */
const LIVE_GRACE_MS = 3 * 60 * 60 * 1000;

/** label är en textnyckel för "Alla", annars sportens namn som det är. */
const SPORT_CHIPS: Array<{ value: string; label: string; labelKey?: TextKey }> = [
  { value: "", label: "", labelKey: "betform.search.sportAll" },
  ...SPORT_LABELS.map((label) => ({ value: label, label })),
];

type DayFilter = "all" | "today" | "tomorrow" | "week" | { ymd: string };

const DAY_CHIPS: Array<{ value: Exclude<DayFilter, { ymd: string }>; label: TextKey }> = [
  { value: "all", label: "betform.search.dayAll" },
  { value: "today", label: "betform.day.today" },
  { value: "tomorrow", label: "betform.day.tomorrow" },
  { value: "week", label: "betform.search.dayWeek" },
];

/**
 * "Alla dagar" och "Denna vecka" söker bland kommande matcher. Idag, Imorgon
 * och ett valt datum söker hela dygnet — även färdiga matcher, så att spel
 * som redan är avgjorda går att föra in i efterhand.
 */
function dayParams(filter: DayFilter): Record<string, string> {
  const today = stockholmYmd();
  if (filter === "today") return { date: today };
  if (filter === "tomorrow") return { date: addStockholmDays(today, 1) };
  if (typeof filter === "object") return { date: filter.ymd };
  const from = new Date(Date.now() - LIVE_GRACE_MS).toISOString();
  if (filter === "week") {
    // Veckan slutar söndag. getUTCDay på middag svensk tid ger rätt veckodag.
    const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
    const daysLeft = (7 - weekday) % 7;
    return { from, to: stockholmDayBounds(addStockholmDays(today, daysLeft)).to };
  }
  return {
    from,
    to: stockholmDayBounds(addStockholmDays(today, FIXTURE_PICKER_FUTURE_DAYS)).to,
  };
}

function dayLabel(kickoff: string, t: TFunction) {
  const ymd = stockholmYmd(new Date(kickoff));
  const today = stockholmYmd();
  if (ymd === today) return t("betform.day.today");
  if (ymd === addStockholmDays(today, 1)) return t("betform.day.tomorrow");
  if (ymd === addStockholmDays(today, -1)) return t("betform.day.yesterday");
  return new Date(kickoff).toLocaleDateString("sv-SE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Europe/Stockholm",
  });
}

function timeLabel(kickoff: string) {
  return new Date(kickoff).toLocaleTimeString("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Stockholm",
  });
}

function sameFilter(a: DayFilter, b: DayFilter) {
  if (typeof a === "object" || typeof b === "object") {
    return typeof a === "object" && typeof b === "object" && a.ymd === b.ymd;
  }
  return a === b;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition",
        active
          ? "border-win/60 bg-win/10 text-win"
          : "border-line bg-bg-soft text-text hover:border-line-hover"
      )}
    >
      {children}
    </button>
  );
}

function ResultRow({
  fixture,
  highlighted,
  onPick,
  onHover,
}: {
  fixture: PickerFixture;
  highlighted: boolean;
  onPick: () => void;
  onHover: () => void;
}) {
  const t = useT();
  const finished = isFinishedStatus(fixture.status);
  const live = !finished && isInPlayStatus(fixture.status);
  const hasScore = fixture.home_score != null && fixture.away_score != null;

  return (
    <button
      type="button"
      role="option"
      aria-selected={highlighted}
      onClick={onPick}
      onMouseEnter={onHover}
      className={cn(
        "w-full rounded-[10px] border px-3 py-2.5 text-left transition",
        highlighted
          ? "border-blue/60 bg-[#26262a]"
          : "border-line bg-bg-soft hover:bg-[#26262a]"
      )}
    >
      <div className="mb-2 flex items-center gap-1.5 text-[12px] text-muted">
        <LeagueLogo
          src={fixture.league_logo}
          leagueId={fixture.league_id}
          sport={fixture.sport}
          name={fixture.league_name || ""}
          size={14}
        />
        <span className="min-w-0 flex-1 truncate">
          {fixture.league_name || t("betform.search.unknownLeague")}
          {fixture.league_country ? ` · ${fixture.league_country}` : ""}
        </span>
        {live ? (
          <span className="shrink-0 rounded-badge bg-live/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-live">
            {t("betform.search.live")}
          </span>
        ) : null}
        <span className="shrink-0 font-mono-num text-[11.5px] text-text">
          {dayLabel(fixture.kickoff, t)} · {timeLabel(fixture.kickoff)}
        </span>
      </div>
      <div className="flex items-center gap-2 text-[14px]">
        <TeamLogo src={fixture.home_logo} size={20} initial={fixture.home_name} />
        <span className="min-w-0 flex-1 truncate font-semibold">
          {fixture.home_name}
        </span>
        <span className="shrink-0 font-mono-num text-[12px] text-faint">
          {(finished || live) && hasScore
            ? `${fixture.home_score}–${fixture.away_score}`
            : t("betform.search.versus")}
        </span>
        <span className="min-w-0 flex-1 truncate text-right font-semibold">
          {fixture.away_name}
        </span>
        <TeamLogo src={fixture.away_logo} size={20} initial={fixture.away_name} />
      </div>
    </button>
  );
}

/**
 * Primär matchväljare: sök på lag, se de närmaste matcherna direkt.
 * Sport och dag är valfria filter ovanpå sökningen.
 */
export function MatchSearch({
  onSelect,
  active = true,
  autoFocus = true,
}: {
  onSelect: (fixture: PickerFixture) => void;
  active?: boolean;
  autoFocus?: boolean;
}) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [sport, setSport] = useState("");
  const [day, setDay] = useState<DayFilter>("all");
  const [results, setResults] = useState<PickerFixture[]>([]);
  const [failed, setFailed] = useState(false);
  /** Vilken sökning resultaten hör till — skiljer färska svar från gamla */
  const [answered, setAnswered] = useState("");
  const [highlight, setHighlight] = useState(0);

  const trimmed = query.trim();
  const ready = trimmed.length >= MIN_CHARS;
  const dayKey = typeof day === "object" ? day.ymd : day;
  const customYmd = typeof day === "object" ? day.ymd : "";
  const searchKey = `${trimmed}|${sport}|${dayKey}`;
  const loading = ready && active && answered !== searchKey;

  useEffect(() => {
    if (!autoFocus || !active) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [autoFocus, active]);

  useEffect(() => {
    if (!active || !ready) return;
    let cancelled = false;
    let poll: ReturnType<typeof setTimeout> | undefined;
    const key = `${trimmed}|${sport}|${dayKey}`;
    const filter: DayFilter = customYmd ? { ymd: customYmd } : (dayKey as DayFilter);

    async function load() {
      const params = new URLSearchParams({
        q: trimmed,
        limit: String(RESULT_LIMIT),
        ...dayParams(filter),
      });
      if (sport) params.set("sport", sport);
      try {
        const res = await fetch(`/api/fixtures?${params}`, { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(json.error || "Sökningen misslyckades");
        setResults(json.fixtures || []);
        setFailed(false);
        setHighlight(0);
        setAnswered(key);
        // Ett dygn som hämtas från API:t för första gången fylls på i
        // bakgrunden — sök om tills det är klart
        if (json.filling) poll = setTimeout(load, 2500);
      } catch {
        if (cancelled) return;
        setResults([]);
        setFailed(true);
        setAnswered(key);
      }
    }

    const timer = setTimeout(load, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (poll) clearTimeout(poll);
    };
  }, [active, ready, trimmed, sport, dayKey, customYmd]);

  const today = stockholmYmd();
  const maxYmd = addStockholmDays(today, FIXTURE_PICKER_FUTURE_DAYS);
  const customLabel = useMemo(() => {
    if (!customYmd) return t("betform.day.custom");
    return new Date(`${customYmd}T12:00:00Z`).toLocaleDateString("sv-SE", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  }, [customYmd, t]);

  function pick(fixture: PickerFixture) {
    onSelect(fixture);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const f = results[highlight];
      if (f) pick(f);
    }
  }

  const upcomingOnly = day === "all" || day === "week";
  const showStale = loading;

  return (
    <div>
      <label
        htmlFor="match-search"
        className="mb-1.5 block text-[11px] uppercase tracking-[0.1em] text-muted"
      >
        {t("betform.search.label")}
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-faint"
          strokeWidth={2}
          aria-hidden
        />
        <input
          id="match-search"
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t("betform.search.placeholder")}
          autoComplete="off"
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls="match-search-results"
          className="w-full rounded-[10px] border border-line bg-bg-soft py-3 pl-10 pr-10 text-[15px] text-text outline-none placeholder:text-faint focus:border-blue"
        />
        {loading ? (
          <span
            className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-line-strong border-t-cyan"
            aria-hidden
          />
        ) : null}
      </div>

      {/* Filtren radbryts i stället för att scrolla i sidled — alla val ska
          alltid synas och gå att klicka på, även i smal modal och mobil. */}
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {SPORT_CHIPS.map((c) => (
          <Chip key={c.value || "all"} active={sport === c.value} onClick={() => setSport(c.value)}>
            {c.labelKey ? t(c.labelKey) : c.label}
          </Chip>
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {DAY_CHIPS.map((c) => (
          <Chip key={c.value} active={sameFilter(day, c.value)} onClick={() => setDay(c.value)}>
            {t(c.label)}
          </Chip>
        ))}
        <label
          className={cn(
            "relative flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition",
            customYmd
              ? "border-win/60 bg-win/10 text-win"
              : "border-line bg-bg-soft text-text hover:border-line-hover"
          )}
        >
          <Calendar className="size-3.5" strokeWidth={2.25} aria-hidden />
          {customLabel}
          <input
            type="date"
            value={customYmd}
            max={maxYmd}
            onChange={(e) => {
              const next = e.target.value;
              if (/^\d{4}-\d{2}-\d{2}$/.test(next)) setDay({ ymd: next });
              else setDay("all");
            }}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label={t("betform.day.pickDate")}
          />
        </label>
      </div>

      {!ready ? (
        <p className="mt-2 text-[12.5px] text-faint">
          {upcomingOnly
            ? t("betform.search.hint.upcoming", { min: MIN_CHARS })
            : t("betform.search.hint.day", { min: MIN_CHARS })}
        </p>
      ) : showStale && !results.length ? (
        <p className="mt-2 text-[12.5px] text-faint" role="status">
          {t("betform.search.loading")}
        </p>
      ) : failed ? (
        <p className="mt-2 text-[12.5px] text-loss">
          {t("betform.search.failed")}
        </p>
      ) : results.length ? (
        <div
          id="match-search-results"
          role="listbox"
          className={cn(
            "mt-2.5 flex max-h-[340px] flex-col gap-1.5 overflow-y-auto pr-0.5 sb-scroll",
            showStale && "opacity-60"
          )}
        >
          {results.map((f, i) => (
            <ResultRow
              key={f.fixture_id}
              fixture={f}
              highlighted={i === highlight}
              onPick={() => pick(f)}
              onHover={() => setHighlight(i)}
            />
          ))}
        </div>
      ) : !loading ? (
        <p className="mt-2 text-[12.5px] text-faint">
          {t(
            upcomingOnly
              ? "betform.search.noResults.upcoming"
              : "betform.search.noResults.any",
            {
              query: trimmed,
              filters:
                sport || day !== "all" ? t("betform.search.noResults.filters") : "",
            }
          )}
        </p>
      ) : null}
    </div>
  );
}

const MANUAL_DAY_CHIPS: Array<{ offset: number; label: TextKey }> = [
  { offset: -1, label: "betform.day.yesterday" },
  { offset: 0, label: "betform.day.today" },
  { offset: 1, label: "betform.day.tomorrow" },
];

/**
 * Sport och datum för en manuellt inlagd match, med samma knappar som
 * matchsöket i stället för en datumslider i sidled. En manuell match behöver
 * ett bestämt datum — därför Igår/Idag/Imorgon plus valfritt datum i stället
 * för sökets "Alla dagar" och "Denna vecka".
 */
export function ManualMatchFilters({
  sport,
  onSportChange,
  ymd,
  onYmdChange,
}: {
  sport: string;
  onSportChange: (sport: string) => void;
  ymd: string;
  onYmdChange: (ymd: string) => void;
}) {
  const t = useT();
  const today = stockholmYmd();
  const quick = MANUAL_DAY_CHIPS.map((c) => ({
    ...c,
    ymd: addStockholmDays(today, c.offset),
  }));
  const isCustom = !quick.some((c) => c.ymd === ymd);
  const customLabel = isCustom
    ? new Date(`${ymd}T12:00:00Z`).toLocaleDateString("sv-SE", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      })
    : t("betform.day.custom");

  return (
    <div>
      <div className="mb-1.5 text-[11px] uppercase tracking-[0.1em] text-muted">
        {t("betform.manual.sport")}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SPORTS.map((s) => (
          <Chip key={s} active={sport === s} onClick={() => onSportChange(s)}>
            {s}
          </Chip>
        ))}
      </div>
      <div className="mb-1.5 mt-3 text-[11px] uppercase tracking-[0.1em] text-muted">
        {t("betform.manual.date")}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {quick.map((c) => (
          <Chip key={c.label} active={c.ymd === ymd} onClick={() => onYmdChange(c.ymd)}>
            {t(c.label)}
          </Chip>
        ))}
        <label
          className={cn(
            "relative flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition",
            isCustom
              ? "border-win/60 bg-win/10 text-win"
              : "border-line bg-bg-soft text-text hover:border-line-hover"
          )}
        >
          <Calendar className="size-3.5" strokeWidth={2.25} aria-hidden />
          {customLabel}
          <input
            type="date"
            value={ymd}
            onChange={(e) => {
              const next = e.target.value;
              if (/^\d{4}-\d{2}-\d{2}$/.test(next)) onYmdChange(next);
            }}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label={t("betform.day.pickDate")}
          />
        </label>
      </div>
    </div>
  );
}
