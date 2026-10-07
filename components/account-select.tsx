"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Account } from "@/lib/pnl";
import { Check, ChevronDown, Plus } from "./icons";

type Props = {
  accounts: Account[];
  value: string;
  onChange: (id: string) => void;
  /** Omit to hide the "New account" entry. */
  onCreate?: () => void;
};

export function AccountSelect({ accounts, value, onChange, onCreate }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const active = accounts.find((a) => a.id === value) ?? accounts[0];

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 min-w-44 items-center justify-between gap-6 rounded-md border border-line bg-surface pr-3 pl-4 text-body text-fg transition-colors hover:bg-raised"
      >
        {active.name}
        <ChevronDown className="size-[18px] text-fg-secondary" />
      </button>
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Account"
          className="absolute right-0 z-10 mt-2 min-w-full overflow-hidden rounded-md border border-line-strong bg-surface py-1"
        >
          {accounts.map((a) => (
            <li key={a.id} role="option" aria-selected={a.id === active.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(a.id);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-4 px-4 py-2 text-left text-body text-fg hover:bg-raised"
              >
                {a.name}
                {a.id === active.id && <Check className="size-4 text-accent" />}
              </button>
            </li>
          ))}
          {onCreate && (
            <li role="presentation" className="mt-1 border-t border-line pt-1">
              <button
                type="button"
                onClick={() => {
                  onCreate();
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-body text-fg-secondary hover:bg-raised hover:text-fg"
              >
                <Plus className="size-4" />
                New account
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
