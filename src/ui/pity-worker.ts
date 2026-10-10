import { calculatePityPlan, type PityPlanRequest } from "./pity-plan.js";

self.addEventListener("message", (event: MessageEvent<PityPlanRequest>) => {
  try {
    self.postMessage({ result: calculatePityPlan(event.data) });
  } catch (error) {
    self.postMessage({
      error:
        error instanceof Error
          ? error.message
          : "Unable to calculate these odds.",
    });
  }
});
