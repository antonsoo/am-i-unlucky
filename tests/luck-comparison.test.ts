import { describe, expect, it } from "vitest";
import oracle from "../studies/tied-outcomes/oracle.json";
import { binomialCdf, simpleLuckComparison } from "../src/math/simple.js";
import { pityDistribution, pityLuckComparison } from "../src/math/pity.js";
import { luckPosition, type CompletedLuck } from "../src/math/luck.js";
import { classifyLuck } from "../src/math/tiers.js";

function check(
  actual: CompletedLuck | null,
  expected: Record<"earlier" | "tied" | "later", string>,
): void {
  if (Number(expected.tied) === 0) {
    expect(actual).toBeNull();
    return;
  }
  expect(actual).not.toBeNull();
  for (const key of ["earlier", "tied", "later"] as const) {
    const want = Number(expected[key]);
    expect(Math.abs(actual![key] - want)).toBeLessThanOrEqual(
      Math.max(1e-300, Math.abs(want) * 2e-10),
    );
  }
  const inclusiveTail = Math.min(
    0.5,
    Number(expected.earlier) + Number(expected.tied),
    Number(expected.tied) + Number(expected.later),
  );
  expect(classifyLuck(luckPosition(actual!)).tailPercent / 100).toBeCloseTo(
    inclusiveTail,
    11,
  );
}

describe("comparison against independent rational probabilities", () => {
  it("matches finite combinatorial sums, including small tails and deterministic support", () => {
    for (const fixture of oracle.simple)
      check(
        simpleLuckComparison(fixture.n, fixture.p, fixture.k),
        fixture.expected,
      );
    expect(binomialCdf(100, 0.5, 0)).toBeCloseTo(2 ** -100, 42);
    expect(simpleLuckComparison(100, 0.5, 1)!.later).toBeGreaterThan(0);
  });
  it("matches every retained absorbing-chain history without renormalizing the unplotted tail", () => {
    for (const fixture of oracle.pity) {
      const dist = pityDistribution(
        fixture.config,
        fixture.initial,
        fixture.target,
      );
      for (const history of fixture.histories)
        check(pityLuckComparison(dist, history.n), history.expected);
    }
  });
  it("keeps unsupported and uncalculated pity completions unavailable", () => {
    const config = {
      baseRate: 1,
      hardPity: 1,
      softPityStart: 1,
      softPityIncrement: 0,
      featuredRate: 0.0001,
      hasGuarantee: false,
    };
    const dist = pityDistribution(config, { pity: 0, guaranteed: false }, 1);
    expect(dist.tailMass).toBeGreaterThan(0.6);
    expect(pityLuckComparison(dist, 1)!.later).toBeCloseTo(0.9999, 11);
    for (const n of [0, -1, 0.5, dist.horizon + 1])
      expect(pityLuckComparison(dist, n)).toBeNull();
  });
});
