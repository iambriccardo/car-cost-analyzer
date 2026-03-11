import type { EstimatorInput, SavedScenario } from "./types";

export const STORAGE_VERSION = 6;

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
    ownershipYears: 5,
    expectedResalePercent: 43
  },
  insurance: {
    monthlyPremium: 200,
    includesMotorTax: true,
    premiumInflation: 3
  },
  parking: {
    monthlyParkingCost: 100,
    residentPermitEnabled: true,
    residentPermitAnnual: 156,
    parkingInflation: 2.5
  },
  driving: {
    monthlyKm: 1000,
    cityShare: 55,
    motorwayShare: 20,
    mixedShare: 25,
    seasonalUsageAdjustment: 6,
    annualMileageChange: 1
  },
  charging: {
    consumptionKwhPer100Km: 13,
    acShare: 70,
    dcShare: 30,
    acTariff: 0.39,
    dcTariff: 0.49,
    superchargerShare: 10,
    superchargerTariff: 0.46,
    chargingLosses: 11,
    winterEfficiencyPenalty: 9,
    idleFeesAnnual: 35,
    energyPriceInflation: 3.5
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
