"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { BottomNav } from "@/components/ui/BottomNav";
import { MobileAddBetFlow } from "@/components/pwa/MobileAddBetFlow";
import { OfflineBanner } from "@/components/pwa/OfflineBanner";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { Onboarding } from "@/components/pwa/Onboarding";
import type { Bookmaker, Sheet } from "@/lib/types";

type MobileChromeValue = {
  openAddBet: () => void;
  closeAddBet: () => void;
  betCount: number;
  bumpBetCount: () => void;
};

const MobileChromeContext = createContext<MobileChromeValue | null>(null);

export function useMobileChrome() {
  return useContext(MobileChromeContext);
}

export function MobileChrome({
  children,
  sheets,
  bookmakers,
  initialBetCount = 0,
}: {
  children: ReactNode;
  sheets: Sheet[];
  bookmakers: Bookmaker[];
  initialBetCount?: number;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [betCount, setBetCount] = useState(initialBetCount);

  const openAddBet = useCallback(() => setAddOpen(true), []);
  const closeAddBet = useCallback(() => setAddOpen(false), []);
  const bumpBetCount = useCallback(() => setBetCount((n) => n + 1), []);

  const value = useMemo(
    () => ({ openAddBet, closeAddBet, betCount, bumpBetCount }),
    [openAddBet, closeAddBet, betCount, bumpBetCount]
  );

  return (
    <MobileChromeContext.Provider value={value}>
      <OfflineBanner />
      {children}
      <BottomNav onAdd={openAddBet} />
      {addOpen ? (
        <MobileAddBetFlow
          sheets={sheets}
          bookmakers={bookmakers}
          onClose={closeAddBet}
          onSaved={() => {
            bumpBetCount();
            closeAddBet();
          }}
        />
      ) : null}
      <InstallPrompt betCount={betCount} />
      <Onboarding />
    </MobileChromeContext.Provider>
  );
}
