import { describe, expect, it } from "vitest";
import { calculateCollectionPlan } from "../src/ui/collection-plan.js";

describe("collection planning", () => {
  it("keeps the mean independent of a zero budget and counts all interval mass", () => {
    const result = calculateCollectionPlan({ probabilities: [0.5, 0.5], n: 0 });
    expect(result.expectedAttempts).toBe(3);
    expect(result.probability).toBe(0);
    expect(result.belowResolution).toBe(false);
    expect(result.points.reduce((total, p) => total + p.pmf, 0)).toBeCloseTo(
      result.points.at(-1)!.cdf,
      14,
    );
    expect("completionAttempts" in result.simulation).toBe(false);
  });
  it("distinguishes impossible goals from rare and overflowing means", () => {
    expect(
      calculateCollectionPlan({ probabilities: [0, 0.5], n: 100 }),
    ).toMatchObject({
      possible: false,
      expectedAttempts: null,
      probability: 0,
      points: [],
    });
    expect(
      calculateCollectionPlan({ probabilities: [1e-20], n: 1e9 }),
    ).toMatchObject({
      possible: true,
      expectedAttempts: 1e20,
      belowResolution: true,
    });
    expect(
      calculateCollectionPlan({ probabilities: [5e-324], n: 1e9 }),
    ).toMatchObject({
      possible: true,
      expectedAttempts: null,
      belowResolution: true,
    });
  });
  it("computes the maximum exact set and bounds its output", () => {
    const result = calculateCollectionPlan({
      probabilities: Array<number>(16).fill(1 / 16),
      n: 100,
    });
    const harmonic = Array.from({ length: 16 }, (_, i) => 1 / (i + 1)).reduce(
      (a, b) => a + b,
    );
    expect(result.expectedAttempts).toBeCloseTo(16 * harmonic, 10);
    expect(result.analytic).toBe(true);
    expect(result.points.length).toBeLessThanOrEqual(160);
    expect(result.simulation.sampleSize).toBe(20_000);
  });
  it("labels the larger-set fallback and retains all censored runs in chance denominators", () => {
    const result = calculateCollectionPlan({
      probabilities: Array<number>(17).fill(1e-20),
      n: 1e9,
    });
    expect(result).toMatchObject({
      analytic: false,
      possible: true,
      expectedAttempts: null,
      probability: 0,
      agreement: null,
    });
    expect(result.probabilityInterval![1]).toBeGreaterThan(0);
    expect(result.points).toHaveLength(160);
    expect(result.points.at(-1)!.x).toBe(1e9);
    expect(result.simulation.censored).toBe(20_000);
  });
  it("reports a seeded cross-check outside its interval honestly", () => {
    const result = calculateCollectionPlan({
      probabilities: [0.006, 0.033],
      n: 100,
    });
    expect(result.agreement).toBe(false);
    expect(result.expectedAttempts).toBeLessThan(result.simulation.ci95![0]);
  });
  it("does not report completers-only means for partially censored runs", () => {
    const result = calculateCollectionPlan({ probabilities: [1e-9], n: 1e9 });
    expect(result.simulation.censored).toBeGreaterThan(0);
    expect(result.simulation.sampleSize).toBeGreaterThan(0);
    expect(result.simulation.mean).toBeNull();
    expect(result.simulation.ci95).toBeNull();
    expect(result.agreement).toBeNull();
    expect(result.expectedAttempts! / 1e9).toBeCloseTo(1, 14);
    expect(result.probability).toBeCloseTo(-Math.expm1(-1), 8);
  });
  it("validates requests again at the worker boundary", () => {
    for (const probabilities of [[], [0.8, 0.8], Array<number>(33).fill(0.001)])
      expect(() =>
        calculateCollectionPlan({ probabilities, n: 100 }),
      ).toThrow();
    expect(() =>
      calculateCollectionPlan({ probabilities: [0.5], n: NaN }),
    ).toThrow();
  });
});
