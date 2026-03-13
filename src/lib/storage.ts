import { exampleScenarios, STORAGE_VERSION } from "./defaults";
import { savedScenarioListSchema } from "./schema";
import type { SavedScenario } from "./types";
import { uid } from "./utils";

const STORAGE_KEY = "austria-ev-tco.scenarios";
const SELECTED_SCENARIO_KEY = "austria-ev-tco.selected-scenario-id";

const readScenarios = (): SavedScenario[] | null => {
  const raw = localStorage.getItem(STORAGE_KEY);
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
  return readScenarios() ?? exampleScenarios;
};

export const saveScenarios = (scenarios: SavedScenario[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
};

export const loadSelectedScenarioId = () => {
  return localStorage.getItem(SELECTED_SCENARIO_KEY);
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
