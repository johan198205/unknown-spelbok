import {
  Skeleton,
  SkeletonHeading,
  SkeletonKpiRow,
  SkeletonRows,
} from "@/components/ui/Skeleton";

export default function HemLoading() {
  return (
    <div className="space-y-5 lg:mx-auto lg:max-w-[720px]">
      <div className="flex items-start justify-between gap-3 px-1">
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-3 w-36" />
        </div>
        <Skeleton className="h-[42px] w-[42px] rounded-full" />
      </div>

      <div className="rounded-[16px] border border-line bg-panel px-3.5 pb-2.5 pt-3.5">
        <Skeleton className="h-[132px] w-full rounded-[10px]" />
      </div>

      <SkeletonKpiRow />

      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <SkeletonHeading />
          <Skeleton className="h-3 w-10" />
        </div>
        <SkeletonRows count={3} />
      </div>
    </div>
  );
}
