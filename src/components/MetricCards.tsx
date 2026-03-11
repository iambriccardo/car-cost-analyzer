import { formatCurrency, formatNumber } from "../lib/format";
import type { HeadlineMetrics } from "../lib/types";

type Props = {
  metrics: HeadlineMetrics;
  years: number;
};

export function MetricCards({ metrics, years }: Props) {
  const items = [
    [`Total ${years}-year TCO`, formatCurrency(metrics.totalTco)],
    ["Monthly equivalent", formatCurrency(metrics.monthlyEquivalent)],
    ["Annual equivalent", formatCurrency(metrics.annualEquivalent)],
    ["Cash spent before resale", formatCurrency(metrics.totalCashOutflow)],
    ["Estimated resale", formatCurrency(metrics.estimatedResaleValue)],
    ["Cost per km", formatCurrency(metrics.costPerKm, true)],
    ["Total distance", formatNumber(metrics.totalKm, " km")],
    ["Net cost after resale", formatCurrency(metrics.netCostAfterResale)]
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(([label, value]) => (
        <div
          key={label}
          className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.04))] px-5 py-5 text-white shadow-panel"
        >
          <div className="text-xs uppercase tracking-[0.18em] text-white/55">
            {label}
          </div>
          <div className="mt-3 text-2xl font-extrabold tracking-tight">{value}</div>
        </div>
      ))}
    </div>
  );
}
