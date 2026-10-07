"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { buildMonth, formatMoney, formatPnl, monthStats, toKey, tone, totalPnl, type Account, type CalendarDay, type Unit } from "@/lib/pnl";
import { AppHeader } from "./app-header";
import { CalendarPanel } from "./calendar-panel";
import { CreateAccountForm } from "./create-account-form";
import { DayEditor } from "./day-editor";
import { ManageAccounts } from "./manage-accounts";
import { Modal } from "./modal";
import { StatStrip } from "./stat-strip";

type Props = {
  accounts: Account[];
  /** Server's clock, only used to pick the month for the server render. */
  serverNow: Date;
  userEmail: string;
  userInitial: string;
  /** Account to show first (from ?account=), falling back to the first account. */
  initialAccountId?: string;
};

const changeTone = { profit: "text-profit", loss: "text-loss", flat: "text-fg-muted" };

// Re-read the date when the tab regains focus and at the next local midnight.
function subscribeToday(onChange: () => void) {
  let timer: ReturnType<typeof setTimeout>;
  const schedule = () => {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    timer = setTimeout(() => {
      onChange();
      schedule();
    }, midnight.getTime() - now.getTime());
  };
  schedule();
  document.addEventListener("visibilitychange", onChange);
  return () => {
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", onChange);
  };
}

/** Today's key in the browser's timezone; null during the server render, whose clock may be on another day. */
function useTodayKey() {
  return useSyncExternalStore(subscribeToday, () => toKey(new Date()), () => null);
}

export function PnlDashboard({ accounts, serverNow, userEmail, userInitial, initialAccountId }: Props) {
  const [accountId, setAccountId] = useState(initialAccountId ?? accounts[0].id);
  const todayKey = useTodayKey();
  // null follows the current month; set once the user navigates.
  const [pickedMonth, setPickedMonth] = useState<{ year: number; month: number } | null>(null);
  const [unit, setUnit] = useState<Unit>("usd");
  const [editingDay, setEditingDay] = useState<CalendarDay | null>(null);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [managingAccounts, setManagingAccounts] = useState(false);

  const view = useMemo(() => {
    if (pickedMonth) return pickedMonth;
    if (todayKey) {
      const [y, m] = todayKey.split("-").map(Number);
      return { year: y, month: m - 1 };
    }
    return { year: serverNow.getFullYear(), month: serverNow.getMonth() };
  }, [pickedMonth, todayKey, serverNow]);

  const account = accounts.find((a) => a.id === accountId) ?? accounts[0];
  const weeks = useMemo(() => buildMonth(view.year, view.month, account), [view, account]);
  const stats = useMemo(() => monthStats(weeks, unit), [weeks, unit]);
  const allTime = useMemo(() => totalPnl(account), [account]);

  const onAccountCreated = useCallback((id: string) => {
    setAccountId(id);
    setCreatingAccount(false);
  }, []);

  const shift = (delta: number) => {
    const d = new Date(view.year, view.month + delta, 1);
    setPickedMonth({ year: d.getFullYear(), month: d.getMonth() });
  };

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col px-4 pt-4 pb-10 sm:px-8 sm:pt-[18px]">
      <AppHeader
        accounts={accounts}
        accountId={account.id}
        onAccountChange={setAccountId}
        onCreateAccount={() => setCreatingAccount(true)}
        onManageAccounts={() => setManagingAccounts(true)}
        userEmail={userEmail}
        userInitial={userInitial}
      />

      <div className="mt-5 mb-3.5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 sm:mt-8">
        <div className="sr-only sm:not-sr-only">
          <h1 className="text-[40px] leading-[44px] font-bold tracking-[-0.02em] text-balance sm:text-display-page">
            Profit &amp; loss
          </h1>
          <p className="mt-1 text-body text-fg-secondary sm:text-body-lg">Your performance, one day at a time.</p>
        </div>
        <dl className="grid sm:text-right">
          <dt className="text-caption text-fg-muted">Current balance</dt>
          <dd className="text-figure-md font-bold tabular-nums">
            {formatMoney(account.startingBalance + allTime)}
            <span className={`ml-2 text-body font-semibold ${changeTone[tone(allTime)]}`}>
              {formatPnl(allTime, unit, account.startingBalance)}
            </span>
          </dd>
        </dl>
      </div>

      <div className="flex flex-col gap-4">
        <StatStrip stats={stats} unit={unit} />
        <CalendarPanel
          year={view.year}
          month={view.month}
          weeks={weeks}
          todayKey={todayKey}
          unit={unit}
          onPrev={() => shift(-1)}
          onNext={() => shift(1)}
          onToday={() => setPickedMonth(null)}
          onUnitChange={setUnit}
          onSelectDay={setEditingDay}
        />
      </div>

      {editingDay && (
        <DayEditor
          key={`${account.id}:${editingDay.key}`}
          accountId={account.id}
          accountName={account.name}
          day={editingDay}
          onClose={() => setEditingDay(null)}
        />
      )}
      {creatingAccount && (
        <Modal title="New account" onClose={() => setCreatingAccount(false)}>
          <CreateAccountForm onSaved={onAccountCreated} onCancel={() => setCreatingAccount(false)} />
        </Modal>
      )}
      {managingAccounts && (
        <Modal title="Manage accounts" onClose={() => setManagingAccounts(false)}>
          <ManageAccounts accounts={accounts} onDone={() => setManagingAccounts(false)} />
        </Modal>
      )}
    </div>
  );
}
