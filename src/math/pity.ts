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
import type { CompletedLuck } from "./luck.js";

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
  /**
   * Measured per-pull hit probabilities, `rates[n - 1]` being the chance on pull n of a streak.
   * When set they replace the base rate and ramp for pulls before `hardPity`; the chain, the
   * guarantee and the hard pity are unchanged, so the result is still exact for that table.
   */
  rates?: readonly number[];
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
  /** True when the complete finite support was calculated. */
  exact: boolean;
  /** Probability mass beyond the computed horizon (0 when exact). */
  tailMass: number;
  horizon: number;
  /** Full-distribution moments, calculated independently of the plotted horizon. */
  expectedPulls: number;
  stdDevPulls: number;
  impossible: boolean;
}

const ABSOLUTE_HORIZON_CAP = 200_000;

/**
 * The most (copies still needed, pity, guarantee) states the walk keeps: 4,000 for the
 * product of the target and the hard pity, e.g. 44 copies at a hard pity of 90. The work
 * grows with the square of that product, and at this size it is a few seconds; with no
 * limit, a mistyped target froze the page for minutes.
 */
export const MAX_PITY_STATES = 8_000;

/** Stop an unbounded plot here, retaining its residual mass and unknown later values. */
const STOP_BELOW = 1e-15;

/** Renewal moments. A tier hit resets pity; its featured roll is independent of
 * the time spent reaching it. No probability tail is discarded from these moments.
 */
function moments(config: PityConfig, initial: PityUserState, target: number) {
  let mean = 0;
  let variance = 0;
  let initialMean = 0;
  let initialVariance = 0;
  for (let pity = config.hardPity - 1; pity >= 0; pity--) {
    const rate = itemTierRate(pity, config);
    variance = (1 - rate) * variance + rate * (1 - rate) * mean * mean;
    mean = 1 + (1 - rate) * mean;
    if (pity === initial.pity) {
      initialMean = mean;
      initialVariance = variance;
    }
  }
  const f = config.featuredRate;
  if (!config.hasGuarantee) {
    if (f === 0) return { expectedPulls: Infinity, stdDevPulls: NaN };
    const extraHits = (target - f) / f;
    return {
      expectedPulls: initialMean + extraHits * mean,
      // Hypot avoids overflowing a squared standard deviation for very rare rates.
      stdDevPulls: Math.hypot(
        Math.sqrt(initialVariance),
        variance === 0 ? 0 : Math.sqrt(extraHits) * Math.sqrt(variance),
        (Math.sqrt(target * (1 - f)) * mean) / f,
      ),
    };
  }
  const firstMiss = initial.guaranteed ? 0 : 1 - f;
  const extraHits = firstMiss + (target - 1) * (2 - f);
  return {
    expectedPulls: initialMean + extraHits * mean,
    stdDevPulls: Math.sqrt(
      initialVariance +
        extraHits * variance +
        (firstMiss * (1 - firstMiss) + (target - 1) * f * (1 - f)) *
          mean *
          mean,
    ),
  };
}

export function validatePityInput(
  config: PityConfig,
  initial: PityUserState,
  target: number,
): void {
  if (!Number.isSafeInteger(target) || target < 1)
    throw new RangeError("Copies wanted must be a positive whole number.");
  if (!Number.isSafeInteger(config.hardPity) || config.hardPity < 1)
    throw new RangeError("Hard pity must be a positive whole number.");
  if (
    !Number.isSafeInteger(initial.pity) ||
    initial.pity < 0 ||
    initial.pity >= config.hardPity
  ) {
    throw new RangeError(
      "Current pity must be a whole number from zero through hard pity minus one.",
    );
  }
  if (!Number.isSafeInteger(config.softPityStart) || config.softPityStart < 1) {
    throw new RangeError(
      "Soft pity must start at a positive whole pull number.",
    );
  }
  for (const [name, value] of [
    ["Base rate", config.baseRate],
    ["Featured rate", config.featuredRate],
  ] as const) {
    if (!Number.isFinite(value) || value < 0 || value > 1)
      throw new RangeError(`${name} must be from 0% through 100%.`);
  }
  if (
    !Number.isFinite(config.softPityIncrement) ||
    config.softPityIncrement < 0
  )
    throw new RangeError("Ramp per pull must be finite and non-negative.");
  if (
    config.rates?.some((rate) => !Number.isFinite(rate) || rate < 0 || rate > 1)
  ) {
    throw new RangeError(
      "Measured rates must be finite probabilities from zero through one.",
    );
  }
  if (target * config.hardPity * 2 > MAX_PITY_STATES) {
    throw new RangeError(
      `That is ${target} copies at a hard pity of ${config.hardPity}: more states than this tracks exactly ` +
        `(the product can be at most ${MAX_PITY_STATES / 2}). Lower one of them.`,
    );
  }
}

