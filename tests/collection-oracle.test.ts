import { describe, expect, it } from "vitest";
import fixtures from "./oracle/collection-fixtures.json";
import {
  collectionCdfEvaluator,
  collectionExpectedAttempts,
} from "../src/math/collection.js";

describe("independent 120-digit collection reference", () => {
  for (const [index, fixture] of fixtures.entries()) {
    it(`matches reference table ${index + 1}`, () => {
      expect(
        collectionExpectedAttempts(fixture.probabilities).expectedAttempts /
          fixture.expectedAttempts,
      ).toBeCloseTo(1, 12);
      const cdf = collectionCdfEvaluator(fixture.probabilities);
      for (const point of fixture.points) {
        const value = cdf(point.n);
        expect(Math.abs(value - point.cdf)).toBeLessThan(1e-10);
        // A lone tiny rate and short positive recurrences also retain relative precision.
        if (
          point.cdf > 0 &&
          (fixture.probabilities.length === 1 || point.n <= 5)
        )
          expect(value / point.cdf).toBeCloseTo(1, 10);
      }
    });
  }
});
