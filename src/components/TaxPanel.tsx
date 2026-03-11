import { formatCurrency } from "../lib/format";
import type { TaxSummary } from "../lib/types";

export function TaxPanel({ taxes }: { taxes: TaxSummary }) {
  return (
    <section className="rounded-[32px] border border-white/10 bg-white/5 p-5 shadow-panel backdrop-blur">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-white/60">
            Austrian tax view
          </div>
          <div className="mt-1 text-sm text-white/60">
            Initial taxes and fees are separated from the ongoing motor tax so you can validate the car-specific Austrian treatment clearly.
          </div>
        </div>
        <div className="rounded-full bg-accent-900/40 px-4 py-2 text-xs font-semibold text-accent-100">
          Motor tax: {formatCurrency(taxes.ongoing.motorTaxMonthly, true)}/month
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <div className="rounded-[28px] bg-white/4 p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-white/50">
            Initial taxes and fees
          </div>
          <div className="mt-4 space-y-3">
            <TaxLine label="Purchase price" value={formatCurrency(taxes.initial.purchasePrice)} />
            <TaxLine label="Registration fees" value={formatCurrency(taxes.initial.registrationFees)} />
            <TaxLine label="Initial taxes + fees total" value={formatCurrency(taxes.initial.totalInitialTaxesAndFees)} strong />
          </div>
        </div>

        <div className="rounded-[28px] bg-white/4 p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-white/50">
            Ongoing taxes
          </div>
          <div className="mt-4 space-y-3">
            <TaxLine label="Insurance premium gross / year" value={formatCurrency(taxes.ongoing.insurancePremiumGrossAnnual)} />
            <TaxLine label="Insurance premium net of motor tax / year" value={formatCurrency(taxes.ongoing.insurancePremiumNetOfMotorTaxAnnual)} />
            <TaxLine label="Motorbezogene Steuer / month" value={formatCurrency(taxes.ongoing.motorTaxMonthly, true)} />
            <TaxLine label="Motorbezogene Steuer / year" value={formatCurrency(taxes.ongoing.motorTaxAnnual)} />
            <TaxLine label="Motor tax over selected horizon" value={formatCurrency(taxes.ongoing.horizonMotorTaxTotal)} strong />
          </div>
        </div>
      </div>

      <details className="mt-5 rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-5 text-white">
        <summary className="flex cursor-pointer items-center justify-between gap-4 text-xs uppercase tracking-[0.18em] text-white/55">
          <span>Formula chain</span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold tracking-[0.16em] text-white/70">
            Expand
          </span>
        </summary>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {taxes.formulas.map((formula) => (
            <div key={formula.label} className="rounded-2xl bg-white/10 px-4 py-4">
              <div className="text-xs uppercase tracking-[0.14em] text-white/50">
                {formula.label}
              </div>
              <div className="mt-2 text-sm text-white/75">{formula.expression}</div>
              <div className="mt-3 font-semibold text-white">{formula.value}</div>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}

function TaxLine({
  label,
  value,
  strong = false
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-white/6 px-4 py-3">
      <div className="text-sm text-white/70">{label}</div>
      <div className={strong ? "font-bold text-white" : "font-semibold text-white"}>
        {value}
      </div>
    </div>
  );
}
