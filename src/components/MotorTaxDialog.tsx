import { Calculator, Sigma } from "lucide-react";
import { formatCurrency, formatNumber } from "../lib/format";
import type { EstimatorInput, TaxSummary } from "../lib/types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "./ui/dialog";

type Props = {
  input: EstimatorInput;
  taxes: TaxSummary;
};

export function MotorTaxDialog({ input, taxes }: Props) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-full justify-center rounded-full text-xs font-semibold"
        >
          <Calculator className="h-3.5 w-3.5" />
          Show tax formula
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-[calc(100%-1.5rem)] overflow-hidden rounded-[24px] border-border/80 p-0 sm:max-w-5xl">
        <div className="max-h-[85vh] overflow-y-auto">
          <DialogHeader className="border-b border-border/80 px-5 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[10px]">
                Austrian EV tax
              </Badge>
              <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px]">
                {formatCurrency(taxes.ongoing.motorTaxMonthly, true)} / month
              </Badge>
              <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px]">
                {formatCurrency(taxes.ongoing.motorTaxAnnual)} / year
              </Badge>
              {input.insurance.includesMotorTax ? (
                <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px]">
                  Included in insurance quote
                </Badge>
              ) : null}
            </div>
            <DialogTitle className="text-xl tracking-[-0.03em]">
              How the Austrian motor tax is calculated
            </DialogTitle>
            <DialogDescription className="max-w-3xl leading-6">
              Austria derives the EV motorbezogene Versicherungssteuer from the
              tax-relevant 30-minute power and the vehicle mass. The same derived monthly
              amount is used everywhere else in the app.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-5 py-4 sm:px-6 sm:py-5">
            <div className="grid gap-3 md:grid-cols-3">
              <Card className="rounded-[18px]">
                <CardHeader className="px-4 py-3">
                  <CardDescription className="text-[11px] uppercase tracking-[0.18em]">
                    Tax power
                  </CardDescription>
                  <CardTitle className="text-lg">
                    {formatNumber(input.purchase.ratedMotorPowerKw)} kW
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="rounded-[18px]">
                <CardHeader className="px-4 py-3">
                  <CardDescription className="text-[11px] uppercase tracking-[0.18em]">
                    Vehicle mass
                  </CardDescription>
                  <CardTitle className="text-lg">
                    {formatNumber(input.purchase.vehicleWeightKg)} kg
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="rounded-[18px]">
                <CardHeader className="px-4 py-3">
                  <CardDescription className="text-[11px] uppercase tracking-[0.18em]">
                    Derived tax
                  </CardDescription>
                  <CardTitle className="text-lg">
                    {formatCurrency(taxes.breakdown.monthlyTotal, true)} / month
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <TaxComponentCard
                title="Power component"
                basisLabel={`max(10, ${formatNumber(input.purchase.ratedMotorPowerKw)} - 45) = ${formatNumber(
                  taxes.breakdown.powerBasisKw
                )} kW taxable basis`}
                subtotal={taxes.breakdown.powerMonthly}
                steps={taxes.breakdown.powerSteps}
                unitLabel="kW"
              />
              <TaxComponentCard
                title="Weight component"
                basisLabel={`max(200, ${formatNumber(input.purchase.vehicleWeightKg)} - 900) = ${formatNumber(
                  taxes.breakdown.weightBasisKg
                )} kg taxable basis`}
                subtotal={taxes.breakdown.weightMonthly}
                steps={taxes.breakdown.weightSteps}
                unitLabel="kg"
              />
            </div>

            <Card className="rounded-[18px]">
              <CardHeader className="flex flex-row items-center justify-between gap-3 px-4 py-3">
                <div>
                  <CardDescription className="text-[11px] uppercase tracking-[0.18em]">
                    Formula chain
                  </CardDescription>
                  <CardTitle className="mt-1 text-base tracking-[-0.02em]">
                    Power component + weight component = motor tax
                  </CardTitle>
                </div>
                <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[10px]">
                  <Sigma className="h-3.5 w-3.5" />
                  Monthly total
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <FormulaValue
                    label="Power"
                    value={formatCurrency(taxes.breakdown.powerMonthly, true)}
                  />
                  <FormulaValue
                    label="Weight"
                    value={formatCurrency(taxes.breakdown.weightMonthly, true)}
                  />
                  <FormulaValue
                    label="Total"
                    value={formatCurrency(taxes.breakdown.monthlyTotal, true)}
                    strong
                  />
                </div>
                <div className="rounded-2xl border border-border/80 bg-muted/30 px-3.5 py-3 text-sm leading-6 text-muted-foreground">
                  {input.insurance.includesMotorTax ? (
                    <>
                      Your insurance quote is marked as already including this tax, so the
                      app splits out{" "}
                      <span className="font-semibold text-foreground">
                        {formatCurrency(taxes.ongoing.motorTaxMonthly, true)} / month
                      </span>{" "}
                      of motor tax and shows the remainder as net insurance premium.
                    </>
                  ) : (
                    <>
                      Your insurance quote is marked as excluding this tax, so the app adds{" "}
                      <span className="font-semibold text-foreground">
                        {formatCurrency(taxes.ongoing.motorTaxMonthly, true)} / month
                      </span>{" "}
                      of motor tax on top of the insurance premium.
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TaxComponentCard({
  title,
  basisLabel,
  subtotal,
  steps,
  unitLabel
}: {
  title: string;
  basisLabel: string;
  subtotal: number;
  steps: TaxSummary["breakdown"]["powerSteps"];
  unitLabel: string;
}) {
  return (
    <Card className="rounded-[18px]">
      <CardHeader className="px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardDescription className="text-[11px] uppercase tracking-[0.18em]">
              {title}
            </CardDescription>
            <CardTitle className="mt-1 text-base tracking-[-0.02em]">{basisLabel}</CardTitle>
          </div>
          <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[10px]">
            {formatCurrency(subtotal, true)} / month
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5 px-4 pb-4">
        {steps.map((step) => (
          <div
            key={step.label}
            className="rounded-2xl border border-border/80 bg-background px-3.5 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">{step.label}</div>
                <div className="mt-1 text-xs leading-5 text-muted-foreground">
                  {formatNumber(step.units)} {unitLabel} × {formatCurrency(step.rate, true)}
                </div>
              </div>
              <div className="shrink-0 text-sm font-semibold text-foreground">
                {formatCurrency(step.subtotal, true)}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function FormulaValue({
  label,
  value,
  strong = false
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-background px-3.5 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className={strong ? "mt-1.5 text-lg font-bold text-foreground" : "mt-1.5 text-sm font-semibold text-foreground"}>
        {value}
      </div>
    </div>
  );
}
