import type {
  CollectionPlan,
  CollectionPlanRequest,
} from "./collection-plan.js";
import { runCalculation } from "./calculation-engine.js";

export function runCollectionPlan(
  request: CollectionPlanRequest,
  signal: AbortSignal,
): Promise<CollectionPlan> {
  return runCalculation(
    () =>
      new Worker(new URL("./collection-worker.ts", import.meta.url), {
        type: "module",
      }),
    request,
    signal,
    "The calculation took too long. Try fewer items, then try again.",
  );
}
