import { toKey, type Account } from "./pnl";

/**
 * Performance statistics over an account's logged days. Each logged day is one "trade": the app
 * stores net daily P&L, not individual fills, so win rate, R multiples and top-trade shares are per day.
 */

export type Range = "30d" | "90d" | "ytd" | "all";

export type DayEntry = {
  key: string;
  pnl: number;
  /** Balance at the start of the day. */
  base: number;
};

export type EquityPoint = {
  /** null for the opening point, the balance before the first day in range. */
  key: string | null;
  balance: number;
  /** Distance below the running peak, in dollars (0 at a new high). */
  drawdown: number;
};

export type Drawdown = {
  amount: number;
  /** amount / peak balance (0-1), or null when the peak is non-positive. */
  pct: number | null;
  peakKey: string | null;
  troughKey: string;
};

export type TopShare = {
  n: number;
  /** Sum of the n best days (fewer when there aren't n winning days). */
  sum: number;
  /** sum / net P&L, or null when net P&L isn't positive. */
  share: number | null;
};

export type Analytics = {
  days: DayEntry[];
  /** Balance going into the range. */
  opening: number;
  net: number;
  grossProfit: number;
  grossLoss: number;
  wins: number;
  losses: number;
  flat: number;
  /** Days with pnl > 0 over logged days (0-1); null with none. */
  winRate: number | null;
  avgWin: number | null;
  /** Negative. */
  avgLoss: number | null;
  /** Mean P&L per logged day. */
  expectancy: number | null;
  /** avgWin / |avgLoss|. */
  payoff: number | null;
  /** grossProfit / |grossLoss|; Infinity with wins and no losses, null with neither. */
  profitFactor: number | null;
  /** Expectancy in R, where 1R is the average losing day. */
  avgR: number | null;
  largestWin: DayEntry | null;
  largestLoss: DayEntry | null;
  maxDrawdown: Drawdown | null;
  /** Current distance below the peak at the end of the range. */
  currentDrawdown: number;
  topShares: TopShare[];
  longestWinStreak: number;
  longestLossStreak: number;
  equity: EquityPoint[];
};

/** First date key included in the range, or null for all time. */
export function rangeStart(range: Range, today: Date): string | null {
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();
  if (range === "30d") return toKey(new Date(y, m, d - 29));
  if (range === "90d") return toKey(new Date(y, m, d - 89));
  if (range === "ytd") return toKey(new Date(y, 0, 1));
  return null;
}

export function analyze(account: Pick<Account, "daily" | "startingBalance">, start: string | null): Analytics {
  const sorted = Object.entries(account.daily).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  let balance = account.startingBalance;
  const days: DayEntry[] = [];
  for (const [key, pnl] of sorted) {
    if (start === null || key >= start) days.push({ key, pnl, base: balance });
    balance += pnl;
  }
  const opening = days[0]?.base ?? balance;

  const winDays = days.filter((d) => d.pnl > 0);
  const lossDays = days.filter((d) => d.pnl < 0);
  const sum = (ds: DayEntry[]) => ds.reduce((a, d) => a + d.pnl, 0);
  const mean = (ds: DayEntry[]) => (ds.length === 0 ? null : sum(ds) / ds.length);

  const grossProfit = sum(winDays);
  const grossLoss = sum(lossDays);
  const net = grossProfit + grossLoss;
  const avgWin = mean(winDays);
  const avgLoss = mean(lossDays);
  const expectancy = mean(days);

  // Equity curve and drawdowns, starting from the balance going into the range.
  const equity: EquityPoint[] = [{ key: null, balance: opening, drawdown: 0 }];
  let peak = opening;
  let peakKey: string | null = null;
  let maxDrawdown: Drawdown | null = null;
  for (const d of days) {
    const bal = d.base + d.pnl;
    if (bal > peak) {
      peak = bal;
      peakKey = d.key;
    }
    const dd = peak - bal;
    equity.push({ key: d.key, balance: bal, drawdown: dd });
    if (dd > 0 && dd > (maxDrawdown?.amount ?? 0)) {
      maxDrawdown = { amount: dd, pct: peak > 0 ? dd / peak : null, peakKey, troughKey: d.key };
    }
  }

  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    const sign = Math.sign(days[i].pnl);
    run = i > 0 && sign !== 0 && sign === Math.sign(days[i - 1].pnl) ? run + 1 : sign === 0 ? 0 : 1;
    if (sign > 0) longestWinStreak = Math.max(longestWinStreak, run);
    if (sign < 0) longestLossStreak = Math.max(longestLossStreak, run);
  }

  const best = [...winDays].sort((a, b) => b.pnl - a.pnl);
  const topShares = [1, 2, 3].map((n) => {
    const top = sum(best.slice(0, n));
    return { n, sum: top, share: net > 0 ? top / net : null };
  });

  return {
    days,
    opening,
    net,
    grossProfit,
    grossLoss,
    wins: winDays.length,
    losses: lossDays.length,
    flat: days.length - winDays.length - lossDays.length,
    winRate: days.length === 0 ? null : winDays.length / days.length,
    avgWin,
    avgLoss,
    expectancy,
    payoff: avgWin !== null && avgLoss !== null ? avgWin / -avgLoss : null,
    profitFactor: grossLoss < 0 ? grossProfit / -grossLoss : grossProfit > 0 ? Infinity : null,
    avgR: expectancy !== null && avgLoss !== null ? expectancy / -avgLoss : null,
    largestWin: best[0] ?? null,
    largestLoss: lossDays.reduce<DayEntry | null>((w, d) => (w === null || d.pnl < w.pnl ? d : w), null),
    maxDrawdown,
    currentDrawdown: equity[equity.length - 1].drawdown,
    topShares,
    longestWinStreak,
    longestLossStreak,
    equity,
  };
}
