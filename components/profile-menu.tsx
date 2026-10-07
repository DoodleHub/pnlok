"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { signOut } from "@/app/auth/actions";
import { LogOut, Wallet } from "./icons";
import { SubmitButton } from "./submit-button";

type Props = {
  userEmail: string;
  userInitial: string;
  /** Page links shown above the actions, e.g. Analytics. */
  links?: { href: string; label: string; icon: ReactNode }[];
  /** Omit to hide "Manage accounts". */
  onManageAccounts?: () => void;
};

const itemClass =
  "flex w-full items-center gap-2.5 px-4 py-2 text-left text-body text-fg-secondary hover:bg-raised hover:text-fg focus-visible:bg-raised focus-visible:text-fg";

export function ProfileMenu({ userEmail, userInitial, links = [], onManageAccounts }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const close = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const onMenuKey = (e: KeyboardEvent) => {
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape" || e.key === "Tab") {
      if (e.key === "Escape") {
        e.preventDefault();
        buttonRef.current?.focus();
      }
      setOpen(false);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = (i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items[next]?.focus();
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label="Profile menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
        className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-surface text-base font-semibold text-fg transition-opacity hover:opacity-80"
      >
        {userInitial}
      </button>
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Profile"
          onKeyDown={onMenuKey}
          className="absolute right-0 z-10 mt-2 w-60 overflow-hidden rounded-md border border-line-strong bg-surface py-1"
        >
          <p className="truncate px-4 pt-1.5 pb-2 text-caption text-fg-muted" title={userEmail}>
            {userEmail}
          </p>
          <div role="separator" className="mb-1 border-t border-line" />
          {links.map((link) => (
            <Link key={link.href} href={link.href} role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
              {link.icon}
              {link.label}
            </Link>
          ))}
          {onManageAccounts && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onManageAccounts();
              }}
              className={itemClass}
            >
              <Wallet className="size-4" />
              Manage accounts
            </button>
          )}
          <form action={signOut}>
            <SubmitButton
              role="menuitem"
              className={`${itemClass} disabled:opacity-60`}
              icon={<LogOut className="size-4" />}
              pendingLabel="Signing out…"
            >
              Sign out
            </SubmitButton>
          </form>
        </div>
      )}
    </div>
  );
}
