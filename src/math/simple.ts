/**
 * Simple drop mode: a fixed per-attempt probability `p`, no pity.
 *
 * The number of attempts needed to see the k-th success is a negative
 * binomial random variable; k = 1 is the geometric distribution. All tail
 * probabilities route through the regularized incomplete beta function
 * (see numeric.ts) rather than summing binomial terms, so they stay exact
 * and fast for n in the millions.
 */
import { binomialPmf, clampProbability } from "./numeric.js";

export interface SimpleDropInput {
  /** Per-attempt success probability, in (0, 1]. */
  p: number;
  /** Attempts made (or budgeted). */
  n: number;
  /** Copies needed / observed (>= 1). */
  k: number;
}

export interface SimpleDropResult {
  /** P(at least k successes in n attempts). */
  probabilityAtLeastK: number;
  /** "Luckier than this fraction of players" (0-100), see docs/MATH.md. */
  luckPercentile: number;
  /** E[attempts to get k successes] = k / p. */
  expectedAttempts: number;
  /** Standard deviation of attempts to get k successes. */
  stdDevAttempts: number;
  /** Smallest n with P(T_k <= n) >= {0.5, 0.9, 0.99}. */
  attemptsFor: { p50: number; p90: number; p99: number };
}

/**
 * The largest variance n p (1 - p) the tail sum is run for: a standard
 * deviation of 100,000 successes, about 900,000 terms. That is ten billion
 * expected successes at even odds, far past any number of attempts a person
 * makes; beyond it the function says so instead of taking seconds per call.
 */
export const MAX_BINOMIAL_VARIANCE = 1e10;

/**
 * The sum of pmf(j) from j = `from` to the end of the support in the given
 * direction. Called only on the side away from the mean, so the first term is
 * the largest and the sum can stop once a term no longer changes it.
 */
function tailSum(
  n: number,
  p: number,
  from: number,
  direction: 1 | -1,
): number {
  let term = binomialPmf(n, p, from);
  let sum = term;
  if (term === 0) return 0;
  const odds = p / (1 - p);
  if (direction === 1) {
    for (let j = from; j < n; j++) {
      term *= ((n - j) / (j + 1)) * odds;
      sum += term;
      if (term < sum * 1e-17) break;
    }
  } else {
    for (let j = from; j > 0; j--) {
      term *= j / (n - j + 1) / odds;
      sum += term;
      if (term < sum * 1e-17) break;
    }
  }
  return sum;
}

/**
 * P(X >= k) for X ~ Binomial(n, p): the pmf summed over whichever tail lies
 * away from the mean (and one minus that, if it is the lower one).
 */
export function binomialSurvival(n: number, p: number, k: number): number {
  if (k <= 0) return 1;
  if (n < 0) throw new RangeError("n must be >= 0");
  if (k > n) return 0;
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  if (n * p * (1 - p) > MAX_BINOMIAL_VARIANCE) {
    throw new RangeError(
      "Too many expected drops to compute exactly: this handles up to about ten billion.",
    );
  }
  if (k > n * p) return clampProbability(tailSum(n, p, k, 1));
  return clampProbability(1 - tailSum(n, p, k - 1, -1));
}

/** P(X <= k) for X ~ Binomial(n, p). */
export function binomialCdf(n: number, p: number, k: number): number {
  if (k < 0) return 0;
  if (k >= n) return 1;
  return clampProbability(1 - binomialSurvival(n, p, k + 1));
}

/** PMF of the geometric distribution: P(first success on attempt n). */
export function geometricPmf(p: number, n: number): number {
  if (n < 1 || !Number.isInteger(n)) return 0;
  if (p <= 0) return 0;
  if (p >= 1) return n === 1 ? 1 : 0;
  return Math.exp((n - 1) * Math.log1p(-p) + Math.log(p));
}

/** CDF of the geometric distribution: P(first success by attempt n). */
export function geometricCdf(p: number, n: number): number {
  if (n < 1) return 0;
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  return clampProbability(-Math.expm1(n * Math.log1p(-p)));
}

/** PMF of the negative binomial "attempts to k-th success": P(T_k = n). */
export function negativeBinomialPmf(k: number, p: number, n: number): number {
  if (k < 1 || !Number.isInteger(k)) return 0;
  if (n < k || !Number.isInteger(n)) return 0;
  if (p <= 0) return 0;
  if (p >= 1) return n === k ? 1 : 0;
  // C(n-1, k-1) p^k q^(n-k) = (k / n) * P(Binomial(n, p) = k).
  return (k / n) * binomialPmf(n, p, k);
}

/** CDF of the negative binomial: P(T_k <= n) = P(Binomial(n, p) >= k). */
export function negativeBinomialCdf(k: number, p: number, n: number): number {
  return binomialSurvival(n, p, k);
}

/** Smallest integer n such that P(T_k <= n) >= target, via monotone search. */
export function attemptsForConfidence(
  k: number,
  p: number,
  target: number,
): number {
  if (target <= 0) return k;
  if (target >= 1) return Infinity;
  if (p <= 0) return Infinity;
  if (p >= 1) return k;

  // Grow an upper bound geometrically from the mean, then binary search.
  const mean = k / p;
  let hi = Math.max(k, Math.ceil(mean));
  while (negativeBinomialCdf(k, p, hi) < target) {
    hi *= 2;
    if (!Number.isFinite(hi) || hi > 1e15) return Infinity;
  }
  let lo = k;
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (negativeBinomialCdf(k, p, mid) >= target) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }
  return lo;
}

/** Luck percentile: what fraction of players needed at least as many attempts as you. */
export function luckPercentile(n: number, p: number, k: number): number {
  return 100 * (1 - binomialSurvival(n, p, k));
}

export function simpleDrop(input: SimpleDropInput): SimpleDropResult {
  const { p, n, k } = input;
  if (p < 0 || p > 1) throw new RangeError("p must be in [0, 1]");
  if (n < 0 || !Number.isInteger(n))
    throw new RangeError("n must be a non-negative integer");
  if (k < 1 || !Number.isInteger(k))
    throw new RangeError("k must be a positive integer");

  const probabilityAtLeastK = binomialSurvival(n, p, k);
  const expectedAttempts = p > 0 ? k / p : Infinity;
  const stdDevAttempts = p > 0 ? Math.sqrt((k * (1 - p)) / (p * p)) : Infinity;

  return {
    probabilityAtLeastK,
    luckPercentile: 100 * (1 - probabilityAtLeastK),
    expectedAttempts,
    stdDevAttempts,
    attemptsFor: {
      p50: attemptsForConfidence(k, p, 0.5),
      p90: attemptsForConfidence(k, p, 0.9),
      p99: attemptsForConfidence(k, p, 0.99),
    },
  };
}

/** Distribution points for charting: P(T_k = n) over a range covering ~99.9% of mass. */
export function negativeBinomialDistribution(
  k: number,
  p: number,
  maxPoints = 200,
): { n: number; pmf: number; cdf: number }[] {
  if (p <= 0) return [];
  const upperBound = attemptsForConfidence(k, p, 0.999);
  const cappedUpper = Number.isFinite(upperBound)
    ? upperBound
    : Math.ceil((k / p) * 5);
  const span = Math.max(1, cappedUpper - k + 1);
  const step = Math.max(1, Math.ceil(span / maxPoints));

  const points: { n: number; pmf: number; cdf: number }[] = [];
  for (let n = k; n <= cappedUpper; n += step) {
    points.push({
      n,
      pmf: negativeBinomialPmf(k, p, n),
      cdf: negativeBinomialCdf(k, p, n),
    });
  }
  return points;
}
