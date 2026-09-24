import { describe, expect, it } from "vitest";
import {
  attemptsForConfidence,
  binomialCdf,
  binomialSurvival,
  geometricCdf,
  geometricPmf,
  luckPercentile,
  negativeBinomialCdf,
  negativeBinomialPmf,
  simpleDrop,
} from "../src/math/simple.js";

describe("binomialSurvival edge cases", () => {
  it("p = 1 always succeeds", () => {
    expect(binomialSurvival(10, 1, 5)).toBe(1);
    expect(binomialSurvival(10, 1, 10)).toBe(1);
  });
  it("p = 0 never succeeds", () => {
    expect(binomialSurvival(10, 0, 1)).toBe(0);
  });
  it("k = 0 is certain", () => {
    expect(binomialSurvival(10, 0.3, 0)).toBe(1);
  });
  it("k > n is impossible", () => {
    expect(binomialSurvival(5, 0.3, 6)).toBe(0);
  });
  it("n = 0", () => {
    expect(binomialSurvival(0, 0.5, 1)).toBe(0);
    expect(binomialSurvival(0, 0.5, 0)).toBe(1);
  });
  it("tiny p like 1/1,000,000 stays in [0, 1] and is monotone in n", () => {
    const p = 1e-6;
    const a = binomialSurvival(100, p, 1);
    const b = binomialSurvival(1_000_000, p, 1);
    const c = binomialSurvival(10_000_000, p, 1);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThanOrEqual(b);
    expect(b).toBeLessThanOrEqual(c);
    expect(c).toBeLessThanOrEqual(1);
  });
  it("huge n converges to 1 for fixed p > 0", () => {
    expect(binomialSurvival(1_000_000_000, 0.001, 1)).toBeCloseTo(1, 9);
  });
  it("matches the binomial/negative-binomial duality: P(T_k <= n) = P(Binom(n,p) >= k)", () => {
    expect(negativeBinomialCdf(3, 0.1, 40)).toBeCloseTo(
      binomialSurvival(40, 0.1, 3),
      12,
    );
  });
});

describe("binomialCdf", () => {
  it("is the complement of survival at k+1", () => {
    expect(binomialCdf(20, 0.4, 8)).toBeCloseTo(
      1 - binomialSurvival(20, 0.4, 9),
      12,
    );
  });
  it("sums pmf-style monotonicity", () => {
    expect(binomialCdf(20, 0.4, 0)).toBeLessThanOrEqual(
      binomialCdf(20, 0.4, 20),
    );
    expect(binomialCdf(20, 0.4, 20)).toBeCloseTo(1, 9);
  });
});

describe("geometric distribution", () => {
  it("pmf sums to ~1 over a wide range for moderate p", () => {
    const p = 0.1;
    let total = 0;
    for (let n = 1; n <= 500; n++) total += geometricPmf(p, n);
    expect(total).toBeCloseTo(1, 6);
  });
  it("cdf(n) = 1 - (1-p)^n", () => {
    expect(geometricCdf(0.05, 20)).toBeCloseTo(1 - Math.pow(0.95, 20), 12);
  });
  it("p = 1 concentrates all mass on n = 1", () => {
    expect(geometricPmf(1, 1)).toBe(1);
    expect(geometricPmf(1, 2)).toBe(0);
    expect(geometricCdf(1, 1)).toBe(1);
  });
});

describe("negative binomial distribution", () => {
  it("pmf sums to ~1 for k=5, p=0.2 over a generous range", () => {
    const k = 5;
    const p = 0.2;
    let total = 0;
    for (let n = k; n <= 500; n++) total += negativeBinomialPmf(k, p, n);
    expect(total).toBeCloseTo(1, 6);
  });
  it("reduces to geometric when k = 1", () => {
    expect(negativeBinomialPmf(1, 0.3, 7)).toBeCloseTo(
      geometricPmf(0.3, 7),
      12,
    );
    expect(negativeBinomialCdf(1, 0.3, 7)).toBeCloseTo(geometricCdf(0.3, 7), 9);
  });
});

describe("attemptsForConfidence", () => {
  it("matches the closed-form geometric inversion for k=1", () => {
    const p = 0.01;
    const n = attemptsForConfidence(1, p, 0.9);
    const expected = Math.ceil(Math.log(1 - 0.9) / Math.log(1 - p));
    expect(n).toBe(expected);
  });
  it("is monotone increasing in confidence", () => {
    const p50 = attemptsForConfidence(3, 0.02, 0.5);
    const p90 = attemptsForConfidence(3, 0.02, 0.9);
    const p99 = attemptsForConfidence(3, 0.02, 0.99);
    expect(p50).toBeLessThanOrEqual(p90);
    expect(p90).toBeLessThanOrEqual(p99);
  });
  it("handles tiny p without hanging", () => {
    const n = attemptsForConfidence(1, 1e-6, 0.5);
    expect(n).toBeGreaterThan(600_000);
    expect(n).toBeLessThan(800_000);
  });
});

describe("luckPercentile", () => {
  it("is trivially 100 at n=0 (nobody could have succeeded in zero attempts either)", () => {
    expect(luckPercentile(0, 0.01, 1)).toBe(100);
  });
  it("rewards fewer attempts with a higher percentile", () => {
    const lucky = luckPercentile(1, 0.01, 1); // succeeded on the very first try at a 1% rate
    const unlucky = luckPercentile(1000, 0.01, 1); // took 1000 tries at a 1% rate
    expect(lucky).toBeGreaterThan(unlucky);
    expect(lucky).toBeGreaterThan(90);
  });
});

describe("simpleDrop integration", () => {
  it("computes a consistent bundle for a classic 1/512 shiny-style hunt", () => {
    const result = simpleDrop({ p: 1 / 512, n: 900, k: 1 });
    expect(result.probabilityAtLeastK).toBeGreaterThan(0.8);
    expect(result.expectedAttempts).toBeCloseTo(512, 5);
    expect(result.attemptsFor.p50).toBeLessThan(result.attemptsFor.p90);
    expect(result.attemptsFor.p90).toBeLessThan(result.attemptsFor.p99);
  });
  it("rejects invalid inputs", () => {
    expect(() => simpleDrop({ p: -0.1, n: 10, k: 1 })).toThrow();
    expect(() => simpleDrop({ p: 0.5, n: 10, k: 0 })).toThrow();
    expect(() => simpleDrop({ p: 0.5, n: -1, k: 1 })).toThrow();
  });
});
