import { useState } from "react";
import { ChevronDown, CircleHelp } from "lucide-react";
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
  compact?: boolean;
};

export function SummarySidebar({
  scenario,
  metrics,
  breakdown,
  taxes,
  compact = false
}: Props) {
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
    "Monthly cost":
      "Headline TCO converted into an average monthly ownership cost over the selected horizon.",
    "Resale value":
      "Expected sale value at the configured resale point based on purchase price and residual assumptions.",
    "Cost per km":
      "Headline TCO divided by the total kilometres driven over the selected horizon.",
    "Cash before resale":
      "All cash leaving your pocket before getting any money back from selling the car.",
    "Total km":
      "Modelled kilometres driven over the full ownership horizon."
  };
  const [isExpanded, setIsExpanded] = useState(!compact);
  const primaryStats = [
    {
      label: `Total ${scenario.input.purchase.ownershipYears}-year TCO`,
      value: formatCurrency(metrics.totalTco),
      help: statHelp[`Total ${scenario.input.purchase.ownershipYears}-year TCO`],
      strong: true,
      className: "col-span-2 xl:col-span-1"
    },
    {
      label: "Monthly cost",
      value: formatCurrency(metrics.monthlyEquivalent),
      help: statHelp["Monthly cost"]
    },
    {
      label: "Resale value",
      value: formatCurrency(metrics.estimatedResaleValue),
      help: statHelp["Resale value"]
    },
    {
      label: "Cost per km",
      value: formatCurrency(metrics.costPerKm, true),
      help: statHelp["Cost per km"]
    }
  ];
  const secondaryStats = [
    {
      label: "Cash before resale",
      value: formatCurrency(metrics.totalCashOutflow),
      help: statHelp["Cash before resale"]
    },
    {
      label: "Total km",
      value: formatNumber(metrics.totalKm, " km"),
      help: statHelp["Total km"],
      className: "col-span-2 xl:col-span-1"
    }
  ];

  return (
    <aside className="space-y-2.5 sm:space-y-3">
      <Card className="rounded-[16px] sm:rounded-[18px]">
        <CardHeader className="px-3 pt-3 sm:px-3.5 sm:pt-3.5">
          <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 items-start gap-1.5 px-3 pb-3 sm:gap-2 sm:px-3.5 sm:pb-3.5 xl:grid-cols-1">
          {primaryStats.map((stat) => (
            <SummaryStat key={stat.label} {...stat} />
          ))}
          {!compact || isExpanded
            ? secondaryStats.map((stat) => <SummaryStat key={stat.label} {...stat} />)
            : null}
          {compact ? (
            <button
              type="button"
              className="col-span-2 inline-flex items-center justify-between rounded-[14px] border border-border/80 bg-background px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition hover:bg-accent/30"
              onClick={() => setIsExpanded((current) => !current)}
            >
              <span>{isExpanded ? "Hide details" : "More summary"}</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  isExpanded ? "rotate-180" : ""
                }`}
              />
            </button>
          ) : null}
        </CardContent>
      </Card>

      {!compact || isExpanded ? (
      <Card className="rounded-[16px] sm:rounded-[18px]">
        <CardHeader className="px-3 pt-3 sm:px-3.5 sm:pt-3.5">
          <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Cost Buckets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 px-3 pb-3 sm:space-y-2.5 sm:px-3.5 sm:pb-3.5">
          {buckets.map((bucket) => {
            const share = bucketTotal > 0 ? (bucket.value / bucketTotal) * 100 : 0;
            return (
              <div key={bucket.label}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-[13px] text-muted-foreground sm:text-sm">{bucket.label}</span>
                  <span className="font-semibold text-foreground">{formatCurrency(bucket.value)}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
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
      ) : null}

      {!compact || isExpanded ? (
      <Card className="rounded-[16px] sm:rounded-[18px]">
        <CardHeader className="px-3 pt-3 sm:px-3.5 sm:pt-3.5">
          <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Austrian Motor Tax
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 px-3 pb-3 sm:space-y-3 sm:px-3.5 sm:pb-3.5">
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
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
      ) : null}
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
    <Card className={`self-start gap-0 rounded-[14px] bg-background sm:rounded-[16px] ${className}`}>
      <CardContent className="px-3 py-3 sm:px-3.5 sm:py-3.5">
      <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.16em] text-muted-foreground sm:gap-2 sm:text-[10px] sm:tracking-[0.18em]">
        <span>{label}</span>
        <InfoButton label={label} help={help} />
      </div>
      <div className={strong ? "mt-1.5 text-[1.4rem] font-extrabold text-foreground sm:mt-2 sm:text-[1.7rem]" : "mt-1.5 text-[14px] font-bold text-foreground sm:mt-2 sm:text-[15px]"}>
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
          className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-transparent text-muted-foreground transition hover:bg-accent hover:text-foreground focus:bg-accent focus:text-foreground sm:h-5 sm:w-5"
        >
          <CircleHelp className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-64 text-xs leading-5">{help}</TooltipContent>
    </Tooltip>
  );
}
