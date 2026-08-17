"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  isInPlayStatus,
  type LiveFixturePatch,
} from "@/lib/live-fixture";

const FALLBACK_MS = 60_000;
const FILTER_ID_CAP = 40;

function uniqueSortedIds(ids: number[]) {
  return [...new Set(ids.filter((id) => Number.isFinite(id) && id > 0))].sort(
    (a, b) => a - b
  );
}

function patchFromRow(row: {
  fixture_id?: unknown;
  status?: unknown;
  elapsed?: unknown;
  home_score?: unknown;
  away_score?: unknown;
}): { id: number; patch: LiveFixturePatch } | null {
  const id = Number(row.fixture_id);
  if (!Number.isFinite(id) || id <= 0) return null;
  return {
    id,
    patch: {
      status: typeof row.status === "string" ? row.status : "NS",
      elapsed: typeof row.elapsed === "number" ? row.elapsed : null,
      home_score: typeof row.home_score === "number" ? row.home_score : null,
      away_score: typeof row.away_score === "number" ? row.away_score : null,
    },
  };
}

/**
 * Prenumererar på fixtures-UPDATEs för synliga matcher.
 * Klienten pollar aldrig API-Football. Fallback mot /api/fixtures
 * bara om Realtime strular och minst en synlig match är live.
 */
export function useLiveFixtures(
  fixtureIds: number[],
  options?: { hasLive?: boolean }
): Record<number, LiveFixturePatch> {
  const key = uniqueSortedIds(fixtureIds).join(",");
  const ids = useMemo(() => (key ? key.split(",").map(Number) : []), [key]);
  const [patches, setPatches] = useState<Record<number, LiveFixturePatch>>({});
  const [realtimeOk, setRealtimeOk] = useState(true);

  useEffect(() => {
    if (!ids.length) return;

    const supabase = createClient();
    const filter =
      ids.length === 1
        ? `fixture_id=eq.${ids[0]}`
        : ids.length <= FILTER_ID_CAP
          ? `fixture_id=in.(${ids.join(",")})`
          : undefined;

    const channel = supabase
      .channel(`live-fixtures:${key.slice(0, 80)}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "fixtures",
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          const parsed = patchFromRow(
            (payload.new ?? {}) as Record<string, unknown>
          );
          if (!parsed || !ids.includes(parsed.id)) return;
          setPatches((prev) => ({ ...prev, [parsed.id]: parsed.patch }));
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setRealtimeOk(true);
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRealtimeOk(false);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [key]);

  const hasLivePatch = Object.values(patches).some((p) =>
    isInPlayStatus(p.status)
  );
  const enableFallback =
    !realtimeOk && ids.length > 0 && !!(options?.hasLive || hasLivePatch);

  useEffect(() => {
    if (!enableFallback) return;

    let cancelled = false;

    async function refetch() {
      try {
        const params = new URLSearchParams({
          ids: ids.join(","),
          limit: String(Math.max(ids.length, 1)),
        });
        const res = await fetch(`/api/fixtures?${params}`, { cache: "no-store" });
        const json = (await res.json()) as {
          fixtures?: Array<Record<string, unknown>>;
        };
        if (cancelled || !Array.isArray(json.fixtures)) return;
        const next: Record<number, LiveFixturePatch> = {};
        for (const row of json.fixtures) {
          const parsed = patchFromRow(row);
          if (parsed) next[parsed.id] = parsed.patch;
        }
        setPatches((prev) => ({ ...prev, ...next }));
      } catch {
        /* nätverksfel: försök igen nästa intervall */
      }
    }

    void refetch();
    const timer = setInterval(() => void refetch(), FALLBACK_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [enableFallback, key]);

  return patches;
}
