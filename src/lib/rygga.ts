import {
  isFinishedStatus,
  isInPlayStatus,
} from "@/lib/live-fixture";

type RyggaBetLike = {
  result: string;
  placed_at: string;
  fixtures?: {
    status?: string | null;
    kickoff?: string | null;
  } | null;
};

type RyggaPlacedAtLike = {
  placed_at: string;
  fixtures?: {
    kickoff?: string | null;
  } | null;
};

/** Öppet spel där matchen ännu inte startat — kan ryggas. */
export function canRyggaBet(bet: RyggaBetLike) {
  if (bet.result !== "open") return false;

  const fixture = bet.fixtures;
  if (fixture) {
    if (isFinishedStatus(fixture.status) || isInPlayStatus(fixture.status)) {
      return false;
    }
    if (fixture.kickoff) {
      const start = new Date(fixture.kickoff).getTime();
      if (!Number.isNaN(start) && Date.now() >= start) return false;
    }
    return true;
  }

  // Manuellt spel utan fixture: tillåt om öppet (kan inte bevisa start)
  return true;
}

/** Notis-klocka: öppet spel kopplat till fixture (som tidigare). */
export function canNotifyBet(bet: {
  result: string;
  fixture_id?: number | null;
}) {
  return bet.result === "open" && bet.fixture_id != null;
}

/** Datum för ryggat spel: matchens kickoff, annars placed_at från original. */
export function ryggaPlacedAt(bet: RyggaPlacedAtLike) {
  const kickoff = bet.fixtures?.kickoff;
  if (kickoff) return kickoff;
  return bet.placed_at;
}
