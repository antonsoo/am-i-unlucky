import {
  COLLECTION_CDF_RESOLUTION,
  COLLECTION_TRIALS,
  MAX_COLLECTION_ATTEMPTS,
  MAX_EXACT_CDF_ITEMS,
  collectionCdfEvaluator,
  collectionExpectedAttempts,
  collectionMonteCarlo,
  collectionSimulationChance,
  validateCollectionBudget,
  validateCollectionProbabilities,
  type MonteCarloResult,
} from "../math/collection.js";
import type { ChartPoint } from "./chart.js";

export interface CollectionPlanRequest {
  probabilities: number[];
  n: number;
}
export interface CollectionPlan {
  possible: boolean;
  analytic: boolean;
  expectedAttempts: number | null;
  probability: number;
  probabilityInterval: [number, number] | null;
  belowResolution: boolean;
  points: ChartPoint[];
  simulation: Omit<MonteCarloResult, "completionAttempts">;
  agreement: boolean | null;
}

export function calculateCollectionPlan({
  probabilities,
  n,
}: CollectionPlanRequest): CollectionPlan {
  validateCollectionProbabilities(probabilities);
  validateCollectionBudget(n);
  if (!probabilities.length) throw new RangeError("Add at least one item.");
  const possible = !probabilities.includes(0);
  const analytic = probabilities.length <= MAX_EXACT_CDF_ITEMS;
  const simulation = collectionMonteCarlo(probabilities, COLLECTION_TRIALS);
  const { completionAttempts: _samples, ...summary } = simulation;
  const mean = !possible
    ? Infinity
    : analytic
      ? collectionExpectedAttempts(probabilities).expectedAttempts
      : simulation.mean;
  const expectedAttempts = mean !== null && Number.isFinite(mean) ? mean : null;
  const cdf = analytic
    ? collectionCdfEvaluator(probabilities)
    : (at: number) => collectionSimulationChance(simulation, at).value;
  const probability = possible ? cdf(n) : 0;
  const probabilityInterval =
    analytic || !possible
      ? null
      : collectionSimulationChance(simulation, n).ci95;
  const horizon = Math.min(
    MAX_COLLECTION_ATTEMPTS,
    Math.max(1, Math.ceil((expectedAttempts ?? MAX_COLLECTION_ATTEMPTS) * 3)),
  );
  const count = Math.min(160, horizon + 1);
  let previous = 0;
  const points = !possible
    ? []
    : Array.from({ length: count }, (_, i) => {
        const x = Math.round((i * horizon) / (count - 1));
        const value = Math.max(previous, cdf(x));
        const point = { x, cdf: value, pmf: value - previous };
        previous = value;
        return point;
      });
  return {
    possible,
    analytic,
    expectedAttempts,
    probability,
    probabilityInterval,
    belowResolution:
      analytic &&
      possible &&
      n >= probabilities.length &&
      probability < COLLECTION_CDF_RESOLUTION,
    points,
    simulation: summary,
    agreement:
      analytic && expectedAttempts !== null && simulation.ci95 !== null
        ? expectedAttempts >= simulation.ci95[0] &&
          expectedAttempts <= simulation.ci95[1]
        : null,
  };
}
