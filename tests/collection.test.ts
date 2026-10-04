import { describe, expect, it } from "vitest";
import {
  collectionCdf,
  collectionExpectedAttempts,
  collectionMonteCarlo,
  collectionCdfEvaluator,
  collectionDistributionPoints,
  collectionSimulationChance,
  validateCollectionProbabilities,
  validateCollectionBudget,
  mulberry32,
} from "../src/math/collection.js";

describe("collectionExpectedAttempts", () => {
  it("matches the classic equal-probability coupon collector formula: n * H_n", () => {
    const m = 6;
    const probs = new Array<number>(m).fill(1 / m);
    const { expectedAttempts } = collectionExpectedAttempts(probs);
    let harmonic = 0;
    for (let i = 1; i <= m; i++) harmonic += 1 / i;
    expect(expectedAttempts).toBeCloseTo(m * harmonic, 9);
  });

  it("is infinite if any item has probability 0", () => {
    const { expectedAttempts } = collectionExpectedAttempts([0.5, 0, 0.3]);
    expect(expectedAttempts).toBe(Infinity);
  });

  it("is 0 for an empty set", () => {
    expect(collectionExpectedAttempts([]).expectedAttempts).toBe(0);
  });

  it("handles a single item as a geometric mean 1/p", () => {
    expect(collectionExpectedAttempts([0.25]).expectedAttempts).toBeCloseTo(
      4,
      9,
    );
  });
});

describe("collectionCdf", () => {
  it("is 0 at n=0 for a nonempty set and approaches 1 for large n", () => {
    const probs = [0.3, 0.2, 0.1];
    expect(collectionCdf(probs, 0)).toBe(0);
    expect(collectionCdf(probs, 10_000)).toBeCloseTo(1, 9);
  });

  it("is monotone non-decreasing in n", () => {
    const probs = [0.4, 0.1, 0.05, 0.2];
    let prev = 0;
    for (let n = 0; n <= 200; n += 5) {
      const cur = collectionCdf(probs, n);
      expect(cur).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = cur;
    }
  });

  it("reduces to 1-(1-p)^n for a single item", () => {
    const p = 0.05;
    expect(collectionCdf([p], 20)).toBeCloseTo(1 - Math.pow(1 - p, 20), 9);
  });
});

describe("collectionMonteCarlo cross-check", () => {
  it("agrees with the exact expectation within its reported confidence interval", () => {
    const probs = [0.3, 0.25, 0.15, 0.1];
    const exact = collectionExpectedAttempts(probs).expectedAttempts;
    const mc = collectionMonteCarlo(probs, 30_000, mulberry32(7));
    expect(mc.censored).toBe(0);
    // The CI is a 95% interval; widen slightly for test stability.
    const margin = (mc.ci95![1] - mc.ci95![0]) * 1.5;
    expect(Math.abs(mc.mean! - exact)).toBeLessThan(margin);
  });

  it("reports sample size honestly", () => {
    const mc = collectionMonteCarlo([0.5, 0.5], 1000, mulberry32(1));
    expect(mc.sampleSize).toBe(1000);
  });
});

describe("collection boundaries and numerical regressions", () => {
  it.each([[0.8, 0.8], [-0.1], [NaN], [Infinity], [1.01]])(
    "rejects invalid table %j before all calculations",
    (...probabilities) => {
      expect(() => validateCollectionProbabilities(probabilities)).toThrow(
        RangeError,
      );
      expect(() => collectionExpectedAttempts(probabilities)).toThrow(
        RangeError,
      );
      expect(() => collectionCdf(probabilities, 2)).toThrow(RangeError);
      expect(() => collectionMonteCarlo(probabilities, 1)).toThrow(RangeError);
    },
  );
  it("accepts equal fractional rates and only rounding at the total boundary", () => {
    expect(() =>
      validateCollectionProbabilities(new Array<number>(6).fill(1 / 6)),
    ).not.toThrow();
    expect(() =>
      validateCollectionProbabilities([0.5, 0.5 + Number.EPSILON]),
    ).not.toThrow();
    expect(() => validateCollectionProbabilities([0.5, 0.50000001])).toThrow();
  });
  it("does not turn a tiny geometric probability into zero", () => {
    expect(collectionCdf([1e-20], 1e20)).toBeCloseTo(-Math.expm1(-1), 14);
    expect(collectionCdf([1e-20], 1e9) / 1e-11).toBeCloseTo(1, 10);
    expect(collectionCdf([0.2, 1e-20], 1000) / 1e-17).toBeCloseTo(1, 10);
  });
  it("preserves a positive first-possible tail and structural impossibility", () => {
    expect(collectionCdf([1e-20, 2e-20], 2) / 4e-40).toBeCloseTo(1, 14);
    expect(collectionCdf([Number.MIN_VALUE, 0.5], 2)).toBe(Number.MIN_VALUE);
    expect(collectionCdf([0.1, 0.2, 0.3], 2)).toBe(0);
    expect(collectionCdf([0, 0.2], 1e9)).toBe(0);
    expect(collectionCdf([1], 1)).toBe(1);
    expect(collectionCdf([], 0)).toBe(1);
  });
  it("computes means without subtracting large nearly equal terms", () => {
    const e = collectionExpectedAttempts([1e-300, 0.25, 0.5]).expectedAttempts;
    expect(e / 1e300).toBeCloseTo(1, 14);
    expect(collectionExpectedAttempts([5e-324]).expectedAttempts).toBe(
      Infinity,
    );
    expect(collectionExpectedAttempts([0.5, 0.5]).expectedAttempts).toBe(3);
  });
  it("reuses one CDF evaluator across out-of-order queries", () => {
    const p = [0.2, 0.1, 0.05];
    const cdf = collectionCdfEvaluator(p);
    for (const n of [100, 3, 50, 1000, 10, 0])
      expect(cdf(n)).toBe(collectionCdf(p, n));
  });
  it.each([NaN, Infinity, -1, 2.5, 1e9 + 1])(
    "rejects invalid chart horizons and budgets: %s",
    (n) => {
      expect(() => validateCollectionBudget(n)).toThrow(RangeError);
      expect(() => collectionDistributionPoints([0.5], n)).toThrow(RangeError);
    },
  );
  it("bounds charts and includes their final point", () => {
    const points = collectionDistributionPoints([0.1], 1000, 160);
    expect(points).toHaveLength(160);
    expect(points[0]).toEqual({ n: 0, cdf: 0 });
    expect(points.at(-1)!.n).toBe(1000);
    expect(new Set(points.map((p) => p.n)).size).toBe(160);
    expect(collectionDistributionPoints([0], 0)).toEqual([{ n: 0, cdf: 0 }]);
    for (const max of [0, 1, Infinity, 501, 2.1])
      expect(() => collectionDistributionPoints([0.5], 100, max)).toThrow();
  });
  it("enforces item limits before exponential work", () => {
    expect(() =>
      collectionExpectedAttempts(new Array<number>(17).fill(0.01)),
    ).toThrow(/at most 16/);
    expect(() => collectionCdf(new Array<number>(17).fill(0.01), 10)).toThrow(
      /at most 16/,
    );
    expect(() =>
      collectionMonteCarlo(new Array<number>(33).fill(0), 1),
    ).toThrow(/at most 32/);
  });
});

