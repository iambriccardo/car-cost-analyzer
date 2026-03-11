import { CircleHelp } from "lucide-react";
import { formatCurrency, formatNumber } from "../lib/format";
import type { CategoryBreakdown, HeadlineMetrics, SavedScenario } from "../lib/types";
import { Tooltip } from "./Tooltip";

type Props = {
  scenario: SavedScenario;
  metrics: HeadlineMetrics;
  breakdown: CategoryBreakdown;
};

export function SummarySidebar({ scenario, metrics, breakdown }: Props) {
  const buckets = [
    { label: "Car & depreciation", value: breakdown.purchaseAndDepreciation },
    { label: "Insurance & tax", value: breakdown.insuranceAndTax },
    { label: "Parking", value: breakdown.parking },
    { label: "Charging", value: breakdown.charging }
  ].filter((bucket) => bucket.value > 0);

  const bucketTotal = buckets.reduce((sum, bucket) => sum + bucket.value, 0);
  const statHelp: Record<string, string> = {
    [`Total ${scenario.input.purchase.ownershipYears}-year TCO`]:
      "Headline net cost over the selected horizon after subtracting the estimated resale value.",
    "Monthly equivalent":
      "Headline TCO converted into an average monthly ownership cost over the selected horizon.",
    "Estimated resale":
      "Expected sale value at the configured resale point based on purchase price and residual assumptions.",
    "Cost per km":
      "Headline TCO divided by the total kilometres driven over the selected horizon.",
    "Cash spent before resale":
      "All cash leaving your pocket before getting any money back from selling the car.",
    "Total distance":
      "Modelled kilometres driven over the full ownership horizon."
  };
  return (
    <aside className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.04))] p-5 shadow-panel backdrop-blur">
        <div className="text-xs font-bold uppercase tracking-[0.22em] text-accent-200">
          Summary
        </div>
        <div className="mt-4 grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <SummaryStat
            label={`Total ${scenario.input.purchase.ownershipYears}-year TCO`}
            value={formatCurrency(metrics.totalTco)}
            help={statHelp[`Total ${scenario.input.purchase.ownershipYears}-year TCO`]}
            strong
          />
          <SummaryStat label="Monthly equivalent" value={formatCurrency(metrics.monthlyEquivalent)} help={statHelp["Monthly equivalent"]} />
          <SummaryStat label="Estimated resale" value={formatCurrency(metrics.estimatedResaleValue)} help={statHelp["Estimated resale"]} />
          <SummaryStat label="Cost per km" value={formatCurrency(metrics.costPerKm, true)} help={statHelp["Cost per km"]} />
          <SummaryStat label="Cash spent before resale" value={formatCurrency(metrics.totalCashOutflow)} help={statHelp["Cash spent before resale"]} />
          <SummaryStat label="Total distance" value={formatNumber(metrics.totalKm, " km")} help={statHelp["Total distance"]} />
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-white/5 p-5 shadow-panel backdrop-blur">
        <div className="text-xs font-bold uppercase tracking-[0.22em] text-accent-200">
          Cost Buckets
        </div>
        <div className="mt-4 space-y-4">
          {buckets.map((bucket) => {
            const share = bucketTotal > 0 ? (bucket.value / bucketTotal) * 100 : 0;
            return (
              <div key={bucket.label}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-white/68">{bucket.label}</span>
                  <span className="font-semibold text-white">{formatCurrency(bucket.value)}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full bg-accent-400"
                    style={{ width: `${Math.min(100, Math.max(4, share))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </aside>
  );
}

function SummaryStat({
  label,
  value,
  help,
  strong = false
}: {
  label: string;
  value: string;
  help: string;
  strong?: boolean;
}) {
  return (
    <div className="self-start rounded-[24px] border border-white/10 bg-white/6 px-4 py-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/50">
        <span>{label}</span>
        <InfoButton label={label} help={help} />
      </div>
      <div className={strong ? "mt-3 text-2xl font-extrabold text-white" : "mt-3 text-lg font-bold text-white"}>
        {value}
      </div>
    </div>
  );
}

function InfoButton({ label, help }: { label: string; help: string }) {
  return (
    <Tooltip content={help} widthClass="w-64">
      <button
        type="button"
        aria-label={`Explain ${label}`}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/8 text-white/60 transition hover:bg-white/12 hover:text-white focus:bg-white/12 focus:text-white"
      >
        <CircleHelp className="h-3.5 w-3.5" />
      </button>
    </Tooltip>
  );
}
