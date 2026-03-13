import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fieldGroups } from "../app/field-config";
import type { FieldConfig } from "../app/field-config";
import { defaultSensitivityLevers } from "./calculator";
import { formatCurrency, formatNumber, formatPercent } from "./format";
import type {
  CaseMode,
  CategoryBreakdown,
  EstimatorResult,
  SavedScenario,
  SensitivityPoint
} from "./types";

const colors = {
  page: [255, 255, 255] as [number, number, number],
  surface: [255, 255, 255] as [number, number, number],
  surfaceAlt: [248, 250, 252] as [number, number, number],
  surfaceStrong: [239, 246, 255] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
  text: [15, 23, 42] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  primary: [37, 99, 235] as [number, number, number],
  primarySoft: [219, 234, 254] as [number, number, number]
};

const getValue = (scenario: SavedScenario, path: string) => {
  const [section, field] = path.split(".");
  return (scenario.input[section as keyof SavedScenario["input"]] as Record<string, unknown>)[
    field
  ];
};

const formatFieldValue = (field: FieldConfig, value: unknown) => {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    const suffix = "suffix" in field ? field.suffix : undefined;
    if (suffix === "%") {
      return formatPercent(value);
    }
    if (suffix) {
      return `${formatNumber(value)} ${suffix}`;
    }
    if (
      field.path.includes("Price") ||
      field.path.includes("Costs") ||
      field.path.includes("Premium") ||
      field.path.includes("Tariff")
    ) {
      return formatCurrency(value, value < 1);
    }
    if (field.path.includes("Km")) {
      return `${formatNumber(value)} km`;
    }
    if (field.path.includes("Years")) {
      return `${formatNumber(value)} years`;
    }
    if (field.path.includes("WeightKg")) {
      return `${formatNumber(value)} kg`;
    }
    if (field.path.includes("PowerKw")) {
      return `${formatNumber(value)} kW`;
    }
    return formatNumber(value);
  }
  return String(value ?? "");
};

const setTextColor = (doc: jsPDF, color: readonly [number, number, number]) => {
  doc.setTextColor(color[0], color[1], color[2]);
};

const setFillColor = (doc: jsPDF, color: readonly [number, number, number]) => {
  doc.setFillColor(color[0], color[1], color[2]);
};

const setDrawColor = (doc: jsPDF, color: readonly [number, number, number]) => {
  doc.setDrawColor(color[0], color[1], color[2]);
};

const paintPage = (doc: jsPDF) => {
  setFillColor(doc, colors.page);
  doc.rect(0, 0, 210, 297, "F");
};

const drawSurface = (
  doc: jsPDF,
  {
    x,
    y,
    w,
    h,
    fill = colors.surface,
    radius = 5,
    stroke = true
  }: {
    x: number;
    y: number;
    w: number;
    h: number;
    fill?: readonly [number, number, number];
    radius?: number;
    stroke?: boolean;
  }
) => {
  setFillColor(doc, fill);
  setDrawColor(doc, colors.border);
  doc.setLineWidth(0.35);
  doc.roundedRect(x, y, w, h, radius, radius, stroke ? "FD" : "F");
};

