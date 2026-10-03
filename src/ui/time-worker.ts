import { calculateTimePlan, type TimePlanRequest } from "./time-plan.js";

self.addEventListener("message", (event: MessageEvent<TimePlanRequest>) => {
  try {
    self.postMessage({ result: calculateTimePlan(event.data) });
  } catch (error) {
    self.postMessage({
      error:
        error instanceof Error
          ? error.message
          : "Unable to calculate this schedule.",
    });
  }
});
