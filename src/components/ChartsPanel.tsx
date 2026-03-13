import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis
} from "recharts";
import { type ReactNode, useDeferredValue, useMemo, useState } from "react";
import { CircleHelp } from "lucide-react";
import { categoryLabels, formatCurrency, formatNumber } from "../lib/format";
import type {
  CaseMode,
  CategoryBreakdown,
  EstimatorInput,
  SensitivityPoint,
  YearlyCostRow
} from "../lib/types";
import {
  calculateSensitivity,
  calculateSimulation,
  defaultSensitivityLevers
} from "../lib/calculator";
import { Badge } from "./ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "./ui/card";
import { Slider } from "./ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "./ui/tooltip";

const colors = [
  "#60a5fa",
  "#818cf8",
  "#34d399",
  "#f59e0b",
  "#f472b6"
];

const chartTooltipStyle = {
  backgroundColor: "#111113",
  border: "1px solid rgba(39, 39, 42, 1)",
  borderRadius: "14px",
  boxShadow: "0 20px 50px rgba(0, 0, 0, 0.55)"
};

const chartTooltipLabelStyle = {
  color: "#e5e7eb"
};

const chartTooltipItemStyle = {
  color: "#f8fafc"
};

type Props = {
  input: EstimatorInput;
  caseMode: CaseMode;
  yearly: YearlyCostRow[];
  breakdown: CategoryBreakdown;
  simulationIterations: number;
  onSimulationIterationsChange: (next: number) => void;
};

const monteCarloRunPresets = [200, 300, 500, 1000, 2000] as const;

const sensitivityHelp: Record<string, string> = {
  "Fast-charging price (DC)":
    "How much total ownership cost changes if public DC fast charging becomes cheaper or more expensive.",
  "Annual distance driven":
    "How much total ownership cost changes if your yearly kilometres move lower or higher.",
  "Insurance premium":
    "How much total ownership cost reacts to the monthly insurance premium you enter.",
  "Private parking cost":
    "How much total ownership cost reacts to the monthly private parking amount you pay.",
  "Residual value assumption":
    "How much total ownership cost reacts to the resale percentage assumption at the time you sell the car.",
  "Slow-charging price (AC)":
    "How much total ownership cost changes if public AC charging becomes cheaper or more expensive."
};

const shockHelp: Record<"Lower shock" | "Higher shock", string> = {
  "Lower shock":
    "Reduces only the currently selected input by the chosen percentage, then recalculates TCO while everything else stays fixed.",
  "Higher shock":
    "Increases only the currently selected input by the chosen percentage, then recalculates TCO while everything else stays fixed."
};

