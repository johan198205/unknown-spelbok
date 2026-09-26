import { RegistrationsChart } from "@/components/admin/RegistrationsChart";
import { getOverviewData } from "@/lib/admin/overview";

export default async function AdminOverviewPage() {
  const data = await getOverviewData();

  return (
    <div className="animate-[admfade_.22s_ease]">
      <div className="mb-[18px] grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {data.kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-[13px] border border-line bg-panel p-4"
          >
            <div className="mb-2 text-[10.5px] uppercase tracking-[0.13em] text-dim">
              {k.label}
            </div>
            <div
              className="font-mono-num text-[27px] font-semibold"
              style={{ color: k.color }}
            >
              {k.value}
            </div>
            <div
              className="mt-1 text-[12.5px]"
              style={{ color: k.deltaColor }}
            >
              {k.delta}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1.55fr_1fr]">
        <RegistrationsChart data={data.chart} total={data.chartTotal} />

        <div className="overflow-hidden rounded-[14px] border border-line bg-panel">
          <div className="border-b border-line-soft px-[18px] py-4 font-display text-[16px] font-semibold uppercase tracking-[0.05em]">
            Senaste händelser
          </div>
          {data.events.length === 0 ? (
            <div className="px-[18px] py-6 text-[13.5px] text-dim">
              Inga händelser ännu.
            </div>
          ) : (
            data.events.map((e, i) => (
              <div
                key={`${e.at}-${i}`}
                className="flex items-start gap-[11px] border-b border-rowline px-[18px] py-3 transition-colors hover:bg-hover"
              >
                <span
                  className="mt-1.5 size-[7px] shrink-0 rounded-full"
                  style={{ background: e.color }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px]">{e.text}</div>
                  <div className="text-[12px] text-dim">{e.detail}</div>
                </div>
                <span className="font-mono-num whitespace-nowrap text-[11.5px] text-dim">
                  {e.time}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
