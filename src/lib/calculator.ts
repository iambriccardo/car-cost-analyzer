import { defaultInput } from "./defaults";
import type {
  CaseMode,
  CategoryBreakdown,
  EstimatorInput,
  EstimatorResult,
  SensitivityPoint,
  SimulationSummary,
  YearlyCostRow
} from "./types";
import {
  average,
  clamp,
  percentToDecimal,
  percentile,
  roundCurrency,
  sum,
  weightedAverage
} from "./utils";

export const defaultSensitivityLevers = [
  {
    label: "Fast-charging price (DC)",
    path: "charging.dcTariff",
    lowFactor: 0.9,
    highFactor: 1.2
  },
  {
    label: "Annual distance driven",
    path: "driving.monthlyKm",
    lowFactor: 0.85,
    highFactor: 1.2
  },
  {
    label: "Insurance premium",
    path: "insurance.monthlyPremium",
    lowFactor: 0.95,
    highFactor: 1.15
  },
  {
    label: "Private parking cost",
    path: "parking.monthlyParkingCost",
    lowFactor: 1,
    highFactor: 1.12
  },
  {
    label: "Residual value assumption",
    path: "purchase.expectedResalePercent",
    lowFactor: 0.82,
    highFactor: 1.08
  },
  {
    label: "Slow-charging price (AC)",
    path: "charging.acTariff",
    lowFactor: 0.92,
    highFactor: 1.18
  }
] as const;

const emptySimulationSummary = (): SimulationSummary => ({
  p10: 0,
  p50: 0,
  p90: 0,
  mean: 0,
  min: 0,
  max: 0,
  samples: [],
  drivers: []
});

const powerTaxPerMonth = (ratedPowerKw: number) => {
  const taxableKw = Math.max(10, ratedPowerKw - 45);
  const first = Math.min(35, taxableKw) * 0.25;
  const second = Math.min(25, Math.max(0, taxableKw - 35)) * 0.35;
  const third = Math.max(0, taxableKw - 60) * 0.45;
  return first + second + third;
};

const weightTaxPerMonth = (weightKg: number) => {
  const taxableKg = Math.max(200, weightKg - 900);
  const first = Math.min(500, taxableKg) * 0.015;
  const second = Math.min(700, Math.max(0, taxableKg - 500)) * 0.03;
  const third = Math.max(0, taxableKg - 1200) * 0.045;
  return first + second + third;
};

const derivePurchaseGross = (input: EstimatorInput) =>
  roundCurrency(input.purchase.purchasePrice);

export const deriveMotorTaxAnnual = (input: EstimatorInput) =>
  roundCurrency(
    (powerTaxPerMonth(input.purchase.ratedMotorPowerKw) +
      weightTaxPerMonth(input.purchase.vehicleWeightKg)) *
      12
  );

export const deriveNova = (_input: EstimatorInput) => 0;

