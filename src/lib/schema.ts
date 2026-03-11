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
    ownershipYears: z.number().min(1).max(30),
    expectedResalePercent: percent
  }),
  insurance: z.object({
    monthlyPremium: positive,
    includesMotorTax: z.boolean(),
    premiumInflation: percent
  }),
  parking: z.object({
    monthlyParkingCost: positive,
    residentPermitEnabled: z.boolean(),
    residentPermitAnnual: positive,
    parkingInflation: percent
  }),
  driving: z.object({
    monthlyKm: positive,
    cityShare: percent,
    motorwayShare: percent,
    mixedShare: percent,
    seasonalUsageAdjustment: z.number().min(0).max(40),
    annualMileageChange: z.number().min(-15).max(15)
  }),
  charging: z.object({
    consumptionKwhPer100Km: z.number().min(8).max(35),
    acShare: percent,
    dcShare: percent,
    acTariff: z.number().min(0).max(2),
    dcTariff: z.number().min(0).max(2),
    superchargerShare: percent,
    superchargerTariff: z.number().min(0).max(2),
    chargingLosses: z.number().min(0).max(35),
    winterEfficiencyPenalty: z.number().min(0).max(30),
    idleFeesAnnual: positive,
    energyPriceInflation: percent
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
