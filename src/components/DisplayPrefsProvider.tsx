"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import {
  DEFAULT_DISPLAY_PREFS,
  formatAmount,
  type DisplayPrefs,
} from "@/lib/display";

/**
 * Server-komponenter hämtar prefs med getDisplayPrefs(). Klientkomponenter tar
 * dem härifrån i stället för att få dem nerkedjade som props genom fem lager.
 */
const DisplayPrefsContext = createContext<DisplayPrefs>(DEFAULT_DISPLAY_PREFS);

export function DisplayPrefsProvider({
  value,
  children,
}: {
  value: DisplayPrefs;
  children: ReactNode;
}) {
  return (
    <DisplayPrefsContext.Provider value={value}>
      {children}
    </DisplayPrefsContext.Provider>
  );
}

export function useDisplayPrefs() {
  return useContext(DisplayPrefsContext);
}

/** formatAmount med användarens prefs redan inbakade. */
export function useAmount() {
  const prefs = useDisplayPrefs();
  return useCallback(
    (value: number, opts?: { sign?: boolean }) => formatAmount(value, prefs, opts),
    [prefs]
  );
}