const deriveTaxSummary = (
  input: EstimatorInput,
  annualMotorTax: number
) => {
  const activeOwnershipYears = input.purchase.ownershipYears;
  const purchasePriceGross = derivePurchaseGross(input);
  const insurancePremiumGrossAnnual = roundCurrency(input.insurance.monthlyPremium * 12);
  const insurancePremiumNetOfMotorTaxAnnual = roundCurrency(
    input.insurance.includesMotorTax
      ? Math.max(0, insurancePremiumGrossAnnual - annualMotorTax)
      : insurancePremiumGrossAnnual
  );
  const taxablePowerKw = Math.max(10, input.purchase.ratedMotorPowerKw - 45);
  const taxableWeightKg = Math.max(200, input.purchase.vehicleWeightKg - 900);
  const powerMonthly = roundCurrency(powerTaxPerMonth(input.purchase.ratedMotorPowerKw));
  const weightMonthly = roundCurrency(weightTaxPerMonth(input.purchase.vehicleWeightKg));
  const monthlyMotorTax = roundCurrency(powerMonthly + weightMonthly);

  return {
    initial: {
      purchasePrice: purchasePriceGross,
      registrationFees: roundCurrency(input.purchase.registrationCosts),
      totalInitialTaxesAndFees: roundCurrency(input.purchase.registrationCosts)
    },
    ongoing: {
      motorTaxMonthly: monthlyMotorTax,
      motorTaxAnnual: annualMotorTax,
      horizonMotorTaxTotal: roundCurrency(annualMotorTax * activeOwnershipYears),
      insurancePremiumGrossAnnual,
      insurancePremiumNetOfMotorTaxAnnual
    },
    formulas: [
      {
        label: "Power tax component",
        expression: `max(10, kW - 45) => ${taxablePowerKw.toFixed(0)} kW basis`,
        value: `EUR ${powerMonthly.toFixed(2)} / month`
      },
      {
        label: "Weight tax component",
        expression: `max(200, kg - 900) => ${taxableWeightKg.toFixed(0)} kg basis`,
        value: `EUR ${weightMonthly.toFixed(2)} / month`
      },
      {
        label: "Motor tax total",
        expression: `power component + weight component`,
        value: `EUR ${monthlyMotorTax.toFixed(2)} / month, EUR ${annualMotorTax.toFixed(2)} / year`
      },
      {
        label: "Resale timing",
        expression: `resale happens at the end of the selected ${input.purchase.ownershipYears}-year horizon`,
        value: `The selected TCO horizon is also the sale point used for the resale credit.`
      }
    ]
  };
};

export const applyCaseMode = (
  input: EstimatorInput,
  caseMode: CaseMode
): EstimatorInput => {
  if (caseMode === "base") {
    return input;
  }

  const optimistic = caseMode === "optimistic";
  const factor = optimistic ? -1 : 1;

  return {
    ...input,
    purchase: {
      ...input.purchase,
      expectedResalePercent: clamp(
        input.purchase.expectedResalePercent + factor * -4,
        20,
        80
      )
    },
    insurance: {
      ...input.insurance,
      premiumInflation: clamp(input.insurance.premiumInflation + factor * 1, 0, 10)
    },
    charging: {
      ...input.charging,
      energyPriceInflation: clamp(
        input.charging.energyPriceInflation + factor * 1.5,
        0,
        12
      ),
      winterEfficiencyPenalty: clamp(
        input.charging.winterEfficiencyPenalty + factor * 2.5,
        0,
        20
      )
    },
    parking: {
      ...input.parking,
      parkingInflation: clamp(input.parking.parkingInflation + factor * 0.7, 0, 8)
    }
  };
};

const computeExpectedResale = (
  input: EstimatorInput,
  _kmUntilResale: number
) => {
  const purchasePriceGross = derivePurchaseGross(input);
  const rangeAdjustment = clamp(
    ((input.purchase.wltpRangeKm - 500) / 100) * 1.5,
    -4,
    4
  );
  const adjustedPct = clamp(
    input.purchase.expectedResalePercent + rangeAdjustment,
    10,
    80
  );
  return roundCurrency(
    Math.max(purchasePriceGross * 0.12, purchasePriceGross * percentToDecimal(adjustedPct))
  );
};

