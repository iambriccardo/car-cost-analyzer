import { exampleScenarios, STORAGE_VERSION } from "./defaults";
import { savedScenarioListSchema } from "./schema";
import type { SavedScenario } from "./types";
import { uid } from "./utils";

const STORAGE_KEY = "vienna-car-cost-analyzer.scenarios";

export const loadScenarios = (): SavedScenario[] => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return exampleScenarios;
  }

  try {
    const parsed = JSON.parse(raw);
    const result = savedScenarioListSchema.parse(parsed);
    if (result.some((scenario) => scenario.version !== STORAGE_VERSION)) {
      return exampleScenarios;
    }
    return result;
  } catch {
    return exampleScenarios;
  }
};

export const saveScenarios = (scenarios: SavedScenario[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
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
