"use server";

import { revalidatePath } from "next/cache";
import { logAdmin } from "@/lib/admin/log";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { payoutForResult } from "@/lib/utils";

/**
 * Sättlingsvyn läser och skriver spel för alla användare. bets har bara
 * ägarpolicyn i RLS, så allt här går via service role-klienten — varje
 * funktion gatear med requireAdmin() först.
 */

export type SettleReason = "fixture_missing" | "postponed" | "unclear" | "awarded";

const REASON_LABEL: Record<string, string> = {
  fixture_missing: "Fixture saknas",
  postponed: "Uppskjuten",
  unclear: "Oklart resultat",
  awarded: "Walkover/tilldömd",
};

export type ManualRow = {
  queueId: string;
  betId: string;
  user: string;
  match: string;
  pick: string;
  odds: number;
  stake: number;
  reason: string;
  reasonLabel: string;
  createdAt: string;
};

export type WaitingRow = {
  betId: string;
  user: string;
  match: string;
  pick: string;
  odds: number;
  stake: number;
  kickoff: string | null;
  fixtureStatus: string;
  score: string;
};

export type AutoRow = {
  betId: string;
  match: string;
  pick: string;
  result: string;
  score: string;
  settledAt: string;
  netto: number;
};

export type FixtureCacheRow = {
  league: string;
  upcoming: number;
  oldestUpdatedAt: string | null;
};

export type SyncLogRow = {
  id: string;
  job: string;
  ok: boolean;
  requests: number;
  upserted: number;
  settled: number;
  error: string | null;
  startedAt: string;
  startedLabel: string;
};

export type SettleData = {
  api: {
    ok: boolean;
    lastSync: string | null;
    lastSyncLabel: string;
  };
  waitingCount: number;
  manualCount: number;
  manual: ManualRow[];
  waiting: WaitingRow[];
  auto: AutoRow[];
  fixtures: FixtureCacheRow[];
  syncLog: SyncLogRow[];
};

const PAGE_SIZE = 1000;

function timeLabel(iso: string | null) {
  if (!iso) return "aldrig";
  return new Date(iso).toLocaleTimeString("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Stockholm",
  });
}

function dateTimeLabel(iso: string | null) {
  if (!iso) return "–";
  return new Date(iso).toLocaleString("sv-SE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Stockholm",
  });
}

function scoreOf(home: number | null, away: number | null) {
  if (home == null || away == null) return "–";
  return `${home}–${away}`;
}

