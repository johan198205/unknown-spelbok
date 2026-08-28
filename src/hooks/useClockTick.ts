"use client";

import { useEffect, useState } from "react";

/** Var femte sekund räcker gott: klockan visar minuter, inte sekunder. */
const TICK_MS = 5_000;

/**
 * Tidsstämpel som uppdateras så länge `active` är sann, för vyer som räknar
 * upp spelminuten lokalt mellan API-svaren. Är den falsk står värdet still
 * och ingen timer startas.
 */
export function useClockTick(active: boolean) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, [active]);

  return now;
}
