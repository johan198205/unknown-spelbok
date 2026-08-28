import Link from "next/link";
import { ApiUsageChart } from "@/components/admin/ApiUsageChart";
import {
  API_USAGE_PERIODS,
  API_USAGE_PROVIDERS,
  getApiUsage,
  parseApiUsageFilters,
  type ApiUsageData,
  type ApiUsageFilters,
  type ApiUsageQuota,
} from "@/lib/admin/api-usage";
import { requireAdmin } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const metadata = { title: "API-förbrukning" };

function int(value: number) {
  return value.toLocaleString("sv-SE");
}

function pct(value: number) {
  return `${value.toLocaleString("sv-SE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function ms(value: number | null) {
  return value == null ? "–" : `${int(Math.round(value))} ms`;
}

function timeAgo(iso: string | null) {
  if (!iso) return null;
  const at = new Date(iso).getTime();
  if (!Number.isFinite(at)) return null;
  const minutes = Math.max(0, Math.round((Date.now() - at) / 60_000));
  if (minutes < 1) return "just nu";
  if (minutes < 60) return `för ${minutes} min sedan`;
  const hours = Math.round(minutes / 60);
  return `för ${hours} h sedan`;
}

/** Grön under 70 %, gul över 70 %, röd över 90 %. */
function quotaTone(usedPct: number | null) {
  if (usedPct == null) return { bar: "bg-muted", text: "text-muted" };
  if (usedPct > 90) return { bar: "bg-loss", text: "text-loss" };
  if (usedPct > 70) return { bar: "bg-yellow", text: "text-yellow" };
  return { bar: "bg-win", text: "text-win" };
}

function hrefFor(filters: ApiUsageFilters, patch: Partial<ApiUsageFilters>) {
  const next = { ...filters, ...patch };
  const params = new URLSearchParams();
  if (next.period !== "7d") params.set("period", next.period);
  if (next.provider !== "all") params.set("provider", next.provider);
  if (next.period === "custom") {
    params.set("from", next.fromYmd);
    params.set("to", next.toYmd);
  }
  const qs = params.toString();
  return qs ? `/admin/api-usage?${qs}` : "/admin/api-usage";
}

export default async function AdminApiUsagePage({
  searchParams,
}: {
  searchParams: Promise<{
    period?: string;
    provider?: string;
    from?: string;
    to?: string;
    groupBy?: string;
  }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const filters = parseApiUsageFilters(sp);

  let data: ApiUsageData | null = null;
  let error: string | null = null;
  try {
    data = await getApiUsage(filters);
  } catch (err) {
    error = err instanceof Error ? err.message : "Kunde inte hämta förbrukningen";
  }

  return (
    <div className="animate-[admfade_.22s_ease]">
      <div className="mb-[18px]">
        <h1 className="font-display text-[28px] font-semibold">
          API-förbrukning
        </h1>
        <p className="text-muted">
          Anrop mot API-Sports (API-Football och API-Hockey). Allt loggas
          lokalt — API:et sparar ingen historik.
        </p>
      </div>

      {error ? (
        <div className="rounded-[13px] border border-loss-border bg-loss-soft p-4 text-[13.5px] text-loss-text">
          <div className="mb-1 font-semibold">
            Kunde inte läsa förbrukningsloggen
          </div>
          <div className="font-mono-num text-[12.5px]">{error}</div>
          <div className="mt-2 text-text-soft">
            Är migreringen körd? Kör db/api-usage-migration.sql i Supabase SQL
            Editor.
          </div>
        </div>
      ) : null}

      {data ? (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {data.quota.map((q) => (
              <QuotaCard key={q.provider} quota={q} />
            ))}
          </div>

          <div className="mb-[18px] flex flex-wrap items-center gap-3">
            <div className="flex gap-[3px] rounded-[11px] border border-line bg-panel p-1">
              {API_USAGE_PROVIDERS.map((p) => {
                const on = p.key === filters.provider;
                return (
                  <Link
                    key={p.key}
                    href={hrefFor(filters, { provider: p.key })}
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

            <div className="flex gap-[3px] rounded-[11px] border border-line bg-panel p-1">
              {API_USAGE_PERIODS.map((p) => {
                const on = p.key === filters.period;
                return (
                  <Link
                    key={p.key}
                    href={hrefFor(filters, { period: p.key })}
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

            {filters.period === "custom" ? (
              <form
                action="/admin/api-usage"
                method="get"
                className="flex flex-wrap items-center gap-2 rounded-[11px] border border-line bg-panel p-1 pl-3"
              >
                <input type="hidden" name="period" value="custom" />
                <input type="hidden" name="provider" value={filters.provider} />
                <input
                  type="date"
                  name="from"
                  defaultValue={filters.fromYmd}
                  aria-label="Från och med"
                  className="font-mono-num rounded-[9px] border border-line bg-bg-soft px-2.5 py-[7px] text-[13px] text-text outline-none focus:border-blue"
                />
                <span className="text-[13px] text-dim">–</span>
                <input
                  type="date"
                  name="to"
                  defaultValue={filters.toYmd}
                  aria-label="Till och med"
                  className="font-mono-num rounded-[9px] border border-line bg-bg-soft px-2.5 py-[7px] text-[13px] text-text outline-none focus:border-blue"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-win/15 px-[15px] py-[9px] text-[13.5px] font-semibold text-win"
                >
                  Visa
                </button>
              </form>
            ) : null}

            <span className="font-mono-num ml-auto text-[12.5px] text-dim">
              {data.rangeLabel}
            </span>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Externa requests"
              value={int(data.totals.external)}
              note={
                data.totals.failed
                  ? `${int(data.totals.failed)} med fel`
                  : "inga fel"
              }
              tone={data.totals.failed ? "warn" : "muted"}
            />
            <MetricCard
              label="Cache-träffar"
              value={int(data.totals.cache)}
              note="anrop vi slapp göra"
              tone="muted"
            />
            <MetricCard
              label="Cache hit rate"
              value={pct(data.totals.cacheHitRate)}
              note={`av ${int(data.totals.total)} förfrågningar`}
              tone="good"
            />
            <MetricCard
              label="Snitt-svarstid"
              value={ms(data.totals.avgResponseMs)}
              note="externa anrop"
              tone="muted"
            />
          </div>

          <div className="mb-4 rounded-[14px] border border-line bg-panel p-[18px]">
            <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="font-display text-[17px] font-semibold uppercase tracking-[0.05em]">
                Requests per {filters.groupBy === "hour" ? "timme" : "dag"}
              </div>
              <div className="flex gap-4 text-[12.5px]">
                <span className="inline-flex items-center gap-[7px] text-text-soft">
                  <span className="size-2.5 rounded-[3px] bg-win" />
                  Externa
                </span>
                <span className="inline-flex items-center gap-[7px] text-muted">
                  <span className="size-2.5 rounded-[3px] bg-cyan/35" />
                  Cache
                </span>
              </div>
            </div>
            {data.totals.total ? (
              <ApiUsageChart data={data.series} />
            ) : (
              <div className="py-10 text-center text-[13.5px] text-dim">
                Inga anrop loggade under perioden.
              </div>
            )}
          </div>

          <div className="rounded-[14px] border border-line bg-panel p-[18px]">
            <div className="mb-4 font-display text-[16px] font-semibold uppercase tracking-[0.05em]">
              Mest anropade endpoints
            </div>
            {data.endpoints.length ? (
              <div className="overflow-x-auto">
                <div className="flex min-w-[720px] items-center gap-3 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted">
                  <span className="flex-1">Endpoint</span>
                  <span className="w-[70px] text-right">Antal</span>
                  <span className="w-[70px] text-right">Externa</span>
                  <span className="w-[70px] text-right">Cache</span>
                  <span className="w-[90px]" />
                  <span className="w-14 text-right">Andel</span>
                  <span className="w-[80px] text-right">Snitt</span>
                </div>
                {data.endpoints.map((row) => (
                  <div
                    key={row.endpoint}
                    className="flex min-w-[720px] items-center gap-3 border-t border-line-soft py-2"
                  >
                    <span className="font-mono-num min-w-0 flex-1 truncate text-[13px] text-text-soft">
                      {row.endpoint}
                    </span>
                    <span className="font-mono-num w-[70px] text-right text-[12.5px]">
                      {int(row.total)}
                    </span>
                    <span className="font-mono-num w-[70px] text-right text-[12.5px] text-win">
                      {int(row.external)}
                    </span>
                    <span className="font-mono-num w-[70px] text-right text-[12.5px] text-cyan">
                      {int(row.cache)}
                    </span>
                    <span className="h-[6px] w-[90px] overflow-hidden rounded-[3px] bg-bg">
                      <span
                        className="block h-full rounded-[3px] bg-cyan"
                        style={{ width: `${Math.max(row.share, 2)}%` }}
                      />
                    </span>
                    <span className="font-mono-num w-14 text-right text-[12.5px] text-muted">
                      {pct(row.share)}
                    </span>
                    <span className="font-mono-num w-[80px] text-right text-[12.5px] text-muted">
                      {ms(row.avgResponseMs)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-[13.5px] text-dim">
                Inga anrop loggade under perioden.
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

function QuotaCard({ quota }: { quota: ApiUsageQuota }) {
  const tone = quotaTone(quota.usedPct);
  const known = quota.limit != null && quota.used != null;

  return (
    <div className="rounded-[13px] border border-line bg-panel p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-[10.5px] uppercase tracking-[0.13em] text-dim">
          {quota.label}
        </div>
        {quota.usedPct != null ? (
          <div className={cn("font-mono-num text-[13px] font-semibold", tone.text)}>
            {pct(quota.usedPct)}
          </div>
        ) : null}
      </div>

      <div className="font-mono-num text-[22px] font-semibold">
        {known ? (
          <>
            {int(quota.used!)}{" "}
            <span className="text-[15px] font-normal text-muted">
              av {int(quota.limit!)} requests använda idag
            </span>
          </>
        ) : (
          <>
            {int(quota.externalToday)}{" "}
            <span className="text-[15px] font-normal text-muted">
              externa requests idag
            </span>
          </>
        )}
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-[4px] bg-bg">
        <span
          className={cn("block h-full rounded-[4px]", tone.bar)}
          style={{ width: `${quota.usedPct != null ? Math.max(quota.usedPct, 1.5) : 0}%` }}
        />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-dim">
        <span>{int(quota.cacheToday)} cache-träffar idag</span>
        {quota.estimated ? (
          <span>Kvot okänd — inga svarsheaders ännu</span>
        ) : (
          <span>
            {int(quota.remaining ?? 0)} kvar
            {timeAgo(quota.recordedAt) ? ` · avläst ${timeAgo(quota.recordedAt)}` : ""}
          </span>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone: "good" | "warn" | "muted";
}) {
  return (
    <div className="rounded-[13px] border border-line bg-panel p-4">
      <div className="mb-2 text-[10.5px] uppercase tracking-[0.13em] text-dim">
        {label}
      </div>
      <div className="font-mono-num text-[27px] font-semibold">{value}</div>
      <div
        className={cn(
          "mt-[5px] text-[13px] font-semibold",
          tone === "good"
            ? "text-win"
            : tone === "warn"
              ? "text-amber"
              : "text-muted"
        )}
      >
        {note}
      </div>
    </div>
  );
}
