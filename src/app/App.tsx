import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Car, CircleHelp, SlidersHorizontal, X } from "lucide-react";
import { fieldGroups } from "./field-config";
import { FieldControl } from "../components/Fields";
import { ChartsPanel } from "../components/ChartsPanel";
import { ScenarioManager } from "../components/ScenarioManager";
import { SummarySidebar } from "../components/SummarySidebar";
import { Tooltip } from "../components/Tooltip";
import { calculateEstimate } from "../lib/calculator";
import { exampleScenarios, STORAGE_VERSION } from "../lib/defaults";
import { formatCurrency, formatNumber, formatPercent } from "../lib/format";
import { exportScenarioPdf } from "../lib/report";
import { estimatorSchema, savedScenarioListSchema } from "../lib/schema";
import { createScenario, loadScenarios, saveScenarios } from "../lib/storage";
import type { CaseMode, EstimatorInput, SavedScenario } from "../lib/types";
import { downloadFile, readJsonFile } from "../lib/utils";

const themeStorageKey = "vienna-car-cost-analyzer.theme";
const fixedCaseMode: CaseMode = "base";

export function App() {
  const [scenarios, setScenarios] = useState<SavedScenario[]>(() => loadScenarios());
  const [selectedId, setSelectedId] = useState(
    () => loadScenarios()[0]?.id ?? exampleScenarios[0].id
  );
  const [selectedGroupId, setSelectedGroupId] = useState(fieldGroups[0].id);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    localStorage.setItem(themeStorageKey, "dark");
  }, []);

  useEffect(() => {
    saveScenarios(scenarios);
  }, [scenarios]);

  const activeScenario =
    scenarios.find((scenario) => scenario.id === selectedId) ?? scenarios[0];
  const deferredInput = useDeferredValue(activeScenario.input);
  const validation = estimatorSchema.safeParse(deferredInput);
  const errors = validation.success
    ? {}
    : Object.fromEntries(
        validation.error.issues.map((issue) => [issue.path.join("."), issue.message])
      );

  const result = useMemo(
    () => calculateEstimate(validation.success ? validation.data : deferredInput, fixedCaseMode),
    [validation, deferredInput]
  );

  const selectedGroup =
    fieldGroups.find((group) => group.id === selectedGroupId) ?? fieldGroups[0];
  const visibleFields = selectedGroup.fields.filter(
    (field) => showAdvanced || !field.advanced
  );

  const updateInput = (path: string, value: string | number | boolean) => {
    setScenarios((current) =>
      current.map((scenario) => {
        if (scenario.id !== selectedId) {
          return scenario;
        }
        const next = structuredClone(scenario);
        const [section, field] = path.split(".");
        (next.input[section as keyof EstimatorInput] as Record<string, unknown>)[field] =
          value;
        next.updatedAt = new Date().toISOString();
        return next;
      })
    );
  };

  const selectScenario = (id: string) => {
    startTransition(() => setSelectedId(id));
  };

  const createNewScenario = () => {
    const base = activeScenario ?? exampleScenarios[0];
    const next = createScenario(`Scenario ${scenarios.length + 1}`, base);
    setScenarios((current) => [...current, next]);
    setSelectedId(next.id);
  };

  const duplicateScenario = () => {
    const next = createScenario(`${activeScenario.name} copy`, activeScenario);
    setScenarios((current) => [...current, next]);
    setSelectedId(next.id);
  };

  const renameScenario = () => {
    const nextName = window.prompt("Rename scenario", activeScenario.name);
    if (!nextName) {
      return;
    }
    setScenarios((current) =>
      current.map((scenario) =>
        scenario.id === selectedId
          ? { ...scenario, name: nextName, updatedAt: new Date().toISOString() }
          : scenario
      )
    );
  };

  const deleteScenario = () => {
    if (scenarios.length === 1 || !window.confirm(`Delete ${activeScenario.name}?`)) {
      return;
    }
    const remaining = scenarios.filter((scenario) => scenario.id !== selectedId);
    setScenarios(remaining);
    setSelectedId(remaining[0].id);
  };

  const exportScenarioConfig = () => {
    downloadFile(
      `${activeScenario.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-config.json`,
      JSON.stringify(activeScenario, null, 2),
      "application/json"
    );
  };

  const exportPdf = () => {
    exportScenarioPdf({
      scenario: activeScenario,
      result,
      caseMode: fixedCaseMode
    });
  };

  const importScenarios = async (file: File) => {
    const parsed = await readJsonFile<unknown>(file);
    const imported = savedScenarioListSchema.parse(parsed).map((scenario) => ({
      ...scenario,
      version: STORAGE_VERSION
    }));
    setScenarios(imported);
    setSelectedId(imported[0]?.id ?? selectedId);
  };

  const resetToDefaults = () => {
    if (!window.confirm("Reset the current scenario to the default Vienna EV assumptions?")) {
      return;
    }
    setScenarios((current) =>
      current.map((scenario) =>
        scenario.id === selectedId
          ? {
              ...exampleScenarios[0],
              id: scenario.id,
              name: scenario.name,
              notes: scenario.notes,
              updatedAt: new Date().toISOString()
            }
          : scenario
      )
    );
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(74,160,136,0.18),_transparent_22%),radial-gradient(circle_at_top_right,_rgba(230,179,90,0.12),_transparent_22%),linear-gradient(180deg,_#0d141c_0%,_#111b25_38%,_#0b1118_100%)] text-white">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-[30px] border border-white/10 bg-white/5 px-5 py-5 shadow-panel backdrop-blur sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-accent-900/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-100">
                <Car className="h-4 w-4" />
                Vienna EV TCO
              </div>
              <h1 className="mt-3 font-display text-3xl tracking-tight text-white sm:text-[2.35rem]">
                Local car cost planner for Vienna.
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/68">
                Starts from a Model 3 standard baseline, stays generic, and keeps the active
                TCO model focused on the costs that matter most: purchase and resale,
                insurance and tax, parking, and public charging.
              </p>
            </div>

            <div className="flex shrink-0 items-start">
              <button
                type="button"
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink-900 shadow-[0_10px_30px_rgba(255,255,255,0.12)]"
                onClick={resetToDefaults}
              >
                Reset defaults
              </button>
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <SectionCard
              number="01"
              title="Scenario setup"
              description="Choose the active scenario and export either the raw configuration or the PDF validation report."
            >
              <ScenarioManager
                scenarios={scenarios}
                selectedId={selectedId}
                onSelect={selectScenario}
                onCreate={createNewScenario}
                onDuplicate={duplicateScenario}
                onRename={renameScenario}
                onDelete={deleteScenario}
                onExportConfig={exportScenarioConfig}
                onExportPdf={exportPdf}
                onImport={(file) => {
                  importScenarios(file).catch(() =>
                    window.alert("Could not import the scenario file.")
                  );
                }}
              />
            </SectionCard>

            <SectionCard
              number="02"
              title="Configuration"
              description="Edit one topic at a time. The main assumptions stay visible by default, and the advanced toggle only reveals the inputs that still materially move the model."
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2">
                  {fieldGroups.map((group, index) => (
                    <button
                      key={group.id}
                      type="button"
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        selectedGroupId === group.id
                          ? "bg-white text-ink-900"
                          : "bg-white/8 text-white/72"
                      }`}
                      onClick={() => setSelectedGroupId(group.id)}
                    >
                      {index + 1}. {group.title}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold ${
                    showAdvanced
                      ? "bg-accent-600 text-white"
                      : "bg-white/8 text-white/75"
                  }`}
                  onClick={() => setShowAdvanced((current) => !current)}
                >
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  {showAdvanced ? "Hide advanced" : "Show advanced"}
                </button>
              </div>

              <div className="mt-5 grid items-start gap-6 lg:grid-cols-[0.68fr_1.32fr]">
                <div className="self-start rounded-[28px] bg-ink-50 p-4 dark:bg-white/5">
                  <div className="text-xs uppercase tracking-[0.18em] text-ink-500 dark:text-white/50">
                    Current configuration section
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-ink-900 dark:text-white">
                    {selectedGroup.title}
                  </div>
                  <div className="mt-2 text-sm leading-7 text-ink-600 dark:text-white/65">
                    {selectedGroup.blurb}
                  </div>
                  <div className="mt-4">
                    <div className="self-start rounded-[22px] border border-white/10 bg-white/6 px-4 py-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/50">
                        Time window
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {[3, 4, 5, 6, 7, 8].map((years) => (
                          <button
                            key={years}
                            type="button"
                            className={`rounded-full px-4 py-2 text-sm font-semibold ${
                              activeScenario.input.purchase.ownershipYears === years
                                ? "bg-white text-ink-900"
                                : "bg-white/10 text-white/70"
                            }`}
                            onClick={() => updateInput("purchase.ownershipYears", years)}
                          >
                            {years}y
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {selectedGroup.id === "charging" ? (
                    <ChargingFormulaCard scenario={activeScenario} />
                  ) : null}
                </div>

                <div className="grid items-start gap-4 md:grid-cols-2">
                  {visibleFields.map((field) => (
                    <FieldControl
                      key={field.path}
                      field={field}
                      value={getValue(activeScenario.input, field.path)}
                      error={errors[field.path]}
                      onChange={(value) => updateInput(field.path, value)}
                    />
                  ))}
                </div>
              </div>
            </SectionCard>

            <SectionCard
              number="03"
              title="Summary"
              description="A compact overview of the active assumptions and the Austrian tax treatment, without expanding the page too much."
            >
              <CompactSummarySection
                scenario={activeScenario}
                taxes={result.taxes}
              />
            </SectionCard>

            <SectionCard
              number="04"
              title="Graphs"
              description="Use the charts to validate how the cost builds up over time, which variables matter most, and how wide the uncertainty range is."
            >
              <ChartsPanel
                input={activeScenario.input}
                caseMode={fixedCaseMode}
                yearly={result.yearly}
                breakdown={result.breakdown}
                simulation={result.simulation}
              />
            </SectionCard>
          </div>

          <SummarySidebar
            scenario={activeScenario}
            metrics={result.metrics}
            breakdown={result.breakdown}
          />
        </div>
      </div>
    </div>
  );
}

const getValue = (input: EstimatorInput, path: string) => {
  const [section, field] = path.split(".");
  return (input[section as keyof EstimatorInput] as Record<string, unknown>)[field] as
    | string
    | number
    | boolean;
};

function SectionCard({
  number,
  title,
  description,
  children
}: {
  number: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[36px] border border-white/10 bg-white/5 p-5 shadow-panel backdrop-blur">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.22em] text-accent-200">
            Section {number}
          </div>
          <div className="mt-2 font-display text-3xl text-white">{title}</div>
          <div className="mt-2 max-w-3xl text-sm leading-7 text-white/65">
            {description}
          </div>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ChargingFormulaCard({ scenario }: { scenario: SavedScenario }) {
  const { charging, driving } = scenario.input;
  const monthlyKm = driving.monthlyKm;
  const annualKm = monthlyKm * 12 * (1 + driving.seasonalUsageAdjustment / 100);
  const cityFactor = driving.cityShare * 0.94;
  const motorwayFactor = driving.motorwayShare * 1.12;
  const mixedFactor = driving.mixedShare * 1;
  const driveMixEfficiency = (cityFactor + motorwayFactor + mixedFactor) / 100;
  const winterFactor = 1 + charging.winterEfficiencyPenalty / 100 * 0.45;
  const lossesFactor = 1 + charging.chargingLosses / 100;
  const baseEnergy = (annualKm / 100) * charging.consumptionKwhPer100Km;
  const adjustedEnergy = baseEnergy * driveMixEfficiency * winterFactor * lossesFactor;
  const blendedDcTariff =
    (charging.superchargerShare * charging.superchargerTariff +
      (100 - charging.superchargerShare) * charging.dcTariff) /
    100;
  const blendedTariff =
    (charging.acShare * charging.acTariff + charging.dcShare * blendedDcTariff) / 100;
  const discountedTariff = blendedTariff * (1 - charging.subscriptionDiscount / 100);
  const billableEnergy = adjustedEnergy * (1 - charging.freeChargingShare / 100);
  const firstYearCharging =
    billableEnergy * discountedTariff + charging.idleFeesAnnual + charging.chargingCardFeesAnnual;

  return (
    <div className="mt-4 rounded-[24px] border border-white/10 bg-white/6 px-4 py-4">
      <div className="text-xs uppercase tracking-[0.18em] text-white/50">
        How charging affects price
      </div>
      <div className="mt-3 text-sm leading-6 text-white/70">
        Charging cost starts from kilometres driven, converts them into kWh, then applies your
        charging mix and tariffs. In the current base year that means:
      </div>
      <div className="mt-3 space-y-2 text-sm text-white/78">
        <div>
          {formatNumber(monthlyKm)} km/month becomes about {formatNumber(annualKm)} km/year after the{" "}
          {formatPercent(driving.seasonalUsageAdjustment)} seasonal usage adjustment, which means about{" "}
          {formatNumber(baseEnergy)} kWh before charging adjustments
        </div>
        <div>
          Drive mix, winter penalty, and charging losses lift that to about{" "}
          {formatNumber(adjustedEnergy)} kWh/year
        </div>
        <div>
          AC/DC split and Supercharger share produce a blended energy price of about{" "}
          {formatCurrency(discountedTariff, true)}/kWh
        </div>
        <div>
          Idle fees and charging-card fees add{" "}
          {formatCurrency(charging.idleFeesAnnual + charging.chargingCardFeesAnnual)} per year, and energy price inflation
          increases both energy and charging-access cost in later years
        </div>
      </div>
      <div className="mt-4 rounded-2xl bg-white/6 px-3 py-3 text-sm font-semibold text-white">
        First-year charging cost from the current inputs: {formatCurrency(firstYearCharging)}
      </div>
    </div>
  );
}

function CompactSummarySection({
  scenario,
  taxes
}: {
  scenario: SavedScenario;
  taxes: ReturnType<typeof calculateEstimate>["taxes"];
}) {
  const [formulaOpen, setFormulaOpen] = useState(false);

  return (
    <>
    <div className="grid items-start gap-4 xl:grid-cols-[1.05fr_0.9fr_0.95fr]">
      <CompactCard title="Vehicle">
        <CompactRow
          label="Car"
          value={scenario.input.meta.vehicleName}
          help="Baseline vehicle profile currently loaded into the estimator."
        />
        <CompactRow
          label="Price"
          value={formatCurrency(scenario.input.purchase.purchasePrice)}
          help="Entered purchase price used as the base gross vehicle cost."
        />
        <CompactRow
          label="WLTP"
          value={`${formatNumber(scenario.input.purchase.wltpRangeKm)} km`}
          help="Official WLTP range. Used as a modest resale-attractiveness signal."
        />
        <CompactRow
          label="30-min power"
          value={`${formatNumber(scenario.input.purchase.ratedMotorPowerKw)} kW`}
          help="Austrian tax-relevant power figure used in the derived motor tax."
        />
        <CompactRow
          label="Weight"
          value={`${formatNumber(scenario.input.purchase.vehicleWeightKg)} kg`}
          help="Vehicle mass used in the Austrian EV motor tax calculation."
        />
      </CompactCard>

      <CompactCard title="Use">
        <CompactRow
          label="Horizon"
          value={`${scenario.input.purchase.ownershipYears} years`}
          help="Selected TCO window over which costs and resale are evaluated."
        />
        <CompactRow
          label="Monthly km"
          value={`${formatNumber(scenario.input.driving.monthlyKm)} km`}
          help="Starting monthly driving distance before seasonal and annual mileage adjustments."
        />
        <CompactRow
          label="Insurance"
          value={`${formatCurrency(scenario.input.insurance.monthlyPremium)}/month`}
          help="Gross insurance premium entry. If the motor tax is included, the model splits it out."
        />
        <CompactRow
          label="Parking"
          value={
            scenario.input.parking.residentPermitEnabled
              ? `${formatCurrency(scenario.input.parking.monthlyParkingCost)}/month + Parkpickerl`
              : `${formatCurrency(scenario.input.parking.monthlyParkingCost)}/month`
          }
          help="Private parking plus optional Parkpickerl, both carried through the parking total."
        />
      </CompactCard>

      <CompactCard title="Austrian tax brief">
        <CompactRow
          label="Initial fees"
          value={formatCurrency(taxes.initial.totalInitialTaxesAndFees)}
          help="One-off registration fee included at purchase time."
        />
        <CompactRow
          label="Motor tax / month"
          value={formatCurrency(taxes.ongoing.motorTaxMonthly, true)}
          help="Derived monthly motorbezogene Versicherungssteuer based on 30-minute power and weight."
        />
        <CompactRow
          label="Insurance net / month"
          value={formatCurrency(taxes.ongoing.insurancePremiumNetOfMotorTaxAnnual / 12, true)}
          help="Monthly insurance premium excluding the derived motor tax share when your quote already bundles it."
        />
        <button
          type="button"
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/72 transition hover:bg-white/12 hover:text-white focus:bg-white/12 focus:text-white"
          onClick={() => setFormulaOpen(true)}
        >
          <CircleHelp className="h-3.5 w-3.5" />
          Show formula chain
        </button>
      </CompactCard>
    </div>

      {formulaOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/78 px-4 backdrop-blur-sm"
          onClick={() => setFormulaOpen(false)}
        >
          <div
            className="max-h-[82vh] w-full max-w-3xl overflow-auto rounded-[32px] border border-white/10 bg-[#111827] p-5 shadow-[0_28px_80px_rgba(2,6,23,0.65)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-accent-200">
                  Austrian tax formula chain
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  How the tax values are derived
                </div>
                <div className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
                  This breaks the current scenario into the registration and motor-tax steps used by the estimator.
                </div>
              </div>
              <button
                type="button"
                aria-label="Close formula chain"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/8 text-white/70 transition hover:bg-white/12 hover:text-white"
                onClick={() => setFormulaOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {taxes.formulas.map((formula) => (
                <div key={formula.label} className="self-start rounded-[24px] border border-white/10 bg-white/5 px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-white/50">
                    {formula.label}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-white/72">{formula.expression}</div>
                  <div className="mt-2 text-base font-semibold text-white">{formula.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function CompactCard({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="self-start rounded-[24px] border border-white/10 bg-white/5 p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-white/50">{title}</div>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

function CompactRow({
  label,
  value,
  help
}: {
  label: string;
  value: string;
  help: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/6 px-3 py-2.5">
      <div className="flex items-center gap-2 text-sm text-white/65">
        <span>{label}</span>
        <Tooltip content={help} widthClass="w-64">
          <button
            type="button"
            aria-label={`Explain ${label}`}
            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/8 text-white/60 transition hover:bg-white/12 hover:text-white focus:bg-white/12 focus:text-white"
          >
            <CircleHelp className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
      </div>
      <div className="text-right text-sm font-semibold text-white">{value}</div>
    </div>
  );
}
