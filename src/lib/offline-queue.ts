import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Bet, BetResult } from "@/lib/types";

export type PendingBet = {
  id: string;
  status: "pending" | "error";
  createdAt: string;
  errorMessage?: string;
  payload: {
    sheet_id: string;
    match: string;
    pick: string;
    league: string | null;
    sport: string;
    odds: number;
    stake: number;
    bookmaker_id: string | null;
    fixture_id: number | null;
    result: "open";
  };
};

interface SpelbokDB extends DBSchema {
  pendingBets: {
    key: string;
    value: PendingBet;
  };
  cachedBets: {
    key: string;
    value: { sheetId: string; bets: Bet[]; updatedAt: string };
  };
}

const DB_NAME = "spelbok-offline";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<SpelbokDB>> | null = null;

function getDb() {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB only available in browser");
  }
  if (!dbPromise) {
    dbPromise = openDB<SpelbokDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("pendingBets")) {
          db.createObjectStore("pendingBets", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("cachedBets")) {
          db.createObjectStore("cachedBets", { keyPath: "sheetId" });
        }
      },
    });
  }
  return dbPromise;
}

export async function enqueuePendingBet(
  payload: PendingBet["payload"]
): Promise<PendingBet> {
  const db = await getDb();
  const item: PendingBet = {
    id: `pending-${crypto.randomUUID()}`,
    status: "pending",
    createdAt: new Date().toISOString(),
    payload,
  };
  await db.put("pendingBets", item);
  return item;
}

export async function listPendingBets(): Promise<PendingBet[]> {
  const db = await getDb();
  const all = await db.getAll("pendingBets");
  return all.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
}

export async function removePendingBet(id: string) {
  const db = await getDb();
  await db.delete("pendingBets", id);
}

export async function markPendingError(id: string, message: string) {
  const db = await getDb();
  const item = await db.get("pendingBets", id);
  if (!item) return;
  item.status = "error";
  item.errorMessage = message;
  await db.put("pendingBets", item);
}

export async function cacheBetsForSheet(sheetId: string, bets: Bet[]) {
  const db = await getDb();
  await db.put("cachedBets", {
    sheetId,
    bets,
    updatedAt: new Date().toISOString(),
  });
}

export async function getCachedBets(sheetId: string): Promise<Bet[] | null> {
  const db = await getDb();
  const row = await db.get("cachedBets", sheetId);
  return row?.bets ?? null;
}

export function pendingToDisplayBet(pending: PendingBet): Bet & {
  _pending?: boolean;
  _pendingStatus?: PendingBet["status"];
  _pendingId?: string;
} {
  return {
    id: pending.id,
    sheet_id: pending.payload.sheet_id,
    user_id: "",
    fixture_id: pending.payload.fixture_id,
    sport: pending.payload.sport,
    league: pending.payload.league,
    match: pending.payload.match,
    pick: pending.payload.pick,
    bookmaker_id: pending.payload.bookmaker_id,
    odds: pending.payload.odds,
    stake: pending.payload.stake,
    result: "open" as BetResult,
    payout: 0,
    placed_at: pending.createdAt,
    settled_at: null,
    settled_by: null,
    notify_goals: false,
    bookmakers: null,
    _pending: true,
    _pendingStatus: pending.status,
    _pendingId: pending.id,
  };
}

export async function syncPendingBets(
  insert: (payload: PendingBet["payload"] & { user_id: string }) => Promise<{
    error: string | null;
  }>,
  userId: string
) {
  const queue = await listPendingBets();
  const results: Array<{ id: string; ok: boolean; error?: string }> = [];

  for (const item of queue) {
    const { error } = await insert({ ...item.payload, user_id: userId });
    if (error) {
      await markPendingError(item.id, error);
      results.push({ id: item.id, ok: false, error });
    } else {
      await removePendingBet(item.id);
      results.push({ id: item.id, ok: true });
    }
  }

  return results;
}
