/**
 * Pity-system mode: soft pity (linear rate ramp), hard pity (guaranteed hit),
 * and an optional "50/50" featured-item guarantee after a loss.
 *
 * Naive math fails here because the per-pull probability is not constant:
 * once you're inside the soft-pity window it climbs every pull, and a lost
 * 50/50 changes the *next* win's outcome deterministically. We model the
 * exact state machine — state = (pity counter, guarantee flag, copies so
 * far) — and run forward dynamic programming over pulls, which gives the
 * exact distribution of "pulls needed" rather than a simulated one. See
 * docs/MATH.md for the full derivation and why the DP horizon is a true
 * upper bound when the guarantee mechanic is enabled.
 */
import { clampProbability } from "./numeric.js";

export interface PityConfig {
  /** Base per-pull probability of an item-tier hit, before soft pity. */
  baseRate: number;
  /** Pull number (1-indexed, within the current streak) where the ramp begins. */
  softPityStart: number;
  /** Rate added per pull once inside the soft-pity window. */
  softPityIncrement: number;
  /** Pull number at which an item-tier hit is guaranteed (rate = 1). */
  hardPity: number;
  /** Probability an item-tier hit is the featured item (e.g. 0.5 for a "50/50"). */
  featuredRate: number;
  /** Whether losing a featured roll guarantees the next item-tier hit is featured. */
  hasGuarantee: boolean;
}

export interface PityUserState {
  /** Pulls since the last item-tier hit (0 = just reset). */
  pity: number;
  /** Whether the next featured roll is guaranteed (only meaningful if hasGuarantee). */
  guaranteed: boolean;
}

export interface PityDistribution {
  /** pmf[t] = P(exactly t additional pulls needed to reach the target). */
  pmf: Float64Array;
  /** True when the DP horizon is a mathematically exact upper bound (hasGuarantee = true). */
  exact: boolean;
  /** Probability mass beyond the computed horizon (0 when exact). */
  tailMass: number;
  horizon: number;
}

const ABSOLUTE_HORIZON_CAP = 200_000;

/** Per-pull item-tier hit probability, given pulls-since-last-hit. */
export function itemTierRate(pity: number, config: PityConfig): number {
  const pullNumber = pity + 1;
  if (pullNumber >= config.hardPity) return 1;
  if (pullNumber < config.softPityStart) return config.baseRate;
  const stepsIn = pullNumber - config.softPityStart + 1;
  return Math.min(1, config.baseRate + stepsIn * config.softPityIncrement);
}

function stateIndex(
  copies: number,
  pity: number,
  guaranteed: boolean,
  hardPity: number,
): number {
  return (copies * hardPity + pity) * 2 + (guaranteed ? 1 : 0);
}

function addAt(arr: Float64Array, index: number, delta: number): void {
  arr[index] = (arr[index] ?? 0) + delta;
}

/**
 * Exact distribution of pulls needed to obtain `target` additional featured
 * copies, starting from `initial`, via forward DP over the Markov chain.
 */