/** Per-pull item-tier hit probability, given pulls-since-last-hit. */
export function itemTierRate(pity: number, config: PityConfig): number {
  const pullNumber = pity + 1;
  if (pullNumber >= config.hardPity) return 1;
  const measured = config.rates?.[pullNumber - 1];
  if (measured !== undefined) return clampProbability(measured);
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
  validatePityInput(config, initial, target);

  const bounded = config.hasGuarantee || config.featuredRate === 1;
  const horizon = bounded
    ? target * 2 * config.hardPity + 1
    : Math.min(
        ABSOLUTE_HORIZON_CAP,
        Math.max(target * 20 * config.hardPity, 5000),
      );

  const hardPity = config.hardPity;
  const size = target * hardPity * 2;
  const fullMoments = moments(config, initial, target);
  const impossible = !config.hasGuarantee && config.featuredRate === 0;
  if (impossible)
    return {
      pmf: new Float64Array(1),
      exact: false,
      tailMass: 1,
      horizon: 0,
      impossible,
      ...fullMoments,
    };
  let state = new Float64Array(size);
  let next = new Float64Array(size);
  state[
    stateIndex(
      0,
      initial.pity,
      initial.guaranteed && config.hasGuarantee,
      hardPity,
    )
  ] = 1;

  const pmf = new Float64Array(horizon + 1);

  let lastPull = horizon;

  for (let t = 1; t <= horizon; t++) {
    next.fill(0);
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
    [state, next] = [next, state];

    // Sum the live states directly: subtracting the CDF from one loses tiny tails.
    // Only an unbounded plot may stop early; its later probabilities stay unknown.
    if (!bounded && t % 32 === 0) {
      let remaining = 0;
      for (let i = 0; i < size; i++) remaining += state[i]!;
      if (remaining < STOP_BELOW) {
        lastPull = t;
        break;
      }
    }
  }

  let remaining = 0;
  for (const mass of state) remaining += mass;

  return {
    pmf: lastPull < horizon ? pmf.slice(0, lastPull + 1) : pmf,
    exact: bounded,
    tailMass: clampProbability(remaining),
    horizon: lastPull,
    impossible,
    ...fullMoments,
  };
}

export interface PitySummary {
  expectedPulls: number;
  stdDevPulls: number;
  /** null: not reached within the calculated horizon; Infinity: impossible. */
  pullsFor: { p50: number | null; p90: number | null; p99: number | null };
  /** null beyond an unbounded distribution's computed horizon. */
  probabilityWithinBudget: (budget: number) => number | null;
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

  const cdf = cumulative(pmf);
  const findQuantile = (target: number): number | null => {
    if (dist.impossible) return Infinity;
    for (let t = 0; t < cdf.length; t++) {
      if (cdf[t]! >= target) return t;
    }
    return null;
  };

  return {
    expectedPulls: dist.expectedPulls,
    stdDevPulls: dist.stdDevPulls,
    pullsFor: {
      p50: findQuantile(0.5),
      p90: findQuantile(0.9),
      p99: findQuantile(0.99),
    },
    probabilityWithinBudget: (budget: number) => {
      if (!Number.isSafeInteger(budget) || budget < 0)
        throw new RangeError(
          "Pull budget must be a non-negative whole number.",
        );
      if (dist.impossible) return 0;
      if (budget > dist.horizon && !dist.exact) return null;
      const t = Math.min(Math.max(0, Math.floor(budget)), cdf.length - 1);
      return clampProbability(cdf[t]!);
    },
  };
}

/** Three disjoint completion outcomes, including the unplotted live tail. */
export function pityLuckComparison(
  dist: PityDistribution,
  actualPulls: number,
): CompletedLuck | null {
  if (!Number.isSafeInteger(actualPulls) || actualPulls < 1 || dist.impossible)
    return null;
  const tied = dist.pmf[actualPulls];
  if (actualPulls > dist.horizon || tied === undefined || tied === 0)
    return null;
  let earlier = 0;
  let later = dist.tailMass;
  for (let t = 0; t < dist.pmf.length; t++) {
    if (t < actualPulls) earlier += dist.pmf[t]!;
    else if (t > actualPulls) later += dist.pmf[t]!;
  }
  return {
    kind: "completed",
    earlier: clampProbability(earlier),
    tied,
    later: clampProbability(later),
  };
}

/** Strictly-later share, retained for callers; alone it cannot rate same-attempt ties. */
export function pityLuckPercentile(
  dist: PityDistribution,
  actualPulls: number,
): number | null {
  if (!Number.isSafeInteger(actualPulls) || actualPulls < 1 || dist.impossible)
    return null;
  if (actualPulls > dist.horizon || dist.pmf[actualPulls] === 0) return null;
  const cdf = cumulative(dist.pmf);
  const t = Math.min(Math.max(0, Math.floor(actualPulls)), cdf.length - 1);
  // Match simple mode: the share taking strictly more pulls, excluding ties.
  return 100 * clampProbability(1 - cdf[t]!);
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
  if (points[points.length - 1]?.pulls !== effectiveEnd) {
    points.push({
      pulls: effectiveEnd,
      pmf: dist.pmf[effectiveEnd]!,
      cdf: cdf[effectiveEnd]!,
    });
  }
  return points;
}
