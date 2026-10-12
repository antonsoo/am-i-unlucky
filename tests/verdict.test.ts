import { describe, expect, it } from "vitest";
import {
  simpleLuckComparison,
  simpleWaitingComparison,
} from "../src/math/simple.js";
import { pityDistribution, pityLuckComparison } from "../src/math/pity.js";
import { classifyLuck } from "../src/math/tiers.js";
import { luckVerdict, meterPercentile } from "../src/ui/verdict.js";

describe("completed runs with same-attempt ties", () => {
  it("does not call first-try success unlucky at a common rate", () => {
    const observation = simpleLuckComparison(1, 0.9, 1)!;
    expect(observation.earlier).toBe(0);
    expect(observation.tied).toBeCloseTo(0.9, 14);
    expect(observation.later).toBeCloseTo(0.1, 14);
    expect(luckVerdict(observation).headline).toBe("About average");
    expect(meterPercentile(observation)).toBe(50);
    expect(classifyLuck(meterPercentile(observation)).tier).toBe("common");
  });

  it("does not turn a 50/50 loss followed by its guarantee into legendary bad luck", () => {
    const config = {
      baseRate: 1,
      hardPity: 1,
      softPityStart: 1,
      softPityIncrement: 0,
      featuredRate: 0.5,
      hasGuarantee: true,
    };
    const dist = pityDistribution(config, { pity: 0, guaranteed: false }, 1);
    const observation = pityLuckComparison(dist, 2)!;
    expect(observation).toEqual({
      kind: "completed",
      earlier: 0.5,
      tied: 0.5,
      later: 0,
    });
    expect(luckVerdict(observation).headline).toBe("About average");
    expect(classifyLuck(meterPercentile(observation)).tier).toBe("common");
  });

  it("only counts strictly faster players in a slow-run verdict", () => {
    const observation = simpleLuckComparison(2, 0.9, 1)!;
    expect(luckVerdict(observation)).toEqual({
      headline: "Unlucky",
      detail: "90% of players would have gotten it sooner.",
      tone: "unlucky",
    });
    // Reaching at least attempt 2 has probability .1, including its .09 tie.
    expect(classifyLuck(meterPercentile(observation)).tailPercent).toBeCloseTo(
      10,
      12,
    );
  });

  it("retains a lucky verdict for genuinely early rare drops", () => {
    const observation = simpleLuckComparison(1, 0.01, 1)!;
    expect(luckVerdict(observation)).toEqual({
      headline: "Lucky",
      detail: "99% of players would need more attempts than you.",
      tone: "lucky",
    });
    expect(classifyLuck(meterPercentile(observation)).tailPercent).toBeCloseTo(
      1,
      12,
    );
  });

  it("does not rank impossible completed histories", () => {
    for (const [n, p, k] of [
      [0, 0.5, 1],
      [1, 0.5, 2],
      [3, 1, 2],
      [3, 0, 1],
    ])
      expect(simpleLuckComparison(n!, p!, k!)).toBeNull();
  });
});

describe("waiting histories remain censored", () => {
  it("rates the actual wait instead of a hypothetical later completion", () => {
    const observation = simpleWaitingComparison(3, 0.5, 1);
    expect(observation.completed).toBeCloseTo(0.875, 14);
    expect(observation.waiting).toBeCloseTo(0.125, 14);
    expect(luckVerdict(observation).detail).toBe(
      "87.5% of players would have it by now.",
    );
    expect(meterPercentile(observation)).toBeCloseTo(12.5, 14);
    expect(classifyLuck(meterPercentile(observation)).tier).toBe("uncommon");
  });

  it("never calls unfinished runs lucky when most players are also waiting", () => {
    const observation = simpleWaitingComparison(100, 1 / 512, 1);
    expect(luckVerdict(observation).headline).toBe("Not unlucky yet");
    expect(meterPercentile(observation)).toBe(50);
  });
});