export function pityDistribution(
  config: PityConfig,
  initial: PityUserState,
  target: number,
): PityDistribution {
  if (target < 1 || !Number.isInteger(target)) {
    throw new RangeError("target must be a positive integer");
  }
  if (config.hardPity < 1) throw new RangeError("hardPity must be >= 1");
  if (initial.pity < 0 || initial.pity >= config.hardPity) {
    throw new RangeError("initial pity must be in [0, hardPity)");
  }

  const horizon = config.hasGuarantee
    ? target * 2 * config.hardPity + 1
    : Math.min(
        ABSOLUTE_HORIZON_CAP,
        Math.max(target * 20 * config.hardPity, 5000),
      );

  const hardPity = config.hardPity;
  const size = target * hardPity * 2;
  let state = new Float64Array(size);
  state[
    stateIndex(
      0,
      initial.pity,
      initial.guaranteed && config.hasGuarantee,
      hardPity,
    )
  ] = 1;

  const pmf = new Float64Array(horizon + 1);

  for (let t = 1; t <= horizon; t++) {
    const next = new Float64Array(size);
    let absorbed = 0;

    for (let copies = 0; copies < target; copies++) {
      for (let pity = 0; pity < hardPity; pity++) {
        for (const g of [false, true]) {
          const prob = state[stateIndex(copies, pity, g, hardPity)]!;
          if (prob === 0) continue;

          const rate = itemTierRate(pity, config);
          const winProb = prob * rate;
          const noWinProb = prob - winProb;

          if (winProb > 0) {
            const featuredProb =
              config.hasGuarantee && g ? 1 : config.featuredRate;
            const gotFeatured = winProb * featuredProb;
            const missed = winProb - gotFeatured;

            if (gotFeatured > 0) {
              if (copies + 1 === target) {
                absorbed += gotFeatured;
              } else {
                addAt(
                  next,
                  stateIndex(copies + 1, 0, false, hardPity),
                  gotFeatured,
                );
              }
            }
            if (missed > 0) {
              // Pity resets on any item-tier hit; guarantee flips on if the mechanic is enabled.
              addAt(
                next,
                stateIndex(copies, 0, config.hasGuarantee, hardPity),
                missed,
              );
            }
          }
          if (noWinProb > 0) {
            const nextPity = Math.min(pity + 1, hardPity - 1);
            addAt(next, stateIndex(copies, nextPity, g, hardPity), noWinProb);
          }
        }
      }
    }

    pmf[t] = absorbed;
    state = next;
  }

  let total = 0;
  for (let t = 0; t <= horizon; t++) total += pmf[t]!;

  return {
    pmf,
    exact: config.hasGuarantee,
    tailMass: Math.max(0, 1 - total),
    horizon,
  };
}

export interface PitySummary {
  expectedPulls: number;
  stdDevPulls: number;
  pullsFor: { p50: number; p90: number; p99: number };
  probabilityWithinBudget: (budget: number) => number;
}

function cumulative(pmf: Float64Array): Float64Array {
  const cdf = new Float64Array(pmf.length);
  let running = 0;
  for (let i = 0; i < pmf.length; i++) {
    running += pmf[i]!;
    cdf[i] = running;
  }
  return cdf;
}

export function summarizePity(dist: PityDistribution): PitySummary {
  const { pmf } = dist;
  let mean = 0;
  for (let t = 0; t < pmf.length; t++) mean += t * pmf[t]!;
  let variance = 0;
  for (let t = 0; t < pmf.length; t++) variance += pmf[t]! * (t - mean) ** 2;

  const cdf = cumulative(pmf);
  const findQuantile = (target: number): number => {
    for (let t = 0; t < cdf.length; t++) {
      if (cdf[t]! >= target) return t;
    }
    return cdf.length - 1;
  };

  return {
    expectedPulls: mean,
    stdDevPulls: Math.sqrt(Math.max(0, variance)),
    pullsFor: {
      p50: findQuantile(0.5),
      p90: findQuantile(0.9),
      p99: findQuantile(0.99),
    },
    probabilityWithinBudget: (budget: number) => {
      const t = Math.min(Math.max(0, Math.floor(budget)), cdf.length - 1);
      return clampProbability(cdf[t]!);
    },
  };
}

/** "How lucky was my history": percentile among players given actual pulls used. */
export function pityLuckPercentile(
  dist: PityDistribution,
  actualPulls: number,
): number {
  const cdf = cumulative(dist.pmf);
  const t = Math.min(Math.max(0, Math.floor(actualPulls)), cdf.length - 1);
  const survivalAtLeast = 1 - (t > 0 ? cdf[t - 1]! : 0);
  return 100 * clampProbability(survivalAtLeast);
}

/** Downsampled {pulls, pmf, cdf} points for charting. */
export function pityDistributionPoints(
  dist: PityDistribution,
  maxPoints = 200,
): { pulls: number; pmf: number; cdf: number }[] {
  const cdf = cumulative(dist.pmf);
  // Trim trailing near-zero mass so the chart doesn't stretch to the full horizon.
  let effectiveEnd = dist.pmf.length - 1;
  while (effectiveEnd > 1 && cdf[effectiveEnd - 1]! > 0.9999) effectiveEnd--;
  effectiveEnd = Math.min(dist.pmf.length - 1, effectiveEnd + 2);

  const step = Math.max(1, Math.ceil(effectiveEnd / maxPoints));
  const points: { pulls: number; pmf: number; cdf: number }[] = [];
  for (let t = 0; t <= effectiveEnd; t += step) {
    points.push({ pulls: t, pmf: dist.pmf[t]!, cdf: cdf[t]! });
  }
  return points;
}
