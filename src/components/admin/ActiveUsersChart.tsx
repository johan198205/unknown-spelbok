"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { StatsPoint } from "@/lib/admin/stats";

const GREEN = "#66E38A";
const CYAN = "#35D6F5";

function formatDay(isoDay: string) {
  const [y, m, d] = isoDay.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function ActiveUsersChart({
  data,
  compare,
}: {
  data: StatsPoint[];
  compare: boolean;
}) {
  const formatted = data.map((p) => ({ ...p, label: formatDay(p.day) }));

  return (
    <div className="h-[230px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={formatted}
          margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
        >
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
            minTickGap={44}
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
            contentStyle={{
              background: "var(--panel-elevated)",
              border: "1px solid var(--line-strong)",
              borderRadius: 10,
              fontSize: 12.5,
            }}
            labelStyle={{ color: "var(--muted)" }}
          />
          {compare ? (
            <Line
              type="monotone"
              dataKey="previous"
              name="Föregående"
              stroke={CYAN}
              strokeOpacity={0.55}
              strokeWidth={2}
              strokeDasharray="6 5"
              dot={false}
              activeDot={{ r: 3, fill: CYAN, stroke: "#0F1420", strokeWidth: 2 }}
            />
          ) : null}
          <Line
            type="monotone"
            dataKey="current"
            name="Denna period"
            stroke={GREEN}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: GREEN, stroke: "#0F1420", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
