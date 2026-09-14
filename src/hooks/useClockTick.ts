"use client";

import { useEffect, useState } from "react";

/** Var femte sekund räcker gott för livescore: klockan visar minuter. */
const DEFAULT_TICK_MS = 5_000;

/**
 * Tidsstämpel som uppdateras så länge `active` är sann, för vyer som räknar
 * upp spelminuten lokalt mellan API-svaren. Är den falsk står värdet still
 * och ingen timer startas.
 *
 * `intervalMs` styr takten — spelbokens matchfas tickar var 30:e sekund.
 */
export function useClockTick(active: boolean, intervalMs = DEFAULT_TICK_MS) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [active, intervalMs]);

  return now;
}
