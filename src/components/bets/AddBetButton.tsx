"use client";

import { useMobileChrome } from "@/components/layout/MobileChrome";
import { Button } from "@/components/ui/Button";
import { useT } from "@/components/TextsProvider";

/**
 * Dashboardens primära åtgärd. Öppnar samma flöde som plusknappen i
 * bottennavigeringen — desktop får BetForm, mobil får MobileAddBetFlow.
 */
export function AddBetButton() {
  const chrome = useMobileChrome();
  const t = useT();
  return (
    <Button
      onClick={() => chrome?.openAddBet()}
      className="shrink-0 rounded-[10px] px-5 py-3 text-[14.5px]"
    >
      {t("betform.trigger")}
    </Button>
  );
}