export const calculateEstimate = (
  rawInput: EstimatorInput,
  caseMode: CaseMode = "base",
  options: number | {
    simulationIterations?: number;
    includeSensitivity?: boolean;
    includeSimulation?: boolean;
  } = 300
): EstimatorResult => {
  const simulationIterations =
    typeof options === "number" ? options : (options.simulationIterations ?? 300);
  const includeSensitivity = typeof options === "number" ? true : (options.includeSensitivity ?? true);
  const includeSimulation = typeof options === "number"
    ? simulationIterations > 0
    : (options.includeSimulation ?? simulationIterations > 0);
  const core = calculateDeterministic(rawInput, caseMode);
  const {
    input,
    years,
    annualMotorTax,
    breakdown,
    yearly,
    totalKm,
    estimatedResaleValue,
    totalCashOutflow,
    totalTco
  } = core;
  const netCostAfterResale = totalCashOutflow - estimatedResaleValue;
  const roundedTotalTco = roundCurrency(totalTco);
  const sensitivity = includeSensitivity
    ? calculateSensitivity(rawInput, caseMode, undefined, roundedTotalTco)
    : [];
  const simulation = includeSimulation
    ? runSimulation(rawInput, caseMode, simulationIterations)
    : emptySimulationSummary();
  const taxes = deriveTaxSummary(input, annualMotorTax);

  return {
    metrics: {
      totalTco: roundedTotalTco,
      monthlyEquivalent: roundCurrency(totalTco / (years * 12)),
      annualEquivalent: roundCurrency(totalTco / years),
      totalCashOutflow: roundCurrency(totalCashOutflow),
      estimatedResaleValue,
      netCostAfterResale: roundCurrency(netCostAfterResale),
      costPerKm: roundCurrency(totalTco / Math.max(totalKm, 1)),
      totalKm: roundCurrency(totalKm)
    },
    breakdown: {
      purchaseAndDepreciation: roundCurrency(breakdown.purchaseAndDepreciation),
      insuranceAndTax: roundCurrency(breakdown.insuranceAndTax),
      parking: roundCurrency(breakdown.parking),
      charging: roundCurrency(breakdown.charging)
    },
    yearly,
    explanations: [
      `Purchase is modeled as a cash purchase with the entered gross car price, registration fees, and a resale credit at the configured sale point.`,
      `Insurance is split between the premium you enter and the derived motorbezogene Versicherungssteuer based on 30-minute power and vehicle mass. When your quote already includes the tax, the app subtracts the derived tax from the premium and shows both parts separately in the audit.`,
      `Charging cost uses driven kilometres, official consumption, route mix, winter penalty, charging losses, AC/DC split, Supercharger share, idle fees, and tariff inflation.`,
      `The active model is intentionally limited to purchase and resale, insurance and tax, parking, and charging so every visible input maps cleanly into the live calculation.`
    ],
    assumptionsAudit: [
      { label: "Vehicle", value: input.meta.vehicleName || defaultInput.meta.vehicleName },
      { label: "City", value: input.meta.city },
      { label: "Ownership period", value: `${years} years` },
      {
        label: "Derived motor tax",
        value: `EUR ${annualMotorTax.toFixed(0)} per year from ${input.purchase.ratedMotorPowerKw} kW and ${input.purchase.vehicleWeightKg} kg`
      },
      {
        label: "Public charging tariff mix",
        value: `${input.charging.acShare}% AC / ${input.charging.dcShare}% DC`
      },
      {
        label: "Insurance premium entry",
        value: input.insurance.includesMotorTax
          ? "Gross premium entered, tax shown as included share"
          : "Premium entered excludes motor tax"
      }
    ],
    sensitivity,
    simulation,
    taxes
  };
};

