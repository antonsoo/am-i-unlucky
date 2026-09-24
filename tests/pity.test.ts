import { describe, expect, it } from "vitest";
import { mulberry32 } from "../src/math/collection.js";
import {
  itemTierRate,
  pityDistribution,
  pityDistributionPoints,
  pityLuckPercentile,
  summarizePity,
  type PityConfig,
  type PityUserState,
} from "../src/math/pity.js";

const GACHA_PRESET: PityConfig = {
  baseRate: 0.006,
  softPityStart: 74,
  softPityIncrement: 0.06,
  hardPity: 90,
  featuredRate: 0.5,
  hasGuarantee: true,
};

function simulateOnce(
  config: PityConfig,
  initial: PityUserState,
  target: number,
  rng: () => number,
): number {
  let pity = initial.pity;
  let guaranteed = initial.guaranteed;
  let copies = 0;
  let pulls = 0;
  while (copies < target) {
    pulls++;
    const rate = itemTierRate(pity, config);
    if (rng() < rate) {
      pity = 0;
      const featuredProb =
        config.hasGuarantee && guaranteed ? 1 : config.featuredRate;
      if (rng() < featuredProb) {
        copies++;
        guaranteed = false;
      } else {
        guaranteed = config.hasGuarantee ? true : guaranteed;
      }
    } else {
      pity++;
    }
    if (pulls > 1_000_000) throw new Error("simulation did not converge");
  }
  return pulls;
}

describe("itemTierRate", () => {
  it("stays at base rate before soft pity", () => {
    expect(itemTierRate(0, GACHA_PRESET)).toBeCloseTo(0.006);
    expect(itemTierRate(72, GACHA_PRESET)).toBeCloseTo(0.006); // pull #73
  });
  it("ramps linearly inside the soft-pity window", () => {
    expect(itemTierRate(73, GACHA_PRESET)).toBeCloseTo(0.006 + 0.06); // pull #74
    expect(itemTierRate(74, GACHA_PRESET)).toBeCloseTo(0.006 + 0.12); // pull #75
  });
  it("guarantees a hit at hard pity", () => {
    expect(itemTierRate(89, GACHA_PRESET)).toBe(1); // pull #90
  });
  it("never exceeds 1", () => {
    for (let pity = 0; pity < GACHA_PRESET.hardPity; pity++) {
      expect(itemTierRate(pity, GACHA_PRESET)).toBeLessThanOrEqual(1);
    }
  });
});

describe("pityDistribution (exact, hasGuarantee=true)", () => {
  it("pmf sums to ~1 (the DP horizon is a true upper bound)", () => {
    const dist = pityDistribution(
      GACHA_PRESET,
      { pity: 0, guaranteed: false },
      1,
    );
    expect(dist.exact).toBe(true);
    expect(dist.tailMass).toBeLessThan(1e-9);
    const total = dist.pmf.reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 9);
  });

  it("has zero probability of getting the featured item before pull 1", () => {
    const dist = pityDistribution(
      GACHA_PRESET,
      { pity: 0, guaranteed: false },
      1,
    );
    expect(dist.pmf[0]).toBe(0);
  });

  it("a pre-existing guarantee makes the next hit certainly featured", () => {
    // With guaranteed=true, copies must land on the same pull as the item-tier hit,
    // so cumulative probability by hard pity (90) must already be 1.
    const dist = pityDistribution(
      GACHA_PRESET,
      { pity: 0, guaranteed: true },
      1,
    );
    let cdfAt90 = 0;
    for (let t = 0; t <= 90; t++) cdfAt90 += dist.pmf[t]!;
    expect(cdfAt90).toBeCloseTo(1, 9);
  });

  it("matches a large seeded Monte Carlo simulation within a non-flaky tolerance", () => {
    const target = 2;
    const initial: PityUserState = { pity: 0, guaranteed: false };
    const dist = pityDistribution(GACHA_PRESET, initial, target);
    const summary = summarizePity(dist);

    const trials = 20_000;
    const rng = mulberry32(42);
    let sum = 0;
    let sumSq = 0;
    for (let i = 0; i < trials; i++) {
      const pulls = simulateOnce(GACHA_PRESET, initial, target, rng);
      sum += pulls;
      sumSq += pulls * pulls;
    }
    const simMean = sum / trials;
    const simVariance = sumSq / trials - simMean * simMean;
    const simStdErr = Math.sqrt(simVariance / trials);

    // 6 standard errors is generous enough to never flake while still being a
    // meaningful check (this is ~1 part in 3000 at 20k trials).
    expect(Math.abs(summary.expectedPulls - simMean)).toBeLessThan(
      6 * simStdErr,
    );
  });
});

describe("pityDistribution (hasGuarantee=false)", () => {
  it("is honestly marked inexact and reports a small tail mass", () => {
    const config: PityConfig = {
      ...GACHA_PRESET,
      hasGuarantee: false,
      featuredRate: 0.5,
    };
    const dist = pityDistribution(config, { pity: 0, guaranteed: false }, 1);
    expect(dist.exact).toBe(false);
    expect(dist.tailMass).toBeGreaterThanOrEqual(0);
    expect(dist.tailMass).toBeLessThan(1e-6);
  });
});

describe("summarizePity", () => {
  it("produces increasing quantiles and a budget probability that matches the cdf", () => {
    const dist = pityDistribution(
      GACHA_PRESET,
      { pity: 0, guaranteed: false },
      1,
    );
    const summary = summarizePity(dist);
    expect(summary.pullsFor.p50).toBeLessThanOrEqual(summary.pullsFor.p90);
    expect(summary.pullsFor.p90).toBeLessThanOrEqual(summary.pullsFor.p99);
    expect(
      summary.probabilityWithinBudget(summary.pullsFor.p90),
    ).toBeGreaterThanOrEqual(0.9 - 1e-9);
  });
});

describe("pityLuckPercentile", () => {
  it("rewards getting the item in very few pulls with a high percentile", () => {
    const dist = pityDistribution(
      GACHA_PRESET,
      { pity: 0, guaranteed: false },
      1,
    );
    const luckyPercentile = pityLuckPercentile(dist, 1);
    const unluckyPercentile = pityLuckPercentile(dist, 89);
    expect(luckyPercentile).toBeGreaterThan(unluckyPercentile);
  });
});

describe("pityDistributionPoints", () => {
  it("returns a monotone cdf and trims trailing near-zero mass", () => {
    const dist = pityDistribution(
      GACHA_PRESET,
      { pity: 0, guaranteed: false },
      1,
    );
    const points = pityDistributionPoints(dist, 60);
    expect(points.length).toBeGreaterThan(0);
    expect(points.length).toBeLessThanOrEqual(62);
    for (let i = 1; i < points.length; i++) {
      expect(points[i]!.cdf).toBeGreaterThanOrEqual(points[i - 1]!.cdf - 1e-12);
    }
  });
});
