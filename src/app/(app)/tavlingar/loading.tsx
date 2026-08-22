import { Skeleton } from "@/components/ui/Skeleton";

export default function TavlingarLoading() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-3.5 w-60" />
      </div>

      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="space-y-3 rounded-[var(--radius-panel)] border border-line bg-panel p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-3 w-52" />
          <div className="space-y-2 pt-1">
            {Array.from({ length: 3 }).map((_, r) => (
              <div key={r} className="flex items-center gap-3">
                <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
                <Skeleton className="h-3 flex-1" />
                <Skeleton className="h-3 w-12 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
