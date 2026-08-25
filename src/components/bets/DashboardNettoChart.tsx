"use client";

import { useId, useMemo, useState } from "react";
import {
  CHART_PERIOD_OPTIONS,
  compactAxisValue,
  periodCutoff,
  type ChartPeriodFilter,
} from "@/lib/sheet-filters";
import { cn } from "@/lib/utils";

/**
 * Ett rättat spel, tillplattat för klienten. Servern skickar bara det grafen
 * behöver — hela Bet-raden skulle vara flera hundra kB på ett stort konto.
 */
export type ChartEntry = {
  sheetId: string | null;
  /** placed_at som epoch-ms. */
  ts: number;
  netto: number;
};

export type ChartSheet = { id: string; name: string };

/**
 * Neutral palett för spelböckerna. Grönt och rött är reserverat för netto,
 * cyan för live och gult för push/void — en spelbok får inte råka se ut som
 * ett utfall.
 */
const SHEET_COLORS = ["#7FB0FF", "#A78BFA", "#8FD6C0", "#C3CBDB"];

const W = 1000;
const H = 230;
/** Luft ovanför högsta och under lägsta värdet så linjen inte tangerar ramen. */
const SCALE_MARGIN = 0.12;

type Point = { x: number; value: number };

/** m/d — samma format som resten av dashboarden. */
function shortDate(ts: number) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * Ackumulerat netto på den GEMENSAMMA tidsaxeln: x = (ts − t0)/(t1 − t0)×1000.
 * Alla serier ankras i (0, 0) så linjerna startar vid vänsterkanten.
 */
function buildSeries(entries: ChartEntry[], t0: number, t1: number): Point[] {
  const span = t1 - t0;
  let running = 0;
  const points: Point[] = [{ x: 0, value: 0 }];
  for (const e of [...entries].sort((a, b) => a.ts - b.ts)) {
    running += e.netto;
    points.push({ x: span > 0 ? ((e.ts - t0) / span) * W : W, value: running });
  }
  return points;
}

