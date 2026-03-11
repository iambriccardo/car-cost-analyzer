const currencyFormatter = new Intl.NumberFormat("de-AT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0
});

const currencyFormatterPrecise = new Intl.NumberFormat("de-AT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const percentFormatter = new Intl.NumberFormat("de-AT", {
  maximumFractionDigits: 1
});

const decimalFormatter = new Intl.NumberFormat("de-AT", {
  maximumFractionDigits: 1
});

export const formatCurrency = (value: number, precise = false) =>
  (precise ? currencyFormatterPrecise : currencyFormatter).format(value);

export const formatPercent = (value: number) => `${percentFormatter.format(value)}%`;

export const formatNumber = (value: number, suffix = "") =>
  `${decimalFormatter.format(value)}${suffix}`;

export const categoryLabels: Record<string, string> = {
  purchaseAndDepreciation: "Purchase & depreciation",
  financing: "Financing",
  insuranceAndTax: "Insurance & taxes",
  parking: "Parking",
  charging: "Charging",
  maintenance: "Maintenance",
  tires: "Tires",
  repairsAndContingencies: "Repairs & contingencies",
  otherCosts: "Other costs"
};
