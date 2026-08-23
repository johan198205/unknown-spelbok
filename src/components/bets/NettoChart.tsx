"use client";

import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/utils";

type Series = {
  id: string;
  name: string;
  color: string;
  points: Array<{ date: string; value: number }>;
};

export function NettoChart({
  points,
  series = [],
  compact = false,
}: {
  points: Array<{ date: string; value: number }>;
  series?: Series[];
  compact?: boolean;
}) {
  const [active, setActive] = useState<number | null>(null);

  // Med bara en spelbok är dess linje identisk med totalen.
  const showSeries = series.length > 1;
  const values = [
    ...points.map((p) => p.value),
    ...(showSeries ? series.flatMap((s) => s.points.map((p) => p.value)) : []),
  ];
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = max - min || 1;
  const w = 1000;
  const h = compact ? 160 : 230;
  const zeroY = h - ((0 - min) / span) * h;
  const clipId = compact ? "c" : "d";

  const coords = useMemo(() => {
    if (!points.length) return [];
    return points.map((p, i) => {
      const x = points.length === 1 ? w / 2 : (i / (points.length - 1)) * w;
      const y = h - ((p.value - min) / span) * h;
      return { x, y, ...p };
    });
  }, [points, h, min, span, w]);

  const seriesPaths = useMemo(() => {
    if (!showSeries) return [];
    return series.map((s) => ({
      ...s,
      d: s.points
        .map((p, i) => {
          const x = s.points.length === 1 ? w / 2 : (i / (s.points.length - 1)) * w;
          const y = h - ((p.value - min) / span) * h;
          return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" "),
    }));
  }, [series, showSeries, h, min, span, w]);

  if (!points.length) return null;

  const line = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  const activePoint = active != null ? coords[active] : null;

  function pointerToIndex(clientX: number, el: SVGSVGElement) {
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.round(ratio * (Math.max(coords.length, 1) - 1));
  }

  return (
    <div className="flex gap-2">
      {!compact ? (
        <div
          className="flex w-[62px] flex-col justify-between text-right font-mono-num text-[11px] text-faint"
          style={{ height: h }}
        >
          <div>{Math.round(max).toLocaleString("sv-SE")}</div>
          <div>0</div>
          <div>{Math.round(min).toLocaleString("sv-SE")}</div>
        </div>
      ) : null}
      <div className="relative min-w-0 flex-1">
        {activePoint ? (
          <div className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 rounded-[8px] border border-line bg-panel-elevated px-2.5 py-1.5 text-center shadow-[var(--shadow-tooltip)]">
            <div className="font-mono-num text-[11px] text-faint">
              {new Date(activePoint.date).toLocaleDateString("sv-SE")}
            </div>
            <div className="font-mono-num text-sm font-semibold">
              {formatMoney(activePoint.value)}
            </div>
            {showSeries ? (
              <div className="mt-1 space-y-0.5 border-t border-line pt-1">
                {series.map((s) => (
                  <div key={s.id} className="flex items-center gap-1.5 text-left">
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: s.color }}
                    />
                    <span className="max-w-[90px] truncate text-[11px] text-muted">
                      {s.name}
                    </span>
                    <span className="ml-auto font-mono-num text-[11px]">
                      {formatMoney(s.points[active!]?.value ?? 0)}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        <svg
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="none"
          className="block w-full touch-none overflow-visible"
          style={{ height: h }}
          onPointerDown={(e) => {
            setActive(pointerToIndex(e.clientX, e.currentTarget));
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (e.buttons === 0 && e.pointerType === "mouse") return;
            setActive(pointerToIndex(e.clientX, e.currentTarget));
          }}
          onPointerUp={() => setActive(null)}
          onPointerLeave={() => setActive(null)}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <line
              key={t}
              x1="0"
              y1={h * t}
              x2={w}
              y2={h * t}
              stroke="#1C2333"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <line
            x1="0"
            y1={zeroY}
            x2={w}
            y2={zeroY}
            stroke="#3A4560"
            strokeWidth="1"
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
          />
          <defs>
            <clipPath id={`${clipId}-above`}>
              <rect x="-20" y="-40" width={w + 40} height={zeroY + 40} />
            </clipPath>
            <clipPath id={`${clipId}-below`}>
              <rect x="-20" y={zeroY} width={w + 40} height={h - zeroY + 40} />
            </clipPath>
          </defs>
          <path
            d={area}
            fill="rgba(102,227,138,.12)"
            clipPath={`url(#${clipId}-above)`}
          />
          <path
            d={area}
            fill="rgba(255,92,108,.12)"
            clipPath={`url(#${clipId}-below)`}
          />
          {seriesPaths.map((s) => (
            <path
              key={s.id}
              d={s.d}
              fill="none"
              stroke={s.color}
              strokeWidth="1.5"
              strokeOpacity="0.75"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path
            d={line}
            fill="none"
            stroke="#66E38A"
            strokeWidth="2"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            clipPath={`url(#${clipId}-above)`}
          />
          <path
            d={line}
            fill="none"
            stroke="#FF5C6C"
            strokeWidth="2"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            clipPath={`url(#${clipId}-below)`}
          />
          {activePoint ? (
            <circle
              cx={activePoint.x}
              cy={activePoint.y}
              r="7"
              fill={activePoint.value >= 0 ? "#66E38A" : "#FF5C6C"}
              stroke="#0F1420"
              strokeWidth="3"
            />
          ) : null}
        </svg>
        <div className="mt-1.5 flex justify-between font-mono-num text-[11px] text-faint">
          <span>
            {new Date(points[0].date).toLocaleDateString("sv-SE", {
              month: "short",
              day: "numeric",
            })}
          </span>
          <span>ackumulerat netto</span>
          <span>
            {new Date(points[points.length - 1].date).toLocaleDateString(
              "sv-SE",
              {
                month: "short",
                day: "numeric",
              }
            )}
          </span>
        </div>
        {showSeries ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-1.5 text-[11px] text-muted">
              <span className="h-[2px] w-3.5 rounded-full bg-win" />
              Totalt
            </span>
            {series.map((s) => (
              <span
                key={s.id}
                className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted"
              >
                <span
                  className="h-[2px] w-3.5 shrink-0 rounded-full"
                  style={{ background: s.color }}
                />
                <span className="max-w-[120px] truncate">{s.name}</span>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
