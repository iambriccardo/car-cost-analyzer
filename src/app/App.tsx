import {
  Suspense,
  lazy,
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState
} from "react";
import { ChevronDown } from "lucide-react";
import { fieldGroups } from "./field-config";
import { FieldControl } from "../components/Fields";
import { ScenarioManager } from "../components/ScenarioManager";
import { SummarySidebar } from "../components/SummarySidebar";
import { calculateEstimate } from "../lib/calculator";
import { exampleScenarios, STORAGE_VERSION } from "../lib/defaults";
import { formatCurrency, formatNumber, formatPercent } from "../lib/format";
import { estimatorSchema, savedScenarioListSchema } from "../lib/schema";
import {
  createScenario,
  loadScenarios,
  loadSelectedScenarioId,
  saveScenarios,
  saveSelectedScenarioId
} from "../lib/storage";
import type { CaseMode, EstimatorInput, SavedScenario } from "../lib/types";
import { downloadFile, readJsonFile } from "../lib/utils";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "../components/ui/card";
import { Slider } from "../components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

const themeStorageKey = "vienna-car-cost-analyzer.theme";
const fixedCaseMode: CaseMode = "base";
const logoAssetUrl = `${import.meta.env.BASE_URL}logo.png`;

const isChunkLoadError = (error: unknown) =>
  error instanceof Error &&
  /Failed to fetch dynamically imported module|Importing a module script failed|preload/i.test(
    error.message
  );

const ChartsPanel = lazy(() =>
  import("../components/ChartsPanel").then((module) => ({ default: module.ChartsPanel }))
);

