"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  isInPlayStatus,
  type LiveFixturePatch,
} from "@/lib/live-fixture";

const POLL_MS = 20_000;
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
  extra?: unknown;
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
      extra: typeof row.extra === "number" ? row.extra : null,
      home_score: typeof row.home_score === "number" ? row.home_score : null,
      away_score: typeof row.away_score === "number" ? row.away_score : null,
      receivedAt: Date.now(),
    },
  };
}

/**
 * Prenumererar på fixtures-UPDATEs och pollar /api/fixtures/live så länge
 * minst en synlig match pågår. Servern hämtar API-Football, skriver cachen
 * och autorättar när status blir FT.
 */
export function useLiveFixtures(
  fixtureIds: number[],
  options?: { hasLive?: boolean; onSettled?: () => void }
): Record<number, LiveFixturePatch> {
  const key = uniqueSortedIds(fixtureIds).join(",");
  const ids = useMemo(() => (key ? key.split(",").map(Number) : []), [key]);
  const [patches, setPatches] = useState<Record<number, LiveFixturePatch>>({});
  const onSettledRef = useRef(options?.onSettled);
  onSettledRef.current = options?.onSettled;

  useEffect(() => {
    if (!ids.length) return;

    const supabase = createClient();
    const filter =
      ids.length === 1
        ? `fixture_id=eq.${ids[0]}`
        : ids.length <= FILTER_ID_CAP
          ? `fixture_id=in.(${ids.join(",")})`
          : undefined;

    const topic = `lf:${crypto.randomUUID()}`;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    try {
      channel = supabase
        .channel(topic)
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
        .subscribe();
    } catch {
      /* Realtime saknas — polling räcker */
    }

    return () => {
      if (channel) void supabase.removeChannel(channel);
    };
  }, [key]);

  const hasLivePatch = Object.values(patches).some((p) =>
    isInPlayStatus(p.status)
  );
  const enablePoll =
    ids.length > 0 && !!(options?.hasLive || hasLivePatch);

  useEffect(() => {
    if (!enablePoll) return;

    let cancelled = false;

    async function refetch() {
      try {
        const params = new URLSearchParams({
          ids: ids.join(","),
        });
        const res = await fetch(`/api/fixtures/live?${params}`, {
          cache: "no-store",
        });
        const json = (await res.json()) as {
          fixtures?: Array<Record<string, unknown>>;
          settled?: number;
        };
        if (cancelled || !Array.isArray(json.fixtures)) return;
        const next: Record<number, LiveFixturePatch> = {};
        for (const row of json.fixtures) {
          const parsed = patchFromRow(row);
          if (parsed) next[parsed.id] = parsed.patch;
        }
        setPatches((prev) => ({ ...prev, ...next }));
        if ((json.settled ?? 0) > 0) onSettledRef.current?.();
      } catch {
        /* nätverksfel: försök igen nästa intervall */
      }
    }

    void refetch();
    const timer = setInterval(() => void refetch(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [enablePoll, key]);

  return patches;
}
