export const percentToDecimal = (value: number) => value / 100;

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const roundCurrency = (value: number) => Math.round(value * 100) / 100;

export const annualizeIntervalCost = (
  intervalMonths: number,
  itemCost: number,
  multiplier = 1
) => (12 / intervalMonths) * itemCost * multiplier;

export const annuityPayment = (
  principal: number,
  annualRate: number,
  months: number
) => {
  if (principal <= 0 || months <= 0) {
    return 0;
  }

  const monthlyRate = annualRate / 12;
  if (monthlyRate === 0) {
    return principal / months;
  }

  return (
    (principal * monthlyRate * (1 + monthlyRate) ** months) /
    ((1 + monthlyRate) ** months - 1)
  );
};

export const sum = (values: number[]) =>
  values.reduce((total, value) => total + value, 0);

export const average = (values: number[]) =>
  values.length === 0 ? 0 : sum(values) / values.length;

export const percentile = (values: number[], p: number) => {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) {
    return sorted[lower];
  }

  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
};

export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const downloadFile = (filename: string, text: string, mime: string) => {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const readJsonFile = async <T>(file: File) => {
  const text = await file.text();
  return JSON.parse(text) as T;
};

export const weightedAverage = (
  items: Array<{ weight: number; value: number }>
) => {
  const totalWeight = sum(items.map((item) => item.weight));
  if (totalWeight === 0) {
    return 0;
  }
  return sum(items.map((item) => item.weight * item.value)) / totalWeight;
};
