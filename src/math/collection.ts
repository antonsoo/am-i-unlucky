/** Weighted coupon collector: at most ONE listed item per independent attempt. */
import { kahanSum } from "./numeric.js";

export const MAX_COLLECTION_ITEMS = 32;
export const MAX_EXACT_EXPECTATION_ITEMS = 16;
export const MAX_EXACT_CDF_ITEMS = 16;
export const MAX_COLLECTION_ATTEMPTS = 1_000_000_000;
export const MAX_COLLECTION_TRIALS = 100_000;
export const COLLECTION_TRIALS = 20_000;
/** Below this absolute probability, alternating sums may lose relative precision. */
export const COLLECTION_CDF_RESOLUTION = 1e-9;

export function validateCollectionProbabilities(probabilities: number[]): void {
  if (probabilities.length > MAX_COLLECTION_ITEMS)
    throw new RangeError(`Use at most ${MAX_COLLECTION_ITEMS} items.`);
  if (probabilities.some((p) => !Number.isFinite(p) || p < 0 || p > 1))
    throw new RangeError(
      "Every item rate must be a finite probability from 0% to 100%.",
    );
  // Permit only rounding at the boundary, e.g. a table of equal fractions.
  if (kahanSum(probabilities) > 1 + 4 * Number.EPSILON)
    throw new RangeError(
      "Item rates must add up to at most 100%: one attempt can drop only one listed item.",
    );
}

export function validateCollectionBudget(n: number): void {
  if (!Number.isInteger(n) || n < 0 || n > MAX_COLLECTION_ATTEMPTS)
    throw new RangeError(
      `Your attempt budget must be a whole number from 0 to ${MAX_COLLECTION_ATTEMPTS.toLocaleString("en-US")}.`,
    );
}

function normalized(probabilities: number[]): number[] {
  validateCollectionProbabilities(probabilities);
  const total = kahanSum(probabilities);
  return probabilities.map((p) => p / Math.max(1, total));
}

function subsetSums(p: number[]): Float64Array {
  const sums = new Float64Array(1 << p.length);
  for (let mask = 1; mask < sums.length; mask++) {
    const bit = mask & -mask;
    sums[mask] = sums[mask ^ bit]! + p[Math.log2(bit)]!;
  }
  return sums;
}

export interface CollectionExpectation {
  expectedAttempts: number;
  exact: boolean;
}

/**
 * Positive recurrence on missing sets: E(S) = 1/P(S) + sum p_i/P(S) E(S-i).
 * Scaling by the rarest rate avoids intermediate overflow and cancellation.
 */
export function collectionExpectedAttempts(
  probabilities: number[],
): CollectionExpectation {
  const p = normalized(probabilities);
  if (p.length > MAX_EXACT_EXPECTATION_ITEMS)
    throw new RangeError(
      `Exact expectation supports at most ${MAX_EXACT_EXPECTATION_ITEMS} items.`,
    );
  if (!p.length) return { expectedAttempts: 0, exact: true };
  if (p.includes(0)) return { expectedAttempts: Infinity, exact: true };
  const scale = Math.min(...p);
  const mass = subsetSums(p);
  const means = new Float64Array(mass.length);
  for (let mask = 1; mask < mass.length; mask++) {
    let value = scale / mass[mask]!;
    for (let bits = mask; bits; bits &= bits - 1) {
      const bit = bits & -bits;
      value += (p[Math.log2(bit)]! / mass[mask]!) * means[mask ^ bit]!;
    }
    means[mask] = value;
  }
  return { expectedAttempts: means[means.length - 1]! / scale, exact: true };
}

