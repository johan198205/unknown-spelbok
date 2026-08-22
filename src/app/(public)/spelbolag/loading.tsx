import { Skeleton } from "@/components/ui/Skeleton";

export default function SpelbolagLoading() {
  return (
    <div className="mx-auto max-w-[1180px] px-7 py-10">
      <div className="mb-[18px] flex flex-col items-center gap-2">
        <Skeleton className="h-8 w-[420px] max-w-full" />
        <Skeleton className="h-3.5 w-44" />
      </div>
      <Skeleton className="mb-5 h-3 w-72 max-w-full" />

      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-[var(--radius-panel)] border border-line bg-panel p-4"
          >
            <Skeleton className="h-12 w-24 shrink-0 rounded-[10px]" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <Skeleton className="h-10 w-32 shrink-0 rounded-[10px]" />
          </div>
        ))}
      </div>
    </div>
  );
}
