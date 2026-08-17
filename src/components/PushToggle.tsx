"use client";

import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export function PushToggle() {
  const {
    isSupported,
    permission,
    isSubscribed,
    ready,
    loading,
    error,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  if (!ready) return null;

  if (!isSupported) {
    return (
      <p className="text-[14px] text-muted">
        Notiser kräver att appen är installerad på hemskärmen.
      </p>
    );
  }

  if (permission === "denied") {
    return (
      <p className="text-[14px] text-muted">
        Du har blockerat notiser. Aktivera dem i webbläsarens inställningar för
        att kunna ta emot push.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {isSubscribed ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 text-[14.5px] font-semibold text-win">
            <BellRing className="size-4" strokeWidth={2.25} />
            Notiser aktiverade
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={loading}
            onClick={() => void unsubscribe()}
          >
            <BellOff className="size-3.5" />
            {loading ? "Stänger av…" : "Stäng av"}
          </Button>
        </div>
      ) : (
        <Button
          disabled={loading}
          onClick={() => void subscribe()}
        >
          <Bell className="size-4" />
          {loading ? "Aktiverar…" : "Aktivera notiser"}
        </Button>
      )}
      {error ? <p className="text-[13px] text-loss">{error}</p> : null}
    </div>
  );
}
