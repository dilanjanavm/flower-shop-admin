"use client";

import { useMemo, useRef, useState } from "react";
import { lkr } from "@/lib/format";

/**
 * Single-series charts in the brand accent (validated ≥3:1 on both the light
 * and dark surfaces). Thin marks, 2px line, rounded data-ends, recessive grid,
 * hover tooltip on every mark, and a table fallback via aria + title.
 */

const fmtK = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));

export function AreaChart({ data, height = 220, format = (n: number) => lkr(n) }: { data: { label: string; value: number }[]; height?: number; format?: (n: number) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const W = 720;
  const H = height;
  const pad = { t: 12, r: 12, b: 26, l: 40 };
  const max = Math.max(1, ...data.map((d) => d.value)) * 1.1;
  const x = (i: number) => pad.l + (i / Math.max(1, data.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(data.length - 1)},${H - pad.b} L${x(0)},${H - pad.b} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((p) => max * p);

  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  };

  return (
    <div className="relative">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Trend: ${data.map((d) => `${d.label} ${format(d.value)}`).join(", ")}`} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeDasharray={t === 0 ? undefined : "3 4"} />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--faint)">{fmtK(Math.round(t))}</text>
          </g>
        ))}
        {data.map((d, i) =>
          i % Math.ceil(data.length / 7) === 0 || i === data.length - 1 ? (
            <text key={d.label} x={x(i)} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--faint)">{d.label}</text>
          ) : null,
        )}
        <path d={area} fill="url(#area-fill)" className="animate-fade-in" />
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" pathLength={1} strokeDasharray="1" style={{ animation: "draw 1.2s var(--ease-out-soft) both" }} />
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="var(--fg)" strokeOpacity="0.25" />
            <circle cx={x(hover)} cy={y(data[hover].value)} r="5" fill="var(--accent)" stroke="var(--panel)" strokeWidth="2" />
          </g>
        )}
        <style>{`@keyframes draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}`}</style>
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-xl border border-line bg-panel px-3 py-2 text-xs shadow-[var(--shadow-lift)]" style={{ left: `${(x(hover) / W) * 100}%` }}>
          <p className="text-muted">{data[hover].label}</p>
          <p className="font-semibold tabular-nums">{format(data[hover].value)}</p>
        </div>
      )}
    </div>
  );
}

export function HBarChart({ data, format = (n: number) => lkr(n) }: { data: { label: string; value: number }[]; format?: (n: number) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = useMemo(() => Math.max(1, ...data.map((d) => d.value)), [data]);
  return (
    <ul className="space-y-2.5" role="list">
      {data.map((d, i) => (
        <li key={d.label} className="group grid grid-cols-[120px_1fr_auto] items-center gap-3 text-sm" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
          <span className="truncate text-fg-soft">{d.label}</span>
          <span className="relative h-6 rounded-r-md">
            <span
              className="absolute inset-y-1 left-0 rounded-r-[4px] bg-accent transition-[width,opacity] duration-700 ease-[var(--ease-out-soft)]"
              style={{ width: `${(d.value / max) * 100}%`, opacity: hover === null || hover === i ? 1 : 0.45, transitionDelay: `${i * 40}ms` }}
            />
          </span>
          <span className="w-20 text-right text-xs tabular-nums text-muted">{format(d.value)}</span>
        </li>
      ))}
    </ul>
  );
}

export function ColumnChart({ data, height = 180, format = (n: number) => String(n) }: { data: { label: string; value: number }[]; height?: number; format?: (n: number) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="relative">
      <div className="flex items-end gap-[2px]" style={{ height }}>
        {data.map((d, i) => (
          <div key={d.label} className="relative flex h-full flex-1 items-end" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <div className="w-full rounded-t-[4px] bg-accent transition-all duration-700 ease-[var(--ease-out-soft)]" style={{ height: `${(d.value / max) * 100}%`, opacity: hover === null || hover === i ? 1 : 0.45 }} />
            {hover === i && (
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-xl border border-line bg-panel px-2.5 py-1.5 text-xs shadow-[var(--shadow-lift)]">
                <span className="text-muted">{d.label}</span> · <span className="font-semibold">{format(d.value)}</span>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-[2px] text-[10px] text-faint">
        {data.map((d) => <span key={d.label} className="flex-1 truncate text-center">{d.label}</span>)}
      </div>
    </div>
  );
}