export function ChartsPanel({
  input,
  caseMode,
  yearly,
  breakdown,
  simulationIterations,
  onSimulationIterationsChange
}: Props) {
  const [analyticsView, setAnalyticsView] = useState<
    "timeline" | "mix" | "sensitivity" | "monte-carlo"
  >("timeline");
  const [categoryView, setCategoryView] = useState<"share" | "monthly">("share");
  const [sensitivityTweaks, setSensitivityTweaks] = useState(() =>
    Object.fromEntries(
      defaultSensitivityLevers.map((lever) => [
        lever.label,
        {
          lowPercent: Math.round((1 - lever.lowFactor) * 100),
          highPercent: Math.round((lever.highFactor - 1) * 100)
        }
      ])
    ) as Record<string, { lowPercent: number; highPercent: number }>
  );
  const [activeSensitivityLabel, setActiveSensitivityLabel] = useState<string>(
    defaultSensitivityLevers[0]?.label ?? ""
  );
  const tooltipFormatter = (value: unknown) =>
    formatCurrency(typeof value === "number" ? value : Number(value ?? 0));
  const activeCategories = Object.entries(breakdown).filter(([, value]) => value > 0);
  const donutData = activeCategories.map(([key, value]) => ({
    name: categoryLabels[key],
    value
  }));
  const years = Math.max(yearly.length, 1);
  const monthlyCategoryData = activeCategories
    .map(([key, value]) => ({
      name: categoryLabels[key],
      value: value / (years * 12)
    }))
    .sort((a, b) => b.value - a.value);
  const baseSensitivity = useMemo(
    () => (analyticsView === "sensitivity" ? calculateSensitivity(input, caseMode) : []),
    [analyticsView, caseMode, input]
  );
  const sensitivity = useMemo(() => {
    if (analyticsView !== "sensitivity") {
      return [];
    }

    return calculateSensitivity(
      input,
      caseMode,
      Object.fromEntries(
        Object.entries(sensitivityTweaks).map(([label, tweak]) => [
          label,
          {
            lowFactor: 1 - tweak.lowPercent / 100,
            highFactor: 1 + tweak.highPercent / 100
          }
        ])
      )
    );
  }, [analyticsView, caseMode, input, sensitivityTweaks]);
  const sensitivityRows = [...sensitivity].sort(
    (a, b) =>
      defaultSensitivityLevers.findIndex((lever) => lever.label === a.label) -
      defaultSensitivityLevers.findIndex((lever) => lever.label === b.label)
  );
  const sensitivityMaxDelta = Math.max(
    1,
    ...baseSensitivity.flatMap((row) => [Math.abs(row.deltaLow), Math.abs(row.deltaHigh)])
  );
  const activeSensitivityRow =
    sensitivityRows.find((row) => row.label === activeSensitivityLabel) ?? sensitivityRows[0];
  const sensitivityShockMax = useMemo(() => {
    const maxDefaultShock = Math.max(
      ...defaultSensitivityLevers.flatMap((lever) => [
        Math.round((1 - lever.lowFactor) * 100),
        Math.round((lever.highFactor - 1) * 100)
      ])
    );
    return Math.ceil((maxDefaultShock + 5) / 5) * 5;
  }, []);
  const deferredSimulationIterations = useDeferredValue(simulationIterations);
  const simulation = useMemo(
    () =>
      analyticsView === "monte-carlo"
        ? calculateSimulation(input, caseMode, deferredSimulationIterations)
        : null,
    [analyticsView, caseMode, deferredSimulationIterations, input]
  );
  const monteCarloCurve = useMemo(
    () => buildDistributionCurve(simulation?.samples ?? []),
    [simulation]
  );
  const driverHelp: Record<string, string> = {
    "Fast-charging price (DC)":
      "How sensitive total cost is to the public DC fast-charging tariff you pay.",
    "Annual distance driven":
      "How much total cost changes when your driven kilometres move up or down.",
    "Residual value assumption":
      "How much total cost reacts to the resale percentage assumption at sale time.",
    "Slow-charging price (AC)":
      "How sensitive total cost is to your public AC charging tariff.",
    "Energy price inflation":
      "How much the long-run TCO shifts when charging tariffs rise faster or slower each year.",
    "Insurance premium inflation":
      "How much the long-run TCO shifts if insurance renewals trend higher or lower than expected.",
    "Charging losses":
      "How much extra energy you end up paying for because not every kWh drawn from the grid reaches the battery.",
    "Winter efficiency penalty":
      "How much TCO changes when cold-weather energy use is better or worse than expected.",
    "Parking inflation":
      "How much long-run TCO changes if parking fees rise faster or slower over time.",
    "Annual mileage growth":
      "How much TCO changes if your yearly kilometres trend upward or downward over the ownership period.",
    "Tesla Supercharger tariff":
      "How sensitive total cost is to the Tesla Supercharger price used inside the DC charging mix."
  };

  return (
    <Tabs
      value={analyticsView}
      onValueChange={(value) =>
        setAnalyticsView(value as "timeline" | "mix" | "sensitivity" | "monte-carlo")
      }
      className="gap-4"
    >
      <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-muted/60 p-1">
        <TabsTrigger value="timeline" className="flex-none rounded-lg px-3 py-2 text-xs font-semibold">
          Timeline
        </TabsTrigger>
        <TabsTrigger value="mix" className="flex-none rounded-lg px-3 py-2 text-xs font-semibold">
          Cost mix
        </TabsTrigger>
        <TabsTrigger value="sensitivity" className="flex-none rounded-lg px-3 py-2 text-xs font-semibold">
          Sensitivity
        </TabsTrigger>
        <TabsTrigger value="monte-carlo" className="flex-none rounded-lg px-3 py-2 text-xs font-semibold">
          Monte Carlo
        </TabsTrigger>
      </TabsList>

      <TabsContent value="timeline" className="mt-0">
        <div className="grid gap-4 xl:grid-cols-2">
          <ChartCard
            title="Stacked yearly cost bars"
            summary="Annual cost build-up by category."
            tooltip="Higher bars mean a more expensive year. Larger colored segments show which cost bucket is driving that year."
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={yearly}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                <XAxis dataKey="year" />
                <YAxis />
                <RechartsTooltip
                  formatter={tooltipFormatter}
                  contentStyle={chartTooltipStyle}
                  labelStyle={chartTooltipLabelStyle}
                  itemStyle={chartTooltipItemStyle}
                />
                <Legend />
                {activeCategories.map(([key], index) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    stackId="cost"
                    fill={colors[index % colors.length]}
                    name={categoryLabels[key]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Cumulative cost"
            summary="How total cost accumulates over time."
            tooltip="A steeper line means costs are building faster. Lower is better. This chart is positive-only because it tracks accumulated cost."
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={yearly}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                <XAxis dataKey="year" />
                <YAxis />
                <RechartsTooltip
                  formatter={tooltipFormatter}
                  contentStyle={chartTooltipStyle}
                  labelStyle={chartTooltipLabelStyle}
                  itemStyle={chartTooltipItemStyle}
                />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#328f7a"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </TabsContent>

      <TabsContent value="mix" className="mt-0">
        <div className="grid gap-4 xl:grid-cols-2">
          <ChartCard
            title="Category breakdown"
            summary="Switch between share of total TCO and average monthly impact by cost bucket."
            tooltip="Use Share to understand composition of total cost. Use Monthly to see how much each bucket contributes to the average monthly ownership cost."
          >
            <Tabs
              value={categoryView}
              onValueChange={(value) => setCategoryView(value as "share" | "monthly")}
              className="gap-4"
            >
              <TabsList className="h-auto w-fit gap-1 rounded-full bg-muted/60 p-1">
                <TabsTrigger value="share" className="rounded-full px-3 py-1.5 text-xs font-semibold">
                  Share
                </TabsTrigger>
                <TabsTrigger value="monthly" className="rounded-full px-3 py-1.5 text-xs font-semibold">
                  Monthly
                </TabsTrigger>
              </TabsList>
              <TabsContent value="share" className="mt-0">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={donutData} dataKey="value" innerRadius={60} outerRadius={110}>
                      {donutData.map((entry, index) => (
                        <Cell key={entry.name} fill={colors[index % colors.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={tooltipFormatter}
                      contentStyle={chartTooltipStyle}
                      labelStyle={chartTooltipLabelStyle}
                      itemStyle={chartTooltipItemStyle}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </TabsContent>
              <TabsContent value="monthly" className="mt-0">
                <div className="space-y-3">
                  {monthlyCategoryData.map((item, index) => {
                    const maxValue = monthlyCategoryData[0]?.value ?? 1;
                    const width = (item.value / maxValue) * 100;
                    return (
                      <Card key={item.name} className="rounded-xl bg-background">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-muted-foreground">{item.name}</span>
                            <span className="font-semibold text-foreground">
                              {formatCurrency(item.value)}/month
                            </span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-muted">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.max(6, width)}%`,
                                backgroundColor: colors[index % colors.length]
                              }}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>
          </ChartCard>

          <ChartCard
            title="Distance and charging demand"
            summary="Shows how yearly kilometres translate into yearly energy demand."
            tooltip="Higher bars mean more kilometres driven. The line shows the matching charging demand in kWh after the current efficiency, winter, and charging-loss assumptions."
          >
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={yearly}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                <XAxis dataKey="year" />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`}
                />
                <RechartsTooltip
                  formatter={(value: unknown, name: string | number | undefined) => {
                    const numeric = typeof value === "number" ? value : Number(value ?? 0);
                    const label = typeof name === "string" ? name : String(name ?? "");
                    if (label === "Kilometres") {
                      return [`${formatNumber(numeric)} km`, label];
                    }
                    return [`${formatNumber(numeric)} kWh`, label];
                  }}
                  contentStyle={chartTooltipStyle}
                  labelStyle={chartTooltipLabelStyle}
                  itemStyle={chartTooltipItemStyle}
                />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="kmDriven"
                  fill="#60a5fa"
                  name="Kilometres"
                  radius={[8, 8, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="energyKwh"
                  stroke="#818cf8"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  name="Charging demand"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </TabsContent>

      <TabsContent value="sensitivity" className="mt-0">
        <ChartCard
          title="Sensitivity ranges"
          summary="Move one input at a time and see how much the final TCO shifts."
          tooltip="Each driver changes only one input while everything else stays fixed. Left means cheaper TCO. Right means more expensive TCO."
        >
          <div className="mb-3 grid gap-2 md:grid-cols-3">
            <CompactExplainTile title="Base case" text="Current TCO only." />
            <CompactExplainTile title="Lower shock" text="One-input downside." />
            <CompactExplainTile title="Higher shock" text="One-input upside." />
          </div>

          <Tabs
            value={activeSensitivityRow?.label}
            onValueChange={setActiveSensitivityLabel}
            className="gap-4"
          >
            <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-muted/60 p-1">
              {sensitivityRows.map((row) => {
                const spread = Math.abs(row.highValue - row.lowValue);
                return (
                  <TabsTrigger
                    key={row.label}
                    value={row.label}
                    className="flex-none rounded-lg px-3 py-2 text-left text-xs font-semibold"
                  >
                    <span>{row.label}</span>
                    <Badge variant="secondary" className="ml-2 rounded-full px-2 py-0.5 text-[10px]">
                      {formatCurrency(spread)}
                    </Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {activeSensitivityRow ? (
              <TabsContent value={activeSensitivityRow.label} className="mt-0">
                <SensitivityRangeRow
                  row={activeSensitivityRow}
                  maxDelta={sensitivityMaxDelta}
                  shockMax={sensitivityShockMax}
                  tweak={sensitivityTweaks[activeSensitivityRow.label]}
                  onTweakChange={(next) =>
                    setSensitivityTweaks((current) => ({
                      ...current,
                      [activeSensitivityRow.label]: next
                    }))
                  }
                />
              </TabsContent>
            ) : null}
          </Tabs>
        </ChartCard>
      </TabsContent>

      <TabsContent value="monte-carlo" className="mt-0">
        <ChartCard
          title="Monte Carlo range"
          summary="The same TCO model rerun many times with uncertainty in the main drivers."
          tooltip="The deterministic summary stays your main answer. Monte Carlo adds a probability range around it by varying uncertain inputs like tariffs, mileage, and resale."
        >
          {simulation ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_360px]">
            <div className="space-y-4">
              <Card className="rounded-[20px] bg-background">
                <CardHeader className="px-4 pt-4 pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm font-semibold tracking-[-0.02em] text-foreground">
                        Simulation runs
                      </CardTitle>
                      <CardDescription className="mt-1 text-sm leading-6">
                        More runs make the range smoother and more stable, but take longer to calculate.
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px]">
                      {deferredSimulationIterations.toLocaleString()} runs
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 p-4 pt-3">
                  <Tabs
                    value={String(simulationIterations)}
                    onValueChange={(value) => onSimulationIterationsChange(Number(value))}
                    className="gap-3"
                  >
                    <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-muted/60 p-1">
                      {monteCarloRunPresets.map((preset) => (
                        <TabsTrigger
                          key={preset}
                          value={String(preset)}
                          className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                        >
                          {preset.toLocaleString()}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      <span>Fine tune</span>
                      <span>{simulationIterations.toLocaleString()} runs</span>
                    </div>
                    <Slider
                      min={100}
                      max={5000}
                      step={100}
                      value={[simulationIterations]}
                      onValueChange={(values) =>
                        onSimulationIterationsChange(values[0] ?? simulationIterations)
                      }
                    />
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>100</span>
                      <span>5,000</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[20px] bg-background">
                <CardContent className="grid gap-3 p-3.5 md:grid-cols-3">
                  <MonteCarloExplainStat
                    label="P10"
                    value={formatCurrency(simulation.p10)}
                    text="Favorable side. About 1 run in 10 lands this low or lower."
                  />
                  <MonteCarloExplainStat
                    label="P50"
                    value={formatCurrency(simulation.p50)}
                    text="Midpoint. Half the simulated runs are lower and half are higher."
                  />
                  <MonteCarloExplainStat
                    label="P90"
                    value={formatCurrency(simulation.p90)}
                    text="Adverse side. About 1 run in 10 lands this high or higher."
                  />
                </CardContent>
              </Card>

              <Card className="rounded-[20px] bg-background">
                <CardHeader className="px-4 pt-4 pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm font-semibold tracking-[-0.02em] text-foreground">
                        Distribution
                      </CardTitle>
                      <CardDescription className="mt-1 text-sm leading-6">
                        Lower density on the far left and right means those outcomes happen less often.
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px]">
                      {simulation.samples.length.toLocaleString()} runs
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-3">
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={monteCarloCurve}>
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                      <XAxis dataKey="tco" tickFormatter={(value) => formatCurrency(Number(value))} />
                      <YAxis />
                      <RechartsTooltip
                        formatter={(value: unknown) =>
                          typeof value === "number" ? value.toFixed(0) : String(value ?? "")
                        }
                        labelFormatter={(label) => `TCO ${formatCurrency(Number(label))}`}
                        contentStyle={chartTooltipStyle}
                        labelStyle={chartTooltipLabelStyle}
                        itemStyle={chartTooltipItemStyle}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#818cf8"
                        fill="#818cf8"
                        fillOpacity={0.22}
                        strokeWidth={2.5}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card className="rounded-[20px] bg-background">
                <CardHeader className="px-4 pt-4 pb-0">
                  <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Range snapshot
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 p-4 md:grid-cols-2">
                  <RangeStat label="P10" value={formatCurrency(simulation.p10)} />
                  <RangeStat label="P50" value={formatCurrency(simulation.p50)} />
                  <RangeStat label="P90" value={formatCurrency(simulation.p90)} />
                  <RangeStat label="Mean" value={formatCurrency(simulation.mean)} />
                  <RangeStat label="Best case" value={formatCurrency(simulation.min)} />
                  <RangeStat label="Worst case" value={formatCurrency(simulation.max)} />
                </CardContent>
              </Card>

              <Card className="rounded-[20px] bg-background">
                <CardHeader className="px-4 pt-4 pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Main uncertainty drivers
                      </CardTitle>
                      <CardDescription className="mt-1 text-sm leading-6">
                        Ranked by correlation with the simulated TCO range.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 p-4">
                  {simulation.drivers.slice(0, 4).map((driver, index) => (
                    <MonteCarloDriverRow
                      key={driver.label}
                      rank={index + 1}
                      label={driver.label}
                      score={driver.score}
                      help={driverHelp[driver.label] ?? driver.label}
                    />
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
          ) : null}
        </ChartCard>
      </TabsContent>
    </Tabs>
  );
}

function ChartCard({
  title,
  summary,
  tooltip,
  className = "",
  children
}: {
  title: string;
  summary: string;
  tooltip: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={`flex h-full flex-col rounded-[24px] shadow-panel ${className}`}>
      <CardHeader className="flex-row items-start justify-between gap-3 px-4 pt-4 pb-0">
        <div className="space-y-1">
          <CardTitle className="text-sm font-semibold tracking-[-0.02em] text-foreground">
            {title}
          </CardTitle>
          <CardDescription className="text-sm leading-6">{summary}</CardDescription>
        </div>
        <InfoButton label={title} help={tooltip} />
      </CardHeader>
      <CardContent className="flex-1 p-4">{children}</CardContent>
    </Card>
  );
}

function RangeStat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-[16px] bg-card">
      <CardContent className="p-3.5">
        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </div>
        <div className="mt-2 text-lg font-bold tracking-[-0.02em] text-foreground">{value}</div>
      </CardContent>
    </Card>
  );
}

function MonteCarloExplainStat({
  label,
  value,
  text
}: {
  label: string;
  value: string;
  text: string;
}) {
  return (
    <Card className="rounded-[16px] bg-card">
      <CardContent className="p-3.5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </div>
        <div className="mt-1.5 text-lg font-bold tracking-[-0.02em] text-foreground">
          {value}
        </div>
        <div className="mt-1.5 text-sm leading-6 text-muted-foreground">{text}</div>
      </CardContent>
    </Card>
  );
}

function MonteCarloDriverRow({
  rank,
  label,
  score,
  help
}: {
  rank: number;
  label: string;
  score: number;
  help: string;
}) {
  return (
    <Card className="rounded-[16px] bg-card">
      <CardContent className="flex items-center justify-between gap-3 p-3.5">
        <div className="min-w-0 flex items-center gap-3">
          <Badge variant="outline" className="h-7 min-w-7 rounded-full px-0 text-[10px]">
            {rank}
          </Badge>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <span className="truncate">{label}</span>
              <InfoButton label={label} help={help} />
            </div>
          </div>
        </div>
        <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px]">
          corr {score.toFixed(2)}
        </Badge>
      </CardContent>
    </Card>
  );
}

function SensitivityRangeRow({
  row,
  maxDelta,
  shockMax,
  tweak,
  onTweakChange
}: {
  row: SensitivityPoint;
  maxDelta: number;
  shockMax: number;
  tweak: { lowPercent: number; highPercent: number };
  onTweakChange: (next: { lowPercent: number; highPercent: number }) => void;
}) {
  const lowerWidth = Math.min(48, (Math.abs(row.deltaLow) / maxDelta) * 48);
  const higherWidth = Math.min(48, (Math.abs(row.deltaHigh) / maxDelta) * 48);
  const spread = Math.abs(row.highValue - row.lowValue);

  return (
    <Card className="rounded-[20px] bg-background">
      <CardContent className="space-y-3.5 p-3.5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <span>{row.label}</span>
          <InfoButton label={row.label} help={sensitivityHelp[row.label] ?? row.label} />
        </div>
        <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px]">
          spread {formatCurrency(spread)}
        </Badge>
      </div>

      <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card px-3 py-2">
          <div>Lower input case</div>
          <div className="mt-1 font-semibold text-foreground">{formatCurrency(row.lowValue)}</div>
        </div>
        <div className="rounded-lg border border-border bg-card px-3 py-2">
          <div>Current base case</div>
          <div className="mt-1 font-semibold text-foreground">{formatCurrency(row.baseValue)}</div>
        </div>
        <div className="rounded-lg border border-border bg-card px-3 py-2">
          <div>Higher input case</div>
          <div className="mt-1 font-semibold text-foreground">{formatCurrency(row.highValue)}</div>
        </div>
      </div>

      <div className="rounded-[16px] border border-border bg-card px-3.5 py-3.5">
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <span>Cheaper</span>
          <span>More expensive</span>
        </div>
        <div className="relative mt-3 h-8 overflow-hidden rounded-full bg-muted">
          <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border" />
          <div
            className="absolute top-2 h-1.5 rounded-full bg-[#60a5fa]"
            style={
              row.deltaLow < 0
                ? { right: "50%", width: `${lowerWidth}%` }
                : { left: "50%", width: `${lowerWidth}%` }
            }
          />
          <div
            className="absolute bottom-2 h-1.5 rounded-full bg-[#f59e0b]"
            style={
              row.deltaHigh < 0
                ? { right: "50%", width: `${higherWidth}%` }
                : { left: "50%", width: `${higherWidth}%` }
            }
          />
          <div
            className="pointer-events-none absolute inset-y-0 flex items-center"
            style={{ left: "50%", transform: "translateX(-50%)" }}
          >
            <span className="h-5 w-2 rounded-full bg-white shadow-[0_0_0_2px_rgba(17,17,19,0.9)]" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-[#60a5fa]/15 px-3 py-1.5 font-semibold text-[#bfdbfe]">
          Lower input: {row.deltaLow < 0 ? "" : "+"}{formatCurrency(row.deltaLow)}
        </span>
        <span className="rounded-full bg-[#f59e0b]/15 px-3 py-1.5 font-semibold text-[#fde68a]">
          Higher input: {row.deltaHigh < 0 ? "" : "+"}{formatCurrency(row.deltaHigh)}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <SliderField
          label="Lower shock"
          value={tweak.lowPercent}
          max={shockMax}
          onChange={(value) => onTweakChange({ ...tweak, lowPercent: value })}
        />
        <SliderField
          label="Higher shock"
          value={tweak.highPercent}
          max={shockMax}
          onChange={(value) => onTweakChange({ ...tweak, highPercent: value })}
        />
      </div>
      </CardContent>
    </Card>
  );
}

function SliderField({
  label,
  max,
  value,
  onChange
}: {
  label: "Lower shock" | "Higher shock";
  max: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="rounded-[16px] border border-border bg-card px-3.5 py-3">
      <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>{label}</span>
          <InfoButton label={label} help={shockHelp[label]} />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[11px]">
            {value}%
          </Badge>
          <Badge variant="outline" className="rounded-full px-2 py-1 text-[10px]">
            max {max}%
          </Badge>
        </div>
      </div>
      <Slider
        className="mt-3"
        min={0}
        max={max}
        step={1}
        value={[value]}
        onValueChange={(next) => onChange(next[0] ?? 0)}
      />
    </label>
  );
}

function CompactExplainTile({ title, text }: { title: string; text: string }) {
  return (
    <Card className="rounded-[14px] bg-background">
      <CardContent className="p-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </div>
        <div className="mt-1.5 text-xs leading-5 text-muted-foreground">{text}</div>
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
          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-transparent text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          <CircleHelp className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-72 text-xs leading-5">{help}</TooltipContent>
    </Tooltip>
  );
}

function buildDistributionCurve(samples: number[]) {
  if (samples.length === 0) {
    return [];
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const bucketCount = Math.min(18, Math.max(8, Math.round(Math.sqrt(samples.length))));
  const bucketSize = Math.max((max - min) / bucketCount, 1);
  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    tco: min + bucketSize * index,
    count: 0
  }));

  sorted.forEach((sample) => {
    const index = Math.min(
      bucketCount - 1,
      Math.floor((sample - min) / bucketSize)
    );
    buckets[index].count += 1;
  });

  return buckets.map((bucket) => ({
    tco: roundToBucket(bucket.tco),
    count: bucket.count
  }));
}

function roundToBucket(value: number) {
  return Math.round(value / 100) * 100;
}
