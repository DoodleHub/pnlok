"use client";

import { useState, useTransition } from "react";
import { saveDailyPnl } from "@/app/actions";
import type { CalendarDay } from "@/lib/pnl";
import { inputClass, primaryButton, secondaryButton } from "./create-account-form";
import { Spinner } from "./icons";
import { Modal } from "./modal";

const dayLabel = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

type Props = {
  accountId: string;
  accountName: string;
  day: CalendarDay;
  onClose: () => void;
};

export function DayEditor({ accountId, accountName, day, onClose }: Props) {
  // Mobile decimal keypads have no minus key, so the sign is a separate toggle and the input holds the amount.
  const [loss, setLoss] = useState(day.pnl !== null && day.pnl < 0);
  const [value, setValue] = useState(day.pnl === null ? "" : String(Math.abs(day.pnl)));
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  // Which button started the pending save, so only that one shows a spinner.
  const [clearing, setClearing] = useState(false);

  const save = (pnl: number | null, clear = false) =>
    startTransition(async () => {
      setClearing(clear);
      const result = await saveDailyPnl(accountId, day.key, pnl);
      if (result.error) setError(result.error);
      else onClose();
    });

  return (
    <Modal title={dayLabel.format(day.date)} description={accountName} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const text = value.trim();
          if (text === "") return save(null);
          const amount = Number(text);
          if (!Number.isFinite(amount)) return setError("Enter a number, like 320 or 175.50.");
          save(loss ? -amount : amount);
        }}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5 text-body text-fg-secondary">
          <label htmlFor="day-pnl">P&amp;L (USD)</label>
          <div className="flex gap-2">
            <div
              role="group"
              aria-label="Profit or loss"
              className="inline-flex shrink-0 gap-0.5 rounded-md border border-line bg-sunken p-[3px]"
            >
              {[
                { label: "Profit", isLoss: false },
                { label: "Loss", isLoss: true },
              ].map((o) => (
                <button
                  key={o.label}
                  type="button"
                  aria-pressed={loss === o.isLoss}
                  onClick={() => setLoss(o.isLoss)}
                  className={`h-9 rounded-sm px-3 text-body font-semibold transition-colors ${
                    loss === o.isLoss
                      ? `bg-raised ${o.isLoss ? "text-loss" : "text-profit"}`
                      : "text-fg-secondary hover:text-fg"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <input
              id="day-pnl"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              autoFocus
              value={value}
              onChange={(e) => {
                // A typed sign (hardware keyboards) flips the toggle instead of staying in the field.
                const next = e.target.value;
                if (/^\s*-/.test(next)) setLoss(true);
                else if (/^\s*\+/.test(next)) setLoss(false);
                setValue(next.replace(/[+-]/g, ""));
              }}
              placeholder="e.g. 320 or 175.50"
              className={`${inputClass} min-w-0`}
            />
          </div>
          <span className="text-caption text-fg-muted">Pick Profit or Loss, then enter the amount. Leave empty for no activity.</span>
        </div>
        {error && (
          <p role="alert" className="text-body text-loss">
            {error}
          </p>
        )}
        <div className="mt-1 flex flex-wrap gap-3">
          <button type="submit" disabled={pending} className={primaryButton}>
            {pending && !clearing && <Spinner className="size-4" />}
            {pending && !clearing ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={onClose} disabled={pending} className={secondaryButton}>
            Cancel
          </button>
          {day.pnl !== null && (
            <button
              type="button"
              disabled={pending}
              onClick={() => save(null, true)}
              className="ml-auto inline-flex items-center gap-1.5 text-body text-loss hover:underline disabled:opacity-60"
            >
              {pending && clearing && <Spinner className="size-4" />}
              {pending && clearing ? "Clearing…" : "Clear day"}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
