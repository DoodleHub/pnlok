"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
};

/** Native modal dialog: focus trapping, Escape and the backdrop come from the browser. */
export function Modal({ title, description, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  // No close() on cleanup: it fires a "close" event that calls onClose, which under Strict Mode's
  // mount → unmount → mount would dismiss the dialog as soon as it opens. Unmounting removes it anyway.
  // showModal() moves focus to the first focusable child, overriding React's autoFocus (which runs
  // earlier and isn't rendered as an attribute), so focus [data-autofocus] afterwards. A layout effect
  // keeps this inside the opening tap, which mobile browsers require before showing the keyboard.
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-lg border border-line-strong bg-surface p-0 text-fg backdrop:bg-black/60"
    >
      <div className="p-6">
        <h2 className="text-[22px] leading-7 font-bold tracking-[-0.01em]">{title}</h2>
        {description && <p className="mt-1 text-body text-fg-secondary">{description}</p>}
        <div className="mt-5">{children}</div>
      </div>
    </dialog>
  );
}
