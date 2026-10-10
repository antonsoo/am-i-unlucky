import type { PityPlan, PityPlanRequest } from "./pity-plan.js";
import { runCalculation } from "./calculation-engine.js";

export function runPityPlan(
  request: PityPlanRequest,
  signal: AbortSignal,
): Promise<PityPlan> {
  return runCalculation(
    () =>
      new Worker(new URL("./pity-worker.ts", import.meta.url), {
        type: "module",
      }),
    request,
    signal,
    "The calculation took too long. Try fewer copies or a lower hard pity.",
  );
}