export function App() {
  const [scenarios, setScenarios] = useState<SavedScenario[]>(() => loadScenarios());
  const [selectedId, setSelectedId] = useState(() => {
    const loadedScenarios = loadScenarios();
    const persistedId = loadSelectedScenarioId();
    if (persistedId && loadedScenarios.some((scenario) => scenario.id === persistedId)) {
      return persistedId;
    }
    return loadedScenarios[0]?.id ?? exampleScenarios[0].id;
  });
  const [selectedGroupId, setSelectedGroupId] = useState(fieldGroups[0].id);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [monteCarloRuns, setMonteCarloRuns] = useState(300);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    localStorage.setItem(themeStorageKey, "dark");
  }, []);

  useEffect(() => {
    saveScenarios(scenarios);
  }, [scenarios]);

  useEffect(() => {
    if (!scenarios.some((scenario) => scenario.id === selectedId)) {
      const fallbackId = scenarios[0]?.id ?? exampleScenarios[0].id;
      if (fallbackId !== selectedId) {
        setSelectedId(fallbackId);
      }
      return;
    }
    saveSelectedScenarioId(selectedId);
  }, [scenarios, selectedId]);

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
    () =>
      calculateEstimate(validation.success ? validation.data : deferredInput, fixedCaseMode, {
        includeSensitivity: false,
        includeSimulation: false
      }),
    [validation, deferredInput]
  );

  const updateInput = (path: string, value: string | number | boolean) => {
    setScenarios((current) =>
      current.map((scenario) => {
        if (scenario.id !== selectedId) {
          return scenario;
        }
        const [section, field] = path.split(".");
        const sectionKey = section as keyof EstimatorInput;
        return {
          ...scenario,
          input: {
            ...scenario.input,
            [sectionKey]: {
              ...(scenario.input[sectionKey] as Record<string, unknown>),
              [field]: value
            }
          } as EstimatorInput,
          updatedAt: new Date().toISOString()
        };
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

  const exportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const { exportScenarioPdf } = await import("../lib/report");
      const parsed = estimatorSchema.safeParse(activeScenario.input);
      const exportInput = parsed.success ? parsed.data : activeScenario.input;
      const exportResult = calculateEstimate(exportInput, fixedCaseMode, {
        simulationIterations: monteCarloRuns,
        includeSensitivity: true,
        includeSimulation: true
      });
      exportScenarioPdf({
        scenario: { ...activeScenario, input: exportInput },
        result: exportResult,
        caseMode: fixedCaseMode
      });
    } catch (error) {
      console.error("PDF export failed", error);
      if (!isChunkLoadError(error)) {
        window.alert("Could not export the PDF report.");
      }
    } finally {
      setIsExportingPdf(false);
    }
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
    if (!window.confirm("Reset the current scenario to the default Austria EV assumptions?")) {
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
    <div className="app-shell min-h-screen text-foreground">
      <div className="w-full px-3 py-3 sm:px-4 lg:px-5">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 rounded-full border border-border bg-card px-2.5 py-1.5">
            <img
              src={logoAssetUrl}
              alt="Austria EV TCO logo"
              className="h-7 w-7 rounded-lg"
            />
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-foreground">
              Austria EV TCO
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full"
            onClick={resetToDefaults}
          >
            Reset defaults
          </Button>
        </div>

        <div className="grid gap-4 xl:h-[calc(100vh-4.5rem)] xl:grid-cols-[minmax(0,1fr)_320px] xl:overflow-hidden">
          <div className="space-y-4 xl:min-h-0 xl:overflow-y-auto">
            <SectionCard title="Scenario">
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
                isExportingPdf={isExportingPdf}
                onImport={(file) => {
                  importScenarios(file).catch(() =>
                    window.alert("Could not import the scenario file.")
                  );
                }}
              />
            </SectionCard>

            <SectionCard title="Configuration">
              <Tabs value={selectedGroupId} onValueChange={setSelectedGroupId} className="gap-4">
                <Card className="w-full rounded-[18px] bg-background">
                  <CardContent className="p-3.5">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        TCO horizon
                      </div>
                      <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[10px]">
                        {activeScenario.input.purchase.ownershipYears} years
                      </Badge>
                    </div>
                    <Slider
                      min={1}
                      max={30}
                      step={1}
                      value={[activeScenario.input.purchase.ownershipYears]}
                      onValueChange={(values) =>
                        updateInput("purchase.ownershipYears", values[0] ?? 1)
                      }
                    />
                    <div className="mt-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      <span>1y</span>
                      <span>30y</span>
                    </div>
                  </CardContent>
                </Card>

                <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-muted/50 p-1">
                  {fieldGroups.map((group) => (
                    <TabsTrigger
                      key={group.id}
                      value={group.id}
                      className="flex-none rounded-lg px-2.5 py-1.5 text-[11px] font-semibold"
                    >
                      {group.title}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {fieldGroups.map((group) => (
                  <TabsContent key={group.id} value={group.id} className="mt-0 space-y-4">
                    <div className="grid items-start gap-2.5 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                      {group.fields.map((field) => (
                        <FieldControl
                          key={field.path}
                          field={field}
                          value={getValue(activeScenario.input, field.path)}
                          error={errors[field.path]}
                          onChange={(value) => updateInput(field.path, value)}
                        />
                      ))}
                    </div>

                    <SectionNarrativeCard
                      groupId={group.id}
                      scenario={activeScenario}
                      result={result}
                    />
                  </TabsContent>
                ))}
              </Tabs>
            </SectionCard>

            <SectionCard title="Analytics">
              <Suspense fallback={<ChartsPanelSkeleton />}>
                <ChartsPanel
                  input={validation.success ? validation.data : deferredInput}
                  caseMode={fixedCaseMode}
                  yearly={result.yearly}
                  breakdown={result.breakdown}
                  simulationIterations={monteCarloRuns}
                  onSimulationIterationsChange={setMonteCarloRuns}
                />
              </Suspense>
            </SectionCard>
          </div>

          <div className="xl:min-h-0 xl:overflow-y-auto">
            <SummarySidebar
              scenario={activeScenario}
              metrics={result.metrics}
              breakdown={result.breakdown}
            />
          </div>
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
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-[22px] shadow-panel">
      <CardHeader className="px-4 pt-3.5 pb-0">
        <CardTitle className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3.5 pt-3">{children}</CardContent>
    </Card>
  );
}

function SectionNarrativeCard({
  groupId,
  scenario,
  result
}: {
  groupId: string;
  scenario: SavedScenario;
  result: ReturnType<typeof calculateEstimate>;
}) {
  const { purchase, insurance, parking, driving, charging } = scenario.input;
  const firstYear = result.yearly[0];
  const finalYear = result.yearly.at(-1) ?? result.yearly[0];
  const annualKmYearOne = driving.monthlyKm * 12 * (1 + driving.seasonalUsageAdjustment / 100);
  const cityFactor = driving.cityShare * 0.94;
  const motorwayFactor = driving.motorwayShare * 1.12;
  const mixedFactor = driving.mixedShare * 1;
  const driveMixEfficiency = (cityFactor + motorwayFactor + mixedFactor) / 100;
  const winterFactor = 1 + charging.winterEfficiencyPenalty / 100 * 0.45;
  const lossesFactor = 1 + charging.chargingLosses / 100;
  const baseEnergy = (annualKmYearOne / 100) * charging.consumptionKwhPer100Km;
  const adjustedEnergy = baseEnergy * driveMixEfficiency * winterFactor * lossesFactor;
  const blendedDcTariff =
    (charging.superchargerShare * charging.superchargerTariff +
      (100 - charging.superchargerShare) * charging.dcTariff) /
    100;
  const blendedTariff =
    (charging.acShare * charging.acTariff + charging.dcShare * blendedDcTariff) / 100;
  const firstYearCharging = adjustedEnergy * blendedTariff + charging.idleFeesAnnual;
  const firstYearParkingBase =
    parking.monthlyParkingCost * 12 +
    (parking.residentPermitEnabled ? parking.residentPermitAnnual : 0);
  const firstYearInsuranceBase = insurance.monthlyPremium * 12;
  const firstYearInsuranceAndTax = firstYear?.insuranceAndTax ?? 0;
  const finalYearInsuranceAndTax = finalYear?.insuranceAndTax ?? 0;

  const narratives: Record<string, { title: string; summary: string; lines: string[] }> = {
    meta: {
      title: "How vehicle and value affect price",
      summary: "Purchase cost, resale, and tax-relevant specs all flow directly into the ownership result.",
      lines: [
        `${formatCurrency(purchase.purchasePrice)} purchase price plus ${formatCurrency(purchase.registrationCosts)} registration costs means about ${formatCurrency(purchase.purchasePrice + purchase.registrationCosts)} leaves your pocket at purchase time.`,
        `${formatPercent(purchase.expectedResalePercent)} expected resale on ${formatCurrency(purchase.purchasePrice)} turns into about ${formatCurrency(result.metrics.estimatedResaleValue)} at the ${purchase.ownershipYears}-year sale point once the model also considers the WLTP range signal.`,
        `${formatNumber(purchase.ratedMotorPowerKw)} kW tax power and ${formatNumber(purchase.vehicleWeightKg)} kg weight derive about ${formatCurrency(result.taxes.ongoing.motorTaxMonthly, true)} of Austrian motor tax per month.`
      ]
    },
    insurance: {
      title: "How insurance and tax affect price",
      summary: "Insurance starts from your monthly quote, then the model splits or adds the derived motor tax and inflates later years.",
      lines: [
        `${formatCurrency(insurance.monthlyPremium)}/month becomes ${formatCurrency(firstYearInsuranceBase)}/year of gross premium before annual inflation.`,
        insurance.includesMotorTax
          ? `Because motor tax is marked as included, the app splits out about ${formatCurrency(result.taxes.ongoing.motorTaxAnnual)} per year of motor tax and treats the rest as net insurance premium.`
          : `Because motor tax is not marked as included, the app adds about ${formatCurrency(result.taxes.ongoing.motorTaxAnnual)} per year of motor tax on top of the premium.`,
        `With ${formatPercent(insurance.premiumInflation)} premium inflation, the insurance-and-tax bucket moves from about ${formatCurrency(firstYearInsuranceAndTax)} in year one to about ${formatCurrency(finalYearInsuranceAndTax)} in the final year.`
      ]
    },
    parking: {
      title: "How parking affects price",
      summary: "Parking is modeled as a recurring fixed cost, then grown over time with parking inflation.",
      lines: [
        `${formatCurrency(parking.monthlyParkingCost)}/month private parking ${parking.residentPermitEnabled ? `plus ${formatCurrency(parking.residentPermitAnnual)}/year resident permit` : "with no resident permit"} gives about ${formatCurrency(firstYearParkingBase)} in year one.`,
        `${formatPercent(parking.parkingInflation)} parking inflation lifts the parking bucket from about ${formatCurrency(firstYear?.parking ?? 0)} in year one to about ${formatCurrency(finalYear?.parking ?? 0)} in the final year.`,
        `Over the selected horizon, parking contributes about ${formatCurrency(result.breakdown.parking)} to total TCO.`
      ]
    },
    driving: {
      title: "How driving usage affects consumption",
      summary: "Distance drives energy demand first, then the drive mix and yearly mileage pattern change how much electricity you end up paying for.",
      lines: [
        `${formatNumber(driving.monthlyKm)} km/month becomes about ${formatNumber(annualKmYearOne)} km/year after the ${formatPercent(driving.seasonalUsageAdjustment)} seasonal usage adjustment.`,
        `${formatPercent(driving.annualMileageChange)} annual mileage growth moves yearly distance from about ${formatNumber(firstYear?.kmDriven ?? 0)} km in year one to about ${formatNumber(finalYear?.kmDriven ?? 0)} km in the final year, for about ${formatNumber(result.metrics.totalKm)} km over the whole horizon.`,
        `The current ${formatPercent(driving.cityShare)} city / ${formatPercent(driving.motorwayShare)} motorway / ${formatPercent(driving.mixedShare)} mixed split creates a drive-cycle multiplier of about ${formatNumber(driveMixEfficiency)}, which then feeds the charging model.`
      ]
    },
    charging: {
      title: "How charging affects price",
      summary: "Charging cost starts from driven kilometres, converts them into kWh, and then applies your live tariff mix and energy modifiers.",
      lines: [
        `${formatNumber(driving.monthlyKm)} km/month becomes about ${formatNumber(annualKmYearOne)} km/year after the ${formatPercent(driving.seasonalUsageAdjustment)} seasonal usage adjustment, which means about ${formatNumber(baseEnergy)} kWh before charging adjustments.`,
        `Drive mix, winter penalty, and charging losses lift that to about ${formatNumber(adjustedEnergy)} kWh/year after applying a drive-cycle factor of ${formatNumber(driveMixEfficiency)}, a winter factor of ${formatNumber(winterFactor)}, and charging losses of ${formatPercent(charging.chargingLosses)}.`,
        `${formatPercent(charging.acShare)} AC / ${formatPercent(charging.dcShare)} DC with ${formatPercent(charging.superchargerShare)} of DC on Superchargers produces a blended energy price of about ${formatCurrency(blendedTariff, true)}/kWh.`,
        `${formatCurrency(charging.idleFeesAnnual)} of idle-fee reserve adds on top, so first-year charging comes out at about ${formatCurrency(firstYearCharging)}, and energy price inflation of ${formatPercent(charging.energyPriceInflation)} raises later years further.`
      ]
    }
  };

  const narrative = narratives[groupId];
  const [isOpen, setIsOpen] = useState(false);
  if (!narrative) {
    return null;
  }

  return (
    <Card className="rounded-xl border-border/80 bg-background">
      <CardHeader className="px-4 py-3">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 text-left"
          onClick={() => setIsOpen((current) => !current)}
        >
          <div className="min-w-0">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Explanation
            </CardTitle>
            <div className="mt-1 text-sm font-medium text-foreground">{narrative.title}</div>
          </div>
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/80 bg-muted/40 text-muted-foreground">
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </span>
        </button>
      </CardHeader>
      {isOpen ? (
        <CardContent className="space-y-3 px-4 pb-4 pt-0">
          <div className="text-sm leading-6 text-muted-foreground">{narrative.summary}</div>
          <div className="space-y-1.5 text-sm text-foreground/80">
            {narrative.lines.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}

function ChartsPanelSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {Array.from({ length: 4 }, (_, index) => (
        <Card
          key={index}
          className={`rounded-[20px] shadow-panel ${
            index >= 2 ? "xl:col-span-2" : ""
          }`}
        >
          <CardContent className="p-4">
            <div className="h-4 w-36 rounded-full bg-white/10" />
            <div className="mt-3 h-3 w-64 rounded-full bg-white/6" />
            <div className="mt-6 h-[300px] rounded-[24px] bg-white/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