/** Compile once for a whole chart; never rebuild exponential tables per point. */
export function collectionCdfEvaluator(
  probabilities: number[],
): (n: number) => number {
  const p = normalized(probabilities).sort((a, b) => a - b);
  const m = p.length;
  if (m > MAX_EXACT_CDF_ITEMS)
    throw new RangeError(
      `Exact CDF supports at most ${MAX_EXACT_CDF_ITEMS} items.`,
    );
  const rest = subsetSums(p.slice(1));
  const signs = new Int8Array(rest.length);
  signs[0] = 1;
  for (let mask = 1; mask < signs.length; mask++)
    signs[mask] = -signs[mask & (mask - 1)]!;
  // A positive state recurrence protects small-n tails from cancellation.
  // Its lifetime work is bounded, even when a chart calls this repeatedly.
  const shortHorizon = Math.min(
    256,
    Math.floor(2_000_000 / Math.max(1, m * 2 ** m)),
  );
  const missing = subsetSums(p);
  const full = missing.length - 1;
  let state = new Float64Array(missing.length);
  state[0] = 1;
  const early = [m ? 0 : 1];

  return (n: number): number => {
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0)
      throw new RangeError(
        "Attempts must be a finite, nonnegative whole number.",
      );
    if (!m) return 1;
    if (n < m || p[0] === 0) return 0;
    if (m === 1) return -Math.expm1(n * Math.log1p(-p[0]!));
    if (n === m) {
      // Multiply the factorial first and the rarest rates last, so a
      // representable subnormal result is not lost in an intermediate product.
      let value = 1;
      for (let i = 2; i <= m; i++) value *= i;
      for (let i = m - 1; i >= 0; i--) value *= p[i]!;
      return value;
    }
    if (n <= shortHorizon) {
      while (early.length <= n) {
        const next = new Float64Array(state.length);
        for (let mask = 0; mask <= full; mask++) {
          const weight = state[mask]!;
          if (!weight) continue;
          next[mask] =
            next[mask]! + weight * Math.max(0, 1 - missing[full ^ mask]!);
          for (let bits = full ^ mask; bits; bits &= bits - 1) {
            const bit = bits & -bits;
            next[mask | bit] = next[mask | bit]! + weight * p[Math.log2(bit)]!;
          }
        }
        state = next;
        early.push(Math.min(1, state[full]!));
      }
      return early[n]!;
    }
    // Pair subsets with/without the rarest item. expm1 retains its contribution
    // even when 1-p rounds to 1. Remaining cancellation has an absolute floor.
    let result = 0;
    let correction = 0;
    for (let mask = 0; mask < rest.length; mask++) {
      const sum = Math.min(1, rest[mask]!);
      if (sum === 1) continue;
      const ratio = Math.min(1, p[0]! / (1 - sum));
      const term =
        signs[mask]! *
        Math.exp(n * Math.log1p(-sum)) *
        -Math.expm1(n * Math.log1p(-ratio));
      const y = term - correction;
      const total = result + y;
      correction = total - result - y;
      result = total;
    }
    return Math.min(1, Math.max(0, result));
  };
}

export function collectionCdf(probabilities: number[], n: number): number {
  return collectionCdfEvaluator(probabilities)(n);
}

export function collectionDistributionPoints(
  probabilities: number[],
  maxN: number,
  maxPoints = 160,
): { n: number; cdf: number }[] {
  validateCollectionBudget(maxN);
  if (!Number.isInteger(maxPoints) || maxPoints < 2 || maxPoints > 500)
    throw new RangeError("Use between 2 and 500 chart points.");
  const cdf = collectionCdfEvaluator(probabilities);
  const count = Math.min(maxN + 1, maxPoints);
  return Array.from({ length: count }, (_, i) => {
    const n = count === 1 ? 0 : Math.round((i * maxN) / (count - 1));
    return { n, cdf: cdf(n) };
  });
}

