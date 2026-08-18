"use client";

import { useEffect, useMemo, useState } from "react";
import type { Fixture } from "@/lib/types";
import { FixtureMatch } from "@/components/bets/FixtureMatch";
import { useLiveFixtures } from "@/hooks/useLiveFixtures";
import { mergeLivePatch, needsLiveRefresh } from "@/lib/live-fixture";
import { upcomingDayChips, stockholmYmd } from "@/lib/stockholm";
import { cn } from "@/lib/utils";

type Coverage = { from: string; to: string };

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

function inCoverage(ymd: string, coverage: Coverage | null) {
  if (!coverage) return true;
  return ymd >= coverage.from && ymd <= coverage.to;
}

export function FixturePicker({
  onSelect,
  active = true,
}: {
  onSelect: (fixture: Fixture) => void;
  active?: boolean;
}) {
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const chips = useMemo(() => {
    const all = upcomingDayChips();
    if (!coverage) return all;
    const visible = all.filter((chip) => inCoverage(chip.ymd, coverage));
    return visible.length ? visible : all;
  }, [coverage]);
  const [ymd, setYmd] = useState(stockholmYmd());
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(false);
  const [filling, setFilling] = useState(false);
  const [planLimited, setPlanLimited] = useState(false);

  useEffect(() => {
    if (coverage && !inCoverage(ymd, coverage)) {
      setYmd(stockholmYmd());
    }
  }, [coverage, ymd]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let poll: ReturnType<typeof setTimeout> | undefined;

    async function load(initial: boolean) {
      if (initial) setLoading(true);
      try {
        const params = new URLSearchParams({
          date: ymd,
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
  }, [ymd, q, active]);

  const byLeague = useMemo(() => {
    const map = new Map<string, Fixture[]>();
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
    { hasLive: items.some((f) => needsLiveRefresh(f.status, f.kickoff)) }
  );

  return (
    <div>
      <div className="mb-1.5 text-[11px] uppercase tracking-[0.1em] text-muted">
        Datum
      </div>
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 sb-scroll">
        {chips.map((chip) => {
          const selected = chip.ymd === ymd;
          const available = inCoverage(chip.ymd, coverage);
          return (
            <button
              key={chip.ymd}
              type="button"
              disabled={!available}
              onClick={() => setYmd(chip.ymd)}
              className={cn(
                "shrink-0 rounded-[10px] border px-2.5 py-2 text-center",
                !available
                  ? "cursor-not-allowed border-line bg-bg-soft text-faint opacity-40"
                  : selected
                    ? "border-win bg-win/10 text-win"
                    : "border-line bg-bg-soft text-muted hover:text-text"
              )}
            >
              <div className="text-[10px] font-semibold uppercase tracking-[0.08em]">
                {chip.isToday
                  ? "Idag"
                  : chip.isTomorrow
                    ? "Imorgon"
                    : chip.weekday}
              </div>
              <div className="font-mono-num text-[13px] font-semibold leading-tight">
                {chip.day}
              </div>
            </button>
          );
        })}
      </div>
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
                      <FixtureMatch fixture={merged} />
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
