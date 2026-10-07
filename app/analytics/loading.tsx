import { LogoMark } from "@/components/icons";

/** Placeholder bar; sized by the caller to match the text or control it stands in for. */
function Bone({ className }: { className: string }) {
  return <div className={`bg-raised motion-safe:animate-pulse ${className}`} />;
}

/** Analytics skeleton shown while the server loads the user's accounts. Mirrors AnalyticsView's layout. */
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading analytics"
      className="mx-auto flex w-full max-w-[1400px] flex-col px-4 pt-4 pb-10 sm:px-8 sm:pt-[18px]"
    >
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-[26px] font-semibold tracking-[-0.01em] text-fg">
          <LogoMark className="size-7" />
          Pnlok
        </div>
        <div className="flex items-center gap-4">
          <Bone className="h-11 w-44 rounded-md" />
          <Bone className="size-11 rounded-full" />
        </div>
      </header>

      <div className="mt-5 mb-3.5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 sm:mt-8">
        <div>
          <Bone className="my-1 h-9 w-48 rounded-md sm:h-12 sm:w-64" />
          <Bone className="mt-2 h-5 w-72 rounded-sm" />
        </div>
        <Bone className="h-11 w-[220px] rounded-md sm:w-[276px]" />
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-y-3 rounded-lg border border-line-strong bg-surface py-3 sm:gap-y-6 sm:py-6 min-[900px]:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`grid gap-1.5 px-4 sm:gap-2.5 sm:px-8 ${i % 2 === 1 ? "border-l border-line" : ""} ${
                i === 2 ? "min-[900px]:border-l min-[900px]:border-line" : ""
              }`}
            >
              <Bone className="h-3.5 w-20 rounded-sm sm:h-4" />
              <Bone className="h-5 w-28 rounded-sm sm:h-7" />
              <Bone className="h-3.5 w-32 rounded-sm" />
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-line-strong bg-surface p-4 sm:p-6">
          <Bone className="mb-4 h-6 w-36 rounded-sm" />
          <Bone className="h-[200px] rounded-sm sm:h-[240px]" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {[7, 7].map((rows, i) => (
            <div key={i} className="rounded-lg border border-line-strong bg-surface">
              <Bone className="mx-4 mt-4 mb-3 h-6 w-36 rounded-sm sm:mx-6 sm:mt-5" />
              {Array.from({ length: rows }, (_, r) => (
                <div key={r} className="flex items-center justify-between border-t border-line px-4 py-4 sm:px-6">
                  <Bone className="h-4 w-32 rounded-sm" />
                  <Bone className="h-5 w-20 rounded-sm" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
