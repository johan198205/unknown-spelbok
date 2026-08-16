"use client";

import { useEffect, useState } from "react";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";

export function OfflineBanner() {
  const online = useOnlineStatus();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted || online) return null;

  return (
    <div className="sticky top-[53px] z-30 mx-3 mt-2 flex items-center gap-2.5 rounded-[12px] border border-[var(--offline-border)] bg-[var(--offline-bg)] px-3.5 py-2.5 text-[13px] text-yellow lg:hidden">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-yellow" />
      <span className="flex-1">
        Offline — dina spel sparas lokalt och synkas automatiskt
      </span>
    </div>
  );
}
