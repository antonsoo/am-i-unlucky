import {
  calculateCollectionPlan,
  type CollectionPlanRequest,
} from "./collection-plan.js";

self.addEventListener(
  "message",
  (event: MessageEvent<CollectionPlanRequest>) => {
    try {
      self.postMessage({ result: calculateCollectionPlan(event.data) });
    } catch (error) {
      self.postMessage({
        error:
          error instanceof Error
            ? error.message
            : "Unable to calculate this collection.",
      });
    }
  },
);
