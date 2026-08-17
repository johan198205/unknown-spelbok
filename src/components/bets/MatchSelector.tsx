"use client";

import { useEffect, useState } from "react";
import type { Fixture } from "@/lib/types";

export function MatchSelector({
  onSelect,
}: {
  onSelect: (fixture: Fixture) => void;
}) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/fixtures?q=${encodeURIComponent(q)}&limit=12`
        );
        const json = await res.json();
        setItems(json.fixtures || []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div>
      <div className="mb-1.5 text-[11px] uppercase tracking-[0.12em] text-muted">
        Välj match (API-cache)
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Sök lag eller liga…"
        className="mb-2 w-full rounded-[9px] border border-line bg-bg-soft px-3 py-3 text-[15px] outline-none focus:border-blue"
      />
      <div className="max-h-48 overflow-auto rounded-[9px] border border-line bg-bg-soft">
        {loading ? (
          <div className="px-3 py-3 text-sm text-faint">Hämtar…</div>
        ) : items.length ? (
          items.map((f) => (
            <button
              key={f.fixture_id}
              type="button"
              onClick={() => onSelect(f)}
              className="flex w-full items-center gap-2 border-b border-line-soft px-3 py-2.5 text-left text-sm hover:bg-panel-2"
            >
              <span className="flex-1 truncate">
                {f.home_name} – {f.away_name}
              </span>
              <span className="text-[12px] text-muted">{f.league_name}</span>
              <span className="font-mono-num text-[11px] text-faint">
                {new Date(f.kickoff).toLocaleString("sv-SE", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </button>
          ))
        ) : (
          <div className="px-3 py-3 text-sm text-faint">
            Inga matcher i cachen. Kör sync-fixtures från admin.
          </div>
        )}
      </div>
    </div>
  );
}
