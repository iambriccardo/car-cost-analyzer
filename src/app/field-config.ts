import type { EstimatorInput } from "../lib/types";

type SectionKey = Exclude<keyof EstimatorInput, "meta"> | "meta";

type BaseField = {
  path: `${SectionKey}.${string}`;
  label: string;
  help: string;
  advanced?: boolean;
};

type NumberField = BaseField & {
  type: "number";
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
};

type ToggleField = BaseField & {
  type: "toggle";
};

type SelectField = BaseField & {
  type: "select";
  options: Array<{ label: string; value: string }>;
};

type TextField = BaseField & {
  type: "text";
};

export type FieldConfig = NumberField | ToggleField | SelectField | TextField;

export type FieldGroup = {
  id: string;
  title: string;
  blurb: string;
  fields: FieldConfig[];
};

export const fieldGroups: FieldGroup[] = [
  {
    id: "meta",
    title: "Vehicle & value",
    blurb: "Only the inputs needed for cash purchase, Austrian EV tax split, and resale.",
    fields: [
      {
        path: "purchase.purchasePrice",
        type: "number",
        label: "Purchase price",
        help: "Final gross vehicle price used directly in the cash-purchase model.",
        step: 100,
        min: 0
      },
      {
        path: "purchase.registrationCosts",
        type: "number",
        label: "Registration costs",
        help: "One-off registration, plates, and dealer handling fee at purchase time.",
        step: 10,
        min: 0,
        advanced: true
      },
      {
        path: "purchase.wltpRangeKm",
        type: "number",
        label: "WLTP range",
        help: "Official range reference used in the vehicle profile and as a modest resale attractiveness signal.",
        step: 1,
        min: 150,
        suffix: "km"
      },
      {
        path: "purchase.ratedMotorPowerKw",
        type: "number",
        label: "Tax power (kW)",
        help: "Use the Austrian tax-relevant rated power if known. The app derives the motorbezogene tax from this and vehicle mass.",
        step: 1,
        min: 10,
        advanced: true
      },
      {
        path: "purchase.vehicleWeightKg",
        type: "number",
        label: "Vehicle weight (kg)",
        help: "Used with tax power to derive the EV motor tax share.",
        step: 10,
        min: 800,
        advanced: true
      },
      {
        path: "purchase.expectedResalePercent",
        type: "number",
        label: "Expected resale percent",
        help: "Estimated remaining value as a percentage of purchase price before mileage and condition adjustments.",
        step: 1,
        min: 0,
        max: 100,
        suffix: "%"
      }
    ]
  },
  {
    id: "insurance",
    title: "Insurance & tax",
    blurb: "Insurance is treated mainly as the quote you enter, plus the derived Austrian motor tax split.",
    fields: [
      {
        path: "insurance.monthlyPremium",
        type: "number",
        label: "Monthly premium",
        help: "Use the premium you were quoted. If it already includes the motor tax, keep the next switch enabled.",
        step: 1,
        min: 0
      },
      {
        path: "insurance.includesMotorTax",
        type: "toggle",
        label: "Premium includes motor tax",
        help: "If enabled, the app shows the derived tax as an included share instead of adding it on top."
      },
      {
        path: "insurance.premiumInflation",
        type: "number",
        label: "Premium inflation",
        help: "Expected annual premium increase.",
        step: 0.1,
        min: 0,
        suffix: "%",
        advanced: true
      }
    ]
  },
  {
    id: "parking",
    title: "Parking",
    blurb: "Model private parking and the optional Vienna Parkpickerl separately. They can both apply at the same time.",
    fields: [
      {
        path: "parking.monthlyParkingCost",
        type: "number",
        label: "Private parking monthly cost",
        help: "Garage or private space rent. Set this to 0 if you do not use private parking.",
        step: 1,
        min: 0
      },
      {
        path: "parking.residentPermitEnabled",
        type: "toggle",
        label: "Include Parkpickerl",
        help: "Enable if you want to include the Vienna resident parking permit on top of any private parking cost."
      },
      {
        path: "parking.residentPermitAnnual",
        type: "number",
        label: "Parkpickerl annual cost",
        help: "Current annual Vienna Parkpickerl amount. This is added only when the toggle is enabled.",
        step: 1,
        min: 0,
        advanced: true
      },
      {
        path: "parking.parkingInflation",
        type: "number",
        label: "Parking inflation",
        help: "Annual increase in parking related spend.",
        step: 0.1,
        min: 0,
        suffix: "%",
        advanced: true
      }
    ]
  },
  {
    id: "driving",
    title: "Driving usage",
    blurb: "Distance and drive-cycle assumptions feed charging and resale.",
    fields: [
      {
        path: "driving.monthlyKm",
        type: "number",
        label: "Monthly kilometres",
        help: "Baseline usage before seasonal and annual mileage adjustments.",
        step: 10,
        min: 0
      },
      {
        path: "driving.cityShare",
        type: "number",
        label: "City share",
        help: "Share of driving in urban stop-start conditions.",
        step: 1,
        min: 0,
        max: 100,
        suffix: "%",
        advanced: true
      },
      {
        path: "driving.motorwayShare",
        type: "number",
        label: "Motorway share",
        help: "Share of faster motorway driving.",
        step: 1,
        min: 0,
        max: 100,
        suffix: "%",
        advanced: true
      },
      {
        path: "driving.mixedShare",
        type: "number",
        label: "Mixed share",
        help: "Remaining mixed driving. The total split must equal 100%.",
        step: 1,
        min: 0,
        max: 100,
        suffix: "%",
        advanced: true
      },
      {
        path: "driving.seasonalUsageAdjustment",
        type: "number",
        label: "Seasonal usage adjustment",
        help: "Captures holiday peaks or winter dips in annual mileage.",
        step: 0.5,
        min: 0,
        suffix: "%",
        advanced: true
      },
      {
        path: "driving.annualMileageChange",
        type: "number",
        label: "Annual mileage growth",
        help: "Expected growth or decline in annual mileage.",
        step: 0.5,
        min: -15,
        max: 15,
        suffix: "%",
        advanced: true
      }
    ]
  },
  {
    id: "charging",
    title: "Charging",
    blurb: "Public charging is modeled as a first-class workflow, including AC/DC mix and losses.",
    fields: [
      {
        path: "charging.consumptionKwhPer100Km",
        type: "number",
        label: "Consumption",
        help: "Vehicle energy use before winter penalties and charging losses.",
        step: 0.1,
        min: 8,
        suffix: "kWh/100km"
      },
      {
        path: "charging.acShare",
        label: "AC share",
        type: "number",
        help: "Share of energy taken from slower public AC chargers.",
        step: 1,
        min: 0,
        max: 100,
        suffix: "%",
        advanced: true
      },
      {
        path: "charging.dcShare",
        type: "number",
        label: "DC share",
        help: "Share of energy taken from faster public DC chargers.",
        step: 1,
        min: 0,
        max: 100,
        suffix: "%",
        advanced: true
      },
      {
        path: "charging.acTariff",
        type: "number",
        label: "AC tariff",
        help: "Editable because public tariffs change faster than regulation.",
        step: 0.01,
        min: 0,
        suffix: "EUR/kWh"
      },
      {
        path: "charging.dcTariff",
        type: "number",
        label: "DC tariff",
        help: "Third-party public DC charging price.",
        step: 0.01,
        min: 0,
        suffix: "EUR/kWh"
      },
      {
        path: "charging.superchargerShare",
        type: "number",
        label: "Supercharger share",
        help: "Share of DC charging done on Tesla Superchargers versus third-party DC.",
        step: 1,
        min: 0,
        max: 100,
        suffix: "%",
        advanced: true
      },
      {
        path: "charging.superchargerTariff",
        type: "number",
        label: "Supercharger tariff",
        help: "Editable Tesla tariff assumption.",
        step: 0.01,
        min: 0,
        suffix: "EUR/kWh",
        advanced: true
      },
      {
        path: "charging.chargingLosses",
        type: "number",
        label: "Charging losses",
        help: "Energy lost during conversion and charging sessions.",
        step: 0.5,
        min: 0,
        max: 35,
        suffix: "%",
        advanced: true
      },
      {
        path: "charging.winterEfficiencyPenalty",
        type: "number",
        label: "Winter efficiency penalty",
        help: "Cold-weather energy penalty applied on top of baseline consumption.",
        step: 0.5,
        min: 0,
        max: 30,
        suffix: "%",
        advanced: true
      },
      {
        path: "charging.idleFeesAnnual",
        type: "number",
        label: "Idle and blocking fees reserve",
        help: "Annual reserve for session idle fees or overstay costs.",
        step: 5,
        min: 0,
        advanced: true
      },
      {
        path: "charging.energyPriceInflation",
        type: "number",
        label: "Energy price inflation",
        help: "Annual expected growth in charging tariffs.",
        step: 0.1,
        min: 0,
        max: 20,
        suffix: "%",
        advanced: true
      }
    ]
  }
];
