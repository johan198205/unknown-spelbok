import { Skeleton, SkeletonKpiRow } from "@/components/ui/Skeleton";

export default function InstallningarLoading() {
  return (
    <div className="space-y-5 lg:mx-auto lg:max-w-[720px]">
      <div className="flex items-center gap-3.5 rounded-[var(--radius-panel)] border border-line bg-panel p-4">
        <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>

      <SkeletonKpiRow count={4} />

      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="space-y-3 rounded-[var(--radius-panel)] border border-line bg-panel p-4"
        >
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full rounded-[10px]" />
          <Skeleton className="h-10 w-full rounded-[10px]" />
        </div>
      ))}
    </div>
  );
}
