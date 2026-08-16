"use client";

import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/utils";

export function NettoChart({
  points,
  compact = false,
}: {
  points: Array<{ date: string; value: number }>;
  compact?: boolean;
}) {
  const [active, setActive] = useState<number | null>(null);

  const values = points.map((p) => p.value);
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
              fill="#66E38A"
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
      </div>
    </div>
  );
}
