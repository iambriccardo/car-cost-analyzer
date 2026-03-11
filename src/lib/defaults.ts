import type { EstimatorInput, SavedScenario } from "./types";

export const STORAGE_VERSION = 4;

export const defaultInput: EstimatorInput = {
  meta: {
    vehicleName: "Model 3 standard",
    city: "Vienna",
    currency: "EUR"
  },
  purchase: {
    purchasePrice: 37970,
    registrationCosts: 299.5,
    wltpRangeKm: 534,
    ratedMotorPowerKw: 88,
    vehicleWeightKg: 1847,
    cashPurchase: true,
    downPayment: 37970,
    financingApr: 4.49,
    financingMonths: 48,
    financingAdminFees: 240,
    discountRate: 3.5,
    ownershipYears: 5,
    expectedResaleYear: 5,
    expectedResalePercent: 43,
    depreciationCurve: "front-loaded-ev",
    mileageResaleAdjustmentPer10kKm: 1.8,
    accidentHistoryImpact: 0,
    cosmeticConditionAdjustment: 0
  },
  insurance: {
    monthlyPremium: 200,
    includesMotorTax: true,
    deductible: 450,
    coverageMode: "vollkasko",
    premiumInflation: 3,
    claimProbabilityAnnual: 10,
    noClaimBonusAnnual: 1.2
  },
  parking: {
    monthlyParkingCost: 100,
    residentPermitEnabled: true,
    residentPermitAnnual: 156,
    parkingInflation: 2.5,
    finesReserveAnnual: 0,
    destinationParkingReserveAnnual: 0
  },
  driving: {
    monthlyKm: 1000,
    cityShare: 55,
    motorwayShare: 20,
    mixedShare: 25,
    seasonalUsageAdjustment: 6,
    annualMileageChange: 1,
    tripSeverityFactor: 1.05,
    drivingEfficiencyFactor: 1
  },
  charging: {
    consumptionKwhPer100Km: 13,
    publicChargingOnly: true,
    acShare: 70,
    dcShare: 30,
    acTariff: 0.44,
    dcTariff: 0.45,
    superchargerShare: 10,
    superchargerTariff: 0.42,
    chargingLosses: 11,
    winterEfficiencyPenalty: 9,
    preconditioningPenalty: 2,
    idleFeesAnnual: 35,
    subscriptionDiscount: 0,
    energyPriceInflation: 3.5,
    freeChargingShare: 0,
    chargingCardFeesAnnual: 0
  },
  maintenance: {
    tireReplacementIntervalMonths: 42,
    tireSetCost: 880,
    winterTireStrategy: "dual-set",
    tireSwapCost: 90,
    tireStorageAnnual: 140,
    alignmentReserveAnnual: 70,
    cabinFilterIntervalMonths: 18,
    cabinFilterCost: 90,
    wiperReplacementIntervalMonths: 12,
    wiperCost: 48,
    brakeFluidCheckIntervalMonths: 24,
    brakeFluidCost: 110,
    brakeServiceReserveAnnual: 140,
    inspectionReserveAnnual: 220,
    washerFluidReserveAnnual: 40,
    battery12vReplacementYears: 5,
    battery12vCost: 220,
    suspensionWearReserveAnnual: 160,
    cosmeticRepairsReserveAnnual: 110,
    detailingReserveAnnual: 180
  },
  repairs: {
    annualRepairReserve: 320,
    stochasticRepairShocks: true,
    bodyworkReserveAnnual: 180,
    glassReserveAnnual: 90,
    roadsideAssistanceAnnual: 85,
    unexpectedRepairProbability: 18,
    minorRepairCost: 240,
    mediumRepairCost: 850,
    majorRepairCost: 2200,
    riskTolerance: 0.55
  },
  other: {
    vignetteAndTollsAnnual: 0,
    carWashAnnual: 0,
    accessoriesAnnual: 0,
    softwareSubscriptionsAnnual: 0,
    opportunityCostOfCapitalAnnual: 3.5,
    inflationGeneral: 2.2,
    contingencyReserveAnnual: 0,
    oneOffAccessorySpend: 0
  }
};

export const exampleScenarios: SavedScenario[] = [
  {
    id: "vienna-base-profile",
    name: "Model 3 standard",
    notes: "Single starter scenario: cash purchase, 1,000 km/month, Vienna public charging baseline, 100 EUR/month private parking, and Parkpickerl enabled.",
    version: STORAGE_VERSION,
    createdAt: new Date("2026-03-10T09:00:00Z").toISOString(),
    updatedAt: new Date("2026-03-10T09:00:00Z").toISOString(),
    input: defaultInput
  }
];
