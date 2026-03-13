import { beforeEach, describe, expect, it } from "vitest";
import { exampleScenarios } from "./defaults";
import {
  loadScenarios,
  loadSelectedScenarioId,
  saveScenarios,
  saveSelectedScenarioId
} from "./storage";

class LocalStorageMock {
  private store = new Map<string, string>();

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }

  get length() {
    return this.store.size;
  }
}

describe("storage persistence", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: new LocalStorageMock(),
      configurable: true,
      writable: true
    });
  });

  it("persists scenarios under the current Austria storage key", () => {
    saveScenarios(exampleScenarios);

    expect(loadScenarios()).toEqual(exampleScenarios);
    expect(localStorage.getItem("austria-ev-tco.scenarios")).not.toBeNull();
  });

  it("persists and reloads the selected scenario id", () => {
    saveSelectedScenarioId(exampleScenarios[0].id);

    expect(loadSelectedScenarioId()).toBe(exampleScenarios[0].id);
    expect(localStorage.getItem("austria-ev-tco.selected-scenario-id")).toBe(
      exampleScenarios[0].id
    );
  });
});
