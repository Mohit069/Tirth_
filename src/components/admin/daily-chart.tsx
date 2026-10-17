"use client";

import { useEffect, useRef, useState } from "react";

type Point = { date: string; yatri: number };

const PLOT_H = 200;
const AXIS_H = 26;
const TOP_PAD = 22; // room for the peak label
const LEFT = 36; // y-axis labels
const BAR_COLOR = "#c9561a";
const BAR_HOVER = "#a8430f";
const GRID = "#efe7dc";
const BASELINE = "#d6c6b3";
const TEXT_MUTED = "#6b5d52";

function niceStep(max: number): number {
  if (max <= 4) return 1;
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

/** Column with a 4px rounded top and a square base. */
function barPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

function dm(ymd: string): string {
  return `${ymd.slice(8, 10)}-${ymd.slice(5, 7)}`;
}

export function DailyChart({ data, label, unit }: { data: Point[]; label: string; unit: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setWidth(Math.max(260, Math.floor(el.clientWidth)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (width === null) {
    return <div ref={wrapRef} style={{ height: TOP_PAD + PLOT_H + AXIS_H }} />;
  }

  const n = data.length;
  const max = Math.max(1, ...data.map((d) => d.yatri));
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);

  const plotW = width - LEFT - 4;
  const band = plotW / n;
  const barW = Math.max(1, Math.min(24, band - 2)); // ≤24px, 2px surface gap
  const y = (v: number) => TOP_PAD + PLOT_H - (v / top) * PLOT_H;
  const peak = data.reduce((best, d, i) => (d.yatri > data[best].yatri ? i : best), 0);

  // Enough room between x labels that they never collide.
  const labelEvery = Math.max(1, Math.ceil(44 / band));

  const activePoint = active !== null ? data[active] : null;
  const tipX = active !== null ? LEFT + band * active + band / 2 : 0;

  return (
    <div ref={wrapRef} className="relative" onPointerLeave={() => setActive(null)}>
      <svg width={width} height={TOP_PAD + PLOT_H + AXIS_H} role="img" aria-label={label} className="block">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={LEFT} x2={width - 4} y1={y(v)} y2={y(v)} stroke={v === 0 ? BASELINE : GRID} strokeWidth={1} shapeRendering="crispEdges" />
            <text x={LEFT - 8} y={y(v)} dy="0.32em" textAnchor="end" fontSize={11} fill={TEXT_MUTED} className="tabular">
              {v}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const x = LEFT + band * i + (band - barW) / 2;
          const h = (d.yatri / top) * PLOT_H;
          return (
            <g key={d.date}>
              {d.yatri > 0 ? (
                <path d={barPath(x, y(d.yatri), barW, h)} fill={active === i ? BAR_HOVER : BAR_COLOR} />
              ) : null}
              {/* Hit target: the whole column, bigger than the bar. */}
              <rect
                x={LEFT + band * i}
                y={TOP_PAD}
                width={band}
                height={PLOT_H}
                fill="transparent"
                tabIndex={0}
                role="graphics-symbol"
                aria-label={`${dm(d.date)}: ${d.yatri} ${unit}`}
                onPointerEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className="outline-none"
              />
              {i % labelEvery === 0 ? (
                <text x={LEFT + band * i + band / 2} y={TOP_PAD + PLOT_H + 17} textAnchor="middle" fontSize={11} fill={TEXT_MUTED} className="tabular">
                  {dm(d.date)}
                </text>
              ) : null}
            </g>
          );
        })}

        {/* Label only the peak day. */}
        {data[peak].yatri > 0 && active === null ? (
          <text x={LEFT + band * peak + band / 2} y={y(data[peak].yatri) - 6} textAnchor="middle" fontSize={12} fontWeight={700} fill="#231c17">
            {data[peak].yatri}
          </text>
        ) : null}
      </svg>

      {activePoint ? (
        <div
          role="status"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xl border border-line bg-card px-3 py-2 text-center shadow-lg"
          style={{ left: Math.min(Math.max(tipX, 60), width - 60), top: y(activePoint.yatri) - 8 }}
        >
          <div className="text-[18px] font-bold leading-tight text-ink">
            {activePoint.yatri} <span className="text-[13px] font-medium text-muted">{unit}</span>
          </div>
          <div className="text-[12px] text-muted">{`${dm(activePoint.date)}-${activePoint.date.slice(0, 4)}`}</div>
        </div>
      ) : null}
    </div>
  );
}
