/**
 * Time-to-drop mode: convert one or more independent attempt sources (each
 * with its own per-attempt rate and how many attempts/day it provides) into
 * a time-to-drop distribution.
 *
 * We collapse the sources into a single per-day "at least one success"
 * probability q, then reuse the exact negative-binomial machinery from
 * simple.ts with the day as the unit of "attempt". This is exact: a day
 * succeeds iff at least one of its independent per-source attempts does,
 * so q = 1 - prod_i (1 - p_i)^{runsPerDay_i} is itself exact, not an
 * approximation.
 */
import {
  attemptsForConfidence,
  binomialSurvival,
  negativeBinomialDistribution,
} from "./simple.js";

export interface AttemptSource {
  name: string;
  /** Per-attempt success probability for this source. */
  p: number;
  /** How many attempts per day this source provides. */
  runsPerDay: number;
}

export interface TimeToDropInput {
  sources: AttemptSource[];
  /** Copies needed. */
  k: number;
}

export interface TimeToDropResult {
  /** Combined probability that at least one success occurs on a given day. */
  dailySuccessRate: number;
  totalRunsPerDay: number;
  expectedDays: number;
  expectedHours: number;
  daysFor: { p50: number; p90: number; p99: number };
  probabilityWithinDays: (days: number) => number;
}

/** Exact per-day "at least one success" probability across independent sources. */
export function combinedDailyRate(sources: AttemptSource[]): number {
  if (sources.length === 0) return 0;
  let probNoSuccess = 1;
  for (const source of sources) {
    if (source.runsPerDay < 0) throw new RangeError("runsPerDay must be >= 0");
    probNoSuccess *= Math.pow(1 - source.p, source.runsPerDay);
  }
  return 1 - probNoSuccess;
}

export function timeToDrop(input: TimeToDropInput): TimeToDropResult {
  const { sources, k } = input;
  if (k < 1 || !Number.isInteger(k))
    throw new RangeError("k must be a positive integer");

  const q = combinedDailyRate(sources);
  const totalRunsPerDay = sources.reduce((sum, s) => sum + s.runsPerDay, 0);
  const expectedDays = q > 0 ? k / q : Infinity;

  return {
    dailySuccessRate: q,
    totalRunsPerDay,
    expectedDays,
    expectedHours: expectedDays * 24,
    daysFor: {
      p50: attemptsForConfidence(k, q, 0.5),
      p90: attemptsForConfidence(k, q, 0.9),
      p99: attemptsForConfidence(k, q, 0.99),
    },
    probabilityWithinDays: (days: number) =>
      binomialSurvival(Math.floor(days), q, k),
  };
}

export function timeToDropDistribution(
  sources: AttemptSource[],
  k: number,
  maxPoints = 200,
) {
  const q = combinedDailyRate(sources);
  return negativeBinomialDistribution(k, q, maxPoints);
}
