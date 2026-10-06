import { formatPnl, tone, type Figure, type MonthStats, type Unit } from "@/lib/pnl";

type Props = { stats: MonthStats; unit: Unit };

const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 0 });
const toneClass = { profit: "text-profit", loss: "text-loss", flat: "text-accent-soft" };

export function StatStrip({ stats, unit }: Props) {
  const money = (f: Figure | null) => (f === null ? "—" : formatPnl(f.pnl, unit, f.base));
  const items = [
    { label: "Monthly P&L", value: money(stats.total), tone: tone(stats.total.pnl) },
    { label: "Avg win", value: money(stats.avgWin), tone: tone(stats.avgWin?.pnl ?? null) },
    { label: "Avg loss", value: money(stats.avgLoss), tone: tone(stats.avgLoss?.pnl ?? null) },
    { label: "Win rate", value: stats.winRate === null ? "—" : percent.format(stats.winRate), tone: "flat" as const },
  ];

  return (
    <section
      aria-label="Month summary"
      className="grid grid-cols-2 gap-y-3 rounded-lg border border-line-strong bg-surface py-3 sm:gap-y-6 sm:py-6 min-[900px]:grid-cols-4"
    >
      {items.map((item, i) => (
        <div
          key={item.label}
          className={`grid gap-0.5 px-4 sm:gap-1 sm:px-8 ${i % 2 === 1 ? "border-l border-line" : ""} ${
            i === 2 ? "min-[900px]:border-l min-[900px]:border-line" : ""
          }`}
        >
          <span className="text-caption text-fg-secondary sm:text-body">{item.label}</span>
          <span className={`text-figure-md font-bold tabular-nums sm:text-figure-lg ${toneClass[item.tone]}`}>
            {item.value}
          </span>
        </div>
      ))}
    </section>
  );
}
