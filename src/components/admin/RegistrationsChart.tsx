"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function RegistrationsChart({
  data,
  total,
}: {
  data: { date: string; count: number }[];
  total: number;
}) {
  const formatted = data.map((d) => ({
    ...d,
    label: formatShort(d.date),
  }));

  return (
    <div className="rounded-[14px] border border-line bg-panel p-[18px]">
      <div className="mb-3.5 flex items-baseline justify-between">
        <div className="font-display text-[17px] font-semibold uppercase tracking-[0.05em]">
          Registreringar 30 dagar
        </div>
        <div className="font-mono-num text-[13px] text-win">
          +{total.toLocaleString("sv-SE")} totalt
        </div>
      </div>
      <div className="h-[210px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={formatted}
            margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
          >
            <defs>
              <linearGradient id="regFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#66E38A" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#66E38A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="var(--line-soft)"
              strokeDasharray="0"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--dim)", fontSize: 10.5, fontFamily: "var(--font-plex)" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={48}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "var(--dim)", fontSize: 10.5, fontFamily: "var(--font-plex)" }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip
              contentStyle={{
                background: "var(--panel-elevated)",
                border: "1px solid var(--line-strong)",
                borderRadius: 10,
                fontSize: 12.5,
              }}
              labelStyle={{ color: "var(--muted)" }}
              itemStyle={{ color: "var(--win)" }}
            />
            <Area
              type="monotone"
              dataKey="count"
              name="Registreringar"
              stroke="#66E38A"
              strokeWidth={2}
              fill="url(#regFill)"
              dot={false}
              activeDot={{ r: 4, fill: "#66E38A", stroke: "#0F1420", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function formatShort(isoDay: string) {
  const [y, m, d] = isoDay.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
