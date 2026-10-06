import { useRef } from "react";
import { formatPnl, formatPnlCompact, tone, type CalendarDay, type Unit } from "@/lib/pnl";
import { ChevronLeft, ChevronRight } from "./icons";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });

type Props = {
  year: number;
  month: number;
  weeks: CalendarDay[][];
  /** Local `YYYY-MM-DD` of today; null until known on the client. */
  todayKey: string | null;
  unit: Unit;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onUnitChange: (unit: Unit) => void;
  onSelectDay: (day: CalendarDay) => void;
};

const btn =
  "inline-flex h-11 items-center justify-center rounded-md border border-line bg-surface text-body text-fg transition-colors hover:bg-raised";

export function CalendarPanel({
  year,
  month,
  weeks,
  todayKey,
  unit,
  onPrev,
  onNext,
  onToday,
  onUnitChange,
  onSelectDay,
}: Props) {
  const swipe = useSwipe({ onLeft: onNext, onRight: onPrev });
  return (
    <section aria-label="Calendar" {...swipe} className="rounded-lg border border-line-strong bg-surface p-3 sm:p-4">
      <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-3 px-1 sm:px-3">
        <h2 className="w-full text-[24px] leading-8 font-bold tracking-[-0.01em] sm:mr-6 sm:w-auto sm:text-display-month">
          {monthLabel.format(new Date(year, month, 1))}
        </h2>
        {/* Controls never wrap; they shrink on phones to share one row. */}
        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
          <button type="button" aria-label="Previous month" onClick={onPrev} className={`${btn} w-10 sm:w-[54px]`}>
            <ChevronLeft />
          </button>
          <button type="button" aria-label="Next month" onClick={onNext} className={`${btn} w-10 sm:ml-2 sm:w-[54px]`}>
            <ChevronRight />
          </button>
          <button type="button" onClick={onToday} className={`${btn} px-3 sm:ml-2 sm:px-6`}>
            Today
          </button>
          <UnitToggle unit={unit} onChange={onUnitChange} />
        </div>
      </div>

      <div
        role="grid"
        aria-label="Daily profit and loss"
        className="grid grid-cols-5 gap-px overflow-hidden rounded-sm border border-line bg-line"
      >
        <div role="row" className="contents">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              role="columnheader"
              className="bg-surface pt-2 pb-2.5 text-center text-label font-medium text-fg-secondary"
            >
              {d}
            </div>
          ))}
        </div>
        {/* Weekends are hidden; skip weeks whose weekdays all fall outside the month. */}
        {weeks.filter((week) => week.slice(0, 5).some((d) => d.inMonth)).map((week) => (
          <div role="row" key={week[0].key} className="contents">
            {week.slice(0, 5).map((day) => (
              <DayCell
                key={day.key}
                day={day}
                isToday={day.key === todayKey}
                unit={unit}
                onSelect={onSelectDay}
              />
            ))}
          </div>
        ))}
      </div>

      <Legend />
    </section>
  );
}

/** Horizontal swipe detection: fires when the finger travels mostly sideways past a threshold. */
function useSwipe({ onLeft, onRight }: { onLeft: () => void; onRight: () => void }) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0];
      start.current = e.touches.length === 1 ? { x: t.clientX, y: t.clientY } : null;
    },
    onTouchEnd: (e: React.TouchEvent) => {
      const s = start.current;
      start.current = null;
      if (!s) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      if (dx < 0) onLeft();
      else onRight();
    },
    onTouchCancel: () => {
      start.current = null;
    },
  };
}

const cellFill = { profit: "bg-profit-cell", loss: "bg-loss-cell", flat: "bg-cell" };
const figure = { profit: "text-profit", loss: "text-loss", flat: "text-fg-secondary" };

const entryLabel = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" });

type DayCellProps = {
  day: CalendarDay;
  isToday: boolean;
  unit: Unit;
  onSelect: (day: CalendarDay) => void;
};

