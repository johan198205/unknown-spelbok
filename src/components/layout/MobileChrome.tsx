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
import { BetForm } from "@/components/bets/BetForm";
import { MobileAddBetFlow } from "@/components/pwa/MobileAddBetFlow";
import { OfflineBanner } from "@/components/pwa/OfflineBanner";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { Onboarding } from "@/components/pwa/Onboarding";
import { useIsDesktop } from "@/lib/hooks/useIsDesktop";
import type { Bookmaker, Fixture, Sheet } from "@/lib/types";

type MobileChromeValue = {
  /** Med fixture: matchen är redan vald och kaskad-väljaren hoppas över. */
  openAddBet: (prefillFixture?: Fixture | null) => void;
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
  const [prefill, setPrefill] = useState<Fixture | null>(null);
  const [betCount, setBetCount] = useState(initialBetCount);
  const isDesktop = useIsDesktop();

  const openAddBet = useCallback((prefillFixture?: Fixture | null) => {
    setPrefill(prefillFixture ?? null);
    setAddOpen(true);
  }, []);
  const closeAddBet = useCallback(() => {
    setAddOpen(false);
    setPrefill(null);
  }, []);
  const bumpBetCount = useCallback(() => setBetCount((n) => n + 1), []);

  const value = useMemo(
    () => ({ openAddBet, closeAddBet, betCount, bumpBetCount }),
    [openAddBet, closeAddBet, betCount, bumpBetCount]
  );

  return (
    <MobileChromeContext.Provider value={value}>
      <OfflineBanner />
      {children}
      <BottomNav onAdd={() => openAddBet()} />
      {/*
        BottomNav är mobil-only, men förslagskorten på dashboarden kan öppna
        flödet även på desktop. Exakt ett flöde monteras — att rendera båda
        och gömma ett med CSS hade dubblerat matchhämtningen.
      */}
      {addOpen ? (
        isDesktop ? (
          <BetForm
            key={prefill?.fixture_id ?? "blank"}
            sheets={sheets}
            bookmakers={bookmakers}
            prefillFixture={prefill}
            hideTrigger
            onClose={closeAddBet}
            onDone={bumpBetCount}
          />
        ) : (
          <MobileAddBetFlow
            sheets={sheets}
            bookmakers={bookmakers}
            prefillFixture={prefill}
            onClose={closeAddBet}
            onSaved={() => {
              bumpBetCount();
              closeAddBet();
            }}
          />
        )
      ) : null}
      <InstallPrompt betCount={betCount} />
      <Onboarding />
    </MobileChromeContext.Provider>
  );
}