export async function getSettleData(): Promise<SettleData> {
  await requireAdmin();
  const service = createAdminClient();
  const nowIso = new Date().toISOString();

  const [lastSync, waitingCount, queueCount, queue, waiting, auto, fixtures, syncLog] =
    await Promise.all([
      service
        .from("sync_log")
        .select("started_at, ok")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      service
        .from("bets")
        .select("*", { count: "exact", head: true })
        .eq("result", "open")
        .not("fixture_id", "is", null),
      service
        .from("settle_queue")
        .select("*", { count: "exact", head: true })
        .eq("resolved", false),
      service
        .from("settle_queue")
        .select(
          "id, reason, created_at, bets:bet_id(id, match, pick, odds, stake, user_id, profiles:user_id(username))"
        )
        .eq("resolved", false)
        .order("created_at", { ascending: true })
        .limit(100),
      service
        .from("bets")
        .select(
          "id, match, pick, odds, stake, profiles:user_id(username), fixtures!inner(kickoff, status, home_score, away_score)"
        )
        .eq("result", "open")
        .lt("fixtures.kickoff", nowIso)
        .order("placed_at", { ascending: false })
        .limit(50),
      service
        .from("bets")
        .select(
          "id, match, pick, result, stake, payout, settled_at, fixtures:fixture_id(home_score, away_score)"
        )
        .eq("settled_by", "auto")
        .not("settled_at", "is", null)
        .order("settled_at", { ascending: false })
        .limit(12),
      service
        .from("fixtures")
        .select("league_name, kickoff, updated_at")
        .gte("kickoff", nowIso)
        .order("kickoff", { ascending: true })
        .range(0, PAGE_SIZE - 1),
      service
        .from("sync_log")
        .select(
          "id, job, ok, requests, upserted, settled, error, started_at"
        )
        .order("started_at", { ascending: false })
        .limit(12),
    ]);

  const lastSyncRow = lastSync.error
    ? null
    : (lastSync.data as { started_at: string; ok: boolean } | null);
  const lastSyncIso = lastSyncRow?.started_at ?? null;
  const fresh = lastSyncRow?.ok === true;

  type QueueRow = {
    id: string;
    reason: string;
    created_at: string;
    bets: {
      id: string;
      match: string;
      pick: string;
      odds: number;
      stake: number;
      profiles: { username: string } | null;
    } | null;
  };

  const manual: ManualRow[] = ((queue.data ?? []) as unknown as QueueRow[])
    .filter((row) => !!row.bets)
    .map((row) => ({
      queueId: row.id,
      betId: row.bets!.id,
      user: row.bets!.profiles?.username ?? "okänd",
      match: row.bets!.match,
      pick: row.bets!.pick,
      odds: Number(row.bets!.odds),
      stake: Number(row.bets!.stake),
      reason: row.reason,
      reasonLabel: REASON_LABEL[row.reason] ?? row.reason,
      createdAt: dateTimeLabel(row.created_at),
    }));

  type WaitingQueryRow = {
    id: string;
    match: string;
    pick: string;
    odds: number;
    stake: number;
    profiles: { username: string } | null;
    fixtures: {
      kickoff: string;
      status: string;
      home_score: number | null;
      away_score: number | null;
    } | null;
  };

  const waitingRows: WaitingRow[] = (
    (waiting.data ?? []) as unknown as WaitingQueryRow[]
  ).map((row) => ({
      betId: row.id,
      user: row.profiles?.username ?? "okänd",
      match: row.match,
      pick: row.pick,
      odds: Number(row.odds),
      stake: Number(row.stake),
      kickoff: row.fixtures?.kickoff ?? null,
      fixtureStatus: row.fixtures?.status ?? "NS",
      score: scoreOf(
        row.fixtures?.home_score ?? null,
        row.fixtures?.away_score ?? null
      ),
    })
  );

  type AutoQueryRow = {
    id: string;
    match: string;
    pick: string;
    result: string;
    stake: number;
    payout: number;
    settled_at: string;
    fixtures: { home_score: number | null; away_score: number | null } | null;
  };

  const autoRows: AutoRow[] = (
    (auto.data ?? []) as unknown as AutoQueryRow[]
  ).map((row) => ({
    betId: row.id,
    match: row.match,
    pick: row.pick,
    result: row.result,
    score: scoreOf(
      row.fixtures?.home_score ?? null,
      row.fixtures?.away_score ?? null
    ),
    settledAt: timeLabel(row.settled_at),
    netto: Number(row.payout) - Number(row.stake),
  }));

  const byLeague = new Map<string, { upcoming: number; oldest: string | null }>();
  for (const row of (fixtures.data ?? []) as {
    league_name: string | null;
    updated_at: string;
  }[]) {
    const league = (row.league_name || "").trim() || "Okänd liga";
    const cur = byLeague.get(league) ?? { upcoming: 0, oldest: null };
    cur.upcoming += 1;
    if (!cur.oldest || row.updated_at < cur.oldest) cur.oldest = row.updated_at;
    byLeague.set(league, cur);
  }

  const fixtureRows: FixtureCacheRow[] = [...byLeague.entries()]
    .map(([league, v]) => ({
      league,
      upcoming: v.upcoming,
      oldestUpdatedAt: v.oldest,
    }))
    .sort((a, b) => b.upcoming - a.upcoming)
    .slice(0, 8);

  const syncLogRows: SyncLogRow[] = syncLog.error
    ? []
    : (
        (syncLog.data ?? []) as {
          id: string;
          job: string;
          ok: boolean;
          requests: number;
          upserted: number;
          settled: number;
          error: string | null;
          started_at: string;
        }[]
      ).map((row) => ({
    id: row.id,
    job: row.job,
    ok: row.ok,
    requests: row.requests,
    upserted: row.upserted,
    settled: row.settled,
    error: row.error,
    startedAt: row.started_at,
    startedLabel: dateTimeLabel(row.started_at),
  }));

  return {
    api: {
      ok: fresh,
      lastSync: lastSyncIso,
      lastSyncLabel: lastSyncIso
        ? `Senaste synk ${timeLabel(lastSyncIso)}`
        : "Ingen synk ännu",
    },
    waitingCount: waitingCount.count ?? 0,
    manualCount: queueCount.count ?? 0,
    manual,
    waiting: waitingRows,
    auto: autoRows,
    fixtures: fixtureRows,
    syncLog: syncLogRows,
  };
}

export async function settleQueuedBet(
  queueId: string,
  betId: string,
  result: "win" | "loss" | "void"
) {
  await requireAdmin();
  const service = createAdminClient();

  const { data: bet } = await service
    .from("bets")
    .select("match, pick, stake, odds, profiles:user_id(username)")
    .eq("id", betId)
    .maybeSingle();

  const row = bet as {
    match?: string;
    pick?: string;
    stake?: number;
    odds?: number;
    profiles?: { username?: string } | null;
  } | null;

  const { error: betError } = await service
    .from("bets")
    .update({
      result,
      payout: payoutForResult(
        result,
        Number(row?.stake ?? 0),
        Number(row?.odds ?? 0)
      ),
      settled_at: new Date().toISOString(),
      settled_by: "user",
    })
    .eq("id", betId);
  if (betError) throw new Error(betError.message);

  const { error: queueError } = await service
    .from("settle_queue")
    .update({ resolved: true })
    .eq("id", queueId);
  if (queueError) throw new Error(queueError.message);

  await logAdmin(
    "settle.manual",
    `${row?.match ?? betId} · ${row?.pick ?? ""} → ${result}`,
    { betId, queueId, result, user: row?.profiles?.username }
  );

  revalidatePath("/admin/sattling");
  revalidatePath("/admin");
  return { result };
}

/** Loggar efter manuell trigger av Edge Function sync-fixtures. */
export async function markFixturesSynced(league?: string) {
  await requireAdmin();
  await logAdmin("fixtures.synced", league ? `liga ${league}` : "alla ligor", {
    league: league ?? null,
  });
  revalidatePath("/admin/sattling");
  return { ok: true };
}
