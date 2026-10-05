"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, Spinner } from "@/components/icons";
import { authenticate, type LoginMode, type LoginState } from "./actions";

const inputClass =
  "h-11 rounded-md border border-line bg-surface px-4 text-body text-fg placeholder:text-fg-faint focus:border-accent focus:outline-none";

export function LoginForm({ initialError }: { initialError?: string }) {
  const [mode, setMode] = useState<LoginMode>("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [state, action, pending] = useActionState<LoginState, FormData>(
    authenticate,
    initialError ? { status: "error", message: initialError } : { status: "idle" },
  );
  const signup = mode === "signup";

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="mode" value={mode} />
      <label htmlFor="email" className="text-body text-fg-secondary">
        Email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
        className={inputClass}
      />
      <label htmlFor="password" className="text-body text-fg-secondary">
        Password
      </label>
      <div className="relative">
        <input
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          required
          minLength={signup ? 8 : undefined}
          autoComplete={signup ? "new-password" : "current-password"}
          className={`${inputClass} w-full pr-12`}
        />
        <button
          type="button"
          // Keep focus in the input so the on-screen keyboard stays open.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setShowPassword((v) => !v)}
          aria-label="Show password"
          aria-pressed={showPassword}
          aria-controls="password"
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-fg-muted transition-colors hover:text-fg"
        >
          {showPassword ? <EyeOff /> : <Eye />}
        </button>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="mt-1 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-accent text-body font-semibold text-canvas transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending && <Spinner className="size-4" />}
        {pending ? (signup ? "Creating account…" : "Signing in…") : signup ? "Create account" : "Sign in"}
      </button>
      {state.message && (
        <p role="status" className={`text-body ${state.status === "error" ? "text-loss" : "text-profit"}`}>
          {state.message}
        </p>
      )}
      <p className="mt-2 text-body text-fg-secondary">
        {signup ? "Already have an account?" : "New to Pnlok?"}{" "}
        <button
          type="button"
          onClick={() => setMode(signup ? "signin" : "signup")}
          className="font-semibold text-accent-soft hover:underline"
        >
          {signup ? "Sign in" : "Create an account"}
        </button>
      </p>
    </form>
  );
}
