"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { analyze, rangeStart, type Range } from "@/lib/analytics";
import { formatMoney, formatPnl, tone, type Account } from "@/lib/pnl";
import { AccountSelect } from "./account-select";
import { EquityChart } from "./equity-chart";
import { CalendarDays, LogoMark } from "./icons";
import { ProfileMenu } from "./profile-menu";

type Props = {
  accounts: Account[];
  initialAccountId?: string;
  userEmail: string;
  userInitial: string;
};

const RANGES: { value: Range; label: string; long: string }[] = [
  { value: "30d", label: "30D", long: "Last 30 days" },
  { value: "90d", label: "90D", long: "Last 90 days" },
  { value: "ytd", label: "YTD", long: "Year to date" },
  { value: "all", label: "All", long: "All time" },
];

const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 0 });
const percent1 = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });
const ratio = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const toneClass = { profit: "text-profit", loss: "text-loss", flat: "text-accent-soft" };

/** "2026-10-07" → "Oct 7, 2026", read as a local date. */
function formatDate(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return dateFormat.format(new Date(y, m - 1, d));
}

const money = (v: number | null) => (v === null ? "—" : formatPnl(v, "usd", 1));
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

type Stat = { label: string; value: string; tone?: "profit" | "loss" | "flat"; note?: string };

function StatRow({ label, value, tone: t = "flat", note }: Stat) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-line px-4 py-3 sm:px-6">
      <dt className="grid gap-0.5">
        <span className="text-body text-fg-secondary">{label}</span>
        {note && <span className="text-caption text-fg-muted">{note}</span>}
      </dt>
      <dd className={`shrink-0 text-figure-md font-bold tabular-nums ${t === "flat" ? "text-fg" : toneClass[t]}`}>
        {value}
      </dd>
    </div>
  );
}

