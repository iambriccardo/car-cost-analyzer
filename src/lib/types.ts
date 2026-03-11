export type CaseMode = "optimistic" | "base" | "pessimistic";

export type CoverageMode = "liability" | "teilkasko" | "vollkasko";
export type TireStrategy = "all-season" | "dual-set" | "existing-second-set";
export type DepreciationCurve = "linear" | "accelerated" | "front-loaded-ev";

export interface PurchaseInputs {
  purchasePrice: number;
  registrationCosts: number;
  wltpRangeKm: number;
  ratedMotorPowerKw: number;
  vehicleWeightKg: number;
  cashPurchase: boolean;
  downPayment: number;
  financingApr: number;
  financingMonths: number;
  financingAdminFees: number;
  discountRate: number;
  ownershipYears: number;
  expectedResaleYear: number;
  expectedResalePercent: number;
  depreciationCurve: DepreciationCurve;
  mileageResaleAdjustmentPer10kKm: number;
  accidentHistoryImpact: number;
  cosmeticConditionAdjustment: number;
}

export interface InsuranceInputs {
  monthlyPremium: number;
  includesMotorTax: boolean;
  deductible: number;
  coverageMode: CoverageMode;
  premiumInflation: number;
  claimProbabilityAnnual: number;
  noClaimBonusAnnual: number;
}

export interface ParkingInputs {
  monthlyParkingCost: number;
  residentPermitEnabled: boolean;
  residentPermitAnnual: number;
  parkingInflation: number;
  finesReserveAnnual: number;
  destinationParkingReserveAnnual: number;
}

export interface DrivingInputs {
  monthlyKm: number;
  cityShare: number;
  motorwayShare: number;
  mixedShare: number;
  seasonalUsageAdjustment: number;
  annualMileageChange: number;
  tripSeverityFactor: number;
  drivingEfficiencyFactor: number;
}

export interface ChargingInputs {
  consumptionKwhPer100Km: number;
  publicChargingOnly: boolean;
  acShare: number;
  dcShare: number;
  acTariff: number;
  dcTariff: number;
  superchargerShare: number;
  superchargerTariff: number;
  chargingLosses: number;
  winterEfficiencyPenalty: number;
  preconditioningPenalty: number;
  idleFeesAnnual: number;
  subscriptionDiscount: number;
  energyPriceInflation: number;
  freeChargingShare: number;
  chargingCardFeesAnnual: number;
}

export interface MaintenanceInputs {
  tireReplacementIntervalMonths: number;
  tireSetCost: number;
  winterTireStrategy: TireStrategy;
  tireSwapCost: number;
  tireStorageAnnual: number;
  alignmentReserveAnnual: number;
  cabinFilterIntervalMonths: number;
  cabinFilterCost: number;
  wiperReplacementIntervalMonths: number;
  wiperCost: number;
  brakeFluidCheckIntervalMonths: number;
  brakeFluidCost: number;
  brakeServiceReserveAnnual: number;
  inspectionReserveAnnual: number;
  washerFluidReserveAnnual: number;
  battery12vReplacementYears: number;
  battery12vCost: number;
  suspensionWearReserveAnnual: number;
  cosmeticRepairsReserveAnnual: number;
  detailingReserveAnnual: number;
}

export interface RepairInputs {
  annualRepairReserve: number;
  stochasticRepairShocks: boolean;
  bodyworkReserveAnnual: number;
  glassReserveAnnual: number;
  roadsideAssistanceAnnual: number;
  unexpectedRepairProbability: number;
  minorRepairCost: number;
  mediumRepairCost: number;
  majorRepairCost: number;
  riskTolerance: number;
}

export interface OtherCostInputs {
  vignetteAndTollsAnnual: number;
  carWashAnnual: number;
  accessoriesAnnual: number;
  softwareSubscriptionsAnnual: number;
  opportunityCostOfCapitalAnnual: number;
  inflationGeneral: number;
  contingencyReserveAnnual: number;
  oneOffAccessorySpend: number;
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
  maintenance: MaintenanceInputs;
  repairs: RepairInputs;
  other: OtherCostInputs;
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
  financing: number;
  insuranceAndTax: number;
  parking: number;
  charging: number;
  maintenance: number;
  tires: number;
  repairsAndContingencies: number;
  otherCosts: number;
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
