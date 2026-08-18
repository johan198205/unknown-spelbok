"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Calendar } from "lucide-react";
import type { Fixture } from "@/lib/types";
import { FixtureMatch } from "@/components/bets/FixtureMatch";
import { useLiveFixtures } from "@/hooks/useLiveFixtures";
import {
  formatFinishedPickerLine,
  isFinishedStatus,
  mergeLivePatch,
  needsLiveRefresh,
} from "@/lib/live-fixture";
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

function PickerMatchOption({ fixture }: { fixture: PickerFixture }) {
  const line = formatFinishedPickerLine(fixture);
  if (line) {
    return <span className="min-w-0 flex-1 text-left text-[13px] leading-snug text-text">{line}</span>;
  }
  return <FixtureMatch fixture={fixture} />;
}

export function FixturePicker({
  onSelect,
  active = true,
  ymd,
  onYmdChange,
}: {
  onSelect: (fixture: PickerFixture) => void;
  active?: boolean;
  ymd?: string;
  onYmdChange?: (ymd: string) => void;
}) {
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [internalYmd, setInternalYmd] = useState(stockholmYmd());
  const selectedYmd = ymd ?? internalYmd;
  const setSelectedYmd = onYmdChange ?? setInternalYmd;
  const [q, setQ] = useState("");
  const [items, setItems] = useState<PickerFixture[]>([]);
  const [loading, setLoading] = useState(false);
  const [filling, setFilling] = useState(false);
  const [planLimited, setPlanLimited] = useState(false);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let poll: ReturnType<typeof setTimeout> | undefined;

    async function load(initial: boolean) {
      if (initial) setLoading(true);
      try {
        const params = new URLSearchParams({
          date: selectedYmd,
          limit: "500",
        });
        if (q.trim()) params.set("q", q.trim());
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

    const debounce = setTimeout(() => {
      void load(true);
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(debounce);
      if (poll) clearTimeout(poll);
    };
  }, [selectedYmd, q, active]);

  const byLeague = useMemo(() => {
    const map = new Map<string, PickerFixture[]>();
    for (const f of items) {
      const key = f.league_name || "Övrigt";
      const list = map.get(key) ?? [];
      list.push(f);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [items]);

  const emptyMessage = planLimited && coverage
    ? `API-planen visar bara matcher ${formatRange(coverage.from, coverage.to)}. Välj ett av de datumen, eller ange matchen manuellt.`
    : q.trim()
      ? "Inget matchar den här dagen. Prova ett annat namn."
      : "Inga matcher den här dagen. Välj ett annat datum.";

  const live = useLiveFixtures(
    items.map((f) => f.fixture_id),
    {
      hasLive: items.some(
        (f) =>
          !isFinishedStatus(f.status) && needsLiveRefresh(f.status, f.kickoff)
      ),
    }
  );

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
        Match
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Sök lag eller liga…"
        className="mb-2 w-full rounded-[10px] border border-line bg-bg-soft px-3 py-3 text-[15px] text-text outline-none placeholder:text-faint focus:border-blue"
      />
      <div className="max-h-72 overflow-auto rounded-[11px] border border-line bg-bg-soft">
        {loading && !items.length ? (
          <div className="px-3 py-3 text-sm text-faint">Hämtar matcher…</div>
        ) : items.length ? (
          <>
            {byLeague.map(([league, rows]) => (
              <div key={league}>
                <div className="sticky top-0 bg-bg-soft px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-faint">
                  {league}
                </div>
                {rows.map((f) => {
                  const merged = mergeLivePatch(f, live[f.fixture_id]);
                  return (
                    <button
                      key={f.fixture_id}
                      type="button"
                      onClick={() => onSelect(merged)}
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
  );
}
