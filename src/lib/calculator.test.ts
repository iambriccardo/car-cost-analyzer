import { describe, expect, it } from "vitest";
import { fieldGroups } from "../app/field-config";
import { calculateEstimate, deriveMotorTaxAnnual } from "./calculator";
import { defaultInput } from "./defaults";

describe("deriveMotorTaxAnnual", () => {
  it("returns a positive annual tax for EVs based on power and weight", () => {
    const tax = deriveMotorTaxAnnual(defaultInput);
    expect(tax).toBeGreaterThan(0);
  });
});

describe("calculateEstimate", () => {
  it("produces stable headline metrics for the default scenario", () => {
    const result = calculateEstimate(defaultInput, "base", 10);
    expect(result.metrics.totalTco).toBeGreaterThan(20000);
    expect(result.metrics.totalTco).toBeLessThan(80000);
    expect(result.metrics.costPerKm).toBeGreaterThan(0.2);
    expect(result.yearly).toHaveLength(defaultInput.purchase.ownershipYears);
  });

  it("derives the Austrian tax summary clearly for the default Tesla scenario", () => {
    const result = calculateEstimate(defaultInput, "base", 0);
    expect(result.taxes.initial.totalInitialTaxesAndFees).toBeCloseTo(
      defaultInput.purchase.registrationCosts,
      2
    );
    expect(result.taxes.ongoing.motorTaxMonthly).toBeCloseTo(32.46, 2);
    expect(result.taxes.ongoing.motorTaxAnnual).toBeCloseTo(389.52, 2);
  });

  it("keeps default resale in line with the configured residual assumption", () => {
    const result = calculateEstimate(defaultInput, "base", 0);
    expect(result.metrics.estimatedResaleValue).toBeGreaterThan(16000);
    expect(result.metrics.estimatedResaleValue).toBeLessThan(17500);
  });

  it("calculates the default 5-year parking total from private parking, Parkpickerl, and parking inflation", () => {
    const result = calculateEstimate(defaultInput, "base", 0);
    expect(result.breakdown.parking).toBeCloseTo(7127.58, 2);
  });

  it("keeps yearly totals and category totals aligned with headline TCO", () => {
    const result = calculateEstimate(defaultInput, "base", 0);
    const breakdownTotal = Object.values(result.breakdown).reduce(
      (sum, value) => sum + value,
      0
    );
    const finalCumulative = result.yearly.at(-1)?.cumulative ?? 0;

    expect(breakdownTotal).toBeCloseTo(result.metrics.totalTco, 2);
    expect(finalCumulative).toBeCloseTo(result.metrics.totalTco, 2);
  });

  it("keeps each yearly row internally consistent for totals and cumulative roll-forward", () => {
    const result = calculateEstimate(defaultInput, "base", 0);
    let rollingTotal = 0;

    result.yearly.forEach((row) => {
      const recomputedYearTotal =
        row.purchaseAndDepreciation +
        row.financing +
        row.insuranceAndTax +
        row.parking +
        row.charging +
        row.maintenance +
        row.tires +
        row.repairsAndContingencies +
        row.otherCosts;
      rollingTotal += recomputedYearTotal;

      expect(row.total).toBeCloseTo(recomputedYearTotal, 2);
      expect(row.cumulative).toBeCloseTo(rollingTotal, 2);
    });
  });

  it("does not double count motor tax when insurance premium includes it", () => {
    const gross = calculateEstimate(defaultInput, "base", 0);
    const netInput = structuredClone(defaultInput);
    netInput.insurance.includesMotorTax = false;
    const net = calculateEstimate(netInput, "base", 0);
    expect(net.breakdown.insuranceAndTax).toBeGreaterThan(gross.breakdown.insuranceAndTax);
  });

  it("shows better TCO in optimistic mode than pessimistic mode", () => {
    const optimistic = calculateEstimate(defaultInput, "optimistic", 0);
    const pessimistic = calculateEstimate(defaultInput, "pessimistic", 0);
    expect(optimistic.metrics.totalTco).toBeLessThan(pessimistic.metrics.totalTco);
  });

  it("keeps sensitivity points mathematically aligned with the deterministic base case", () => {
    const result = calculateEstimate(defaultInput, "base", 0);

    result.sensitivity.forEach((point) => {
      expect(point.baseValue).toBeCloseTo(result.metrics.totalTco, 2);
      expect(point.deltaLow).toBeCloseTo(point.lowValue - point.baseValue, 2);
      expect(point.deltaHigh).toBeCloseTo(point.highValue - point.baseValue, 2);
    });

    const resale = result.sensitivity.find((point) => point.label === "Residual value assumption");
    const insurance = result.sensitivity.find((point) => point.label === "Insurance premium");

    expect(resale?.deltaLow).toBeGreaterThan(0);
    expect(resale?.deltaHigh).toBeLessThan(0);
    expect(insurance?.deltaLow).toBeLessThan(0);
    expect(insurance?.deltaHigh).toBeGreaterThan(0);
  });

  it("keeps Monte Carlo summary values ordered and bounded by the sampled outcomes", () => {
    const result = calculateEstimate(defaultInput, "base", 120);
    const { simulation } = result;

    expect(simulation.samples).toHaveLength(120);
    expect(simulation.min).toBeLessThanOrEqual(simulation.p10);
    expect(simulation.p10).toBeLessThanOrEqual(simulation.p50);
    expect(simulation.p50).toBeLessThanOrEqual(simulation.p90);
    expect(simulation.p90).toBeLessThanOrEqual(simulation.max);
    expect(simulation.mean).toBeGreaterThanOrEqual(simulation.min);
    expect(simulation.mean).toBeLessThanOrEqual(simulation.max);

    simulation.drivers.forEach((driver, index) => {
      expect(driver.score).toBeGreaterThanOrEqual(0);
      expect(driver.score).toBeLessThanOrEqual(1);
      if (index > 0) {
        expect(simulation.drivers[index - 1].score).toBeGreaterThanOrEqual(driver.score);
      }
    });
  });

  it("keeps cost per km aligned with the reported total kilometres", () => {
    const result = calculateEstimate(defaultInput, "base", 0);
    expect(result.metrics.costPerKm).toBeCloseTo(
      result.metrics.totalTco / result.metrics.totalKm,
      2
    );
  });

  it("includes yearly charging-access reserves inside the charging bucket", () => {
    const withReserve = calculateEstimate(defaultInput, "base", 0);
    const withoutReserveInput = structuredClone(defaultInput);
    withoutReserveInput.charging.idleFeesAnnual = 0;
    const withoutReserve = calculateEstimate(withoutReserveInput, "base", 0);

    expect(withReserve.breakdown.charging).toBeGreaterThan(withoutReserve.breakdown.charging);
  });

  it("stops recurring ownership costs and driven kilometres after the configured resale year", () => {
    const input = structuredClone(defaultInput);
    input.purchase.ownershipYears = 5;
    input.purchase.expectedResaleYear = 3;

    const result = calculateEstimate(input, "base", 0);
    const yearsAfterSale = result.yearly.filter((row) => row.year > 3);
    const kmUntilSale = result.yearly
      .filter((row) => row.year <= 3)
      .reduce((sum, row) => sum + row.kmDriven, 0);

    yearsAfterSale.forEach((row) => {
      expect(row.insuranceAndTax).toBe(0);
      expect(row.parking).toBe(0);
      expect(row.charging).toBe(0);
      expect(row.kmDriven).toBe(0);
      expect(row.energyKwh).toBe(0);
    });

    expect(result.metrics.totalKm).toBeCloseTo(kmUntilSale, 2);
    expect(result.taxes.ongoing.horizonMotorTaxTotal).toBeCloseTo(
      result.taxes.ongoing.motorTaxAnnual * 3,
      2
    );
  });

  it("makes every visible editable field contribute to outputs", () => {
    const base = calculateEstimate(defaultInput, "base", 0);
    const visibleFields = fieldGroups.flatMap((group) => group.fields);

    visibleFields.forEach((field) => {
      const next = structuredClone(defaultInput);
      applyFieldChange(next, field.path);
      const changed = calculateEstimate(next, "base", 0);

      const baseSignature = JSON.stringify({
        metrics: base.metrics,
        taxes: base.taxes,
        yearly: base.yearly
      });
      const changedSignature = JSON.stringify({
        metrics: changed.metrics,
        taxes: changed.taxes,
        yearly: changed.yearly
      });

      expect(changedSignature, `${field.path} should affect outputs`).not.toEqual(
        baseSignature
      );
    });
  });
});

