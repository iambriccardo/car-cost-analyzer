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
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { type ReactNode, useMemo, useState } from "react";
import { CircleHelp } from "lucide-react";
import { categoryLabels, formatCurrency, formatNumber } from "../lib/format";
import type {
  CaseMode,
  CategoryBreakdown,
  EstimatorInput,
  SensitivityPoint,
  SimulationSummary,
  YearlyCostRow
} from "../lib/types";
import { Tooltip as InfoTooltip } from "./Tooltip";
import { calculateSensitivity, defaultSensitivityLevers } from "../lib/calculator";

const colors = [
  "#328f7a",
  "#e6b35a",
  "#eab7a0",
  "#5c7cfa",
  "#48bfe3",
  "#6c757d",
  "#f77f00",
  "#8d99ae",
  "#95d5b2"
];

const chartTooltipStyle = {
  backgroundColor: "#020617",
  border: "1px solid rgba(148, 163, 184, 0.28)",
  borderRadius: "16px",
  boxShadow: "0 20px 50px rgba(2, 6, 23, 0.55)"
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
  simulation: SimulationSummary;
};

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

export function ChartsPanel({ input, caseMode, yearly, breakdown, simulation }: Props) {
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
    () => calculateSensitivity(input, caseMode),
    [caseMode, input]
  );
  const sensitivity = useMemo(
    () =>
      calculateSensitivity(
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
      ),
    [caseMode, input, sensitivityTweaks]
  );
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
  const monteCarloCurve = buildDistributionCurve(simulation.samples);
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
    <div className="grid gap-6 xl:grid-cols-2">
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
            <Tooltip
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
            <Tooltip
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

      <ChartCard
        title="Category breakdown"
        summary="Switch between share of total TCO and average monthly impact by cost bucket."
        tooltip="Use Share to understand composition of total cost. Use Monthly to see how much each bucket contributes to the average monthly ownership cost."
        className="xl:self-start xl:min-h-[640px]"
      >
        <div className="mb-4 inline-flex rounded-full bg-white/6 p-1">
          <button
            type="button"
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              categoryView === "share" ? "bg-white text-ink-900" : "text-white/70"
            }`}
            onClick={() => setCategoryView("share")}
          >
            Share
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              categoryView === "monthly" ? "bg-white text-ink-900" : "text-white/70"
            }`}
            onClick={() => setCategoryView("monthly")}
          >
            Monthly
          </button>
        </div>
        {categoryView === "share" ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={donutData} dataKey="value" innerRadius={60} outerRadius={110}>
                {donutData.map((entry, index) => (
                  <Cell key={entry.name} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={tooltipFormatter}
                contentStyle={chartTooltipStyle}
                labelStyle={chartTooltipLabelStyle}
                itemStyle={chartTooltipItemStyle}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="space-y-3">
            {monthlyCategoryData.map((item, index) => {
              const maxValue = monthlyCategoryData[0]?.value ?? 1;
              const width = (item.value / maxValue) * 100;
              return (
                <div key={item.name} className="rounded-2xl bg-white/4 px-4 py-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-white/72">{item.name}</span>
                    <span className="font-semibold text-white">
                      {formatCurrency(item.value)}/month
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(6, width)}%`,
                        backgroundColor: colors[index % colors.length]
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ChartCard>

      <ChartCard
        title="Distance and charging demand"
        summary="Shows how yearly kilometres translate into yearly energy demand."
        tooltip="Higher bars mean more kilometres driven. The line shows the matching charging demand in kWh after the current efficiency, winter, and charging-loss assumptions."
        className="xl:self-start xl:min-h-[640px]"
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
            <Tooltip
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
              fill="#328f7a"
              name="Kilometres"
              radius={[8, 8, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="energyKwh"
              stroke="#e6b35a"
              strokeWidth={3}
              dot={{ r: 4 }}
              name="Charging demand"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Sensitivity ranges"
        summary="Shows how the main TCO result changes if you move one input up or down while leaving everything else unchanged."
        tooltip="Each row is centered on the current base case. Bars to the left reduce TCO, which is better. Bars to the right increase TCO, which is worse. Longer bars mean the variable matters more."
        className="xl:col-span-2"
      >
        <div className="mb-4 rounded-2xl bg-white/4 px-4 py-3 text-sm leading-6 text-white/68">
          The summary above the charts is the exact result from your current inputs. Sensitivity does not replace that result. It asks one simpler question: if one input moves within a practical downside and upside range while everything else stays fixed, how much does the final TCO change?
        </div>
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <ExplainTile
            title="Center marker"
            text="Your current TCO with the exact values you entered."
          />
          <ExplainTile
            title="Left side"
            text="Cheaper total ownership cost. More left is better."
          />
          <ExplainTile
            title="Right side"
            text="More expensive total ownership cost. More right is worse."
          />
        </div>
        <div className="mb-4 rounded-2xl bg-white/4 px-4 py-3 text-sm leading-6 text-white/68">
          Use the sliders on each row to change the downside and upside shock. Example: setting insurance to `-8% / +20%` means the chart will recalculate TCO once with insurance `8%` lower and once with insurance `20%` higher, while everything else stays unchanged.
        </div>
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
          Choose driver
        </div>
        <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {sensitivityRows.map((row) => {
            const isActive = row.label === activeSensitivityRow?.label;
            const spread = Math.abs(row.highValue - row.lowValue);
            return (
              <button
                key={row.label}
                type="button"
                className={`rounded-[20px] border px-4 py-3 text-left transition ${
                  isActive
                    ? "border-accent-300/60 bg-accent-400/18 text-white shadow-[inset_0_0_0_1px_rgba(141,211,190,0.12)]"
                    : "border-white/10 bg-white/4 text-white/72 hover:bg-white/6"
                }`}
                onClick={() => setActiveSensitivityLabel(row.label)}
              >
                <div className="text-sm font-semibold">{row.label}</div>
                <div className="mt-2 text-[11px] uppercase tracking-[0.14em] text-white/45">
                  spread {formatCurrency(spread)}
                </div>
              </button>
            );
          })}
        </div>
        <div className="rounded-[28px] border border-white/10 bg-white/3 p-1.5">
          {activeSensitivityRow ? (
            <SensitivityRangeRow
              row={activeSensitivityRow}
              maxDelta={sensitivityMaxDelta}
              tweak={sensitivityTweaks[activeSensitivityRow.label]}
              onTweakChange={(next) =>
                setSensitivityTweaks((current) => ({
                  ...current,
                  [activeSensitivityRow.label]: next
                }))
              }
            />
          ) : null}
        </div>
      </ChartCard>

      <ChartCard
        title="Monte Carlo range"
        summary="Distribution of possible TCO outcomes."
        tooltip="Lower values are better. P10 is a relatively favorable outcome, P50 is the midpoint, and P90 is a relatively adverse outcome."
        className="xl:col-span-2"
      >
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="mb-4 rounded-2xl bg-white/4 px-4 py-3 text-sm leading-6 text-white/68">
              The summary at the top is the exact base-case answer from your current inputs. Monte Carlo keeps the same model, then reruns it many times with realistic variation in uncertain inputs like resale, mileage, and charging prices. Use it to see the range around your base case, not to replace it.
            </div>
            <div className="mb-4 grid gap-3 md:grid-cols-3">
              <ExplainTile
                title="P10"
                text="A relatively favorable outcome. Only about 1 run in 10 ends up this cheap or cheaper."
              />
              <ExplainTile
                title="P50"
                text="The middle outcome. About half of the runs end up lower and half higher."
              />
              <ExplainTile
                title="P90"
                text="A relatively adverse outcome. Only about 1 run in 10 ends up this expensive or worse."
              />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monteCarloCurve}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                <XAxis dataKey="tco" tickFormatter={(value) => formatCurrency(Number(value))} />
                <YAxis />
                <Tooltip
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
                  stroke="#48bfe3"
                  fill="#48bfe3"
                  fillOpacity={0.22}
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-2">
              <RangeStat label="P10" value={formatCurrency(simulation.p10)} />
              <RangeStat label="P50" value={formatCurrency(simulation.p50)} />
              <RangeStat label="P90" value={formatCurrency(simulation.p90)} />
              <RangeStat label="Mean" value={formatCurrency(simulation.mean)} />
              <RangeStat label="Best case" value={formatCurrency(simulation.min)} />
              <RangeStat label="Worst case" value={formatCurrency(simulation.max)} />
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/4 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-white/50">
                Main Monte Carlo drivers
              </div>
              <div className="mt-3 space-y-2">
                {simulation.drivers.slice(0, 4).map((driver) => (
                  <div
                    key={driver.label}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-white/6 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2 text-sm text-white/68">
                      <span>{driver.label}</span>
                      <InfoTooltip content={driverHelp[driver.label] ?? driver.label} widthClass="w-64">
                        <button
                          type="button"
                          aria-label={`Explain ${driver.label}`}
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/8 text-white/60 transition hover:bg-white/12 hover:text-white focus:bg-white/12 focus:text-white"
                        >
                          <CircleHelp className="h-3.5 w-3.5" />
                        </button>
                      </InfoTooltip>
                    </div>
                    <span className="rounded-full bg-accent-900/40 px-3 py-1.5 text-xs font-semibold text-accent-100">
                      corr {driver.score.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ChartCard>

    </div>
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
    <div
      className={`flex h-full flex-col rounded-[32px] border border-white/10 bg-white/5 p-5 shadow-panel backdrop-blur ${className}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-white/60">
            {title}
          </div>
          <div className="mt-1 text-sm text-white/68">{summary}</div>
        </div>
        <InfoTooltip content={tooltip} widthClass="w-72">
          <button
            type="button"
            aria-label={`Explain ${title}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/8 text-white/60 transition hover:bg-white/12 hover:text-white focus:bg-white/12 focus:text-white"
          >
            <CircleHelp className="h-4 w-4" />
          </button>
        </InfoTooltip>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function RangeStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/4 px-4 py-4">
      <div className="text-xs uppercase tracking-[0.14em] text-white/50">
        {label}
      </div>
      <div className="mt-2 text-lg font-bold text-white">{value}</div>
    </div>
  );
}

function ExplainTile({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
        {title}
      </div>
      <div className="mt-2 text-sm leading-6 text-white/70">{text}</div>
    </div>
  );
}

function SensitivityRangeRow({
  row,
  maxDelta,
  tweak,
  onTweakChange
}: {
  row: SensitivityPoint;
  maxDelta: number;
  tweak: { lowPercent: number; highPercent: number };
  onTweakChange: (next: { lowPercent: number; highPercent: number }) => void;
}) {
  const lowerWidth = Math.min(48, (Math.abs(row.deltaLow) / maxDelta) * 48);
  const higherWidth = Math.min(48, (Math.abs(row.deltaHigh) / maxDelta) * 48);
  const spread = Math.abs(row.highValue - row.lowValue);

  return (
    <div className="rounded-[24px] border border-white/10 bg-white/4 p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 font-semibold text-white">
          <span>{row.label}</span>
          <InfoTooltip content={sensitivityHelp[row.label] ?? row.label} widthClass="w-64">
            <button
              type="button"
              aria-label={`Explain ${row.label}`}
              className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/8 text-white/60 transition hover:bg-white/12 hover:text-white focus:bg-white/12 focus:text-white"
            >
              <CircleHelp className="h-3.5 w-3.5" />
            </button>
          </InfoTooltip>
        </div>
        <div className="text-xs text-white/55">
          spread {formatCurrency(spread)}
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-xs text-white/62 sm:grid-cols-3">
        <div className="rounded-2xl bg-white/6 px-3 py-2">
          <div>Lower input case</div>
          <div className="mt-1 font-semibold text-white">{formatCurrency(row.lowValue)}</div>
        </div>
        <div className="rounded-2xl bg-white/6 px-3 py-2">
          <div>Current base case</div>
          <div className="mt-1 font-semibold text-white">{formatCurrency(row.baseValue)}</div>
        </div>
        <div className="rounded-2xl bg-white/6 px-3 py-2">
          <div>Higher input case</div>
          <div className="mt-1 font-semibold text-white">{formatCurrency(row.highValue)}</div>
        </div>
      </div>

      <div className="mt-4 rounded-[22px] bg-white/6 px-4 py-4">
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
          <span>Cheaper TCO</span>
          <span>More expensive TCO</span>
        </div>
        <div className="relative mt-4 h-10 overflow-hidden rounded-full bg-white/8">
          <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/30" />
          <div
            className="absolute top-2.5 h-2 rounded-full bg-[#95d5b2]"
            style={
              row.deltaLow < 0
                ? { right: "50%", width: `${lowerWidth}%` }
                : { left: "50%", width: `${lowerWidth}%` }
            }
          />
          <div
            className="absolute bottom-2.5 h-2 rounded-full bg-[#e6b35a]"
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
            <span className="h-6 w-2 rounded-full bg-white shadow-[0_0_0_2px_rgba(13,20,28,0.9)]" />
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-[#95d5b2]/15 px-3 py-1.5 font-semibold text-[#b8f0d6]">
          Lower input: {row.deltaLow < 0 ? "" : "+"}{formatCurrency(row.deltaLow)}
        </span>
        <span className="rounded-full bg-[#eab7a0]/15 px-3 py-1.5 font-semibold text-[#ffd7c7]">
          Higher input: {row.deltaHigh < 0 ? "" : "+"}{formatCurrency(row.deltaHigh)}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <SliderField
          label="Lower shock"
          value={tweak.lowPercent}
          onChange={(value) => onTweakChange({ ...tweak, lowPercent: value })}
        />
        <SliderField
          label="Higher shock"
          value={tweak.highPercent}
          onChange={(value) => onTweakChange({ ...tweak, highPercent: value })}
        />
      </div>
    </div>
  );
}

function SliderField({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="rounded-2xl bg-white/4 px-4 py-3">
      <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
        <span>{label}</span>
        <span className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] text-white/75">
          {value}%
        </span>
      </div>
      <input
        className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#48bfe3]"
        type="range"
        min={0}
        max={35}
        step={1}
        value={value}
        onChange={(event) => onChange(event.target.valueAsNumber || 0)}
      />
    </label>
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
