import Link from "next/link";
import { ActiveUsersChart } from "@/components/admin/ActiveUsersChart";
import { switchClasses } from "@/components/ui/Switch";
import {
  getStatsData,
  parsePeriod,
  STATS_PERIODS,
  type StatsBannerRow,
  type StatsBar,
} from "@/lib/admin/stats";
import { cn } from "@/lib/utils";

export const metadata = { title: "Statistik" };

function pct(value: number) {
  return `${value.toLocaleString("sv-SE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

export default async function AdminStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; cmp?: string }>;
}) {
  const sp = await searchParams;
  const period = parsePeriod(sp.period);
  const compare = sp.cmp !== "0";
  const data = await getStatsData(period, compare);

  const href = (patch: { period?: string; cmp?: string }) => {
    const params = new URLSearchParams();
    const next = { period, cmp: compare ? "1" : "0", ...patch };
    if (next.period !== "30d") params.set("period", next.period);
    if (next.cmp === "0") params.set("cmp", "0");
    const qs = params.toString();
    return qs ? `/admin/statistik?${qs}` : "/admin/statistik";
  };

  return (
    <div className="animate-[admfade_.22s_ease]">
      <div className="mb-[18px] flex flex-wrap items-center gap-3">
        <div className="flex gap-[3px] rounded-[11px] border border-line bg-panel p-1">
          {STATS_PERIODS.map((p) => {
            const on = p.key === period;
            return (
              <Link
                key={p.key}
                href={href({ period: p.key })}
                className={cn(
                  "rounded-lg px-[15px] py-[9px] text-[13.5px] font-semibold no-underline transition-colors hover:no-underline",
                  on
                    ? "bg-win/15 text-win"
                    : "bg-transparent text-muted hover:text-text"
                )}
              >
                {p.label}
              </Link>
            );
          })}
        </div>

        <div className="ml-1.5 flex items-center gap-2.5">
          <span className="text-[13.5px] text-text-soft">
            vs föregående period
          </span>
          <Link
            href={href({ cmp: compare ? "0" : "1" })}
            role="switch"
            aria-checked={compare}
            aria-label="Växla jämförelse med föregående period"
            className={switchClasses(compare).track}
          >
            <span aria-hidden className={switchClasses(compare).knob} />
          </Link>
        </div>

        <span className="font-mono-num ml-auto text-[12.5px] text-dim">
          {data.rangeLabel}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {data.kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-[13px] border border-line bg-panel p-4"
          >
            <div className="mb-2 text-[10.5px] uppercase tracking-[0.13em] text-dim">
              {k.label}
            </div>
            <div className="font-mono-num text-[27px] font-semibold">
              {k.value}
            </div>
            <div
              className={cn(
                "mt-[5px] inline-flex items-center gap-1.5 text-[13px] font-semibold",
                k.positive === true
                  ? "text-win"
                  : k.positive === false
                    ? "text-loss"
                    : "text-muted"
              )}
            >
              <span>{k.arrow}</span>
              <span>{k.delta}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4 rounded-[14px] border border-line bg-panel p-[18px]">
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="font-display text-[17px] font-semibold uppercase tracking-[0.05em]">
            Aktiva användare per dag
          </div>
          <div className="flex gap-4 text-[12.5px]">
            <span className="inline-flex items-center gap-[7px] text-text-soft">
              <span className="h-[2px] w-4 bg-win" />
              Denna period
            </span>
            {data.compare ? (
              <span className="inline-flex items-center gap-[7px] text-muted">
                <span className="w-4 border-t-2 border-dashed border-cyan/60" />
                Föregående
              </span>
            ) : null}
          </div>
        </div>
        <ActiveUsersChart data={data.chart} compare={data.compare} />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-[14px] border border-line bg-panel p-[18px]">
          <div className="mb-3.5 font-display text-[16px] font-semibold uppercase tracking-[0.05em]">
            Affiliateklick per bolag
          </div>
          {data.affiliate.length ? (
            <ClickBars rows={data.affiliate} />
          ) : (
            <div className="py-4 text-[13.5px] text-dim">
              Inga klick under perioden.
            </div>
          )}
        </div>

        <div className="rounded-[14px] border border-line bg-panel p-[18px]">
          <div className="mb-3.5 font-display text-[16px] font-semibold uppercase tracking-[0.05em]">
            Mest loggade ligor
          </div>
          {data.leagues.length ? (
            <div>
              <div className="flex items-center gap-3 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted">
                <span className="flex-1">Liga</span>
                <span className="w-[70px] text-right">Spel</span>
                <span className="w-[90px]" />
                <span className="w-12 text-right">Andel</span>
              </div>
              {data.leagues.map((l) => (
                <div
                  key={l.name}
                  className="flex items-center gap-3 border-t border-line-soft py-2"
                >
                  <span className="min-w-0 flex-1 truncate text-[13.5px] text-text-soft">
                    {l.name}
                  </span>
                  <span className="font-mono-num w-[70px] text-right text-[12.5px]">
                    {l.count.toLocaleString("sv-SE")}
                  </span>
                  <span className="h-[6px] w-[90px] overflow-hidden rounded-[3px] bg-bg">
                    <span
                      className="block h-full rounded-[3px] bg-cyan"
                      style={{ width: `${Math.max(l.share, 2)}%` }}
                    />
                  </span>
                  <span className="font-mono-num w-12 text-right text-[12.5px] text-muted">
                    {pct(l.share)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-[13.5px] text-dim">
              Inga spel loggade under perioden.
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 rounded-[14px] border border-line bg-panel p-[18px]">
        <div className="mb-3.5 font-display text-[16px] font-semibold uppercase tracking-[0.05em]">
          Bannerklick per banner
        </div>
        {data.banners.length ? (
          <BannerTable rows={data.banners} />
        ) : (
          <div className="py-4 text-[13.5px] text-dim">
            Inga händelser under perioden.
          </div>
        )}
      </div>

      <div className="rounded-[14px] border border-line bg-panel p-[18px]">
        <div className="mb-4 font-display text-[16px] font-semibold uppercase tracking-[0.05em]">
          Konvertering
        </div>
        <div className="max-w-[520px]">
          {data.funnel.map((f, i) => {
            const widths = ["100%", "78%", "58%"];
            const tones = [
              { bg: "bg-win/[0.10]", border: "border-win/30", text: "text-win" },
              {
                bg: "bg-cyan/[0.10]",
                border: "border-cyan/30",
                text: "text-cyan",
              },
              {
                bg: "bg-blue/[0.10]",
                border: "border-blue/30",
                text: "text-blue",
              },
            ];
            const tone = tones[i] ?? tones[2];
            const previous = data.funnel[i - 1];
            return (
              <div key={f.label}>
                {previous ? (
                  <div className="flex items-center gap-[9px] py-[7px] pl-4 text-[12.5px] text-dim">
                    <span className="h-4 w-px bg-line-strong" />
                    <span
                      className={cn(
                        "font-mono-num",
                        (f.step ?? 0) >= 50 ? "text-win" : "text-amber"
                      )}
                    >
                      {pct(f.step ?? 0)}
                    </span>
                    <span>går vidare</span>
                  </div>
                ) : null}
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-[11px] border px-[15px] py-[13px]",
                    tone.bg,
                    tone.border
                  )}
                  style={{ width: widths[i] ?? "58%" }}
                >
                  <span className="flex-1 text-[13.5px]">{f.label}</span>
                  <span
                    className={cn(
                      "font-mono-num text-[16px] font-semibold",
                      tone.text
                    )}
                  >
                    {f.value.toLocaleString("sv-SE")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-[12.5px] text-dim">
          Kohorten är de {data.funnel[0].value.toLocaleString("sv-SE")} konton
          som registrerades under {data.periodLabel.toLowerCase()}.
        </p>
      </div>
    </div>
  );
}

function BannerTable({ rows }: { rows: StatsBannerRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse">
        <thead>
          <tr className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted">
            <th className="pb-2 text-left font-semibold">Banner</th>
            <th className="w-[100px] pb-2 text-right font-semibold">
              Visningar
            </th>
            <th className="w-[80px] pb-2 text-right font-semibold">Klick</th>
            <th className="w-[80px] pb-2 text-right font-semibold">CTR</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id} className="border-t border-line-soft">
              <td className="py-2.5 pr-3">
                <span className="flex items-center gap-3">
                  {b.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={b.imageUrl}
                      alt=""
                      loading="lazy"
                      className="h-8 w-[72px] shrink-0 rounded-[5px] border border-line object-cover"
                    />
                  ) : (
                    <span className="h-8 w-[72px] shrink-0 rounded-[5px] border border-dashed border-line-strong" />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] text-text-soft">
                      {b.title}
                    </span>
                    <span className="block text-[11.5px] text-dim">
                      {b.placement}
                    </span>
                  </span>
                </span>
              </td>
              <td className="font-mono-num py-2.5 text-right text-[12.5px] text-muted">
                {b.views.toLocaleString("sv-SE")}
              </td>
              <td className="font-mono-num py-2.5 text-right text-[12.5px] font-semibold">
                {b.clicks.toLocaleString("sv-SE")}
              </td>
              <td className="font-mono-num py-2.5 text-right text-[12.5px] text-cyan">
                {pct(b.ctr)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ClickBars({ rows }: { rows: StatsBar[] }) {
  const max = Math.max(...rows.map((r) => r.count), 1);

  return (
    <div>
      {rows.map((r) => (
        <div key={r.name} className="mb-2.5 flex items-center gap-3">
          <span className="w-[110px] shrink-0 truncate text-[13.5px] text-text-soft">
            {r.name}
          </span>
          <span className="h-2.5 flex-1 overflow-hidden rounded-[5px] bg-bg">
            <span
              className="block h-full rounded-[5px] bg-win"
              style={{ width: `${Math.max((r.count / max) * 100, 2)}%` }}
            />
          </span>
          <span className="font-mono-num w-[60px] shrink-0 text-right text-[12.5px]">
            {r.count.toLocaleString("sv-SE")}
          </span>
        </div>
      ))}
    </div>
  );
}
