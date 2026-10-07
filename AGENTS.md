<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Pnlok

A daily profit & loss calendar for traders. Users sign in with email and password, create trading accounts, and log each day's net P&L (after fees). The dashboard shows one account's month as a calendar and a summary strip, in USD or as a percent of the account's starting balance.

Stack: Next.js 16 (App Router, Turbopack, `proxy.ts` instead of middleware), React 19, Tailwind CSS v4, Supabase (Postgres + Auth) via `@supabase/ssr`. TypeScript strict. No test suite yet; verify with `npm run build` and `npm run lint`.

## Layout

```
proxy.ts                     Session refresh + redirect signed-out users to /login (all routes except static assets and PWA files)
app/
  layout.tsx                 Root layout, Figtree font, dark theme
  globals.css                Design tokens (see Design system)
  manifest.ts                PWA manifest (/manifest.webmanifest); apple-icon.png sits beside it
  (dashboard)/page.tsx       Dashboard (server): loads claims + accounts, renders PnlDashboard or the first-account form
  (dashboard)/loading.tsx    Dashboard skeleton while the page loads (route group keeps it off /login)
  analytics/page.tsx         Analytics (server): loads accounts, renders AnalyticsView (?account= picks the account)
  analytics/loading.tsx      Analytics skeleton
  actions.ts                 Server actions: createAccount, updateAccount, deleteAccount, saveDailyPnl (upsert, or delete when pnl is null)
  login/                     Email/password sign-in + sign-up page, form (client), authenticate action
  auth/confirm/route.ts      Sign-up confirmation email landing: exchanges `code` (PKCE) or verifies `token_hash`, then redirects
  auth/actions.ts            signOut action
components/
  pnl-dashboard.tsx          Client root of the dashboard: selected account, visible month, unit, open dialogs
  app-header.tsx             Logo, AccountSelect, ProfileMenu
  profile-menu.tsx           Avatar button → menu: page links (Analytics / Calendar), Manage accounts, Sign out
  analytics-view.tsx         Client root of /analytics: account, date range (30D/90D/YTD/All), stat panels
  equity-chart.tsx           SVG balance curve with hover/keyboard crosshair tooltip
  manage-accounts.tsx        Dialog body: list accounts, edit inline (CreateAccountForm), delete with confirm
  account-select.tsx         Custom listbox dropdown of accounts + "New account" entry
  stat-strip.tsx             Monthly P&L, win rate, average win/loss
  calendar-panel.tsx         Month grid (Mon-first), month nav, USD/% toggle, legend; in-month days are buttons
  day-editor.tsx             Dialog to set/clear one day's P&L (calls saveDailyPnl)
  create-account-form.tsx    Account form (useActionState → createAccount, or updateAccount when `account` is passed); also exports shared input/button class strings
  modal.tsx                  Native <dialog> wrapper (showModal, Escape, backdrop click)
  icons.tsx                  Inline SVG icons (24px stroke set), Spinner and LogoMark
  service-worker.tsx         Registers public/sw.js (production only)
  submit-button.tsx          Form submit button with a spinner while pending (useFormStatus)
lib/
  pnl.ts                     Pure domain logic: types, buildMonth, monthStats, formatPnl, tone
  analytics.ts               Pure analytics: analyze(account, start) → win rate, profit factor, drawdown, R, concentration, streaks, equity curve
  market.ts                  US market calendar: marketClosure(date) → "Weekend" | holiday name | null
  accounts.ts                getAccounts(): reads accounts + daily_pnl for the current user, maps to `Account`
  supabase/server.ts         createClient() for server components, actions and route handlers
  supabase/proxy.ts          updateSession() used by proxy.ts
  supabase/database.types.ts Generated DB types; regenerate after schema changes
public/
  sw.js                      Service worker: caches /_next/static + offline/launch pages; pages and actions always hit the network
  offline.html               Offline fallback for navigations (static, inline token values)
  launch.html                PWA start_url: precached splash that paints instantly, then location.replace("/")
  icon-*.png                 Manifest icons (any + maskable)
supabase/migrations/         SQL migrations, applied to the hosted project (no local Supabase stack)
ss-mocks/calendar-design.png Reference design for the dashboard
```

