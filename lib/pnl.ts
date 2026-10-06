import { marketClosure } from "./market";

export type Unit = "usd" | "pct";

export type Account = {
  id: string;
  name: string;
  /** Balance before the first logged day. */
  startingBalance: number;
  /** Net P&L after fees, keyed by ISO date (YYYY-MM-DD). */
  daily: Record<string, number>;
};

export type CalendarDay = {
  date: Date;
  key: string;
  inMonth: boolean;
  pnl: number | null;
  /** Account balance at the start of this day: starting balance plus all earlier P&L. Percent mode divides by it. */
  base: number;
  /** Why the US market is closed ("Weekend", holiday name), or null on trading days. */
  closed: string | null;
};

/** A P&L amount with the balance it is measured against in percent mode. */
export type Figure = { pnl: number; base: number };

export type MonthStats = {
  /** Month P&L against the balance at the start of the month. */
  total: Figure;
  /** Share of logged days with pnl > 0 (0-1), or null with no logged days. */
  winRate: number | null;
  /** Mean winning / losing day in the displayed unit; null when there are none. */
  avgWin: Figure | null;
  avgLoss: Figure | null;
};

export function toKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return toKey(a) === toKey(b);
}

/** Weeks (Monday first) covering the month, each with seven days. */
export function buildMonth(year: number, month: number, account: Pick<Account, "daily" | "startingBalance">): CalendarDay[][] {
  const { daily } = account;
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Monday = 0
  const start = new Date(year, month, 1 - offset);
  const last = new Date(year, month + 1, 0);
  const weekCount = Math.ceil((offset + last.getDate()) / 7);

  // Running balance: everything logged before the first visible day, then each day in order.
  const startKey = toKey(start);
  let balance = account.startingBalance;
  for (const [key, pnl] of Object.entries(daily)) if (key < startKey) balance += pnl;

  const weeks: CalendarDay[][] = [];
  for (let w = 0; w < weekCount; w++) {
    const week: CalendarDay[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d);
      const key = toKey(date);
      const inMonth = date.getMonth() === month;
      week.push({ date, key, inMonth, pnl: inMonth ? (daily[key] ?? null) : null, base: balance, closed: marketClosure(date) });
      balance += daily[key] ?? 0;
    }
    weeks.push(week);
  }
  return weeks;
}

/** Value shown for a figure in the given unit, used to rank days. */
function measure(f: Figure, unit: Unit): number {
  return unit === "usd" ? f.pnl : f.pnl / f.base;
}

/**
 * Averages are taken in the displayed unit (mean of each day's own percent in % mode), so they match the calendar cells.
 * The result is a Figure with base 1, so `formatPnl` renders it unchanged in USD and as value × 100 in percent.
 */
export function monthStats(weeks: CalendarDay[][], unit: Unit): MonthStats {
  const days = weeks.flat().filter((d) => d.inMonth);
  const traded: Figure[] = days.filter((d) => d.pnl !== null).map((d) => ({ pnl: d.pnl as number, base: d.base }));
  const average = (figs: Figure[]): Figure | null => {
    const usable = unit === "pct" ? figs.filter((f) => f.base > 0) : figs;
    if (usable.length === 0) return null;
    return { pnl: usable.reduce((a, f) => a + measure(f, unit), 0) / usable.length, base: 1 };
  };
  const wins = traded.filter((f) => f.pnl > 0);
  return {
    total: { pnl: traded.reduce((a, f) => a + f.pnl, 0), base: days[0].base },
    winRate: traded.length === 0 ? null : wins.length / traded.length,
    avgWin: average(wins),
    avgLoss: average(traded.filter((f) => f.pnl < 0)),
  };
}

/** All-time net P&L across every logged day, rounded to cents. */
export function totalPnl(account: Account): number {
  const sum = Object.values(account.daily).reduce((a, b) => a + b, 0);
  return Math.round(sum * 100) / 100;
}

const usd = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Unsigned money: $25,000.00. */
export function formatMoney(value: number): string {
  return `$${usd.format(value)}`;
}

/** Signed money or percent of `base`: +$4,373.00, -$340.00, +1.84%, $0.00. Percent of a non-positive balance is "—". */
export function formatPnl(value: number, unit: Unit, base: number): string {
  if (unit === "pct" && base <= 0) return "—";
  const amount = unit === "usd" ? value : (value / base) * 100;
  const rounded = Math.round(amount * 100) / 100;
  const sign = rounded > 0 ? "+" : rounded < 0 ? "-" : "";
  const body = usd.format(Math.abs(rounded));
  return unit === "usd" ? `${sign}$${body}` : `${sign}${body}%`;
}

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumSignificantDigits: 2 });
const pctShort = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

/** Short signed figure for narrow cells: +1.5k, -340, +12k, +1.2M, +1.8%, +12%, 0. */
export function formatPnlCompact(value: number, unit: Unit, base: number): string {
  if (unit === "pct" && base <= 0) return "—";
  const amount = unit === "usd" ? value : (value / base) * 100;
  const abs = Math.abs(amount);
  const sign = amount > 0 ? "+" : amount < 0 ? "-" : "";
  if (unit === "pct") return `${sign}${abs < 10 ? pctShort.format(abs) : compact.format(abs).replace("K", "k")}%`;
  return `${sign}${Math.round(abs) < 1000 ? Math.round(abs) : compact.format(abs).replace("K", "k")}`;
}

export function tone(value: number | null): "profit" | "loss" | "flat" {
  if (value === null || value === 0) return "flat";
  return value > 0 ? "profit" : "loss";
}
