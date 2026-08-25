import { Skeleton } from "@/components/ui/Skeleton";

/** Speglar HemPage: rubrikrad, KPI-grid och tvåkolumnsytan från 1080px. */
export default function HemLoading() {
  return (
    <div className="min-[1080px]:pb-8">
      <div className="mb-[18px] flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-[46px] w-56" />
          <Skeleton className="h-3 w-64" />
        </div>
        <Skeleton className="h-[45px] w-32 shrink-0 rounded-[10px]" />
      </div>

      <div className="mb-[18px] grid grid-cols-[repeat(auto-fit,minmax(152px,1fr))] gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[12px] border border-line bg-panel px-[15px] py-[14px]"
          >
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="mt-2.5 h-5 w-20" />
          </div>
        ))}
      </div>

      <div className="grid items-start gap-[18px] min-[1080px]:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-[18px]">
          <section className="rounded-[14px] border border-line bg-panel p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-7 w-40 rounded-[9px]" />
            </div>
            <Skeleton className="h-[230px] w-full rounded-[10px]" />
          </section>

          <section>
            <div className="mb-2.5 flex items-baseline justify-between gap-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-14" />
            </div>
            <div className="space-y-2.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-end gap-x-3.5 gap-y-2 rounded-[13px] border border-line bg-panel px-4 py-3.5"
                >
                  <div className="min-w-0 grow basis-full space-y-2 sm:basis-0">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <Skeleton className="h-4 w-[84px] shrink-0" />
                  <Skeleton className="h-4 w-[74px] shrink-0" />
                  <Skeleton className="h-5 w-[132px] shrink-0" />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[14px] border border-line bg-panel p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-7 w-48 rounded-[9px]" />
            </div>
            <div>
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 border-t border-line-soft py-[9px]"
                >
                  <Skeleton className="h-3 w-28 shrink-0" />
                  <Skeleton className="hidden h-[6px] w-[110px] shrink-0 rounded-[99px] sm:block" />
                  <div className="flex-1" />
                  <Skeleton className="h-3.5 w-16 shrink-0" />
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="min-w-0 space-y-[18px]">
          <section>
            <Skeleton className="mb-2.5 h-4 w-40" />
            <div className="overflow-hidden rounded-[13px] border border-line bg-panel">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 border-b border-line-row px-[13px] py-[9px] last:border-b-0"
                >
                  <div className="min-w-0 flex-1 space-y-[7px]">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-2.5 w-1/2" />
                  </div>
                  <Skeleton className="h-3.5 w-14 shrink-0" />
                </div>
              ))}
            </div>
          </section>

          <section>
            <Skeleton className="mb-2.5 h-4 w-44" />
            <div className="overflow-hidden rounded-[13px] border border-line bg-panel">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 border-b border-line-row px-[13px] py-[11px] last:border-b-0"
                >
                  <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-[7px]">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-2.5 w-2/5" />
                  </div>
                  <Skeleton className="h-3.5 w-12 shrink-0" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
