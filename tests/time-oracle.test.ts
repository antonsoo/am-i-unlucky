import { describe, expect, it } from "vitest";
import fixtures from "./oracle/time-fixtures.json";
import { timeToDrop } from "../src/math/time.js";

describe("independent 80-digit time oracle", () => {
  for (const [index, fixture] of fixtures.entries()) {
    it(`matches schedule ${index + 1}, including first-day quantile thresholds`, () => {
      const result = timeToDrop({ sources: fixture.sources, k: fixture.k });
      expect(fixture.expectationRemainderBound).toBeLessThan(1e-30);
      expect(result.expectedDays! / fixture.expectedDays).toBeCloseTo(1, 11);
      expect(result.daysFor).toEqual(fixture.daysFor);
      for (const point of fixture.probabilities) {
        expect(result.probabilityWithinDays(point.days)).toBeCloseTo(
          point.chance,
          12,
        );
      }
    });
  }
});
