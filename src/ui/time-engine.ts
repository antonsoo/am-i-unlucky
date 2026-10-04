import type { TimePlan, TimePlanRequest } from "./time-plan.js";
import { runCalculation } from "./calculation-engine.js";

export function runTimePlan(
  request: TimePlanRequest,
  signal: AbortSignal,
): Promise<TimePlan> {
  return runCalculation(
    () =>
      new Worker(new URL("./time-worker.ts", import.meta.url), {
        type: "module",
      }),
    request,
    signal,
    "The calculation took too long. Try fewer sources or copies, then try again.",
  );
}
