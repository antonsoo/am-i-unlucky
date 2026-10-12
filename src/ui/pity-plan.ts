import {
  pityDistribution,
  pityDistributionPoints,
  pityLuckPercentile,
  pityLuckComparison,
  summarizePity,
  validatePityInput,
  type PityConfig,
  type PityUserState,
} from "../math/pity.js";

export interface PityPlanRequest {
  config: PityConfig;
  initial: PityUserState;
  target: number;
  budget: number;
  actualPulls: number;
}

export function validatePityRequest(request: PityPlanRequest): void {
  validatePityInput(request.config, request.initial, request.target);
  for (const [name, value] of [
    ["Pull budget", request.budget],
    ["Actual pulls", request.actualPulls],
  ] as const) {
    if (!Number.isSafeInteger(value) || value < 0)
      throw new RangeError(`${name} must be a non-negative whole number.`);
  }
}

export function calculatePityPlan(request: PityPlanRequest) {
  validatePityRequest(request);
  const dist = pityDistribution(
    request.config,
    request.initial,
    request.target,
  );
  const summary = summarizePity(dist);
  return {
    exact: dist.exact,
    horizon: dist.horizon,
    tailMass: dist.tailMass,
    impossible: dist.impossible,
    expectedPulls: summary.expectedPulls,
    stdDevPulls: summary.stdDevPulls,
    pullsFor: summary.pullsFor,
    withinBudget: summary.probabilityWithinBudget(request.budget),
    historyPercentile: pityLuckPercentile(dist, request.actualPulls),
    historyComparison: pityLuckComparison(dist, request.actualPulls),
    points: pityDistributionPoints(dist, 220),
  };
}

export type PityPlan = ReturnType<typeof calculatePityPlan>;
