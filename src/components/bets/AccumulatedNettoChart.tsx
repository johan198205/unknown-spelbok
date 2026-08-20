"use client";

import { useId, useMemo } from "react";
import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Panel } from "@/components/ui/Panel";
import {
  CHART_PERIOD_OPTIONS,
  compactAxisValue,
  filterChartBets,
  formatChartDate,
  type ChartPeriodFilter,
} from "@/lib/sheet-filters";
import { cumulativeNettoByDay, formatMoney } from "@/lib/utils";
import type { Bet } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AccumulatedNettoChart({
  bets,
  period,
  onPeriodChange,
}: {
  bets: Bet[];
  period: ChartPeriodFilter;
  onPeriodChange: (period: ChartPeriodFilter) => void;
}) {
  const gradId = useId().replace(/:/g, "");
  const chartBets = useMemo(
    () => filterChartBets(bets, period),
    [bets, period]
  );
  const points = useMemo(
    () => cumulativeNettoByDay(chartBets),
    [chartBets]
  );

  const data = useMemo(
    () =>
      points.map((p) => ({
        date: p.date,
        value: p.value,
        label: formatChartDate(p.date),
      })),
    [points]
  );

  const { min, max, zeroOffset } = useMemo(() => {
    if (!data.length) return { min: -1, max: 1, zeroOffset: 0.5 };
    const values = data.map((d) => d.value);
    let lo = Math.min(0, ...values);
    let hi = Math.max(0, ...values);
    if (lo === hi) {
      lo -= 1;
      hi += 1;
    }
    const pad = (hi - lo) * 0.08;
    lo -= pad;
    hi += pad;
    // Gradient goes top (max) → bottom (min); offset = share above zero
    const offset = hi / (hi - lo);
    return { min: lo, max: hi, zeroOffset: Math.min(1, Math.max(0, offset)) };
  }, [data]);

  return (
    <Panel className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="font-display text-[17px] font-semibold">
          Ackumulerat netto
        </div>
        <div className="flex gap-1 rounded-[9px] border border-[#1C2333] bg-bg p-[3px]">
          {CHART_PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onPeriodChange(opt.value)}
              className={cn(
                "rounded-[7px] px-3 py-1.5 text-[13px] font-semibold transition",
                period === opt.value
                  ? "bg-[#1B2436] text-text"
                  : "bg-transparent text-muted hover:text-text"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {!data.length ? (
        <div className="relative flex h-[230px] items-center justify-center">
          <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-[#3A4560]" />
          <p className="relative z-[1] bg-panel px-3 text-sm text-muted">
            Inga settlade spel ännu
          </p>
        </div>
      ) : (
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id={`${gradId}-stroke`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset={0} stopColor="#66E38A" />
                  <stop offset={zeroOffset} stopColor="#66E38A" />
                  <stop offset={zeroOffset} stopColor="#FF5C6C" />
                  <stop offset={1} stopColor="#FF5C6C" />
                </linearGradient>
                <linearGradient
                  id={`${gradId}-fill`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset={0}
                    stopColor="#66E38A"
                    stopOpacity={0.18}
                  />
                  <stop
                    offset={zeroOffset}
                    stopColor="#66E38A"
                    stopOpacity={0.06}
                  />
                  <stop
                    offset={zeroOffset}
                    stopColor="#FF5C6C"
                    stopOpacity={0.06}
                  />
                  <stop
                    offset={1}
                    stopColor="#FF5C6C"
                    stopOpacity={0.18}
                  />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{
                  fill: "#5D6883",
                  fontSize: 11,
                  fontFamily: "var(--font-plex), monospace",
                }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={48}
                ticks={pickAxisTicks(
                  data.map((d) => d.label),
                  4
                )}
              />
              <YAxis
                domain={[min, max]}
                tickFormatter={compactAxisValue}
                tick={{
                  fill: "#5D6883",
                  fontSize: 11,
                  fontFamily: "var(--font-plex), monospace",
                }}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <ReferenceLine
                y={0}
                stroke="#3A4560"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              <Tooltip
                cursor={{ stroke: "#3A4560", strokeWidth: 1 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0]?.payload as {
                    date: string;
                    value: number;
                  };
                  return (
                    <div className="rounded-[9px] border border-line-strong bg-panel-elevated px-2.5 py-1.5 shadow-[var(--shadow-tooltip)]">
                      <div className="font-mono-num text-[11px] text-faint">
                        {row.date}
                      </div>
                      <div
                        className={`font-mono-num text-sm font-semibold ${
                          row.value > 0
                            ? "text-win"
                            : row.value < 0
                              ? "text-loss"
                              : "text-text"
                        }`}
                      >
                        {formatMoney(row.value)}
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={`url(#${gradId}-stroke)`}
                strokeWidth={2}
                fill={`url(#${gradId}-fill)`}
                dot={false}
                activeDot={{
                  r: 5,
                  stroke: "#0F1420",
                  strokeWidth: 2,
                  fill: "#66E38A",
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}

function pickAxisTicks(labels: string[], count: number): string[] {
  if (labels.length <= count) return labels;
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.round((i * (labels.length - 1)) / (count - 1));
    out.push(labels[idx]);
  }
  return [...new Set(out)];
}