const calculateDeterministic = (
  rawInput: EstimatorInput,
  caseMode: CaseMode = "base"
) => {
  const input = applyCaseMode(rawInput, caseMode);
  const purchasePriceGross = derivePurchaseGross(input);
  const years = input.purchase.ownershipYears;
  const annualMotorTax = deriveMotorTaxAnnual(input);
  const seasonalKmFactor = 1 + percentToDecimal(input.driving.seasonalUsageAdjustment);
  const annualMileageFactor = 1 + percentToDecimal(input.driving.annualMileageChange);
  const chargingInflationFactor = 1 + percentToDecimal(input.charging.energyPriceInflation);
  const insuranceInflationFactor = 1 + percentToDecimal(input.insurance.premiumInflation);
  const parkingInflationFactor = 1 + percentToDecimal(input.parking.parkingInflation);
  const driveMixEfficiency = weightedAverage([
    { weight: input.driving.cityShare, value: 0.94 },
    { weight: input.driving.motorwayShare, value: 1.12 },
    { weight: input.driving.mixedShare, value: 1 }
  ]);
  const energyUseFactor =
    driveMixEfficiency *
    (1 + percentToDecimal(input.charging.winterEfficiencyPenalty) * 0.45) *
    (1 + percentToDecimal(input.charging.chargingLosses));
  const blendedDcTariff = weightedAverage([
    {
      weight: input.charging.superchargerShare,
      value: input.charging.superchargerTariff
    },
    {
      weight: 100 - input.charging.superchargerShare,
      value: input.charging.dcTariff
    }
  ]);
  const baseEffectiveTariff = weightedAverage([
    { weight: input.charging.acShare, value: input.charging.acTariff },
    { weight: input.charging.dcShare, value: blendedDcTariff }
  ]);
  const baseParkingAnnual =
    input.parking.monthlyParkingCost * 12 +
    (input.parking.residentPermitEnabled ? input.parking.residentPermitAnnual : 0);
  const baseInsuranceGrossAnnual = input.insurance.monthlyPremium * 12;
  const estimatedResaleValue = computeExpectedResale(input, 0);
  const netVehicleCost = Math.max(0, purchasePriceGross - estimatedResaleValue);
  const yearly: YearlyCostRow[] = [];
  let operatingCashOutflow = 0;
  let totalKm = 0;
  let annualKm = input.driving.monthlyKm * 12 * seasonalKmFactor;
  let chargingInflationMultiplier = 1;
  let insuranceInflationMultiplier = 1;
  let parkingInflationMultiplier = 1;
  const depreciationShare = netVehicleCost / Math.max(years, 1);
  let cumulative = 0;

  for (let year = 1; year <= years; year += 1) {
    const ownsCarThisYear = year <= years;
    const currentAnnualKm = ownsCarThisYear ? annualKm : 0;
    totalKm += currentAnnualKm;

    const yearEnergyKwh =
      (currentAnnualKm / 100) *
      input.charging.consumptionKwhPer100Km *
      energyUseFactor;

    const effectiveTariff = baseEffectiveTariff * chargingInflationMultiplier;
    const annualChargingFees =
      input.charging.idleFeesAnnual * chargingInflationMultiplier;
    const chargingCost = ownsCarThisYear
      ? yearEnergyKwh * effectiveTariff + annualChargingFees
      : 0;

    const annualInsuranceGross = ownsCarThisYear
      ? baseInsuranceGrossAnnual * insuranceInflationMultiplier
      : 0;
    const annualInsuranceNet = input.insurance.includesMotorTax
      ? Math.max(0, annualInsuranceGross - annualMotorTax)
      : annualInsuranceGross;
    const insuranceAndTax = ownsCarThisYear ? annualInsuranceNet + annualMotorTax : 0;

    const parking = ownsCarThisYear
      ? baseParkingAnnual * parkingInflationMultiplier
      : 0;
    const purchaseAndDepreciation =
      (ownsCarThisYear ? depreciationShare : 0) +
      (year === 1 ? input.purchase.registrationCosts : 0);

    const yearCashOutflow = sum([
      year === 1 ? input.purchase.registrationCosts : 0,
      insuranceAndTax,
      parking,
      chargingCost
    ]);
    operatingCashOutflow += yearCashOutflow;

    cumulative +=
      purchaseAndDepreciation + insuranceAndTax + parking + chargingCost;
    const yearRow: YearlyCostRow = {
      year,
      purchaseAndDepreciation: roundCurrency(purchaseAndDepreciation),
      insuranceAndTax: roundCurrency(insuranceAndTax),
      parking: roundCurrency(parking),
      charging: roundCurrency(chargingCost),
      total: 0,
      cumulative: roundCurrency(cumulative),
      kmDriven: roundCurrency(currentAnnualKm),
      energyKwh: roundCurrency(yearEnergyKwh)
    };
    yearRow.total = roundCurrency(
      yearRow.purchaseAndDepreciation +
        yearRow.insuranceAndTax +
        yearRow.parking +
        yearRow.charging
    );

    yearly.push(yearRow);
    annualKm *= annualMileageFactor;
    chargingInflationMultiplier *= chargingInflationFactor;
    insuranceInflationMultiplier *= insuranceInflationFactor;
    parkingInflationMultiplier *= parkingInflationFactor;
  }

  const breakdown = yearly.reduce<CategoryBreakdown>(
    (totals, row) => {
      totals.purchaseAndDepreciation += row.purchaseAndDepreciation;
      totals.insuranceAndTax += row.insuranceAndTax;
      totals.parking += row.parking;
      totals.charging += row.charging;
      return totals;
    },
    {
      purchaseAndDepreciation: 0,
      insuranceAndTax: 0,
      parking: 0,
      charging: 0
    }
  );

  const totalCashOutflow = purchasePriceGross + operatingCashOutflow;
  const totalTco = yearly.at(-1)?.cumulative ?? 0;

  return {
    input,
    years,
    annualMotorTax,
    breakdown,
    yearly,
    totalKm,
    estimatedResaleValue,
    totalCashOutflow,
    totalTco
  };
};

