import { z } from "zod";

const percent = z.number().min(0).max(100);
const positive = z.number().min(0);

export const estimatorSchema = z.object({
  meta: z.object({
    vehicleName: z.string().min(1),
    city: z.string().min(1),
    currency: z.string().min(1)
  }),
  purchase: z.object({
    purchasePrice: positive,
    registrationCosts: positive,
    wltpRangeKm: z.number().min(150).max(1000),
    ratedMotorPowerKw: z.number().min(10).max(450),
    vehicleWeightKg: z.number().min(800).max(4000),
    cashPurchase: z.boolean(),
    downPayment: positive,
    financingApr: percent,
    financingMonths: z.number().min(1).max(120),
    financingAdminFees: positive,
    discountRate: percent,
    ownershipYears: z.number().min(1).max(15),
    expectedResaleYear: z.number().min(1).max(15),
    expectedResalePercent: percent,
    depreciationCurve: z.enum(["linear", "accelerated", "front-loaded-ev"]),
    mileageResaleAdjustmentPer10kKm: z.number().min(0).max(20),
    accidentHistoryImpact: z.number().min(0).max(30),
    cosmeticConditionAdjustment: z.number().min(-10).max(10)
  }),
  insurance: z.object({
    monthlyPremium: positive,
    includesMotorTax: z.boolean(),
    deductible: positive,
    coverageMode: z.enum(["liability", "teilkasko", "vollkasko"]),
    premiumInflation: percent,
    claimProbabilityAnnual: percent,
    noClaimBonusAnnual: z.number().min(0).max(10)
  }),
  parking: z.object({
    monthlyParkingCost: positive,
    residentPermitEnabled: z.boolean(),
    residentPermitAnnual: positive,
    parkingInflation: percent,
    finesReserveAnnual: positive,
    destinationParkingReserveAnnual: positive
  }),
  driving: z.object({
    monthlyKm: positive,
    cityShare: percent,
    motorwayShare: percent,
    mixedShare: percent,
    seasonalUsageAdjustment: z.number().min(0).max(40),
    annualMileageChange: z.number().min(-15).max(15),
    tripSeverityFactor: z.number().min(0.6).max(1.6),
    drivingEfficiencyFactor: z.number().min(0.75).max(1.4)
  }),
  charging: z.object({
    consumptionKwhPer100Km: z.number().min(8).max(35),
    publicChargingOnly: z.boolean(),
    acShare: percent,
    dcShare: percent,
    acTariff: z.number().min(0).max(2),
    dcTariff: z.number().min(0).max(2),
    superchargerShare: percent,
    superchargerTariff: z.number().min(0).max(2),
    chargingLosses: z.number().min(0).max(35),
    winterEfficiencyPenalty: z.number().min(0).max(30),
    preconditioningPenalty: z.number().min(0).max(15),
    idleFeesAnnual: positive,
    subscriptionDiscount: z.number().min(0).max(40),
    energyPriceInflation: percent,
    freeChargingShare: percent,
    chargingCardFeesAnnual: positive
  }),
  maintenance: z.object({
    tireReplacementIntervalMonths: z.number().min(12).max(96),
    tireSetCost: positive,
    winterTireStrategy: z.enum([
      "all-season",
      "dual-set",
      "existing-second-set"
    ]),
    tireSwapCost: positive,
    tireStorageAnnual: positive,
    alignmentReserveAnnual: positive,
    cabinFilterIntervalMonths: z.number().min(6).max(48),
    cabinFilterCost: positive,
    wiperReplacementIntervalMonths: z.number().min(6).max(36),
    wiperCost: positive,
    brakeFluidCheckIntervalMonths: z.number().min(12).max(48),
    brakeFluidCost: positive,
    brakeServiceReserveAnnual: positive,
    inspectionReserveAnnual: positive,
    washerFluidReserveAnnual: positive,
    battery12vReplacementYears: z.number().min(1).max(10),
    battery12vCost: positive,
    suspensionWearReserveAnnual: positive,
    cosmeticRepairsReserveAnnual: positive,
    detailingReserveAnnual: positive
  }),
  repairs: z.object({
    annualRepairReserve: positive,
    stochasticRepairShocks: z.boolean(),
    bodyworkReserveAnnual: positive,
    glassReserveAnnual: positive,
    roadsideAssistanceAnnual: positive,
    unexpectedRepairProbability: percent,
    minorRepairCost: positive,
    mediumRepairCost: positive,
    majorRepairCost: positive,
    riskTolerance: z.number().min(0).max(1)
  }),
  other: z.object({
    vignetteAndTollsAnnual: positive,
    carWashAnnual: positive,
    accessoriesAnnual: positive,
    softwareSubscriptionsAnnual: positive,
    opportunityCostOfCapitalAnnual: percent,
    inflationGeneral: percent,
    contingencyReserveAnnual: positive,
    oneOffAccessorySpend: positive
  })
}).superRefine(({ driving, charging }, ctx) => {
  const driveShare = driving.cityShare + driving.motorwayShare + driving.mixedShare;
  if (Math.abs(driveShare - 100) > 0.001) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["driving", "mixedShare"],
      message: "Driving mix must sum to 100%."
    });
  }

  const chargeShare = charging.acShare + charging.dcShare;
  if (Math.abs(chargeShare - 100) > 0.001) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["charging", "dcShare"],
      message: "Charging split must sum to 100%."
    });
  }
});

export const savedScenarioSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  notes: z.string(),
  version: z.number().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  input: estimatorSchema
});

export const savedScenarioListSchema = z.array(savedScenarioSchema);
