import { Skeleton, SkeletonKpiRow } from "@/components/ui/Skeleton";

export default function StatistikLoading() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-3.5 w-56" />
      </div>

      <SkeletonKpiRow count={4} />

      <div className="rounded-[16px] border border-line bg-panel px-3.5 pb-2.5 pt-3.5">
        <Skeleton className="h-[160px] w-full rounded-[10px]" />
      </div>

      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-[12px] border border-line bg-panel px-3.5 py-3.5"
          >
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3.5 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
