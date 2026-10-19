"use client";

import { Bell, BellOff, BellRing } from "lucide-react";
import { useT } from "@/components/TextsProvider";
import { Button } from "@/components/ui/Button";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export function PushToggle() {
  const t = useT();
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
        {t("pwa.push.unsupported")}
      </p>
    );
  }

  if (permission === "denied") {
    return (
      <p className="text-[14px] text-muted">
        {t("pwa.push.denied")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {isSubscribed ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 text-[14.5px] font-semibold text-win">
            <BellRing className="size-4" strokeWidth={2.25} />
            {t("pwa.push.active")}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={loading}
            onClick={() => void unsubscribe()}
          >
            <BellOff className="size-3.5" />
            {loading ? t("pwa.push.disabling") : t("pwa.push.disable")}
          </Button>
        </div>
      ) : (
        <Button
          disabled={loading}
          onClick={() => void subscribe()}
        >
          <Bell className="size-4" />
          {loading ? t("pwa.push.enabling") : t("pwa.push.enable")}
        </Button>
      )}
      {error ? <p className="text-[13px] text-loss">{error}</p> : null}
    </div>
  );
}
