"use client";

import { createContext, useContext, useMemo } from "react";
import { createT, type TextOverrides, type TFunction } from "@/lib/texts";

const TextsContext = createContext<TextOverrides>({});

/** Rot-layouten skickar in adminens överskrivningar; standardtexterna finns i bundlen. */
export function TextsProvider({
  overrides,
  children,
}: {
  overrides: TextOverrides;
  children: React.ReactNode;
}) {
  return (
    <TextsContext.Provider value={overrides}>{children}</TextsContext.Provider>
  );
}

/** t() för klientkomponenter. Serverkomponenter använder `await getT()`. */
export function useT(): TFunction {
  const overrides = useContext(TextsContext);
  return useMemo(() => createT(overrides), [overrides]);
}
