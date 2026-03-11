import { categoryLabels, formatCurrency } from "../lib/format";
import type { CategoryBreakdown } from "../lib/types";

export function BreakdownTable({ breakdown }: { breakdown: CategoryBreakdown }) {
  return (
    <div className="rounded-[32px] border border-ink-200/70 bg-white/80 p-5 shadow-panel backdrop-blur dark:border-white/10 dark:bg-white/5">
      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-ink-500 dark:text-white/60">
        Breakdown
      </div>
      <div className="mt-4 space-y-3">
        {Object.entries(breakdown).map(([key, value]) => (
          <div
            key={key}
            className="flex items-center justify-between rounded-2xl bg-ink-50 px-4 py-3 dark:bg-white/5"
          >
            <span className="text-sm text-ink-700 dark:text-white/70">
              {categoryLabels[key]}
            </span>
            <span className="font-semibold text-ink-900 dark:text-white">
              {formatCurrency(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
