import { cn } from "@/lib/utils";

/**
 * Byggklossar för loading.tsx. Poängen är inte att gissa exakt innehåll utan
 * att sidan byter form direkt vid klicket — annars upplevs appen som död och
 * användaren klickar igen.
 */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded bg-panel-2", className)} />
  );
}

export function SkeletonPanel({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-panel)] border border-line bg-panel p-4",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Vågrät rad med KPI-kort, som på Hem och Statistik. */
export function SkeletonKpiRow({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-2.5 overflow-hidden pb-1">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="min-w-[104px] flex-1 rounded-[13px] border border-line bg-panel px-[13px] py-3"
        >
          <Skeleton className="h-2.5 w-12" />
          <Skeleton className="mt-2 h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Lista av rader i panelstil — spel, tävlingar, topplista. */
export function SkeletonRows({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-[12px] border border-line bg-panel px-3.5 py-3"
        >
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
          <Skeleton className="h-4 w-14 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonHeading({ className }: { className?: string }) {
  return <Skeleton className={cn("h-4 w-40", className)} />;
}
