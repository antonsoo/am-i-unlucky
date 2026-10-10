import { describe, expect, it } from "vitest";
import oracle from "./oracle/pity-fixtures.json";
import { pityDistribution, summarizePity } from "../src/math/pity.js";

describe("independent exact rational absorbing-chain oracle", () => {
  for (const [i, fixture] of oracle.cases.entries()) {
    it(`matches full moments and the first 32 cumulative probabilities (${i})`, () => {
      const dist = pityDistribution(
        fixture.config,
        fixture.initial,
        fixture.target,
      );
      const summary = summarizePity(dist);
      const mean = Number(fixture.mean);
      const sd = Math.sqrt(Number(fixture.variance));
      expect(
        Math.abs(summary.expectedPulls - mean) / Math.max(1, mean),
      ).toBeLessThan(2e-13);
      expect(Math.abs(summary.stdDevPulls - sd) / Math.max(1, sd)).toBeLessThan(
        2e-13,
      );
      for (const [t, value] of fixture.cdf1Through32.entries()) {
        expect(summary.probabilityWithinBudget(t + 1)).toBeCloseTo(
          Number(value),
          12,
        );
      }
    });
  }
});