const modifyInput = (
  input: EstimatorInput,
  path: string,
  factor: number
): EstimatorInput => {
  const [section, field] = path.split(".");
  const sectionKey = section as keyof EstimatorInput;
  const sectionRecord = input[sectionKey] as Record<string, unknown>;
  const current = sectionRecord[field] as number;
  return {
    ...input,
    [sectionKey]: {
      ...sectionRecord,
      [field]: current * factor
    }
  } as EstimatorInput;
};

export const calculateSensitivity = (
  input: EstimatorInput,
  caseMode: CaseMode,
  overrides?: Partial<Record<(typeof defaultSensitivityLevers)[number]["label"], { lowFactor: number; highFactor: number }>>,
  baseValueOverride?: number
): SensitivityPoint[] => {
  const baseValue = baseValueOverride ?? calculateEstimateCore(input, caseMode);
  const roundedBaseValue = roundCurrency(baseValue);

  return defaultSensitivityLevers.map(({ label, path, lowFactor, highFactor }) => {
    const activeLowFactor = overrides?.[label]?.lowFactor ?? lowFactor;
    const activeHighFactor = overrides?.[label]?.highFactor ?? highFactor;
    const low = calculateEstimateCore(modifyInput(input, path, activeLowFactor), caseMode);
    const high = calculateEstimateCore(modifyInput(input, path, activeHighFactor), caseMode);
    const roundedLowValue = roundCurrency(low);
    const roundedHighValue = roundCurrency(high);
    return {
      label,
      deltaLow: roundCurrency(roundedLowValue - roundedBaseValue),
      deltaHigh: roundCurrency(roundedHighValue - roundedBaseValue),
      lowValue: roundedLowValue,
      baseValue: roundedBaseValue,
      highValue: roundedHighValue
    };
  });
};

const calculateEstimateCore = (input: EstimatorInput, caseMode: CaseMode) =>
  calculateDeterministic(input, caseMode).totalTco;

const correlation = (x: number[], y: number[]) => {
  if (x.length !== y.length || x.length < 2) {
    return 0;
  }

  const meanX = average(x);
  const meanY = average(y);
  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let index = 0; index < x.length; index += 1) {
    const dx = x[index] - meanX;
    const dy = y[index] - meanY;
    numerator += dx * dy;
    denomX += dx ** 2;
    denomY += dy ** 2;
  }

  if (denomX === 0 || denomY === 0) {
    return 0;
  }

  return numerator / Math.sqrt(denomX * denomY);
};

