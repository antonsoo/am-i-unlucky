/**
 * Numerical primitives shared across the math library.
 *
 * The headline correctness claim of this project is "exact wherever feasible".
 * For binomial / negative-binomial tails that means evaluating the
 * regularized incomplete beta function directly instead of summing
 * individual binomial terms, so results stay accurate (and fast) even when
 * `n` is in the millions. See docs/MATH.md for the derivation and the
 * cross-check against SciPy that backs the tolerances used in tests.
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
