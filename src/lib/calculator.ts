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
  simulationIterations = 300
): EstimatorResult => {
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
  const sensitivity = calculateSensitivity(rawInput, caseMode);
  const simulation = runSimulation(rawInput, caseMode, simulationIterations);
  const taxes = deriveTaxSummary(input, annualMotorTax);

  return {
    metrics: {
      totalTco: roundCurrency(totalTco),
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
  const seasonalKmFactor =
    1 + percentToDecimal(input.driving.seasonalUsageAdjustment);
  const totalKmByYear = Array.from({ length: years }, (_, index) => {
    const year = index + 1;
    const mileageFactor =
      (1 + percentToDecimal(input.driving.annualMileageChange)) ** (year - 1);
    return (
      input.driving.monthlyKm *
      12 *
      mileageFactor *
      seasonalKmFactor
    );
  });
  const saleYear = years;
  const kmUntilResale = sum(totalKmByYear.slice(0, saleYear));
  const estimatedResaleValue = computeExpectedResale(input, kmUntilResale);
  const netVehicleCost = Math.max(0, purchasePriceGross - estimatedResaleValue);
  const yearly: YearlyCostRow[] = [];
  let operatingCashOutflow = 0;
  let totalKm = 0;

  for (let year = 1; year <= years; year += 1) {
    const ownsCarThisYear = year <= saleYear;
    const annualKm = ownsCarThisYear ? totalKmByYear[year - 1] : 0;
    totalKm += annualKm;

    const driveMixEfficiency = weightedAverage([
      { weight: input.driving.cityShare, value: 0.94 },
      { weight: input.driving.motorwayShare, value: 1.12 },
      { weight: input.driving.mixedShare, value: 1 }
    ]);

    const yearEnergyKwh =
      (annualKm / 100) *
      input.charging.consumptionKwhPer100Km *
      driveMixEfficiency *
      (1 + percentToDecimal(input.charging.winterEfficiencyPenalty) * 0.45) *
      (1 + percentToDecimal(input.charging.chargingLosses));

    const yearAcPrice =
      input.charging.acTariff *
      (1 + percentToDecimal(input.charging.energyPriceInflation)) ** (year - 1);
    const yearDcPrice =
      weightedAverage([
        {
          weight: input.charging.superchargerShare,
          value: input.charging.superchargerTariff
        },
        {
          weight: 100 - input.charging.superchargerShare,
          value: input.charging.dcTariff
        }
      ]) *
      (1 + percentToDecimal(input.charging.energyPriceInflation)) ** (year - 1);

    const effectiveTariff = weightedAverage([
      { weight: input.charging.acShare, value: yearAcPrice },
      { weight: input.charging.dcShare, value: yearDcPrice }
    ]);
    const annualChargingFees =
      input.charging.idleFeesAnnual *
      (1 + percentToDecimal(input.charging.energyPriceInflation)) ** (year - 1);
    const chargingCost = ownsCarThisYear
      ? yearEnergyKwh * effectiveTariff + annualChargingFees
      : 0;

    const annualInsuranceGross = ownsCarThisYear
      ? input.insurance.monthlyPremium *
        12 *
        (1 + percentToDecimal(input.insurance.premiumInflation)) ** (year - 1)
      : 0;
    const annualInsuranceNet = input.insurance.includesMotorTax
      ? Math.max(0, annualInsuranceGross - annualMotorTax)
      : annualInsuranceGross;
    const insuranceAndTax = ownsCarThisYear ? annualInsuranceNet + annualMotorTax : 0;

    const permitCost = input.parking.residentPermitEnabled
      ? input.parking.residentPermitAnnual
      : 0;
    const parking = ownsCarThisYear
      ? (input.parking.monthlyParkingCost * 12 +
          permitCost) *
        (1 + percentToDecimal(input.parking.parkingInflation)) ** (year - 1)
      : 0;
    const depreciationShare = ownsCarThisYear ? netVehicleCost / Math.max(saleYear, 1) : 0;
    const purchaseAndDepreciation =
      depreciationShare + (year === 1 ? input.purchase.registrationCosts : 0);

    const yearCashOutflow = sum([
      year === 1 ? input.purchase.registrationCosts : 0,
      insuranceAndTax,
      parking,
      chargingCost
    ]);
    operatingCashOutflow += yearCashOutflow;

    const yearRow: YearlyCostRow = {
      year,
      purchaseAndDepreciation: roundCurrency(purchaseAndDepreciation),
      insuranceAndTax: roundCurrency(insuranceAndTax),
      parking: roundCurrency(parking),
      charging: roundCurrency(chargingCost),
      total: 0,
      cumulative: 0,
      kmDriven: roundCurrency(annualKm),
      energyKwh: roundCurrency(yearEnergyKwh)
    };
    yearRow.total = roundCurrency(
      yearRow.purchaseAndDepreciation +
        yearRow.insuranceAndTax +
        yearRow.parking +
        yearRow.charging
    );
    yearRow.cumulative = roundCurrency(
      (yearly.at(-1)?.cumulative ?? 0) + yearRow.total
    );

    yearly.push(yearRow);
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
  const clone = structuredClone(input);
  const [section, field] = path.split(".");
  const sectionRecord = clone[section as keyof EstimatorInput] as Record<string, unknown>;
  const current = sectionRecord[field] as number;
  sectionRecord[field] = current * factor;
  return clone;
};

export const calculateSensitivity = (
  input: EstimatorInput,
  caseMode: CaseMode,
  overrides?: Partial<Record<(typeof defaultSensitivityLevers)[number]["label"], { lowFactor: number; highFactor: number }>>
): SensitivityPoint[] => {
  const baseValue = calculateEstimateCore(input, caseMode);

  return defaultSensitivityLevers.map(({ label, path, lowFactor, highFactor }) => {
    const activeLowFactor = overrides?.[label]?.lowFactor ?? lowFactor;
    const activeHighFactor = overrides?.[label]?.highFactor ?? highFactor;
    const low = calculateEstimateCore(modifyInput(input, path, activeLowFactor), caseMode);
    const high = calculateEstimateCore(modifyInput(input, path, activeHighFactor), caseMode);
    const roundedBaseValue = roundCurrency(baseValue);
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

const runSimulation = (
  input: EstimatorInput,
  caseMode: CaseMode,
  iterations: number
): SimulationSummary => {
  if (iterations <= 0) {
    return {
      p10: 0,
      p50: 0,
      p90: 0,
      mean: 0,
      min: 0,
      max: 0,
      samples: [],
      drivers: []
    };
  }

  const samples: number[] = [];
  const driverScores = new Map<string, number[]>();
  for (let i = 0; i < iterations; i += 1) {
    const sample = structuredClone(input);
    sample.charging.dcTariff = clamp(
      sample.charging.dcTariff * (1 + gaussian() * 0.1),
      0.3,
      1.2
    );
    sample.charging.acTariff = clamp(
      sample.charging.acTariff * (1 + gaussian() * 0.08),
      0.2,
      0.9
    );
    sample.charging.superchargerTariff = clamp(
      sample.charging.superchargerTariff * (1 + gaussian() * 0.08),
      0.2,
      1
    );
    sample.charging.energyPriceInflation = clamp(
      sample.charging.energyPriceInflation + gaussian() * 1,
      0,
      12
    );
    sample.charging.chargingLosses = clamp(
      sample.charging.chargingLosses + gaussian() * 1.5,
      0,
      25
    );
    sample.charging.winterEfficiencyPenalty = clamp(
      sample.charging.winterEfficiencyPenalty + gaussian() * 2,
      0,
      25
    );
    sample.driving.monthlyKm = clamp(
      sample.driving.monthlyKm * (1 + gaussian() * 0.1),
      300,
      4000
    );
    sample.driving.annualMileageChange = clamp(
      sample.driving.annualMileageChange + gaussian() * 1.25,
      -10,
      15
    );
    sample.insurance.premiumInflation = clamp(
      sample.insurance.premiumInflation + gaussian() * 0.8,
      0,
      10
    );
    sample.parking.parkingInflation = clamp(
      sample.parking.parkingInflation + gaussian() * 0.6,
      0,
      8
    );
    sample.purchase.expectedResalePercent = clamp(
      sample.purchase.expectedResalePercent + gaussian() * 4.5,
      15,
      80
    );
    const tco = calculateEstimateCore(sample, caseMode);
    samples.push(tco);

    const contributions = [
      ["Fast-charging price (DC)", sample.charging.dcTariff],
      ["Annual distance driven", sample.driving.monthlyKm],
      ["Residual value assumption", sample.purchase.expectedResalePercent],
      ["Slow-charging price (AC)", sample.charging.acTariff],
      ["Energy price inflation", sample.charging.energyPriceInflation],
      ["Insurance premium inflation", sample.insurance.premiumInflation],
      ["Charging losses", sample.charging.chargingLosses],
      ["Winter efficiency penalty", sample.charging.winterEfficiencyPenalty],
      ["Parking inflation", sample.parking.parkingInflation],
      ["Annual mileage growth", sample.driving.annualMileageChange],
      ["Tesla Supercharger tariff", sample.charging.superchargerTariff]
    ] as const;

    contributions.forEach(([label, value]) => {
      const existing = driverScores.get(label) ?? [];
      existing.push(value);
      driverScores.set(label, existing);
    });
  }

  const mean = average(samples);
  const drivers = [...driverScores.entries()]
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
    min: roundCurrency(Math.min(...samples)),
    max: roundCurrency(Math.max(...samples)),
    samples,
    drivers
  };
};
