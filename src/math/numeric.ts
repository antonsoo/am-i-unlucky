/**
 * Numerical primitives shared across the math library.
 *
 * The headline correctness claim of this project is "exact wherever feasible".
 * Binomial and negative-binomial tails are summed from an accurate pmf
 * (`binomialPmf`, below) outward from the point asked about, away from the
 * mean, where the terms only shrink. See docs/MATH.md for the derivation and
 * the cross-check against SciPy that backs the tolerances used in tests.
 *
 * `regularizedIncompleteBeta` is the closed form the tails used to go through.
 * Its continued fraction stops after 300 steps and its prefactor is a
 * difference of log-gammas, which is fine up to n of about a million and wrong
 * beyond: at n = 1e9, p = 0.5 it put the chance of reaching the median at 0.
 * It is kept for callers with moderate arguments.
 */

// Lanczos approximation coefficients (g = 7, n = 9), the standard
// double-precision recipe reproduced in most numerical computing texts.
const LANCZOS_G = 7;
const LANCZOS_COEFFICIENTS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028,
  771.32342877765313, -176.61502916214059, 12.507343278686905,
  -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];

/** log(Gamma(x)) via the Lanczos approximation, valid for x > 0. */
export function logGamma(x: number): number {
  if (x <= 0) {
    throw new RangeError(`logGamma requires x > 0, got ${x}`);
  }
  // Reflection into the region where the Lanczos series converges well.
  if (x < 0.5) {
    // Gamma(x) * Gamma(1-x) = pi / sin(pi x)
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  }
  const y = x - 1;
  let a = LANCZOS_COEFFICIENTS[0]!;
  const t = y + LANCZOS_G + 0.5;
  for (let i = 1; i < LANCZOS_COEFFICIENTS.length; i++) {
    a += LANCZOS_COEFFICIENTS[i]! / (y + i);
  }
  return (
    0.5 * Math.log(2 * Math.PI) + (y + 0.5) * Math.log(t) - t + Math.log(a)
  );
}

/** log(C(n, k)) computed via logGamma, stable for large n. */
export function logChoose(n: number, k: number): number {
  if (k < 0 || k > n) return -Infinity;
  if (k === 0 || k === n) return 0;
  return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
}

/** log(Beta(a, b)) = logGamma(a) + logGamma(b) - logGamma(a + b). */
function logBeta(a: number, b: number): number {
  return logGamma(a) + logGamma(b) - logGamma(a + b);
}

// Continued-fraction evaluation of the incomplete beta function
// (Lentz's algorithm), the standard method for I_x(a, b).
const CF_MAX_ITER = 300;
const CF_EPS = 1e-15;
const CF_TINY = 1e-300;

function betaContinuedFraction(x: number, a: number, b: number): number {
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < CF_TINY) d = CF_TINY;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= CF_MAX_ITER; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < CF_TINY) d = CF_TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < CF_TINY) c = CF_TINY;
    d = 1 / d;
    h *= d * c;

    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < CF_TINY) d = CF_TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < CF_TINY) c = CF_TINY;
    d = 1 / d;
    const del = d * c;
    h *= del;

    if (Math.abs(del - 1) < CF_EPS) break;
  }
  return h;
}

/**
 * Regularized incomplete beta function I_x(a, b), the exact closed form
 * behind binomial and negative-binomial tail probabilities.
 * Matches `scipy.special.betainc` to within double-precision tolerance
 * (see tests/oracle for the cross-check).
 */
export function regularizedIncompleteBeta(
  x: number,
  a: number,
  b: number,
): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(a * Math.log(x) + b * Math.log1p(-x) - logBeta(a, b));
  if (x < (a + 1) / (a + b + 2)) {
    return (front * betaContinuedFraction(x, a, b)) / a;
  }
  return 1 - (front * betaContinuedFraction(1 - x, b, a)) / b;
}

// --- Binomial probabilities for any n -----------------------------------------
//
// Catherine Loader's saddle-point form of the binomial pmf ("Fast and Accurate
// Computation of Binomial Probabilities", 2000; it is what R's dbinom uses).
// Writing the pmf as log C(n, k) + k log p + (n - k) log q subtracts numbers of
// size n to get one of size 1, so its error grows with n: by n = 1e9 nothing is
// left. Loader's form adds only small terms: the error of Stirling's formula at
// n, k and n - k, and two deviance terms that vanish when k is near n p.

const LOG_2PI = Math.log(2 * Math.PI);

/** log(n!) for the small n where Stirling's series is not yet accurate enough. */
const SMALL_LOG_FACTORIALS: number[] = (() => {
  const logs = [0];
  let factorial = 1;
  for (let n = 1; n <= 15; n++) {
    factorial *= n; // exact: 15! is below 2^53
    logs.push(Math.log(factorial));
  }
  return logs;
})();

/** log(n!) - log(sqrt(2 pi n) (n / e)^n), for an integer n >= 1. */
export function stirlingError(n: number): number {
  if (n <= 15) {
    return (
      SMALL_LOG_FACTORIALS[n]! - ((n + 0.5) * Math.log(n) - n + 0.5 * LOG_2PI)
    );
  }
  const nn = n * n;
  if (n > 500) return (1 / 12 - 1 / 360 / nn) / n;
  if (n > 80) return (1 / 12 - (1 / 360 - 1 / 1260 / nn) / nn) / n;
  if (n > 35)
    return (1 / 12 - (1 / 360 - (1 / 1260 - 1 / 1680 / nn) / nn) / nn) / n;
  return (
    (1 / 12 -
      (1 / 360 - (1 / 1260 - (1 / 1680 - 1 / 1188 / nn) / nn) / nn) / nn) /
    n
  );
}

/** x log(x / np) + np - x, by a series when x is close to np (where the direct form cancels). */
function deviance(x: number, np: number): number {
  if (Math.abs(x - np) < 0.1 * (x + np)) {
    let v = (x - np) / (x + np);
    let sum = (x - np) * v;
    let term = 2 * x * v;
    v *= v;
    for (let j = 1; j < 1000; j++) {
      term *= v;
      const next = sum + term / (2 * j + 1);
      if (next === sum) return next;
      sum = next;
    }
    return sum;
  }
  return x * Math.log(x / np) + np - x;
}

/** P(X = k) for X ~ Binomial(n, p), accurate to double precision whatever the size of n. */
export function binomialPmf(n: number, p: number, k: number): number {
  if (k < 0 || k > n || !Number.isInteger(k)) return 0;
  if (p <= 0) return k === 0 ? 1 : 0;
  if (p >= 1) return k === n ? 1 : 0;
  if (k === 0) return Math.exp(n * Math.log1p(-p));
  if (k === n) return Math.exp(n * Math.log(p));
  const logCore =
    stirlingError(n) -
    stirlingError(k) -
    stirlingError(n - k) -
    deviance(k, n * p) -
    deviance(n - k, n * (1 - p));
  const logScale = LOG_2PI + Math.log(k) + Math.log1p(-k / n);
  return Math.exp(logCore - 0.5 * logScale);
}

/** Kahan summation for alternating/inclusion-exclusion sums that cancel heavily. */
export function kahanSum(values: Iterable<number>): number {
  let sum = 0;
  let c = 0;
  for (const value of values) {
    const y = value - c;
    const t = sum + y;
    c = t - sum - y;
    sum = t;
  }
  return sum;
}

/** Clamp a probability into the closed [0, 1] range, absorbing float noise. */
export function clampProbability(p: number): number {
  if (Number.isNaN(p)) return NaN;
  return Math.min(1, Math.max(0, p));
}
