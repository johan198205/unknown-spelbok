"use client";

import { useId, useMemo, useRef, useState } from "react";
import { useAmount } from "@/components/DisplayPrefsProvider";
import { compactAxisValue } from "@/lib/sheet-filters";
import type { Bet } from "@/lib/types";
import { cn, cumulativeNettoByDay } from "@/lib/utils";

const W = 1000;
const H = 230;
/** Luft ovanför högsta och under lägsta värdet så linjen inte tangerar ramen. */
const SCALE_MARGIN = 0.08;

type Point = { x: number; value: number; date: string };

/** m/d — samma format som dashboardens graf. */
function shortDate(ts: number) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * Ackumulerat netto för spelboken.
 *
 * Grafen har INGEN egen periodväljare: den ritar exakt de spel filterraden
 * har släppt igenom, så graf och tabell aldrig kan visa olika perioder.
 */
export function SheetNettoChart({
  bets,
  periodLabel,
}: {
  bets: Bet[];
  periodLabel: string;
}) {
  const amount = useAmount();
  const uid = useId().replace(/:/g, "");
  const boxRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const settledCount = useMemo(
    () => bets.filter((b) => b.result !== "open").length,
    [bets]
  );

  const chart = useMemo(() => {
    const days = cumulativeNettoByDay(bets);
    if (!days.length) return null;

    const times = days.map((d) => Date.parse(d.date));
    const t0 = times[0];
    const t1 = times[times.length - 1];
    const span = t1 - t0;

    const points: Point[] = days.map((d, i) => ({
      x: span > 0 ? ((times[i] - t0) / span) * W : W,
      value: d.value,
      date: d.date,
    }));
    // En enda speldag ger en punkt längst till höger — dra en nollinje fram
    // till den så linjen har en riktning i stället för att bli en prick.
    if (points.length === 1) {
      points.unshift({ x: 0, value: 0, date: points[0].date });
    }

    const values = [0, ...points.map((p) => p.value)];
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const pad = (rawMax - rawMin || 1000) * SCALE_MARGIN;
    const min = rawMin - pad;
    const max = rawMax + pad;

    return { points, min, max, span: max - min || 1, t0, t1 };
  }, [bets]);

  const header = (
    <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-3">
      <h2 className="font-display text-[17px] font-semibold uppercase tracking-[0.09em]">
        Ackumulerat netto
      </h2>
      <span className="font-mono-num text-[12.5px] text-faint">
        {settledCount} rättade spel · {periodLabel}
      </span>
    </div>
  );

  if (!chart) {
    return (
      <section className="rounded-[12px] border border-line bg-panel p-[18px]">
        {header}
        <div className="relative flex h-[230px] items-center justify-center">
          <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-line-hover" />
          <p className="relative z-[1] bg-panel px-3 text-[13px] text-muted">
            Grafen fylls när du sätter resultat.
          </p>
        </div>
      </section>
    );
  }

  const { min, span, points, t0, t1, max } = chart;
  const y = (v: number) => H - ((v - min) / span) * H;
  const zeroY = Math.min(H, Math.max(0, y(0)));
  const line = points
    .map(
      (p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${y(p.value).toFixed(1)}`
    )
    .join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;

  const yTicks = Array.from({ length: 5 }, (_, i) => ({
    value: max - (span / 4) * i,
    top: (i / 4) * 100,
  }));
  const xTicks = Array.from({ length: 4 }, (_, i) => ({
    key: i,
    label: shortDate(t0 + ((t1 - t0) / 3) * i),
  }));

  const active = hover != null ? points[hover] : null;
  const activeLeft = active ? (active.x / W) * 100 : 0;
  const activeTop = active ? (y(active.value) / H) * 100 : 0;
  const flip = activeLeft > 60;

  function onMove(event: React.MouseEvent<HTMLDivElement>) {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const px = ((event.clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - px);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    setHover(best);
  }

  return (
    <section className="rounded-[12px] border border-line bg-panel p-[18px]">
      {header}

      <div className="flex items-start gap-2">
        <div className="relative h-[230px] w-[56px] shrink-0">
          {yTicks.map((tick) => (
            <span
              key={tick.top}
              className="absolute right-0 -translate-y-1/2 font-mono-num text-[11px] leading-none text-faint"
              style={{ top: `${tick.top}%` }}
            >
              {compactAxisValue(tick.value)}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div
            ref={boxRef}
            className="relative h-[230px] w-full"
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
          >
            <svg
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              className="block h-full w-full"
              role="img"
              aria-label="Ackumulerat netto över tid"
            >
              <defs>
                {/*
                  Linjen byter färg exakt vid nollinjen. Två klippytor i
                  stället för en gradient: färgbytet ska ske på noll, inte på
                  en interpolerad punkt mellan två mätvärden.
                */}
                <clipPath id={`${uid}-above`}>
                  <rect x="-20" y="-40" width={W + 40} height={zeroY + 40} />
                </clipPath>
                <clipPath id={`${uid}-below`}>
                  <rect
                    x="-20"
                    y={zeroY}
                    width={W + 40}
                    height={H - zeroY + 40}
                  />
                </clipPath>
              </defs>

              {yTicks.map((tick) => (
                <line
                  key={tick.top}
                  x1="0"
                  y1={(tick.top / 100) * H}
                  x2={W}
                  y2={(tick.top / 100) * H}
                  stroke="#1C2333"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              <line
                x1="0"
                y1={zeroY}
                x2={W}
                y2={zeroY}
                stroke="#3A4560"
                strokeWidth="1"
                strokeDasharray="4 4"
                vectorEffect="non-scaling-stroke"
              />

              <path
                d={area}
                fill="rgba(102,227,138,0.12)"
                clipPath={`url(#${uid}-above)`}
              />
              <path
                d={area}
                fill="rgba(255,92,108,0.12)"
                clipPath={`url(#${uid}-below)`}
              />
              <path
                d={line}
                fill="none"
                stroke="#66E38A"
                strokeWidth="2.2"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                clipPath={`url(#${uid}-above)`}
              />
              <path
                d={line}
                fill="none"
                stroke="#FF5C6C"
                strokeWidth="2.2"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                clipPath={`url(#${uid}-below)`}
              />
            </svg>

            {active ? (
              <>
                <span
                  className="pointer-events-none absolute inset-y-0 w-px bg-line-hover"
                  style={{ left: `${activeLeft}%` }}
                />
                <span
                  className="pointer-events-none absolute size-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bg-soft"
                  style={{
                    left: `${activeLeft}%`,
                    top: `${activeTop}%`,
                    background: active.value >= 0 ? "#66E38A" : "#FF5C6C",
                  }}
                />
                <span
                  className={cn(
                    "pointer-events-none absolute top-2 rounded-[9px] border border-line-strong bg-panel-elevated px-2.5 py-1.5 shadow-[var(--shadow-tooltip)]",
                    flip ? "-translate-x-[calc(100%+10px)]" : "translate-x-[10px]"
                  )}
                  style={{ left: `${activeLeft}%` }}
                >
                  <span
                    className={cn(
                      "block whitespace-nowrap font-mono-num text-[18px] font-semibold",
                      active.value > 0
                        ? "text-win"
                        : active.value < 0
                          ? "text-loss"
                          : "text-text"
                    )}
                  >
                    {amount(active.value)}
                  </span>
                  <span className="block font-mono-num text-[11px] text-muted">
                    {active.date}
                  </span>
                </span>
              </>
            ) : null}
          </div>

          <div className="mt-2 flex justify-between font-mono-num text-[11px] text-faint">
            {xTicks.map((t) => (
              <span key={t.key}>{t.label}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