const applyFieldChange = (input: typeof defaultInput, path: string) => {
  const [section, field] = path.split(".");
  const target = input[section as keyof typeof input] as Record<string, unknown>;

  switch (path) {
    case "insurance.includesMotorTax":
    case "parking.residentPermitEnabled":
      target[field] = !(target[field] as boolean);
      return;
    case "purchase.depreciationCurve":
      input.purchase.expectedResaleYear = 4;
      target[field] = "linear";
      return;
    case "purchase.expectedResaleYear":
      target[field] = 4;
      return;
    case "purchase.mileageResaleAdjustmentPer10kKm":
      target[field] = 6;
      return;
    case "insurance.coverageMode":
      target[field] = "liability";
      return;
    case "parking.residentPermitAnnual":
      input.parking.residentPermitEnabled = true;
      target[field] = 240;
      return;
    case "driving.cityShare":
      input.driving.cityShare = 45;
      input.driving.motorwayShare = 30;
      input.driving.mixedShare = 25;
      return;
    case "driving.motorwayShare":
      input.driving.cityShare = 50;
      input.driving.motorwayShare = 30;
      input.driving.mixedShare = 20;
      return;
    case "driving.mixedShare":
      input.driving.cityShare = 35;
      input.driving.motorwayShare = 15;
      input.driving.mixedShare = 50;
      return;
    case "charging.acShare":
      input.charging.acShare = 60;
      input.charging.dcShare = 40;
      return;
    case "charging.dcShare":
      input.charging.acShare = 55;
      input.charging.dcShare = 45;
      return;
    case "charging.superchargerShare":
      target[field] = 35;
      return;
    default: {
      const current = target[field];
      if (typeof current !== "number") {
        throw new Error(`Unhandled non-numeric field: ${path}`);
      }

      const delta = Math.max(Math.abs(current) * 0.1, 1);
      target[field] = current + delta;
    }
  }
};
