"use client";

import { useEffect, useRef, useState } from "react";

const DISMISS_KEY = "spelbok.install.dismissedAt";
const DISMISS_DAYS = 14;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS Safari
    window.navigator.standalone === true
  );
}

function wasDismissedRecently() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function InstallPrompt({ betCount }: { betCount: number }) {
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);

  useEffect(() => {
    if (isStandalone() || wasDismissedRecently()) return;

    const onBip = (e: Event) => {
      e.preventDefault();
      deferred.current = e as BeforeInstallPromptEvent;
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  useEffect(() => {
    if (isStandalone() || wasDismissedRecently()) return;
    if (betCount < 3) return;
    setVisible(true);
  }, [betCount]);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setVisible(false);
    setIosHelp(false);
  }

  async function install() {
    if (deferred.current) {
      await deferred.current.prompt();
      const choice = await deferred.current.userChoice;
      deferred.current = null;
      if (choice.outcome === "accepted") {
        setVisible(false);
        return;
      }
      dismiss();
      return;
    }
    if (isIos()) {
      setIosHelp(true);
      return;
    }
    dismiss();
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-[108px] z-[55] lg:hidden">
      {iosHelp ? (
        <div className="rounded-[14px] border border-line bg-panel p-4 shadow-[0_18px_50px_rgba(0,0,0,.55)]">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="font-semibold">Lägg till på hemskärmen</div>
            <button type="button" onClick={dismiss} className="text-muted">
              ×
            </button>
          </div>
          <ol className="space-y-2 text-sm text-muted">
            <li>1. Tryck på Dela-ikonen i Safari</li>
            <li>2. Välj ”Lägg till på hemskärmen”</li>
            <li>3. Bekräfta med Lägg till</li>
          </ol>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-[14px] border border-line bg-panel px-3 py-3 shadow-[0_18px_50px_rgba(0,0,0,.55)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/icon-192.png"
            alt=""
            className="h-10 w-10 rounded-[10px]"
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">
              Lägg till på hemskärmen
            </div>
            <div className="truncate text-[12px] text-muted">
              Fullskärm, snabbare start
            </div>
          </div>
          <button
            type="button"
            onClick={install}
            className="rounded-[10px] bg-win px-3 py-2 text-[13px] font-bold text-win-ink"
          >
            Lägg till
          </button>
          <button type="button" onClick={dismiss} className="px-1 text-muted" aria-label="Stäng">
            ×
          </button>
        </div>
      )}
    </div>
  );
}