## Data flow

- Reads happen in server components (`app/page.tsx` → `lib/accounts.ts`). The page is dynamic because it reads cookies.
- Writes go through server actions in `app/actions.ts`, which validate input, write with the user's Supabase session and call `revalidatePath("/")`. The client never talks to Supabase directly; there is no browser Supabase client.
- `PnlDashboard` is the only stateful client component tree. It receives `accounts` as props; after an action revalidates, new props arrive and the UI updates. Dialogs (`DayEditor`, new-account `Modal`) are mounted only while open.
- `lib/pnl.ts` is framework-free. Keep calculations and formatting there, not in components.

## Domain rules

- `Account.daily` is `Record<"YYYY-MM-DD", number>`. Build keys with `toKey()` (local time). Never use `toISOString()` for date keys; it shifts days across timezones.
- A day with no row means "no activity" (`pnl: null`, rendered as —), which is different from a 0 P&L day.
- Calendar weeks start Monday and show Mon–Fri only (weekends are hidden; `buildMonth` still returns 7-day weeks). Only in-month days count toward totals and are editable.
- Percent mode measures against the balance going into the period: a day uses its opening balance (`CalendarDay.base` = starting balance + all earlier P&L), monthly P&L the balance at the 1st, and the header's all-time change the starting balance. Average win/loss are averaged in the displayed unit (each day's own percent in % mode). A non-positive base formats as —. `formatPnl` produces `+$4,373.00`, `-$340.00`, `+1.84%`, `$0.00`.
- US market closures (weekends, NYSE holidays computed in `lib/market.ts`, plus a hand-kept list of unscheduled closures) set `CalendarDay.closed`. Closed days aren't editable unless they already hold an entry (so it can be cleared), and `saveDailyPnl` rejects new P&L on them.
- `monthStats.winRate` is days with pnl > 0 over days with an entry (a 0 day counts as traded, not a win); `avgWin`/`avgLoss` average the positive/negative days.
- Analytics treat each logged day as one trade (only daily net P&L is stored). Average R uses 1R = the average losing day; top-N concentration is the best N days' sum over net P&L (only when net > 0). The dashboard and analytics pass the selected account between pages as `?account=<id>`.
- P&L is stored as `numeric(14,2)`; amounts are rounded to cents before saving.

## Supabase