function toPath(points: Point[], y: (v: number) => number) {
  return points
    .map(
      (p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${y(p.value).toFixed(1)}`
    )
    .join(" ");
}

export function DashboardNettoChart({
  entries,
  sheets,
}: {
  entries: ChartEntry[];
  sheets: ChartSheet[];
}) {
  const [period, setPeriod] = useState<ChartPeriodFilter>("all");
  const uid = useId().replace(/:/g, "");

  const chart = useMemo(() => {
    const cut = periodCutoff(period);
    const inPeriod =
      cut == null ? entries : entries.filter((e) => e.ts >= cut);
    if (!inPeriod.length) return null;

    const times = inPeriod.map((e) => e.ts);
    const t0 = Math.min(...times);
    const t1 = Math.max(...times);

    const total = buildSeries(inPeriod, t0, t1);
    const seen = new Set(inPeriod.map((e) => e.sheetId));
    const series = sheets
      .filter((s) => seen.has(s.id))
      .map((s, i) => ({
        id: s.id,
        name: s.name,
        color: SHEET_COLORS[i % SHEET_COLORS.length],
        points: buildSeries(
          inPeriod.filter((e) => e.sheetId === s.id),
          t0,
          t1
        ),
      }));

    // Skalan spänner över alla serier plus noll — annars hoppar totallinjen
    // ur bild så fort en enskild spelbok går tyngre än snittet.
    const values = [
      0,
      ...total.map((p) => p.value),
      ...series.flatMap((s) => s.points.map((p) => p.value)),
    ];
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const pad = (rawMax - rawMin || 1000) * SCALE_MARGIN;
    const min = rawMin - pad;
    const max = rawMax + pad;
    const span = max - min || 1;

    return {
      total,
      series,
      min,
      max,
      span,
      t0,
      t1,
      final: total[total.length - 1]?.value ?? 0,
    };
  }, [entries, period, sheets]);

  const periodPicker = (
    <div className="flex shrink-0 gap-[3px] rounded-[9px] border border-line-soft bg-bg-soft p-[3px]">
      {CHART_PERIOD_OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => setPeriod(o.value)}
          className={cn(
            "cursor-pointer rounded-[7px] px-3 py-1.5 text-[12.5px] font-semibold transition",
            period === o.value
              ? "bg-panel-2 text-text"
              : "bg-transparent text-muted hover:text-text"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );

  const header = (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-display text-[15px] font-semibold uppercase tracking-[0.09em]">
        Ackumulerat netto
      </h2>
      {periodPicker}
    </div>
  );

  if (!chart) {
    return (
      <section className="rounded-[14px] border border-line bg-panel p-4">
        {header}
        <p className="py-14 text-center text-[13px] text-muted">
          Grafen fylls när du sätter resultat.
        </p>
      </section>
    );
  }

  const y = (v: number) => H - ((v - chart.min) / chart.span) * H;
  const zeroY = y(0);
  const totalPath = toPath(chart.total, y);
  const totalArea = `${totalPath} L${W},${H} L0,${H} Z`;
  const totalColor = chart.final >= 0 ? "#66E38A" : "#FF5C6C";

  const yTicks = Array.from({ length: 5 }, (_, i) => ({
    value: chart.max - (chart.span / 4) * i,
    top: (i / 4) * 100,
  }));
  const xTicks = Array.from({ length: 4 }, (_, i) => ({
    label: shortDate(chart.t0 + ((chart.t1 - chart.t0) / 3) * i),
    key: i,
  }));

  return (
    <section className="rounded-[14px] border border-line bg-panel p-4">
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
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="block h-[230px] w-full"
            role="img"
            aria-label="Ackumulerat netto över tid"
          >
            <defs>
              {/*
                Totallinjen byter färg vid nollinjen. Två klippytor i stället
                för en gradient: färgbytet ska ske exakt på noll, inte på en
                interpolerad punkt mellan två mätvärden.
              */}
              <clipPath id={`${uid}-above`}>
                <rect x="-20" y="-40" width={W + 40} height={zeroY + 40} />
              </clipPath>
              <clipPath id={`${uid}-below`}>
                <rect x="-20" y={zeroY} width={W + 40} height={H - zeroY + 40} />
              </clipPath>
            </defs>

            {[0.5, H / 2, H - 0.5].map((gy) => (
              <line
                key={gy}
                x1="0"
                y1={gy}
                x2={W}
                y2={gy}
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
              d={totalArea}
              fill="rgba(102,227,138,0.12)"
              clipPath={`url(#${uid}-above)`}
            />
            <path
              d={totalArea}
              fill="rgba(255,92,108,0.12)"
              clipPath={`url(#${uid}-below)`}
            />

            {chart.series.map((s) => (
              <path
                key={s.id}
                d={toPath(s.points, y)}
                fill="none"
                stroke={s.color}
                strokeWidth="1.5"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}

            <path
              d={totalPath}
              fill="none"
              stroke="#66E38A"
              strokeWidth="2.2"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              clipPath={`url(#${uid}-above)`}
            />
            <path
              d={totalPath}
              fill="none"
              stroke="#FF5C6C"
              strokeWidth="2.2"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              clipPath={`url(#${uid}-below)`}
            />
          </svg>

          <div className="mt-2 flex justify-between font-mono-num text-[11px] text-faint">
            {xTicks.map((t) => (
              <span key={t.key}>{t.label}</span>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line-soft pt-3">
            <span className="flex items-center gap-2 text-[12.5px] text-text-soft">
              <span
                className="h-[2px] w-[14px] shrink-0"
                style={{ background: totalColor }}
              />
              Totalt
            </span>
            {chart.series.map((s) => (
              <span
                key={s.id}
                className="flex min-w-0 items-center gap-2 text-[12.5px] text-text-soft"
              >
                <span
                  className="h-[2px] w-[14px] shrink-0"
                  style={{ background: s.color }}
                />
                <span className="truncate">{s.name}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
