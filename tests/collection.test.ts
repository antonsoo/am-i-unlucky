import { describe, expect, it } from "vitest";
import {
  collectionCdf,
  collectionExpectedAttempts,
  collectionMonteCarlo,
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
    const margin = (mc.ci95[1] - mc.ci95[0]) * 1.5;
    expect(Math.abs(mc.mean - exact)).toBeLessThan(margin);
  });

  it("reports sample size honestly", () => {
    const mc = collectionMonteCarlo([0.5, 0.5], 1000, mulberry32(1));
    expect(mc.sampleSize).toBe(1000);
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