const drawPill = (
  doc: jsPDF,
  {
    x,
    y,
    text,
    fill = colors.surfaceAlt,
    color = colors.text,
    width
  }: {
    x: number;
    y: number;
    text: string;
    fill?: readonly [number, number, number];
    color?: readonly [number, number, number];
    width?: number;
  }
) => {
  const w = width ?? Math.max(24, text.length * 2.1 + 10);
  setFillColor(doc, fill);
  doc.roundedRect(x, y, w, 8, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  setTextColor(doc, color);
  doc.text(text.toUpperCase(), x + w / 2, y + 5.2, { align: "center" });
  return w;
};

const drawPageHeader = (
  doc: jsPDF,
  title: string,
  subtitle: string,
  pageTag?: string
) => {
  paintPage(doc);
  drawPill(doc, {
    x: 18,
    y: 14,
    text: "Austria EV TCO",
    fill: colors.primarySoft,
    color: colors.primary,
    width: 34
  });
  if (pageTag) {
    drawPill(doc, {
      x: 166,
      y: 14,
      text: pageTag,
      fill: colors.surfaceAlt,
      color: colors.muted,
      width: 24
    });
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  setTextColor(doc, colors.text);
  doc.text(title, 16, 31);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  setTextColor(doc, colors.muted);
  const subtitleLines = doc.splitTextToSize(subtitle, 178);
  doc.text(subtitleLines, 16, 38);
  const headerBottom = 38 + subtitleLines.length * 4.6;
  setDrawColor(doc, colors.border);
  doc.setLineWidth(0.35);
  doc.line(16, headerBottom + 4, 194, headerBottom + 4);
  return headerBottom + 10;
};

const drawSectionLabel = (doc: jsPDF, label: string, y: number) => {
  setTextColor(doc, colors.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.4);
  doc.text(label.toUpperCase(), 16, y);
};

const drawInfoBox = (
  doc: jsPDF,
  {
    x = 16,
    y,
    w = 178,
    title,
    body,
    fill = colors.surface
  }: {
    x?: number;
    y: number;
    w?: number;
    title: string;
    body: string;
    fill?: readonly [number, number, number];
  }
) => {
  const lines = doc.splitTextToSize(body, w - 10);
  const height = 13 + lines.length * 4.9;
  drawSurface(doc, { x, y, w, h: height, fill });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.6);
  setTextColor(doc, colors.text);
  doc.text(title, x + 5, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setTextColor(doc, colors.muted);
  doc.text(lines, x + 5, y + 12.5);
  return y + height;
};

const drawMetricCard = (
  doc: jsPDF,
  {
    x,
    y,
    w,
    label,
    value,
    strong = false
  }: {
    x: number;
    y: number;
    w: number;
    label: string;
    value: string;
    strong?: boolean;
  }
) => {
  drawSurface(doc, {
    x,
    y,
    w,
    h: 24,
    fill: strong ? colors.surfaceStrong : colors.surface
  });
  setFillColor(doc, strong ? colors.primary : colors.surfaceAlt);
  doc.roundedRect(x + 4, y + 4, strong ? 22 : 16, 3.2, 1.6, 1.6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  setTextColor(doc, colors.muted);
  doc.text(label.toUpperCase(), x + 4, y + 7);
  doc.setFontSize(strong ? 18 : 14);
  setTextColor(doc, colors.text);
  doc.text(value, x + 4, y + 17);
};

const drawMetricGrid = (doc: jsPDF, result: EstimatorResult, y: number) => {
  const metrics = [
    ["Total TCO", formatCurrency(result.metrics.totalTco), true],
    ["Monthly equivalent", formatCurrency(result.metrics.monthlyEquivalent), false],
    ["Annual equivalent", formatCurrency(result.metrics.annualEquivalent), false],
    ["Estimated resale", formatCurrency(result.metrics.estimatedResaleValue), false],
    ["Cash spent before resale", formatCurrency(result.metrics.totalCashOutflow), false],
    ["Cost per km", formatCurrency(result.metrics.costPerKm, true), false]
  ] as const;

  metrics.forEach(([label, value, strong], index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    drawMetricCard(doc, {
      x: 16 + col * 60,
      y: y + row * 30,
      w: 56,
      label,
      value,
      strong
    });
  });
};

const getTopBuckets = (breakdown: CategoryBreakdown) =>
  [
    ["Car and depreciation", breakdown.purchaseAndDepreciation],
    ["Insurance and tax", breakdown.insuranceAndTax],
    ["Parking", breakdown.parking],
    ["Charging", breakdown.charging]
  ]
    .map(([label, value]) => [label, value] as [string, number])
    .sort((a, b) => b[1] - a[1])
    .filter(([, value]) => value > 0);

const getTopSensitivity = (items: SensitivityPoint[]) =>
  [...items]
    .sort(
      (a, b) =>
        Math.max(Math.abs(b.deltaLow), Math.abs(b.deltaHigh)) -
        Math.max(Math.abs(a.deltaLow), Math.abs(a.deltaHigh))
    )
    .slice(0, 3);

const getSuggestions = (scenario: SavedScenario, result: EstimatorResult) => {
  const topBuckets = getTopBuckets(result.breakdown);
  const biggest = topBuckets[0]?.[0];
  const suggestions: string[] = [];

  if (biggest === "Car and depreciation") {
    suggestions.push(
      "Depreciation is the biggest driver here. If you want to materially improve TCO, challenge the resale assumption before fine-tuning smaller operating inputs."
    );
  }
  if (biggest === "Insurance and tax") {
    suggestions.push(
      "Insurance and tax are the biggest fixed drag in this scenario. A better quote or a flatter renewal path can move the outcome more than small efficiency tweaks."
    );
  }
  if (biggest === "Parking") {
    suggestions.push(
      "Parking is a major fixed cost. If your actual parking setup may change, this is one of the easiest levers to test because it does not depend on kilometres driven."
    );
  }
  if (result.breakdown.charging > result.breakdown.parking * 0.8) {
    suggestions.push(
      "Charging is a meaningful share of cost. Validate the AC/DC split and Supercharger share against your real routine, because those assumptions move the result more than minor consumption tweaks."
    );
  }

  const topSensitivity = getTopSensitivity(result.sensitivity)[0];
  if (topSensitivity) {
    suggestions.push(
      `The most sensitive single assumption in this scenario is "${topSensitivity.label}". Validate that input first before refining lower-impact fields.`
    );
  }

  if (scenario.input.purchase.ownershipYears >= 8) {
    suggestions.push(
      "Longer ownership makes recurring-cost inflation matter more. For long-hold scenarios, focus on insurance, parking, and charging inflation realism as much as the launch-year numbers."
    );
  }

  return suggestions.slice(0, 3);
};

const drawRecommendations = (
  doc: jsPDF,
  scenario: SavedScenario,
  result: EstimatorResult,
  y: number
) => {
  const suggestions = getSuggestions(scenario, result);
  drawSectionLabel(doc, "Suggestions", y);
  let currentY = y + 5;
  suggestions.forEach((item) => {
    currentY = drawInfoBox(doc, {
      y: currentY,
      title: "Recommendation",
      body: item,
      fill: colors.surfaceAlt
    }) + 4;
  });
  return currentY;
};

const addFooters = (doc: jsPDF) => {
  const pages = doc.getNumberOfPages();
  for (let index = 1; index <= pages; index += 1) {
    doc.setPage(index);
    setDrawColor(doc, colors.border);
    doc.line(16, 287, 194, 287);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setTextColor(doc, colors.muted);
    doc.text("Austria EV TCO", 16, 292);
    doc.text(`Page ${index} of ${pages}`, 194, 292, { align: "right" });
  }
};

const getTableTheme = () => ({
  theme: "grid" as const,
  margin: { left: 16, right: 16 },
  styles: {
    fontSize: 8.5,
    cellPadding: 2.8,
    lineColor: colors.border,
    lineWidth: 0.22,
    textColor: colors.text,
    fillColor: colors.surface
  },
  headStyles: {
    fillColor: colors.primarySoft,
    textColor: colors.text,
    fontStyle: "bold" as const,
    lineColor: colors.border,
    lineWidth: 0.22
  },
  bodyStyles: {
    fillColor: colors.surface,
    textColor: colors.text
  },
  alternateRowStyles: {
    fillColor: colors.surfaceAlt
  }
});

export const buildScenarioPdfDoc = ({
  scenario,
  result,
  caseMode
}: {
  scenario: SavedScenario;
  result: EstimatorResult;
  caseMode: CaseMode;
}) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const sensitivityShockMap = new Map<string, string>(
    defaultSensitivityLevers.map((lever) => [
      lever.label,
      `${formatPercent((1 - lever.lowFactor) * 100)} down / ${formatPercent(
        (lever.highFactor - 1) * 100
      )} up`
    ])
  );

  const firstPageStart = drawPageHeader(
    doc,
    "Austria EV TCO Report",
    `Generated ${new Date().toLocaleString("de-AT")} | ${scenario.input.purchase.ownershipYears}-year horizon | ${caseMode} case`,
    `${scenario.input.purchase.ownershipYears}Y`
  );

  drawSectionLabel(doc, "Executive summary", firstPageStart);
  drawMetricGrid(doc, result, firstPageStart + 6);
  let y = drawInfoBox(doc, {
    y: firstPageStart + 68,
    title: "How to read this report",
    body:
      "The headline TCO is the net ownership cost over the selected horizon after crediting the resale value at the end. The model assumes a cash purchase and keeps the active scope intentionally narrow so every visible input maps directly into the result."
  });
  y = drawInfoBox(doc, {
    y: y + 5,
    title: "What matters most in this scenario",
    body: getTopBuckets(result.breakdown)
      .slice(0, 3)
      .map(([label, value], index) => `${index + 1}. ${label}: ${formatCurrency(value)}`)
      .join("   ")
  });
  drawRecommendations(doc, scenario, result, y + 8);

  doc.addPage();
  let contentStart = drawPageHeader(
    doc,
    "Active assumptions",
    "Editable inputs used in the current scenario. The resale point is the same as the selected TCO horizon.",
    "Inputs"
  );
  let currentY = contentStart;
  fieldGroups.forEach((group, index) => {
    autoTable(doc, {
      ...getTableTheme(),
      startY: currentY,
      head: [[group.title, "Value"]],
      body: group.fields.map((field) => [
        field.label,
        formatFieldValue(field, getValue(scenario, field.path))
      ])
    });
    currentY =
      ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ??
        currentY) + 8;
    if (index < fieldGroups.length - 1 && currentY > 250) {
      doc.addPage();
      currentY = drawPageHeader(doc, "Active assumptions", "Continued", "Inputs");
    }
  });

  doc.addPage();
  contentStart = drawPageHeader(
    doc,
    "Tax view",
    "Austrian registration and motor-tax treatment shown in the same simplified scope as the app.",
    "Tax"
  );
  const taxIntroBottom = drawInfoBox(doc, {
    y: contentStart,
    title: "Interpretation",
    body:
      "Registration is treated as the only one-off initial fee in the active model. The motorbezogene Versicherungssteuer is derived from the 30-minute power and vehicle mass, and is shown separately even when your insurance quote already includes it."
  });
  autoTable(doc, {
    ...getTableTheme(),
    startY: taxIntroBottom + 8,
    head: [["Initial item", "Value"]],
    body: [
      ["Registration fees", formatCurrency(result.taxes.initial.registrationFees)],
      ["Initial fees total", formatCurrency(result.taxes.initial.totalInitialTaxesAndFees)]
    ]
  });
  autoTable(doc, {
    ...getTableTheme(),
    startY:
      ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 58) + 8,
    head: [["Ongoing tax and insurance split", "Value"]],
    body: [
      [
        "Insurance premium gross / year",
        formatCurrency(result.taxes.ongoing.insurancePremiumGrossAnnual)
      ],
      [
        "Insurance premium net of motor tax / year",
        formatCurrency(result.taxes.ongoing.insurancePremiumNetOfMotorTaxAnnual)
      ],
      ["Motor tax / month", formatCurrency(result.taxes.ongoing.motorTaxMonthly, true)],
      ["Motor tax / year", formatCurrency(result.taxes.ongoing.motorTaxAnnual)],
      ["Motor tax over horizon", formatCurrency(result.taxes.ongoing.horizonMotorTaxTotal)]
    ]
  });
  autoTable(doc, {
    ...getTableTheme(),
    startY:
      ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 120) + 8,
    head: [["Formula", "Expression", "Meaning"]],
    body: result.taxes.formulas.map((item) => [item.label, item.expression, item.value]),
    styles: {
      ...getTableTheme().styles,
      fontSize: 8.4,
      cellPadding: 2.6
    }
  });

  doc.addPage();
  contentStart = drawPageHeader(
    doc,
    "Cost path",
    "Year-by-year build-up of ownership cost across the selected horizon.",
    "Timeline"
  );
  const timelineIntroBottom = drawInfoBox(doc, {
    y: contentStart,
    title: "Interpretation",
    body:
      "The yearly path helps validate whether costs rise in the way you expect. Purchase and depreciation are front-loaded, while insurance, parking, and charging build through recurring annual spend and inflation."
  });
  autoTable(doc, {
    ...getTableTheme(),
    startY: timelineIntroBottom + 8,
    head: [["Year", "Purchase", "Insurance", "Parking", "Charging", "Total", "Cumulative"]],
    body: result.yearly.map((row) => [
      row.year,
      formatCurrency(row.purchaseAndDepreciation),
      formatCurrency(row.insuranceAndTax),
      formatCurrency(row.parking),
      formatCurrency(row.charging),
      formatCurrency(row.total),
      formatCurrency(row.cumulative)
    ]),
    styles: {
      ...getTableTheme().styles,
      fontSize: 8.4,
      cellPadding: 2.5
    }
  });
  autoTable(doc, {
    ...getTableTheme(),
    startY:
      ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 130) + 10,
    head: [["Cost bucket", "Total over horizon", "Why it matters"]],
    body: [
      [
        "Car and depreciation",
        formatCurrency(result.breakdown.purchaseAndDepreciation),
        "This is the ownership cost of tying the purchase price to the resale value at the end of the horizon."
      ],
      [
        "Insurance and tax",
        formatCurrency(result.breakdown.insuranceAndTax),
        "This combines the net insurance premium and the derived motor tax."
      ],
      [
        "Parking",
        formatCurrency(result.breakdown.parking),
        "This includes private parking plus the resident permit when enabled."
      ],
      [
        "Charging",
        formatCurrency(result.breakdown.charging),
        "This is driven by kilometres, consumption, charging losses, winter penalty, AC/DC split, tariffs, and charging-price inflation."
      ]
    ]
  });

  doc.addPage();
  contentStart = drawPageHeader(
    doc,
    "Sensitivity and uncertainty",
    "A quick guide to which assumptions matter most and how wide the modeled range is.",
    "Risk"
  );
  const riskIntroBottom = drawInfoBox(doc, {
    y: contentStart,
    title: "How to read sensitivity",
    body:
      "Each sensitivity row changes one input at a time while leaving everything else fixed. Use it to identify the assumptions that move TCO the most, not to forecast a combined best or worst case."
  });
  autoTable(doc, {
    ...getTableTheme(),
    startY: riskIntroBottom + 8,
    head: [["Variable", "Low case", "Base", "High case", "Applied shock"]],
    body: result.sensitivity.map((item) => [
      item.label,
      formatCurrency(item.lowValue),
      formatCurrency(item.baseValue),
      formatCurrency(item.highValue),
      sensitivityShockMap.get(item.label) ?? "Custom"
    ])
  });
  autoTable(doc, {
    ...getTableTheme(),
    startY:
      ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 120) + 10,
    head: [["Monte Carlo summary", "Value", "Interpretation"]],
    body: [
      [
        "P10",
        formatCurrency(result.simulation.p10),
        "A relatively favorable outcome. Only about 1 run in 10 lands this low or lower."
      ],
      ["P50", formatCurrency(result.simulation.p50), "The midpoint of the simulated range."],
      [
        "P90",
        formatCurrency(result.simulation.p90),
        "A relatively adverse outcome. Only about 1 run in 10 lands this high or higher."
      ],
      ["Mean", formatCurrency(result.simulation.mean), "Average outcome across all simulation runs."],
      ["Best case", formatCurrency(result.simulation.min), "Lowest simulated outcome in this run set."],
      ["Worst case", formatCurrency(result.simulation.max), "Highest simulated outcome in this run set."]
    ]
  });

  doc.addPage();
  contentStart = drawPageHeader(
    doc,
    "Model notes and suggestions",
    "Final interpretation notes for validating the scenario.",
    "Notes"
  );
  let finalY = drawInfoBox(doc, {
    y: contentStart,
    title: "Scope note",
    body:
      "This report intentionally focuses on purchase and resale, insurance and tax, parking, and charging. It does not currently include maintenance, repairs, vignette, or other recurring extras."
  });
  finalY = drawInfoBox(doc, {
    y: finalY + 6,
    title: "Austria note",
    body:
      "The model treats the entered car price as VAT-included, uses the registration fee as the only initial fee in active scope, and derives the motorbezogene Versicherungssteuer from the vehicle power and mass."
  });
  finalY = drawRecommendations(doc, scenario, result, finalY + 8);
  drawInfoBox(doc, {
    y: finalY + 4,
    title: "Practical validation checklist",
    body:
      "Before relying on the final TCO, validate four things: the insurance quote net of tax, the parking setup you really expect to pay for, the public charging tariffs you will actually use, and the resale percentage you believe is realistic for the chosen horizon."
  });

  addFooters(doc);
  return doc;
};

export const exportScenarioPdf = ({
  scenario,
  result,
  caseMode
}: {
  scenario: SavedScenario;
  result: EstimatorResult;
  caseMode: CaseMode;
}) => {
  const doc = buildScenarioPdfDoc({ scenario, result, caseMode });
  doc.save("austria-ev-tco-report.pdf");
};
