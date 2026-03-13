import { exampleScenarios, STORAGE_VERSION } from "./defaults";
import { savedScenarioListSchema } from "./schema";
import type { SavedScenario } from "./types";
import { uid } from "./utils";

const STORAGE_KEY = "austria-ev-tco.scenarios";
const LEGACY_STORAGE_KEY = "vienna-car-cost-analyzer.scenarios";
const SELECTED_SCENARIO_KEY = "austria-ev-tco.selected-scenario-id";
const LEGACY_SELECTED_SCENARIO_KEY = "vienna-car-cost-analyzer.selected-scenario-id";

const readScenarios = (key: string): SavedScenario[] | null => {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    const result = savedScenarioListSchema.parse(parsed);
    if (result.some((scenario) => scenario.version !== STORAGE_VERSION)) {
      return null;
    }
    return result;
  } catch {
    return null;
  }
};

export const loadScenarios = (): SavedScenario[] => {
  const current = readScenarios(STORAGE_KEY);
  if (current) {
    return current;
  }

  const legacy = readScenarios(LEGACY_STORAGE_KEY);
  if (legacy) {
    saveScenarios(legacy);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return legacy;
  }

  return exampleScenarios;
};

export const saveScenarios = (scenarios: SavedScenario[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
};

export const loadSelectedScenarioId = () => {
  const current = localStorage.getItem(SELECTED_SCENARIO_KEY);
  if (current) {
    return current;
  }

  const legacy = localStorage.getItem(LEGACY_SELECTED_SCENARIO_KEY);
  if (legacy) {
    saveSelectedScenarioId(legacy);
    localStorage.removeItem(LEGACY_SELECTED_SCENARIO_KEY);
    return legacy;
  }

  return null;
};

export const saveSelectedScenarioId = (id: string) => {
  localStorage.setItem(SELECTED_SCENARIO_KEY, id);
};

export const createScenario = (
  name: string,
  template: SavedScenario
): SavedScenario => {
  const now = new Date().toISOString();
  return {
    ...template,
    id: uid(),
    name,
    version: STORAGE_VERSION,
    createdAt: now,
    updatedAt: now
  };
};
