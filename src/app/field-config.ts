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
    blurb: "Purchase price, tax-relevant specs, and resale assumptions.",
    fields: [
      {
        path: "purchase.purchasePrice",
        type: "number",
        label: "Purchase price",
        help: "Final gross car price paid in cash. A higher value raises upfront cash outflow and usually raises the resale amount too, but not enough to offset the higher purchase cost.",
        step: 100,
        min: 0
      },
      {
        path: "purchase.registrationCosts",
        type: "number",
        label: "Registration costs",
        help: "One-off registration, plates, and dealer handling fee at purchase time. This adds directly to initial cash outflow and TCO.",
        step: 10,
        min: 0,
        advanced: true
      },
      {
        path: "purchase.wltpRangeKm",
        type: "number",
        label: "WLTP range",
        help: "Official range reference used as a modest resale-attractiveness input. Higher range can slightly improve estimated resale value, but it does not directly change charging consumption in the model.",
        step: 1,
        min: 150,
        suffix: "km"
      },
      {
        path: "purchase.ratedMotorPowerKw",
        type: "number",
        label: "Tax power",
        help: "Use the Austrian tax-relevant rated power if known. Higher tax power increases the derived Austrian motor tax and therefore raises the insurance-and-tax bucket.",
        step: 1,
        min: 10,
        advanced: true,
        suffix: "kW"
      },
      {
        path: "purchase.vehicleWeightKg",
        type: "number",
        label: "Vehicle weight",
        help: "Used with tax power to derive the Austrian motor tax share. Higher weight increases the derived motor tax and therefore raises the insurance-and-tax bucket.",
        step: 10,
        min: 800,
        advanced: true,
        suffix: "kg"
      },
      {
        path: "purchase.expectedResalePercent",
        type: "number",
        label: "Expected resale percent",
        help: "Estimated remaining value at the sale point as a percentage of purchase price. Higher resale percent lowers net TCO because more value is recovered when the car is sold.",
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
    blurb: "Your insurance quote, plus the derived Austrian motor tax split.",
    fields: [
      {
        path: "insurance.monthlyPremium",
        type: "number",
        label: "Monthly premium",
        help: "Use the monthly insurance quote you were given. Higher premium raises TCO linearly year after year. If the quote already bundles motor tax, keep the next switch enabled.",
        step: 1,
        min: 0
      },
      {
        path: "insurance.includesMotorTax",
        type: "toggle",
        label: "Premium includes motor tax",
        help: "If enabled, the app treats part of the entered premium as the derived Austrian motor tax instead of adding motor tax on top. Turn it off only if your insurance quote excludes that tax."
      },
      {
        path: "insurance.premiumInflation",
        type: "number",
        label: "Premium inflation",
        help: "Expected annual insurance renewal increase. Higher inflation makes later years more expensive and raises long-horizon TCO.",
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
    blurb: "Private parking and the optional resident permit are modeled separately.",
    fields: [
      {
        path: "parking.monthlyParkingCost",
        type: "number",
        label: "Private parking monthly cost",
        help: "Garage or private space rent. Set it to 0 if you do not use private parking. Higher values raise TCO directly every month.",
        step: 1,
        min: 0
      },
      {
        path: "parking.residentPermitEnabled",
        type: "toggle",
        label: "Include resident permit",
        help: "Adds the resident parking permit on top of private parking. Enable it if you expect to pay that recurring permit cost during ownership."
      },
      {
        path: "parking.residentPermitAnnual",
        type: "number",
        label: "Resident permit annual cost",
        help: "Annual resident permit amount. This is added only when the toggle is enabled, so a higher value raises the parking bucket directly.",
        step: 1,
        min: 0,
        advanced: true
      },
      {
        path: "parking.parkingInflation",
        type: "number",
        label: "Parking inflation",
        help: "Expected annual growth in parking spend. Higher inflation makes parking more expensive in later years and raises long-horizon TCO.",
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
    blurb: "Distance and driving mix feed charging cost and resale.",
    fields: [
      {
        path: "driving.monthlyKm",
        type: "number",
        label: "Monthly kilometres",
        help: "Baseline driving distance before seasonal and annual mileage adjustments. Higher kilometres increase energy use, charging cost, and total distance, and can also reduce resale value indirectly through heavier use.",
        step: 10,
        min: 0
      },
      {
        path: "driving.cityShare",
        type: "number",
        label: "City share",
        help: "Share of driving in urban stop-start conditions. In this model, more city driving slightly lowers energy use versus motorway driving, so it can reduce charging demand and charging cost.",
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
        help: "Share of faster motorway driving. In this model, more motorway driving raises energy use versus city driving, so it tends to increase charging demand and charging cost.",
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
        help: "Remaining mixed driving between city and motorway. The three shares should total 100%. It affects the blended drive-cycle efficiency used for yearly charging demand.",
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
        help: "Adjusts yearly distance above or below a simple 12 x monthly-km baseline. Higher values mean more yearly driving, which increases charging demand, charging cost, and total kilometres.",
        step: 0.5,
        min: 0,
        suffix: "%",
        advanced: true
      },
      {
        path: "driving.annualMileageChange",
        type: "number",
        label: "Annual mileage growth",
        help: "Expected yearly increase or decrease in kilometres after year one. Higher growth raises later-year charging demand and total cost over longer ownership periods.",
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
    blurb: "Public charging with AC/DC mix, losses, winter effects, and tariff inflation.",
    fields: [
      {
        path: "charging.consumptionKwhPer100Km",
        type: "number",
        label: "Consumption",
        help: "Baseline vehicle energy use before winter penalties and charging losses. Higher consumption increases yearly kWh demand directly, so it raises charging cost materially.",
        step: 0.1,
        min: 8,
        suffix: "kWh / 100 km"
      },
      {
        path: "charging.acShare",
        label: "AC share",
        type: "number",
        help: "Share of total charging taken from public AC chargers. Raising AC share lowers cost if AC is cheaper than DC, and raises cost if AC is more expensive than your DC mix.",
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
        help: "Share of total charging taken from public DC chargers. Raising DC share increases or decreases cost depending on how expensive DC is relative to AC in your current tariff mix.",
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
        help: "Price per kWh paid on public AC charging. Higher AC tariff raises the blended charging price and therefore increases charging cost according to your AC share.",
        step: 0.01,
        min: 0,
        suffix: "EUR/kWh"
      },
      {
        path: "charging.dcTariff",
        type: "number",
        label: "DC tariff",
        help: "Price per kWh paid on third-party public DC charging. Higher DC tariff raises the blended charging price and therefore increases charging cost according to your DC share.",
        step: 0.01,
        min: 0,
        suffix: "EUR/kWh"
      },
      {
        path: "charging.superchargerShare",
        type: "number",
        label: "Supercharger share",
        help: "Share of DC charging done on Tesla Superchargers instead of third-party DC. It changes the DC blended tariff depending on whether the Supercharger tariff is cheaper or more expensive than other DC charging.",
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
        help: "Price per kWh paid on Tesla Superchargers. Higher values raise charging cost in proportion to how much of your DC charging is done on Superchargers.",
        step: 0.01,
        min: 0,
        suffix: "EUR/kWh",
        advanced: true
      },
      {
        path: "charging.chargingLosses",
        type: "number",
        label: "Charging losses",
        help: "Energy lost between the charger and the battery during charging sessions. Higher losses mean you pay for more grid energy than the car actually stores, so charging cost rises.",
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
        help: "Cold-weather energy penalty applied on top of baseline consumption. Higher winter penalty increases yearly kWh demand and therefore raises charging cost.",
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
        help: "Annual reserve for overstay, blocking, or idle fees. This does not change energy use, but it increases the charging bucket directly as a fixed annual charging-access cost.",
        step: 5,
        min: 0,
        advanced: true
      },
      {
        path: "charging.energyPriceInflation",
        type: "number",
        label: "Energy price inflation",
        help: "Expected annual growth in charging tariffs. Higher energy inflation makes later years more expensive even if your driving and consumption stay unchanged.",
        step: 0.1,
        min: 0,
        max: 20,
        suffix: "%",
        advanced: true
      }
    ]
  }
];
