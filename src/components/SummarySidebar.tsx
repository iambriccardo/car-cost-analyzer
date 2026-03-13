import { CircleHelp } from "lucide-react";
import { formatCurrency, formatNumber } from "../lib/format";
import type {
  CategoryBreakdown,
  HeadlineMetrics,
  SavedScenario,
  TaxSummary
} from "../lib/types";
import { MotorTaxDialog } from "./MotorTaxDialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "./ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

type Props = {
  scenario: SavedScenario;
  metrics: HeadlineMetrics;
  breakdown: CategoryBreakdown;
  taxes: TaxSummary;
};

export function SummarySidebar({ scenario, metrics, breakdown, taxes }: Props) {
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
    <aside className="space-y-3">
      <Card className="rounded-[18px]">
        <CardHeader className="px-3.5 pt-3.5">
          <CardTitle className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="grid items-start gap-2 px-3.5 pb-3.5 grid-cols-2 xl:grid-cols-1">
          <SummaryStat
            label={`Total ${scenario.input.purchase.ownershipYears}-year TCO`}
            value={formatCurrency(metrics.totalTco)}
            help={statHelp[`Total ${scenario.input.purchase.ownershipYears}-year TCO`]}
            strong
            className="col-span-2 xl:col-span-1"
          />
          <SummaryStat label="Monthly equivalent" value={formatCurrency(metrics.monthlyEquivalent)} help={statHelp["Monthly equivalent"]} />
          <SummaryStat label="Estimated resale" value={formatCurrency(metrics.estimatedResaleValue)} help={statHelp["Estimated resale"]} />
          <SummaryStat label="Cost per km" value={formatCurrency(metrics.costPerKm, true)} help={statHelp["Cost per km"]} />
          <SummaryStat label="Cash spent before resale" value={formatCurrency(metrics.totalCashOutflow)} help={statHelp["Cash spent before resale"]} />
          <SummaryStat label="Total distance" value={formatNumber(metrics.totalKm, " km")} help={statHelp["Total distance"]} className="col-span-2 xl:col-span-1" />
        </CardContent>
      </Card>

      <Card className="rounded-[18px]">
        <CardHeader className="px-3.5 pt-3.5">
          <CardTitle className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            Cost Buckets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5 px-3.5 pb-3.5">
          {buckets.map((bucket) => {
            const share = bucketTotal > 0 ? (bucket.value / bucketTotal) * 100 : 0;
            return (
              <div key={bucket.label}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">{bucket.label}</span>
                  <span className="font-semibold text-foreground">{formatCurrency(bucket.value)}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-accent-500"
                    style={{ width: `${Math.min(100, Math.max(4, share))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="rounded-[18px]">
        <CardHeader className="px-3.5 pt-3.5">
          <CardTitle className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            Austrian Motor Tax
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-3.5 pb-3.5">
          <div className="grid grid-cols-2 gap-2">
            <SummaryStat
              label="Monthly"
              value={formatCurrency(taxes.ongoing.motorTaxMonthly, true)}
              help="Derived motorbezogene Versicherungssteuer based on tax-relevant 30-minute power and vehicle weight."
            />
            <SummaryStat
              label="Annual"
              value={formatCurrency(taxes.ongoing.motorTaxAnnual)}
              help="Monthly motor tax multiplied by 12."
            />
          </div>
          <MotorTaxDialog input={scenario.input} taxes={taxes} />
        </CardContent>
      </Card>
    </aside>
  );
}

function SummaryStat({
  label,
  value,
  help,
  strong = false,
  className = ""
}: {
  label: string;
  value: string;
  help: string;
  strong?: boolean;
  className?: string;
}) {
  return (
    <Card className={`self-start gap-0 rounded-[16px] bg-background ${className}`}>
      <CardContent className="px-3.5 py-3.5">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <span>{label}</span>
        <InfoButton label={label} help={help} />
      </div>
      <div className={strong ? "mt-2 text-[1.55rem] font-extrabold text-foreground sm:text-[1.7rem]" : "mt-2 text-[15px] font-bold text-foreground"}>
        {value}
      </div>
      </CardContent>
    </Card>
  );
}

function InfoButton({ label, help }: { label: string; help: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`Explain ${label}`}
          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-transparent text-muted-foreground transition hover:bg-accent hover:text-foreground focus:bg-accent focus:text-foreground"
        >
          <CircleHelp className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-64 text-xs leading-5">{help}</TooltipContent>
    </Tooltip>
  );
}
