import {
  Skeleton,
  SkeletonKpiRow,
  SkeletonRows,
} from "@/components/ui/Skeleton";

/** Bara innehållet — flikarna sitter i layouten och blinkar inte bort. */
export default function SpelbokLoading() {
  return (
    <div className="space-y-5">
      <SkeletonKpiRow count={4} />
      <Skeleton className="h-[220px] w-full rounded-[14px]" />
      <SkeletonRows count={6} />
    </div>
  );
}
