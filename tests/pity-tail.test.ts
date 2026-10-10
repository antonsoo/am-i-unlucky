import { describe, expect, it } from "vitest";
import {
  pityDistribution,
  pityLuckPercentile,
  summarizePity,
  type PityConfig,
} from "../src/math/pity.js";
import { calculatePityPlan } from "../src/ui/pity-plan.js";

const geometric: PityConfig = {
  baseRate: 1,
  softPityStart: 1,
  softPityIncrement: 0,
  hardPity: 1,
  featuredRate: 0.0001,
  hasGuarantee: false,
};
const initial = { pity: 0, guaranteed: false };

describe("the probability beyond a pity plot", () => {
  it("retains the full geometric mean instead of shrinking it with the tail", () => {
    const dist = pityDistribution(geometric, initial, 1);
    const summary = summarizePity(dist);
    expect(summary.expectedPulls).toBeCloseTo(10000, 9);
    expect(summary.stdDevPulls).toBeCloseTo(Math.sqrt(1 - 0.0001) / 0.0001, 9);
    expect(dist.tailMass).toBeCloseTo(
      Math.exp(dist.horizon * Math.log1p(-0.0001)),
      12,
    );
    expect(summary.pullsFor).toEqual({ p50: null, p90: null, p99: null });
    expect(summary.probabilityWithinBudget(100000)).toBeNull();
    expect(summary.probabilityWithinBudget(5000)).toBeCloseTo(
      -Math.expm1(5000 * Math.log1p(-0.0001)),
      12,
    );
    expect(pityLuckPercentile(dist, 100000)).toBeNull();
  });

  it("keeps exact multi-copy moments even when almost all outcomes are beyond the plot", () => {
    const config = { ...geometric, featuredRate: 1e-12 };
    const dist = pityDistribution(config, initial, 3);
    expect(dist.expectedPulls).toBe(3e12);
    expect(dist.stdDevPulls / (Math.sqrt(3 * (1 - 1e-12)) / 1e-12)).toBeCloseTo(
      1,
      14,
    );
    expect(summarizePity(dist).pullsFor.p50).toBeNull();
  });

  it("distinguishes an impossible drop from an uncalculated positive chance", () => {
    const dist = pityDistribution(
      { ...geometric, featuredRate: 0 },
      initial,
      1,
    );
    const summary = summarizePity(dist);
    expect(dist.impossible).toBe(true);
    expect(summary.expectedPulls).toBe(Infinity);
    expect(summary.stdDevPulls).toBeNaN();
    expect(summary.pullsFor).toEqual({
      p50: Infinity,
      p90: Infinity,
      p99: Infinity,
    });
    expect(summary.probabilityWithinBudget(1e9)).toBe(0);
    expect(pityLuckPercentile(dist, 20)).toBeNull();
  });

  it("computes the complete bounded chain instead of labelling an early cut an upper bound", () => {
    const dist = pityDistribution(
      { ...geometric, hardPity: 90, baseRate: 0.5, featuredRate: 1 },
      initial,
      1,
    );
    expect(dist.exact).toBe(true);
    expect(dist.horizon).toBeGreaterThanOrEqual(90);
    expect(dist.pmf[90]).toBeGreaterThan(0);
    expect(dist.tailMass).toBe(0);
    expect(summarizePity(dist).probabilityWithinBudget(1000)).toBe(1);
  });

  it("uses the same strictly-more convention as simple mode, and excludes impossible histories", () => {
    const dist = pityDistribution(
      { ...geometric, featuredRate: 0.5 },
      initial,
      1,
    );
    expect(pityLuckPercentile(dist, 1)).toBeCloseTo(50, 12);
    expect(pityLuckPercentile(dist, 2)).toBeCloseTo(25, 12);
    expect(pityLuckPercentile(dist, 0)).toBeNull();
    const certain = pityDistribution(
      { ...geometric, featuredRate: 1 },
      initial,
      1,
    );
    expect(pityLuckPercentile(certain, 2)).toBeNull();
  });

  it("rejects malformed coordinates and rates before allocating a chain", () => {
    for (const hardPity of [NaN, Infinity, 1.5, 0]) {
      expect(() =>
        pityDistribution({ ...geometric, hardPity }, initial, 1),
      ).toThrow(/Hard pity/);
    }
    expect(() =>
      pityDistribution(geometric, { pity: 0.5, guaranteed: false }, 1),
    ).toThrow(/Current pity/);
    expect(() =>
      pityDistribution({ ...geometric, featuredRate: -0.1 }, initial, 1),
    ).toThrow(/Featured rate/);
    expect(() =>
      calculatePityPlan({
        config: geometric,
        initial,
        target: 1,
        budget: 3.5,
        actualPulls: 2,
      }),
    ).toThrow(/Pull budget/);
  });
});
