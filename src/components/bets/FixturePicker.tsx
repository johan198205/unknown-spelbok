"use client";

import { useEffect, useMemo, useState } from "react";
import type { Fixture } from "@/lib/types";
import { TeamPair } from "@/components/bets/TeamPair";
import {
  upcomingDayChips,
  stockholmDayBounds,
  stockholmYmd,
} from "@/lib/stockholm";
import { cn } from "@/lib/utils";

export function FixturePicker({
  onSelect,
  active = true,
}: {
  onSelect: (fixture: Fixture) => void;
  active?: boolean;
}) {
  const chips = useMemo(() => upcomingDayChips(), []);
  const [ymd, setYmd] = useState(chips[0]?.ymd ?? stockholmYmd());
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { from, to } = stockholmDayBounds(ymd);
        const params = new URLSearchParams({
          from,
          to,
          limit: "80",
        });
        if (q.trim()) params.set("q", q.trim());
        const res = await fetch(`/api/fixtures?${params}`);
        const json = await res.json();
        setItems(json.fixtures || []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => clearTimeout(t);
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

  return (
    <div>
      <div className="mb-1.5 text-[11px] uppercase tracking-[0.1em] text-muted">
        Datum
      </div>
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 sb-scroll">
        {chips.map((chip) => {
          const selected = chip.ymd === ymd;
          return (
            <button
              key={chip.ymd}
              type="button"
              onClick={() => setYmd(chip.ymd)}
              className={cn(
                "shrink-0 rounded-[10px] border px-2.5 py-2 text-center",
                selected
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
        {loading ? (
          <div className="px-3 py-3 text-sm text-faint">Hämtar…</div>
        ) : items.length ? (
          byLeague.map(([league, rows]) => (
            <div key={league}>
              <div className="sticky top-0 bg-bg-soft px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-faint">
                {league}
              </div>
              {rows.map((f) => (
                <button
                  key={f.fixture_id}
                  type="button"
                  onClick={() => onSelect(f)}
                  className="flex w-full items-center gap-2 border-b border-line-soft px-3 py-2.5 text-left text-sm last:border-0 hover:bg-panel-2"
                >
                  <TeamPair
                    homeLogo={f.home_logo}
                    awayLogo={f.away_logo}
                    homeTeamId={f.home_team_id}
                    awayTeamId={f.away_team_id}
                    sport={f.sport}
                  />
                  <span className="min-w-0 flex-1 truncate font-semibold">
                    {f.home_name} – {f.away_name}
                  </span>
                  <span className="shrink-0 font-mono-num text-[11px] text-faint">
                    {new Date(f.kickoff).toLocaleTimeString("sv-SE", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Europe/Stockholm",
                    })}
                  </span>
                </button>
              ))}
            </div>
          ))
        ) : (
          <div className="px-3 py-3 text-sm text-faint">
            {q.trim()
              ? "Inget matchar den här dagen. Prova ett annat namn."
              : "Inga matcher den här dagen. Välj ett annat datum."}
          </div>
        )}
      </div>
    </div>
  );
}