const gaussian = () => {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

export const calculateSimulation = (
  input: EstimatorInput,
  caseMode: CaseMode,
  iterations: number
): SimulationSummary => {
  if (iterations <= 0) {
    return emptySimulationSummary();
  }

  const samples: number[] = [];
  let sampleTotal = 0;
  let sampleMin = Number.POSITIVE_INFINITY;
  let sampleMax = Number.NEGATIVE_INFINITY;
  const driverScores: Record<string, number[]> = {
    "Fast-charging price (DC)": [],
    "Annual distance driven": [],
    "Residual value assumption": [],
    "Slow-charging price (AC)": [],
    "Energy price inflation": [],
    "Insurance premium inflation": [],
    "Charging losses": [],
    "Winter efficiency penalty": [],
    "Parking inflation": [],
    "Annual mileage growth": [],
    "Tesla Supercharger tariff": []
  };
  for (let i = 0; i < iterations; i += 1) {
    const charging = {
      ...input.charging,
      dcTariff: clamp(
        input.charging.dcTariff * (1 + gaussian() * 0.1),
        0.3,
        1.2
      ),
      acTariff: clamp(
        input.charging.acTariff * (1 + gaussian() * 0.08),
        0.2,
        0.9
      ),
      superchargerTariff: clamp(
        input.charging.superchargerTariff * (1 + gaussian() * 0.08),
        0.2,
        1
      ),
      energyPriceInflation: clamp(
        input.charging.energyPriceInflation + gaussian() * 1,
        0,
        12
      ),
      chargingLosses: clamp(
        input.charging.chargingLosses + gaussian() * 1.5,
        0,
        25
      ),
      winterEfficiencyPenalty: clamp(
        input.charging.winterEfficiencyPenalty + gaussian() * 2,
        0,
        25
      )
    };
    const driving = {
      ...input.driving,
      monthlyKm: clamp(
        input.driving.monthlyKm * (1 + gaussian() * 0.1),
        300,
        4000
      ),
      annualMileageChange: clamp(
        input.driving.annualMileageChange + gaussian() * 1.25,
        -10,
        15
      )
    };
    const insurance = {
      ...input.insurance,
      premiumInflation: clamp(
        input.insurance.premiumInflation + gaussian() * 0.8,
        0,
        10
      )
    };
    const parking = {
      ...input.parking,
      parkingInflation: clamp(
        input.parking.parkingInflation + gaussian() * 0.6,
        0,
        8
      )
    };
    const purchase = {
      ...input.purchase,
      expectedResalePercent: clamp(
        input.purchase.expectedResalePercent + gaussian() * 4.5,
        15,
        80
      )
    };
    const sample: EstimatorInput = {
      ...input,
      purchase,
      insurance,
      parking,
      driving,
      charging
    };
    const tco = calculateEstimateCore(sample, caseMode);
    samples.push(tco);
    sampleTotal += tco;
    sampleMin = Math.min(sampleMin, tco);
    sampleMax = Math.max(sampleMax, tco);

    driverScores["Fast-charging price (DC)"].push(charging.dcTariff);
    driverScores["Annual distance driven"].push(driving.monthlyKm);
    driverScores["Residual value assumption"].push(purchase.expectedResalePercent);
    driverScores["Slow-charging price (AC)"].push(charging.acTariff);
    driverScores["Energy price inflation"].push(charging.energyPriceInflation);
    driverScores["Insurance premium inflation"].push(insurance.premiumInflation);
    driverScores["Charging losses"].push(charging.chargingLosses);
    driverScores["Winter efficiency penalty"].push(charging.winterEfficiencyPenalty);
    driverScores["Parking inflation"].push(parking.parkingInflation);
    driverScores["Annual mileage growth"].push(driving.annualMileageChange);
    driverScores["Tesla Supercharger tariff"].push(charging.superchargerTariff);
  }

  const mean = sampleTotal / samples.length;
  const drivers = Object.entries(driverScores)
    .map(([label, values]) => ({
      label,
      score: Math.abs(correlation(values, samples))
    }))
    .sort((a, b) => b.score - a.score);

  return {
    p10: roundCurrency(percentile(samples, 0.1)),
    p50: roundCurrency(percentile(samples, 0.5)),
    p90: roundCurrency(percentile(samples, 0.9)),
    mean: roundCurrency(mean),
    min: roundCurrency(sampleMin),
    max: roundCurrency(sampleMax),
    samples,
    drivers
  };
};

const runSimulation = calculateSimulation;
