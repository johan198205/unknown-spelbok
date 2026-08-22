import { Skeleton, SkeletonRows } from "@/components/ui/Skeleton";

export default function TopplistaLoading() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-3.5 w-56" />
      </div>

      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-[10px]" />
        ))}
      </div>

      <SkeletonRows count={8} />
    </div>
  );
}
