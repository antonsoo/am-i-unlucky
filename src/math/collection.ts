/**
 * Collection mode: completing a set of m items with unequal, independent
 * per-attempt probabilities ("set collection" / weighted coupon collector).
 *
 * Both the expected value and the full completion CDF have closed forms via
 * inclusion-exclusion over subsets of items, at the cost of O(2^m) work.
 * That's exact and fast for realistic set sizes (a banner with a dozen
 * items) but exponential, so we cap it and fall back to a documented
 * Monte Carlo estimate (with a reported sample size and confidence
 * interval) above the cap. See docs/MATH.md for the derivation.
 */
import { kahanSum } from "./numeric.js";

export const MAX_EXACT_EXPECTATION_ITEMS = 24;
export const MAX_EXACT_CDF_ITEMS = 18;

export interface CollectionExpectation {
  expectedAttempts: number;
  exact: boolean;
}

function popcount(x: number): number {
  let count = 0;
  while (x) {
    x &= x - 1;
    count++;
  }
  return count;
}

/** subsetSum[mask] = sum of probabilities[i] for each set bit i in mask. */
function buildSubsetSums(probabilities: number[]): Float64Array {
  const m = probabilities.length;
  const sums = new Float64Array(1 << m);
  for (let mask = 1; mask < 1 << m; mask++) {
    const lowestBit = mask & -mask;
    const index = Math.log2(lowestBit);
    sums[mask] = sums[mask & (mask - 1)]! + probabilities[index]!;
  }
  return sums;
}

/**
 * Exact expected number of attempts to collect at least one of every item,
 * via E[T] = sum over nonempty subsets S of (-1)^(|S|+1) / P(S).
 */
export function collectionExpectedAttempts(
  probabilities: number[],
): CollectionExpectation {
  const m = probabilities.length;
  if (m === 0) return { expectedAttempts: 0, exact: true };
  if (probabilities.some((p) => p <= 0))
    return { expectedAttempts: Infinity, exact: true };
  if (m > MAX_EXACT_EXPECTATION_ITEMS) {
    throw new RangeError(
      `Exact expectation supports at most ${MAX_EXACT_EXPECTATION_ITEMS} items (got ${m}).`,
    );
  }

  const subsetSums = buildSubsetSums(probabilities);
  const terms: number[] = [];
  for (let mask = 1; mask < 1 << m; mask++) {
    const sign = popcount(mask) % 2 === 1 ? 1 : -1;
    terms.push(sign / subsetSums[mask]!);
  }
  return { expectedAttempts: kahanSum(terms), exact: true };
}

/**
 * Exact P(all m items collected within n attempts), via
 * P(T <= n) = sum over all subsets S (including empty) of (-1)^|S| * (1 - P(S))^n.
 */
export function collectionCdf(probabilities: number[], n: number): number {
  const m = probabilities.length;
  if (m === 0) return 1;
  if (m > MAX_EXACT_CDF_ITEMS) {
    throw new RangeError(
      `Exact CDF supports at most ${MAX_EXACT_CDF_ITEMS} items (got ${m}).`,
    );
  }
  if (n < 0) return 0;

  const subsetSums = buildSubsetSums(probabilities);
  const terms: number[] = new Array<number>(1 << m).fill(0);
  for (let mask = 0; mask < 1 << m; mask++) {
    const sign = popcount(mask) % 2 === 0 ? 1 : -1;
    const miss = 1 - subsetSums[mask]!;
    terms[mask] = sign * Math.pow(miss, n);
  }
  const result = kahanSum(terms);
  return Math.min(1, Math.max(0, result));
}

export function collectionDistributionPoints(
  probabilities: number[],
  maxN: number,
  maxPoints = 200,
): { n: number; cdf: number }[] {
  const step = Math.max(1, Math.ceil(maxN / maxPoints));
  const points: { n: number; cdf: number }[] = [];
  for (let n = 0; n <= maxN; n += step) {
    points.push({ n, cdf: collectionCdf(probabilities, n) });
  }
  return points;
}

// --- Monte Carlo cross-check -------------------------------------------------

/** Deterministic PRNG (mulberry32) so tests and the "cross-check" panel are reproducible. */
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
  sampleSize: number;
  mean: number;
  stdDev: number;
  /** 95% confidence interval for the mean, normal approximation. */
  ci95: [number, number];
  censored: number;
}

/**
 * Simulate `trials` independent collection runs and report the sample mean
 * attempts-to-completion with a 95% CI, as an independent check on the
 * closed-form CDF/expectation above.
 */
export function collectionMonteCarlo(
  probabilities: number[],
  trials: number,
  rng: () => number = mulberry32(0xc0ffee),
  maxAttemptsPerRun = 2_000_000,
): MonteCarloResult {
  const m = probabilities.length;
  const cumulative: number[] = [];
  let running = 0;
  for (const p of probabilities) {
    running += p;
    cumulative.push(running);
  }

  const samples: number[] = [];
  let censored = 0;

  for (let trial = 0; trial < trials; trial++) {
    const have = new Array<boolean>(m).fill(false);
    let remaining = m;
    let attempts = 0;
    while (remaining > 0 && attempts < maxAttemptsPerRun) {
      attempts++;
      const roll = rng();
      // Find which item (if any) this trial produced.
      let index = -1;
      for (let i = 0; i < m; i++) {
        if (roll < cumulative[i]!) {
          index = i;
          break;
        }
      }
      if (index >= 0 && !have[index]) {
        have[index] = true;
        remaining--;
      }
    }
    if (remaining > 0) {
      censored++;
    } else {
      samples.push(attempts);
    }
  }

  const n = samples.length;
  const mean = n > 0 ? samples.reduce((a, b) => a + b, 0) / n : Infinity;
  const variance =
    n > 1 ? samples.reduce((acc, x) => acc + (x - mean) ** 2, 0) / (n - 1) : 0;
  const stdDev = Math.sqrt(variance);
  const stderr = n > 0 ? stdDev / Math.sqrt(n) : Infinity;

  return {
    sampleSize: trials,
    mean,
    stdDev,
    ci95: [mean - 1.96 * stderr, mean + 1.96 * stderr],
    censored,
  };
}
