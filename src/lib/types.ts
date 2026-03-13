export type CaseMode = "optimistic" | "base" | "pessimistic";

export interface PurchaseInputs {
  purchasePrice: number;
  registrationCosts: number;
  wltpRangeKm: number;
  ratedMotorPowerKw: number;
  vehicleWeightKg: number;
  ownershipYears: number;
  expectedResalePercent: number;
}

export interface InsuranceInputs {
  monthlyPremium: number;
  includesMotorTax: boolean;
  premiumInflation: number;
}

export interface ParkingInputs {
  monthlyParkingCost: number;
  residentPermitEnabled: boolean;
  residentPermitAnnual: number;
  parkingInflation: number;
}

export interface DrivingInputs {
  monthlyKm: number;
  cityShare: number;
  motorwayShare: number;
  mixedShare: number;
  seasonalUsageAdjustment: number;
  annualMileageChange: number;
}

export interface ChargingInputs {
  consumptionKwhPer100Km: number;
  acShare: number;
  dcShare: number;
  acTariff: number;
  dcTariff: number;
  superchargerShare: number;
  superchargerTariff: number;
  chargingLosses: number;
  winterEfficiencyPenalty: number;
  idleFeesAnnual: number;
  energyPriceInflation: number;
}

export interface EstimatorInput {
  meta: {
    vehicleName: string;
    city: string;
    currency: string;
  };
  purchase: PurchaseInputs;
  insurance: InsuranceInputs;
  parking: ParkingInputs;
  driving: DrivingInputs;
  charging: ChargingInputs;
}

export interface SavedScenario {
  id: string;
  name: string;
  notes: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  input: EstimatorInput;
}

export interface CategoryBreakdown {
  purchaseAndDepreciation: number;
  insuranceAndTax: number;
  parking: number;
  charging: number;
}

export interface YearlyCostRow extends CategoryBreakdown {
  year: number;
  total: number;
  cumulative: number;
  kmDriven: number;
  energyKwh: number;
}

export interface HeadlineMetrics {
  totalTco: number;
  monthlyEquivalent: number;
  annualEquivalent: number;
  totalCashOutflow: number;
  estimatedResaleValue: number;
  netCostAfterResale: number;
  costPerKm: number;
  totalKm: number;
}

export interface SensitivityPoint {
  label: string;
  deltaLow: number;
  deltaHigh: number;
  lowValue: number;
  baseValue: number;
  highValue: number;
}

export interface SimulationSummary {
  p10: number;
  p50: number;
  p90: number;
  mean: number;
  min: number;
  max: number;
  samples: number[];
  drivers: Array<{ label: string; score: number }>;
}

export interface TaxSummary {
  initial: {
    purchasePrice: number;
    registrationFees: number;
    totalInitialTaxesAndFees: number;
  };
  ongoing: {
    motorTaxMonthly: number;
    motorTaxAnnual: number;
    horizonMotorTaxTotal: number;
    insurancePremiumGrossAnnual: number;
    insurancePremiumNetOfMotorTaxAnnual: number;
  };
  breakdown: {
    powerBasisKw: number;
    weightBasisKg: number;
    powerSteps: Array<{
      label: string;
      units: number;
      rate: number;
      subtotal: number;
    }>;
    weightSteps: Array<{
      label: string;
      units: number;
      rate: number;
      subtotal: number;
    }>;
    powerMonthly: number;
    weightMonthly: number;
    monthlyTotal: number;
    annualTotal: number;
  };
  formulas: Array<{
    label: string;
    expression: string;
    value: string;
  }>;
}

export interface EstimatorResult {
  metrics: HeadlineMetrics;
  breakdown: CategoryBreakdown;
  yearly: YearlyCostRow[];
  explanations: string[];
  assumptionsAudit: Array<{ label: string; value: string }>;
  sensitivity: SensitivityPoint[];
  simulation: SimulationSummary;
  taxes: TaxSummary;
}