export function AnalyticsView({ accounts, initialAccountId, userEmail, userInitial }: Props) {
  const [accountId, setAccountId] = useState(initialAccountId ?? accounts[0].id);
  // The start date is fixed when the range is picked, so the render stays pure. "all" needs no clock.
  const [range, setRange] = useState<{ value: Range; start: string | null }>({ value: "all", start: null });

  const account = accounts.find((a) => a.id === accountId) ?? accounts[0];
  const a = useMemo(() => analyze(account, range.start), [account, range.start]);
  const rangeLabel = RANGES.find((r) => r.value === range.value)!.long;

  const changeAccount = (id: string) => {
    setAccountId(id);
    window.history.replaceState(null, "", `/analytics?account=${id}`);
  };

  const dashboardHref = `/?account=${account.id}`;
  const hasDays = a.days.length > 0;

  const headline: Stat[] = [
    {
      label: "Net P&L",
      value: money(hasDays ? a.net : null),
      tone: tone(a.net),
      note: hasDays ? `${formatPnl(a.net, "pct", a.opening)} of opening balance` : undefined,
    },
    {
      label: "Win rate",
      value: a.winRate === null ? "—" : percent.format(a.winRate),
      note: hasDays ? `${a.wins}W · ${a.losses}L${a.flat ? ` · ${a.flat} flat` : ""}` : undefined,
    },
    {
      label: "Profit factor",
      value: a.profitFactor === null ? "—" : a.profitFactor === Infinity ? "∞" : ratio.format(a.profitFactor),
      tone: a.profitFactor === null ? "flat" : a.profitFactor >= 1 ? "profit" : "loss",
      note: hasDays ? "Gross profit ÷ gross loss" : undefined,
    },
    {
      label: "Max drawdown",
      value: a.maxDrawdown ? formatPnl(-a.maxDrawdown.amount, "usd", 1) : hasDays ? "$0.00" : "—",
      tone: a.maxDrawdown ? "loss" : "flat",
      note:
        a.maxDrawdown?.pct != null
          ? `-${percent1.format(a.maxDrawdown.pct)} from peak · ${formatDate(a.maxDrawdown.troughKey)}`
          : undefined,
    },
  ];

  const tradeStats: Stat[] = [
    { label: "Average win", value: money(a.avgWin), tone: tone(a.avgWin) },
    { label: "Average loss", value: money(a.avgLoss), tone: tone(a.avgLoss) },
    {
      label: "Largest win",
      value: money(a.largestWin?.pnl ?? null),
      tone: tone(a.largestWin?.pnl ?? null),
      note: a.largestWin ? formatDate(a.largestWin.key) : undefined,
    },
    {
      label: "Largest loss",
      value: money(a.largestLoss?.pnl ?? null),
      tone: tone(a.largestLoss?.pnl ?? null),
      note: a.largestLoss ? formatDate(a.largestLoss.key) : undefined,
    },
    {
      label: "Expectancy",
      value: money(a.expectancy),
      tone: tone(a.expectancy),
      note: "Average P&L per logged day",
    },
    {
      label: "Payoff ratio",
      value: a.payoff === null ? "—" : ratio.format(a.payoff),
      note: "Average win ÷ average loss",
    },
    {
      label: "Average R multiple",
      value: a.avgR === null ? "—" : `${a.avgR > 0 ? "+" : ""}${ratio.format(a.avgR)}R`,
      tone: tone(a.avgR === null ? null : Math.round(a.avgR * 100)),
      note: a.avgLoss === null ? "Needs at least one losing day" : `1R = average loss (${formatMoney(-a.avgLoss)})`,
    },
  ];

  const streakStats: Stat[] = [
    { label: "Longest win streak", value: plural(a.longestWinStreak, "day") },
    { label: "Longest loss streak", value: plural(a.longestLossStreak, "day") },
    {
      label: "Current drawdown",
      value: a.currentDrawdown > 0 ? formatPnl(-a.currentDrawdown, "usd", 1) : "$0.00",
      tone: a.currentDrawdown > 0 ? "loss" : "flat",
      note: a.currentDrawdown > 0 ? "Below the peak balance" : hasDays ? "At peak balance" : undefined,
    },
    { label: "Days logged", value: String(a.days.length) },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col px-4 pt-4 pb-10 sm:px-8 sm:pt-[18px]">
      <header className="flex items-center justify-between gap-4">
        <Link href={dashboardHref} className="flex items-center gap-2 text-[26px] font-semibold tracking-[-0.01em] text-fg">
          <LogoMark className="size-7" />
          Pnlok
        </Link>
        <div className="flex items-center gap-4">
          <AccountSelect accounts={accounts} value={account.id} onChange={changeAccount} />
          <ProfileMenu
            userEmail={userEmail}
            userInitial={userInitial}
            links={[{ href: dashboardHref, label: "Calendar", icon: <CalendarDays className="size-4" /> }]}
          />
        </div>
      </header>

      <div className="mt-5 mb-3.5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 sm:mt-8">
        <div>
          <h1 className="text-[32px] leading-[38px] font-bold tracking-[-0.02em] text-balance sm:text-display-page">
            Analytics
          </h1>
          <p className="mt-1 text-body text-fg-secondary sm:text-body-lg">
            {rangeLabel} · each logged day counts as one trade.
          </p>
        </div>
        <div
          role="group"
          aria-label="Date range"
          className="inline-flex shrink-0 gap-0.5 rounded-md border border-line bg-sunken p-[3px]"
        >
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              aria-pressed={range.value === r.value}
              aria-label={r.long}
              onClick={() => setRange({ value: r.value, start: rangeStart(r.value, new Date()) })}
              className={`h-9 min-w-12 rounded-sm px-2 text-body font-semibold transition-colors sm:min-w-16 ${
                range.value === r.value ? "bg-raised text-accent-soft" : "text-fg-secondary hover:text-fg"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <section
          aria-label="Summary"
          className="grid grid-cols-2 gap-y-3 rounded-lg border border-line-strong bg-surface py-3 sm:gap-y-6 sm:py-6 min-[900px]:grid-cols-4"
        >
          {headline.map((item, i) => (
            <div
              key={item.label}
              className={`grid content-start gap-0.5 px-4 sm:gap-1 sm:px-8 ${i % 2 === 1 ? "border-l border-line" : ""} ${
                i === 2 ? "min-[900px]:border-l min-[900px]:border-line" : ""
              }`}
            >
              <span className="text-caption text-fg-secondary sm:text-body">{item.label}</span>
              <span className={`text-figure-md font-bold tabular-nums sm:text-figure-lg ${toneClass[item.tone ?? "flat"]}`}>
                {item.value}
              </span>
              {item.note && <span className="text-caption text-fg-muted">{item.note}</span>}
            </div>
          ))}
        </section>

        <section aria-labelledby="equity-heading" className="rounded-lg border border-line-strong bg-surface p-4 sm:p-6">
          <h2 id="equity-heading" className="mb-4 text-figure-md font-bold tracking-[-0.01em]">
            Equity curve
          </h2>
          {hasDays ? (
            <EquityChart points={a.equity} formatDate={formatDate} />
          ) : (
            <p className="py-12 text-center text-body text-fg-muted">
              No entries in this range. Log days on the{" "}
              <Link href={dashboardHref} className="text-accent underline">
                calendar
              </Link>{" "}
              to see your stats.
            </p>
          )}
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section aria-labelledby="trades-heading" className="rounded-lg border border-line-strong bg-surface">
            <h2 id="trades-heading" className="px-4 pt-4 pb-2 text-figure-md font-bold tracking-[-0.01em] sm:px-6 sm:pt-5">
              Wins &amp; losses
            </h2>
            <dl>
              {tradeStats.map((s) => (
                <StatRow key={s.label} {...s} />
              ))}
            </dl>
          </section>

          <div className="flex flex-col gap-4">
            <section aria-labelledby="concentration-heading" className="rounded-lg border border-line-strong bg-surface">
              <div className="px-4 pt-4 pb-2 sm:px-6 sm:pt-5">
                <h2 id="concentration-heading" className="text-figure-md font-bold tracking-[-0.01em]">
                  Concentration
                </h2>
                <p className="mt-0.5 text-caption text-fg-muted">
                  {a.net > 0
                    ? "Share of net P&L from your best days. Over 100% means the rest of the days lost money overall."
                    : "Share of net P&L from your best days. Shown when net P&L is positive."}
                </p>
              </div>
              <dl>
                {a.topShares.map((t) => (
                  <div key={t.n} className="grid gap-2 border-t border-line px-4 py-3 sm:px-6">
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="grid gap-0.5">
                        <span className="text-body text-fg-secondary">{t.n === 1 ? "Top day" : `Top ${t.n} days`}</span>
                        <span className="text-caption text-fg-muted tabular-nums">
                          {t.sum > 0 ? `${formatPnl(t.sum, "usd", 1)} of ${formatPnl(a.net, "usd", 1)}` : "No winning days"}
                        </span>
                      </dt>
                      <dd className="text-figure-md font-bold tabular-nums">
                        {t.share === null ? "—" : percent.format(t.share)}
                      </dd>
                    </div>
                    <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-raised">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${Math.min(t.share ?? 0, 1) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </dl>
            </section>

            <section aria-labelledby="streaks-heading" className="rounded-lg border border-line-strong bg-surface">
              <h2 id="streaks-heading" className="px-4 pt-4 pb-2 text-figure-md font-bold tracking-[-0.01em] sm:px-6 sm:pt-5">
                Streaks &amp; risk
              </h2>
              <dl>
                {streakStats.map((s) => (
                  <StatRow key={s.label} {...s} />
                ))}
              </dl>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
