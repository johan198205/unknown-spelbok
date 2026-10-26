import { Skeleton } from "@/components/ui/Skeleton";

/*
  Samma container och tabellform som sidan, så att innehållet landar där
  skelettet stod i stället för att hoppa in från kanten.
*/
export default function TopplistaLoading() {
  return (
    <div className="mx-auto max-w-[1180px] px-5 py-2 lg:px-7 lg:py-10">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-3.5 w-64 max-w-full" />
      </div>

      <div className="overflow-hidden rounded-[var(--radius-panel)] border border-line bg-panel">
        <div className="border-b border-line bg-bg-soft px-5 py-3">
          <Skeleton className="h-3 w-32" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b border-line-row px-5 py-3.5 last:border-b-0"
          >
            <Skeleton className="h-4 w-4 shrink-0" />
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-48 max-w-full" />
              <Skeleton className="h-3 w-32 max-w-full" />
            </div>
            <Skeleton className="h-4 w-14 shrink-0" />
            <Skeleton className="hidden h-4 w-20 shrink-0 sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
