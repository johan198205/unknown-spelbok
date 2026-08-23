"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ApiUsagePoint } from "@/lib/admin/api-usage";

const GREEN = "#66E38A";
const CYAN = "#35D6F5";

export function ApiUsageChart({ data }: { data: ApiUsagePoint[] }) {
  return (
    <div className="h-[230px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid
            stroke="var(--line-soft)"
            strokeDasharray="0"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{
              fill: "var(--dim)",
              fontSize: 10.5,
              fontFamily: "var(--font-plex)",
            }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={28}
          />
          <YAxis
            allowDecimals={false}
            tick={{
              fill: "var(--dim)",
              fontSize: 10.5,
              fontFamily: "var(--font-plex)",
            }}
            tickLine={false}
            axisLine={false}
            width={36}
          />
          <Tooltip
            cursor={{ fill: "var(--hover)" }}
            contentStyle={{
              background: "var(--panel-elevated)",
              border: "1px solid var(--line-strong)",
              borderRadius: 10,
              fontSize: 12.5,
            }}
            labelStyle={{ color: "var(--muted)" }}
          />
          <Bar
            dataKey="cache"
            name="Cache-träffar"
            stackId="requests"
            fill={CYAN}
            fillOpacity={0.35}
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="external"
            name="Externa requests"
            stackId="requests"
            fill={GREEN}
            radius={[3, 3, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
