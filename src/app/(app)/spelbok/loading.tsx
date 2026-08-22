import {
  Skeleton,
  SkeletonKpiRow,
  SkeletonRows,
} from "@/components/ui/Skeleton";

export default function SpelbokLoading() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-3.5 w-64" />
        </div>
        <Skeleton className="h-9 w-32 rounded-[10px]" />
      </div>

      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-28 rounded-[10px]" />
        ))}
      </div>

      <SkeletonKpiRow count={4} />

      <SkeletonRows count={6} />
    </div>
  );
}