function DayCell({ day, isToday, unit, onSelect }: DayCellProps) {
  const t = tone(day.pnl);
  // Closed days stay editable only if they already hold an entry, so it can be cleared.
  const editable = day.inMonth && (day.closed === null || day.pnl !== null);
  const fill = day.closed !== null && day.pnl === null ? "bg-sunken" : cellFill[t];
  const body =
    "grid h-full min-h-[64px] w-full grid-rows-[auto_1fr] px-1.5 pt-1.5 pb-2.5 text-left sm:min-h-[84px] sm:px-3";
  return (
    <div
      role="gridcell"
      aria-current={isToday ? "date" : undefined}
      aria-disabled={day.inMonth && !editable ? true : undefined}
      title={day.closed && day.closed !== "Weekend" ? `Market closed: ${day.closed}` : undefined}
      className={`relative ${fill} ${isToday ? "z-[1] rounded-sm shadow-[inset_0_0_0_2px_var(--accent)]" : ""}`}
    >
      {editable ? (
        <button
          type="button"
          onClick={() => onSelect(day)}
          aria-label={`Edit P&L for ${entryLabel.format(day.date)}`}
          className={`${body} rounded-sm transition-[box-shadow] hover:shadow-[inset_0_0_0_1px_var(--border-strong)] focus-visible:outline-offset-[-2px]`}
        >
          <DayContent day={day} unit={unit} />
        </button>
      ) : (
        <div className={body}>
          <DayContent day={day} unit={unit} />
        </div>
      )}
    </div>
  );
}

function DayContent({ day, unit }: { day: CalendarDay; unit: Unit }) {
  const t = tone(day.pnl);
  const dayColor = !day.inMonth ? "text-fg-secondary" : day.closed !== null && day.pnl === null ? "text-fg-muted" : "text-fg";
  return (
    <>
      <span className={`text-label font-medium tabular-nums ${dayColor}`}>
        {day.date.getDate()}
      </span>
      {day.pnl === null && day.closed !== null ? (
        day.inMonth && day.closed !== "Weekend" ? (
          <span className="place-self-center text-center text-caption text-fg-muted">
            <span className="sm:hidden">Closed</span>
            <span className="hidden sm:inline">{day.closed}</span>
          </span>
        ) : (
          <span aria-label="Market closed" />
        )
      ) : day.pnl === null ? (
        <span aria-label="No activity" className="place-self-center text-figure-md text-fg-faint">
          —
        </span>
      ) : (
        <PnlFigure value={day.pnl} unit={unit} base={day.base} className={`place-self-center ${figure[t]}`} />
      )}
    </>
  );
}

/** Compact figure (+1.5k) on phones, full figure (+$1,500.00) from sm up. */
function PnlFigure({ value, unit, base, className }: { value: number; unit: Unit; base: number; className: string }) {
  const full = formatPnl(value, unit, base);
  return (
    <span className={`text-caption font-bold tabular-nums sm:text-figure-md ${className}`}>
      <span aria-hidden className="sm:hidden">
        {formatPnlCompact(value, unit, base)}
      </span>
      <span className="sr-only sm:not-sr-only">{full}</span>
    </span>
  );
}

function UnitToggle({ unit, onChange }: { unit: Unit; onChange: (u: Unit) => void }) {
  const options: { value: Unit; label: string }[] = [
    { value: "usd", label: "USD" },
    { value: "pct", label: "%" },
  ];
  return (
    <div
      role="group"
      aria-label="Display unit"
      className="ml-auto inline-flex shrink-0 gap-0.5 rounded-md border border-line bg-sunken p-[3px]"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={unit === o.value}
          onClick={() => onChange(o.value)}
          className={`h-9 min-w-12 rounded-sm px-2 sm:min-w-20 text-body font-semibold transition-colors ${
            unit === o.value ? "bg-raised text-accent-soft" : "text-fg-secondary hover:text-fg"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Legend() {
  const items = [
    { label: "Profit", dot: "bg-profit-dot" },
    { label: "Loss", dot: "bg-loss-dot" },
    { label: "No activity", dot: "bg-neutral-dot" },
  ];
  return (
    <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 px-1 text-caption text-fg-muted">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2">
          <span className={`size-2.5 rounded-full ${i.dot}`} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
