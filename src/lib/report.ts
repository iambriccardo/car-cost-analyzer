import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fieldGroups } from "../app/field-config";
import type { FieldConfig } from "../app/field-config";
import { austriaSources } from "./austria-sources";
import { defaultSensitivityLevers } from "./calculator";
import { formatCurrency, formatNumber, formatPercent } from "./format";
import type { CaseMode, EstimatorResult, SavedScenario } from "./types";

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
      field.path.includes("Tariff") ||
      field.path.includes("payment") ||
      field.path.includes("Cost")
    ) {
      return formatCurrency(value, value < 1);
    }
    if (field.path.includes("Km")) {
      return `${formatNumber(value)} km`;
    }
    if (field.path.includes("Years") || field.path.includes("Year")) {
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

const addSectionTitle = (doc: jsPDF, title: string, y: number) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(23, 32, 44);
  doc.text(title, 16, y);
};

const addMetricGrid = (doc: jsPDF, result: EstimatorResult, y: number) => {
  const metrics = [
    ["Total TCO", formatCurrency(result.metrics.totalTco)],
    ["Monthly", formatCurrency(result.metrics.monthlyEquivalent)],
    ["Annual", formatCurrency(result.metrics.annualEquivalent)],
    ["Resale", formatCurrency(result.metrics.estimatedResaleValue)],
    ["Cash outflow", formatCurrency(result.metrics.totalCashOutflow)],
    ["Cost per km", formatCurrency(result.metrics.costPerKm, true)]
  ];

  metrics.forEach(([label, value], index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = 16 + col * 62;
    const boxY = y + row * 24;
    doc.setFillColor(244, 248, 251);
    doc.roundedRect(x, boxY, 56, 18, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(79, 100, 127);
    doc.text(label, x + 4, boxY + 6);
    doc.setFontSize(12);
    doc.setTextColor(23, 32, 44);
    doc.text(value, x + 4, boxY + 13);
  });
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
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const sensitivityShockMap = new Map<string, string>(
    defaultSensitivityLevers.map((lever) => [
      lever.label,
      `${formatPercent((1 - lever.lowFactor) * 100)} down / ${formatPercent(
        (lever.highFactor - 1) * 100
      )} up`
    ])
  );

  doc.setFillColor(23, 32, 44);
  doc.rect(0, 0, 210, 55, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("Vienna EV TCO Report", 16, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `Generated ${new Date().toLocaleString("de-AT")} | Case: ${caseMode} | ${scenario.input.purchase.ownershipYears}-year horizon`,
    16,
    31
  );
  doc.text(
    "Local validation report for cash purchase, insurance, parking, driving, charging, and resale assumptions.",
    16,
    38
  );

  addSectionTitle(doc, "Headline summary", 61);
  addMetricGrid(doc, result, 67);

  addSectionTitle(doc, "Model scope", 130);
  autoTable(doc, {
    startY: 135,
    theme: "grid",
    head: [["Included", "Excluded for now"]],
    body: [[
      "Cash purchase, registration, resale, insurance, parking, driving usage, public charging, Austrian EV motor tax split, sensitivity, Monte Carlo.",
      "Financing, maintenance, repairs, and other recurring costs are intentionally excluded from the active model."
    ]],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [50, 143, 122] }
  });

  addSectionTitle(doc, "Active assumptions", (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ? (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable!.finalY + 10 : 165);
  let currentY = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 165) + 14;

  fieldGroups.forEach((group, index) => {
    autoTable(doc, {
      startY: currentY,
      theme: "striped",
      head: [[group.title, "Value"]],
      body: group.fields.map((field) => [
        field.label,
        formatFieldValue(field, getValue(scenario, field.path))
      ]),
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      headStyles: { fillColor: [38, 115, 100] }
    });
    currentY = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentY) + 8;
    if (index < fieldGroups.length - 1 && currentY > 250) {
      doc.addPage();
      currentY = 20;
    }
  });

  doc.addPage();
  addSectionTitle(doc, "Tax detail", 18);
  autoTable(doc, {
    startY: 24,
    theme: "grid",
    head: [["Initial taxes and fees", "Value"]],
    body: [
      ["Registration fees", formatCurrency(result.taxes.initial.registrationFees)],
      ["Initial taxes + fees total", formatCurrency(result.taxes.initial.totalInitialTaxesAndFees)]
    ],
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: [50, 143, 122] }
  });

  autoTable(doc, {
    startY: ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 90) + 8,
    theme: "grid",
    head: [["Ongoing taxes", "Value"]],
    body: [
      ["Insurance premium gross / year", formatCurrency(result.taxes.ongoing.insurancePremiumGrossAnnual)],
      ["Insurance premium net of motor tax / year", formatCurrency(result.taxes.ongoing.insurancePremiumNetOfMotorTaxAnnual)],
      ["Motor tax / month", formatCurrency(result.taxes.ongoing.motorTaxMonthly, true)],
      ["Motor tax / year", formatCurrency(result.taxes.ongoing.motorTaxAnnual)],
      ["Motor tax over horizon", formatCurrency(result.taxes.ongoing.horizonMotorTaxTotal)]
    ],
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: [23, 32, 44] }
  });

  autoTable(doc, {
    startY: ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 150) + 8,
    theme: "striped",
    head: [["Formula", "Expression", "Value"]],
    body: result.taxes.formulas.map((item) => [item.label, item.expression, item.value]),
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [50, 143, 122] }
  });

  doc.addPage();
  addSectionTitle(doc, "Yearly cost path", 18);
  autoTable(doc, {
    startY: 24,
    theme: "grid",
    head: [[
      "Year",
      "Purchase",
      "Insurance",
      "Parking",
      "Charging",
      "Total",
      "Cumulative"
    ]],
    body: result.yearly.map((row) => [
      row.year,
      formatCurrency(row.purchaseAndDepreciation),
      formatCurrency(row.insuranceAndTax),
      formatCurrency(row.parking),
      formatCurrency(row.charging),
      formatCurrency(row.total),
      formatCurrency(row.cumulative)
    ]),
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: [23, 32, 44] }
  });

  addSectionTitle(doc, "Sensitivity and uncertainty", ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 80) + 10);
  autoTable(doc, {
    startY: ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 80) + 16,
    theme: "striped",
    head: [["Variable", "Low case", "Base", "High case", "Applied input shock"]],
    body: result.sensitivity.map((item) => [
      item.label,
      formatCurrency(item.lowValue),
      formatCurrency(item.baseValue),
      formatCurrency(item.highValue),
      sensitivityShockMap.get(item.label) ?? "Custom"
    ]),
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: [50, 143, 122] }
  });

  autoTable(doc, {
    startY: ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 160) + 10,
    theme: "grid",
    head: [["Monte Carlo", "Value"]],
    body: [
      ["P10", formatCurrency(result.simulation.p10)],
      ["P50", formatCurrency(result.simulation.p50)],
      ["P90", formatCurrency(result.simulation.p90)],
      ["Mean", formatCurrency(result.simulation.mean)],
      ["Best case", formatCurrency(result.simulation.min)],
      ["Worst case", formatCurrency(result.simulation.max)]
    ],
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: [23, 32, 44] }
  });

  doc.addPage();
  addSectionTitle(doc, "Austrian validation notes", 18);
  autoTable(doc, {
    startY: 24,
    theme: "striped",
    head: [["Model note", "Applied rule"]],
    body: [
      [
        "Cash purchase",
        "The active model assumes full cash purchase. Financing costs are excluded by design."
      ],
      [
        "Motorbezogene Versicherungssteuer",
        `Derived from 30-minute power and mass. Current Tesla default cross-checks to EUR 389.52/year.`
      ],
      [
        "Insurance handling",
        "If the entered premium already includes motor tax, the report subtracts the derived tax from the premium and still shows it as an included statutory component."
      ],
      [
        "Charging prices",
        "Public charging tariffs remain user inputs because they are market prices, not fixed Austrian statutory values."
      ]
    ],
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: [50, 143, 122] }
  });

  autoTable(doc, {
    startY: ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 110) + 10,
    theme: "grid",
    head: [["Source", "Why it is used"]],
    body: austriaSources.map((source) => [source.url, source.note]),
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [23, 32, 44] }
  });

  const filename = "vienna-ev-tco-report.pdf";
  doc.save(filename);
};
