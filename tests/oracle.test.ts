import { describe, expect, it } from "vitest";
import fixtures from "./oracle/fixtures.json" with { type: "json" };
import {
  binomialSurvival,
  geometricCdf,
  geometricPmf,
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
