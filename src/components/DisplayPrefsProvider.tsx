"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_DISPLAY_PREFS,
  formatAmount,
  type DisplayMode,
  type DisplayPrefs,
} from "@/lib/display";

/**
 * Server-komponenter hämtar prefs med getDisplayPrefs(). Klientkomponenter tar
 * dem härifrån i stället för att få dem nerkedjade som props genom fem lager.
 *
 * Mode kan sättas lokalt (SEK↔Units) så belopp via useAmount/FormattedAmount
 * byter direkt — utan att vänta på router.refresh().
 */
const DisplayPrefsContext = createContext<DisplayPrefs>(DEFAULT_DISPLAY_PREFS);
const SetDisplayModeContext = createContext<(mode: DisplayMode) => void>(
  () => {}
);

export function DisplayPrefsProvider({
  value,
  children,
}: {
  value: DisplayPrefs;
  children: ReactNode;
}) {
  const [prefs, setPrefs] = useState(value);

  // Nästa navigation / refresh levererar serverns sanning — synka då.
  useEffect(() => {
    setPrefs(value);
  }, [value]);

  const setMode = useCallback((mode: DisplayMode) => {
    setPrefs((prev) => (prev.mode === mode ? prev : { ...prev, mode }));
  }, []);

  return (
    <DisplayPrefsContext.Provider value={prefs}>
      <SetDisplayModeContext.Provider value={setMode}>
        {children}
      </SetDisplayModeContext.Provider>
    </DisplayPrefsContext.Provider>
  );
}

export function useDisplayPrefs() {
  return useContext(DisplayPrefsContext);
}

/** Sätt visningsläge lokalt. Persistens sköts av DisplayModeToggle. */
export function useSetDisplayMode() {
  return useContext(SetDisplayModeContext);
}

/** formatAmount med användarens prefs redan inbakade. */
export function useAmount() {
  const prefs = useDisplayPrefs();
  return useCallback(
    (value: number, opts?: { sign?: boolean }) => formatAmount(value, prefs, opts),
    [prefs]
  );
}