describe("bounded simulation and honest uncertainty", () => {
  it("returns immediately for an impossible set without consuming randomness", () => {
    const mc = collectionMonteCarlo([0.5, 0], 20_000, () => {
      throw new Error("must not draw");
    });
    expect(mc).toMatchObject({
      trials: 20_000,
      sampleSize: 0,
      censored: 20_000,
      mean: null,
      stdDev: null,
      ci95: null,
      completionAttempts: [],
    });
  });
  it("withholds the mean even when only some runs are censored", () => {
    const values = [0, 0, 0.9];
    const mc = collectionMonteCarlo([0.5], 2, () => values.shift()!, 1);
    expect(mc).toMatchObject({
      trials: 2,
      sampleSize: 1,
      censored: 1,
      mean: null,
      stdDev: null,
      ci95: null,
      completionAttempts: [1],
    });
    expect(collectionSimulationChance(mc, 1).value).toBe(0.5);
    expect(() => collectionSimulationChance(mc, 2)).toThrow(/horizon/);
  });
  it("uses at most two random draws per newly collected item", () => {
    let draws = 0;
    const rng = mulberry32(7);
    const mc = collectionMonteCarlo([1e-20, 1e-20], 20_000, () => {
      draws++;
      return rng();
    });
    expect(draws).toBeLessThanOrEqual(80_000);
    expect(mc.censored).toBe(20_000);
    expect(mc.ci95).toBeNull();
    const chance = collectionSimulationChance(mc, 1e9);
    expect(chance.value).toBe(0);
    expect(chance.ci95[1]).toBeGreaterThan(0);
  });
  it("does not manufacture a zero-width interval from one completed run", () => {
    const mc = collectionMonteCarlo([1], 1);
    expect(mc.mean).toBe(1);
    expect(mc.ci95).toBeNull();
  });
  it("includes zero and deterministic outcomes at exact cap boundaries", () => {
    expect(
      collectionMonteCarlo([], 3, undefined, 0).completionAttempts,
    ).toEqual([0, 0, 0]);
    expect(collectionMonteCarlo([1], 3, undefined, 1)).toMatchObject({
      mean: 1,
      ci95: [1, 1],
      censored: 0,
    });
    expect(collectionMonteCarlo([1], 3, undefined, 0).censored).toBe(3);
  });
  it("checks the RNG and trial bounds instead of looping on bad input", () => {
    for (const value of [-1, 1, NaN, Infinity])
      expect(() => collectionMonteCarlo([0.5], 2, () => value)).toThrow(
        /random source/,
      );
    for (const trials of [0, 0.5, 100_001, Infinity])
      expect(() => collectionMonteCarlo([0.5], trials)).toThrow(
        /simulation runs/,
      );
  });
  it("matches a categorical completion probability, including no-drop outcomes", () => {
    const mc = collectionMonteCarlo([0.2, 0.3], 100_000, mulberry32(87), 2);
    const chance = collectionSimulationChance(mc, 2);
    expect(chance.value).toBeCloseTo(0.12, 2);
    expect(chance.ci95[0]).toBeLessThan(0.12);
    expect(chance.ci95[1]).toBeGreaterThan(0.12);
    expect(mc.censored + mc.sampleSize).toBe(mc.trials);
  });
});

describe("mulberry32", () => {
  it("is deterministic for a fixed seed", () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    for (let i = 0; i < 10; i++) expect(a()).toBe(b());
  });
  it("produces values in [0, 1)", () => {
    const rng = mulberry32(999);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
