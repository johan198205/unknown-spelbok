"use client";

import { useEffect, useState } from "react";

/** Samma brytpunkt som Tailwinds `lg:` — håll dem i synk. */
const DESKTOP_QUERY = "(min-width: 1024px)";

/**
 * Avgör vilket "lägg spel"-flöde som ska monteras: BetForm (desktop-modal)
 * eller MobileAddBetFlow (helskärmsguide). Att i stället rendera båda och
 * gömma en med CSS betyder att den gömda ändå hämtar dagens matcher.
 *
 * false på servern och i första renderingen — flödena monteras först efter
 * ett klick, så ingen hydration hinner se fel värde.
 */
export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(DESKTOP_QUERY);
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return isDesktop;
}
