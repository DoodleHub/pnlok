"use client";

import { useState, type KeyboardEvent, type PointerEvent } from "react";
import type { EquityPoint } from "@/lib/analytics";
import { formatMoney, formatPnl, tone } from "@/lib/pnl";

type Props = { points: EquityPoint[]; formatDate: (key: string) => string };

const W = 800;
const H = 240;
const PAD_Y = 12;
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const toneClass = { profit: "text-profit", loss: "text-loss", flat: "text-fg-muted" };

/** Account balance after each logged day, evenly spaced. Hover or arrow keys show a day's balance and drawdown. */
export function EquityChart({ points, formatDate }: Props) {
  const [active, setActive] = useState<number | null>(null);

  const balances = points.map((p) => p.balance);
  const lo = Math.min(...balances);
  const hi = Math.max(...balances);
  const span = hi - lo || Math.max(Math.abs(hi), 1) * 0.02;
  const min = lo - span * 0.05;
  const max = hi + span * 0.05;
  const x = (i: number) => (points.length === 1 ? W / 2 : (i / (points.length - 1)) * W);
  const y = (v: number) => PAD_Y + (1 - (v - min) / (max - min)) * (H - 2 * PAD_Y);
  const ticks = [max, (max + min) / 2, min].map((v) => ({ v, top: (y(v) / H) * 100 }));

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)},${y(p.balance).toFixed(2)}`).join("");
  const area = `${line}L${x(points.length - 1)},${H}L${x(0)},${H}Z`;
  const opening = points[0].balance;

  const onPointer = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    setActive(Math.round(ratio * (points.length - 1)));
  };

  const onKey = (e: KeyboardEvent) => {
    const last = points.length - 1;
    const step = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (step !== undefined) {
      e.preventDefault();
      setActive((i) => Math.min(Math.max((i ?? last) + step, 0), last));
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      setActive(e.key === "Home" ? 0 : last);
    } else if (e.key === "Escape") setActive(null);
  };

  const point = active === null ? null : points[active];
  const change = point ? point.balance - opening : 0;
  const leftPct = active === null ? 0 : (x(active) / W) * 100;

  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-3">
      <div className="relative w-12 text-right text-caption text-fg-muted tabular-nums" aria-hidden="true">
        {ticks.map((t) => (
          <span key={t.top} className="absolute right-0 -translate-y-1/2" style={{ top: `${t.top}%` }}>
            ${compact.format(t.v)}
          </span>
        ))}
      </div>
      <div
        tabIndex={0}
        role="img"
        aria-label={`Balance from ${formatMoney(opening)} to ${formatMoney(points[points.length - 1].balance)} over ${points.length - 1} logged days. Use the arrow keys to read each day.`}
        onPointerMove={onPointer}
        onPointerDown={onPointer}
        onPointerLeave={() => setActive(null)}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
        className="relative h-[200px] touch-pan-y rounded-sm sm:h-[240px]"
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
          {ticks.map((t) => (
            <line
              key={t.top}
              x1={0}
              x2={W}
              y1={y(t.v)}
              y2={y(t.v)}
              stroke="var(--border-subtle)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path d={area} fill="var(--accent)" opacity={0.1} />
          <path
            d={line}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {active !== null && (
            <line
              x1={x(active)}
              x2={x(active)}
              y1={0}
              y2={H}
              stroke="var(--text-muted)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        {point && active !== null && (
          <>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ring-2 ring-surface"
              style={{ left: `${leftPct}%`, top: `${(y(point.balance) / H) * 100}%` }}
            />
            <div
              role="status"
              className={`pointer-events-none absolute top-0 z-10 grid min-w-40 gap-0.5 rounded-md border border-line-strong bg-canvas px-3 py-2 ${
                leftPct > 60 ? "-translate-x-[calc(100%+12px)]" : "translate-x-3"
              }`}
              style={{ left: `${leftPct}%` }}
            >
              <span className="text-caption text-fg-muted">{point.key ? formatDate(point.key) : "Opening balance"}</span>
              <span className="text-body font-bold tabular-nums">{formatMoney(point.balance)}</span>
              <span className={`text-caption tabular-nums ${toneClass[tone(change)]}`}>
                {formatPnl(change, "usd", 1)} · {formatPnl(change, "pct", opening)}
              </span>
              {point.drawdown > 0 && (
                <span className="text-caption text-fg-secondary tabular-nums">
                  {formatMoney(point.drawdown)} below peak
                </span>
              )}
            </div>
          </>
        )}
      </div>
      <div className="col-start-2 mt-2 flex justify-between text-caption text-fg-muted" aria-hidden="true">
        <span>{points[1]?.key ? formatDate(points[1].key) : ""}</span>
        <span>{points.length > 2 && points[points.length - 1].key ? formatDate(points[points.length - 1].key!) : ""}</span>
      </div>
    </div>
  );
}