Project ref `rmeyfwmpkgodtbdbvdan` (also in `.mcp.json`). Env vars live in `.env.local` (git-ignored; see `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Only the publishable key is used; never add a service-role/secret key to the app.

Schema (`public`):
- `accounts`: `id uuid pk`, `user_id uuid` (defaults to `auth.uid()`, FK `auth.users`, cascade), `name text` (1-100 chars), `starting_balance numeric(14,2) > 0`, `created_at`.
- `daily_pnl`: `account_id uuid` (FK `accounts`, cascade), `day date`, `pnl numeric(14,2)`; primary key `(account_id, day)`, so saves are upserts.

Security model: RLS is on for both tables, with select/insert/update/delete policies `to authenticated`. `accounts` is owned via `user_id = (select auth.uid())`; `daily_pnl` via an `exists` check on the parent account. `anon` has no privileges. Do not insert `user_id` from the client; rely on the column default.

Auth: email + password (`signInWithPassword`, `signUp`). Sign-up passes `emailRedirectTo = <origin>/auth/confirm` for the confirmation email, where origin is `NEXT_PUBLIC_SITE_URL` if set, else the request origin. If the redirect isn't allow-listed, Supabase silently falls back to the dashboard Site URL. Each environment's `/auth/confirm` URL must be in the Supabase dashboard's Auth redirect allow-list. In server code, check identity with `supabase.auth.getClaims()`, not `getSession()`. Keep `getClaims()` immediately after `createServerClient` in `lib/supabase/proxy.ts`.

Schema changes:
1. Apply with the Supabase MCP `apply_migration` tool (there is no local stack or CLI in this repo).
2. Save the same SQL to `supabase/migrations/<version>_<name>.sql`, using the version `list_migrations` reports.
3. Enable RLS and add owner-scoped policies for every new table in `public`; grant to `authenticated` only.
4. Run `get_advisors` (security and performance) and fix findings.
5. Regenerate `lib/supabase/database.types.ts` with `generate_typescript_types`.

Read `.agents/skills/supabase/SKILL.md` before Supabase work.

## Design system

Single dark theme. All colors, radii and type sizes are tokens in `app/globals.css` (`:root` CSS variables mapped into Tailwind via `@theme inline`), mirroring the Pnlok design system's tokens.json. Use the token utilities, never raw hex values or Tailwind's default palette.

Colors (utility → role):
- Surfaces: `bg-canvas` (page), `bg-surface` (panels, inputs on panels), `bg-sunken` (closed days, toggle track, inputs in dialogs), `bg-cell` (empty day), `bg-raised` (hover, selected toggle).
- Borders: `border-line` (subtle dividers, controls), `border-line-strong` (panel and popover outlines).
- Text: `text-fg`, `text-fg-secondary` (labels, body copy), `text-fg-muted` (captions), `text-fg-faint` (placeholders, "—").
- P&L: `text-profit`/`bg-profit-cell`/`bg-profit-dot`, `text-loss`/`bg-loss-cell`/`bg-loss-dot`, `bg-neutral-dot`. Pick via `tone(value)` → `"profit" | "loss" | "flat"`, never by hand-coded sign checks.
- Accent: `accent` (primary buttons, focus ring, today outline, logo), `accent-soft` (selected toggle text, flat stat values), `accent-surface` (avatar).

Type scale: `text-display-page` (52/56, page title), `text-display-month` (28/34), `text-figure-lg` (28/34, stat values), `text-figure-md` (18/24, cell figures), `text-body-lg` (19/26), `text-body` (15/22, default UI text), `text-label` (14/20, weekday headers, day numbers), `text-caption` (13/18). Figtree font, weights 400-700. Use `tabular-nums` for all figures; headings are bold with negative tracking.

Radii: `rounded-sm` 6px (cells, toggle segments), `rounded-md` 8px (buttons, inputs, menus), `rounded-lg` 12px (panels, dialogs).

Component conventions:
- Controls are 44px tall (`h-11`); primary/secondary button and input classes are exported from `components/create-account-form.tsx`. Reuse them rather than restyling.
- Panels: `rounded-lg border border-line-strong bg-surface`.
- Dialogs use `components/modal.tsx` (native `<dialog>`); don't add a modal library.
- Icons are inline SVG in `components/icons.tsx` (24×24 viewBox, stroke 2, `currentColor`); add new ones there.
- Focus: global `:focus-visible` accent outline; don't remove outlines.
- Loading: pending buttons show `Spinner` (size-4) beside a "…ing" label and are disabled; skeleton bones use `bg-raised` with `motion-safe:animate-pulse`.
- Layout is responsive from ~360px up: `sm:` widens type and padding, and the calendar scrolls horizontally below 640px.
- Keep ARIA patterns intact: calendar is `role="grid"`, account picker is a listbox, unit toggle uses `aria-pressed`.

## Conventions

- Server components by default; add `"use client"` only for interactivity.
- Next 16 specifics: `cookies()`/`headers()`/`searchParams` are async; page props use the global `PageProps<"/route">` / `LayoutProps` types; route types are generated at build, so run `npm run build` (not bare `tsc`) to typecheck new routes.
- Imports use the `@/` alias. Components are named exports in kebab-case files.
- Pin dependency versions (`--save-exact`) and commit the lockfile.
- When you change `public/sw.js`, bump its `VERSION` constant so clients drop old caches. Never cache pages, RSC payloads or server action responses there; P&L data must always come from the network.