/** Deterministic PRNG for reproducible checks, not for cryptography. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface MonteCarloResult {
  trials: number;
  /** Completed runs, the actual sample available for a completion mean. */
  sampleSize: number;
  censored: number;
  maxAttemptsPerRun: number;
  /** Unavailable if ANY run was censored; never a completers-only average. */
  mean: number | null;
  stdDev: number | null;
  /** Approximate 95% normal interval; unavailable with censoring or <2 runs. */
  ci95: [number, number] | null;
  /** Sorted complete times; censored runs are excluded, but remain in denominators. */
  completionAttempts: number[];
}

/**
 * Jump to each new item: geometric wait at the total unseen rate, followed by
 * a categorical draw among unseen items. At most m jumps per run, even at p=0.
 */
export function collectionMonteCarlo(
  probabilities: number[],
  trials: number,
  rng: () => number = mulberry32(0xc0ffee),
  maxAttemptsPerRun = MAX_COLLECTION_ATTEMPTS,
): MonteCarloResult {
  const p = normalized(probabilities);
  validateCollectionBudget(maxAttemptsPerRun);
  if (!Number.isInteger(trials) || trials < 1 || trials > MAX_COLLECTION_TRIALS)
    throw new RangeError(
      `Use from 1 to ${MAX_COLLECTION_TRIALS} simulation runs.`,
    );
  function uniform(): number {
    const value = rng();
    if (!Number.isFinite(value) || value < 0 || value >= 1)
      throw new RangeError("The random source must produce values in [0, 1).");
    return value;
  }
  const samples: number[] = [];
  // Impossible sets need no random draws at all.
  if (!p.includes(0))
    for (let trial = 0; trial < trials; trial++) {
      const unseen = [...p];
      let attempts = 0;
      while (unseen.length) {
        const total = Math.min(1, kahanSum(unseen));
        const wait =
          total === 1
            ? 1
            : Math.floor(Math.log1p(-uniform()) / Math.log1p(-total)) + 1;
        if (wait > maxAttemptsPerRun - attempts) break;
        attempts += wait;
        const roll = uniform() * total;
        let cumulative = 0;
        let index = unseen.length - 1;
        for (let i = 0; i < unseen.length; i++) {
          cumulative += unseen[i]!;
          if (roll < cumulative) {
            index = i;
            break;
          }
        }
        unseen.splice(index, 1);
      }
      if (!unseen.length) samples.push(attempts);
    }
  samples.sort((a, b) => a - b);
  const censored = trials - samples.length;
  const mean = censored ? null : kahanSum(samples) / trials;
  const stdDev =
    mean === null || trials < 2
      ? null
      : Math.sqrt(kahanSum(samples.map((x) => (x - mean) ** 2)) / (trials - 1));
  const margin = stdDev === null ? null : (1.96 * stdDev) / Math.sqrt(trials);
  return {
    trials,
    sampleSize: samples.length,
    censored,
    maxAttemptsPerRun,
    mean,
    stdDev,
    ci95:
      mean === null || margin === null
        ? null
        : [Math.max(0, mean - margin), mean + margin],
    completionAttempts: samples,
  };
}

/** Wilson interval for an empirical completion chance, including censored runs. */
export function collectionSimulationChance(
  mc: MonteCarloResult,
  n: number,
): { value: number; ci95: [number, number] } {
  validateCollectionBudget(n);
  if (n > mc.maxAttemptsPerRun)
    throw new RangeError("The budget exceeds the simulation horizon.");
  let lo = 0;
  let hi = mc.completionAttempts.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (mc.completionAttempts[mid]! <= n) lo = mid + 1;
    else hi = mid;
  }
  const value = lo / mc.trials;
  const z2 = 1.96 ** 2;
  const denominator = 1 + z2 / mc.trials;
  const center = (value + z2 / (2 * mc.trials)) / denominator;
  const margin =
    (1.96 *
      Math.sqrt(
        (value * (1 - value)) / mc.trials + z2 / (4 * mc.trials ** 2),
      )) /
    denominator;
  return {
    value,
    ci95: [Math.max(0, center - margin), Math.min(1, center + margin)],
  };
}
