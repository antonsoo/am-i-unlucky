import { describe, expect, it } from "vitest";
import fixtures from "./oracle/fixtures.json" with { type: "json" };
import { binomialPmf, stirlingError } from "../src/math/numeric.js";
import {
  binomialCdf,
  binomialSurvival,
  geometricCdf,
  geometricPmf,
  MAX_BINOMIAL_VARIANCE,
  negativeBinomialCdf,
  negativeBinomialPmf,
} from "../src/math/simple.js";

// Cross-check against SciPy (the independent oracle). Regenerate fixtures
// with `uv run --with scipy python3 scripts/oracle.py`.
describe("oracle: binomial survival vs scipy.stats.binom.sf", () => {
  for (const c of fixtures.binomial_survival) {
    it(`n=${c.n} p=${c.p} k=${c.k}`, () => {
      expect(binomialSurvival(c.n, c.p, c.k)).toBeCloseTo(c.survival, 9);
    });
  }
});

/** Within 1e-9 of the true value in relative terms, or 1e-12 in absolute terms for a value that small. */
function expectClose(actual: number, expected: number, what: string): void {
  const tolerance = Math.max(1e-12, Math.abs(expected) * 1e-9);
  expect(
    Math.abs(actual - expected),
    `${what}: ${actual} vs ${expected}`,
  ).toBeLessThan(tolerance);
}

describe("oracle: binomial tails across the whole range vs scipy.stats.binom", () => {
  // n from 10 to 1e15, p from 1e-15 to 0.999999, k in both tails and at the mean. The closed
  // form used before was right to n = 1e6 and off by 0.5 (as wrong as a probability gets) at 1e9.
  it(`matches ${fixtures.binomial_grid.length} reference values to 9 significant digits`, () => {
    for (const c of fixtures.binomial_grid) {
      const at = `n=${c.n} p=${c.p} k=${c.k}`;
      expectClose(
        binomialSurvival(c.n, c.p, c.k),
        c.survival,
        `survival ${at}`,
      );
      expectClose(binomialCdf(c.n, c.p, c.k), c.cdf, `cdf ${at}`);
      expectClose(binomialPmf(c.n, c.p, c.k), c.pmf, `pmf ${at}`);
    }
  });

  it("puts the chance of reaching the median of a billion coin flips at a half", () => {
    expect(binomialSurvival(1e9, 0.5, 5e8)).toBeCloseTo(0.5000126, 6); // was 0
  });

  it("keeps a far tail as a small number rather than rounding it to zero", () => {
    // 100 successes in a million attempts at one in a million: about 4e-159.
    const tail = binomialSurvival(1_000_000, 1e-6, 100);
    expect(tail).toBeGreaterThan(1e-160);
    expect(tail).toBeLessThan(1e-156);
  });

  it("answers at the largest variance it supports in well under a second", () => {
    const n = 4 * MAX_BINOMIAL_VARIANCE; // p = 0.5
    const started = performance.now();
    expect(binomialSurvival(n, 0.5, n / 2)).toBeCloseTo(0.5, 5);
    expect(performance.now() - started).toBeLessThan(1000);
  });

  it("refuses, rather than guesses, beyond that", () => {
    expect(() => binomialSurvival(1e15, 0.5, 5e14)).toThrow(
      /Too many expected drops/,
    );
    // A huge n is fine while the variance is small: one-in-a-trillion odds, a trillion attempts.
    expect(binomialSurvival(1e12, 1e-12, 1)).toBeCloseTo(1 - Math.exp(-1), 9);
  });

  it("computes the Stirling error on both sides of each switch between formulas", () => {
    // S(n) = log(n!) - log(sqrt(2 pi n) (n/e)^n), reference values from mpmath at 40 digits.
    const reference: [number, number][] = [
      [1, 0.08106146679532726],
      [5, 0.01664469118982119],
      [15, 0.005554733551962801],
      [16, 0.00520765591960964],
      [35, 0.002380887608234112],
      [36, 0.002314755290514684],
      [80, 0.001041661241561619],
      [81, 0.001028801357710778],
      [500, 0.0001666666444444698],
      [501, 0.0001663339765799327],
      [1_000_000, 8.333333333333056e-8],
    ];
    for (const [n, expected] of reference) {
      expect(Math.abs(stirlingError(n) - expected), `S(${n})`).toBeLessThan(
        5e-15,
      );
    }
  });
});

describe("oracle: negative binomial vs scipy.stats.nbinom", () => {
  for (const c of fixtures.negative_binomial) {
    it(`k=${c.k} p=${c.p} n=${c.n} cdf`, () => {
      expect(negativeBinomialCdf(c.k, c.p, c.n)).toBeCloseTo(c.cdf, 6);
    });
    it(`k=${c.k} p=${c.p} n=${c.n} pmf`, () => {
      // Small pmf values need relative rather than absolute tolerance.
      const actual = negativeBinomialPmf(c.k, c.p, c.n);
      if (c.pmf < 1e-6) {
        expect(Math.abs(actual - c.pmf)).toBeLessThan(
          Math.max(1e-9, c.pmf * 1e-3),
        );
      } else {
        expect(actual).toBeCloseTo(c.pmf, 6);
      }
    });
  }
});

describe("oracle: geometric vs scipy.stats.geom", () => {
  for (const c of fixtures.geometric) {
    it(`p=${c.p} n=${c.n} pmf`, () => {
      const actual = geometricPmf(c.p, c.n);
      if (c.pmf < 1e-6) {
        expect(Math.abs(actual - c.pmf)).toBeLessThan(
          Math.max(1e-9, c.pmf * 1e-3),
        );
      } else {
        expect(actual).toBeCloseTo(c.pmf, 6);
      }
    });
    it(`p=${c.p} n=${c.n} cdf`, () => {
      expect(geometricCdf(c.p, c.n)).toBeCloseTo(c.cdf, 6);
    });
  }
});
