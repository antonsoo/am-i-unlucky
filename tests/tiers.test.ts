import { describe, expect, it } from "vitest";
import { classifyLuck, tierLabel } from "../src/math/tiers.js";

// Tiers are nested percentile bands around the median: the middle 50%
// (25th-75th percentile) is "common", then top/bottom 25% is "uncommon",
// top/bottom 10% is "rare", top/bottom 2% is "epic", top/bottom 0.5% is
// "legendary". See src/math/tiers.ts for the derivation.
describe("classifyLuck", () => {
  it("is common at the median", () => {
    const c = classifyLuck(50);
    expect(c.tier).toBe("common");
    expect(c.direction).toBe("average");
    expect(c.tailPercent).toBe(50);
  });

  it("is common throughout the middle 50% (25th-75th percentile)", () => {
    expect(classifyLuck(25).tier).toBe("uncommon"); // boundary is inclusive to uncommon
    expect(classifyLuck(25.1).tier).toBe("common");
    expect(classifyLuck(74.9).tier).toBe("common");
    expect(classifyLuck(75).tier).toBe("uncommon");
  });

  it("is uncommon just inside the top/bottom 25%, down to the top/bottom 10% boundary", () => {
    expect(classifyLuck(24.9).tier).toBe("uncommon");
    expect(classifyLuck(10).tier).toBe("rare"); // boundary is inclusive to rare
    expect(classifyLuck(10.1).tier).toBe("uncommon");
    expect(classifyLuck(90).tier).toBe("rare");
    expect(classifyLuck(89.9).tier).toBe("uncommon");
  });

  it("is rare between the top/bottom 10% and top/bottom 2% boundaries", () => {
    expect(classifyLuck(9.9).tier).toBe("rare");
    expect(classifyLuck(2).tier).toBe("epic"); // boundary is inclusive to epic
    expect(classifyLuck(2.1).tier).toBe("rare");
    expect(classifyLuck(98).tier).toBe("epic");
    expect(classifyLuck(97.9).tier).toBe("rare");
  });

  it("is epic between the top/bottom 2% and top/bottom 0.5% boundaries", () => {
    expect(classifyLuck(1.9).tier).toBe("epic");
    expect(classifyLuck(0.5).tier).toBe("legendary"); // boundary is inclusive to legendary
    expect(classifyLuck(0.6).tier).toBe("epic");
    expect(classifyLuck(99.5).tier).toBe("legendary");
    expect(classifyLuck(99.4).tier).toBe("epic");
  });

  it("is legendary in the outermost 0.5% on either side, including the extremes", () => {
    expect(classifyLuck(0).tier).toBe("legendary");
    expect(classifyLuck(0.4).tier).toBe("legendary");
    expect(classifyLuck(99.6).tier).toBe("legendary");
    expect(classifyLuck(100).tier).toBe("legendary");
  });

  it("is symmetric: tier only depends on distance from the median, not direction", () => {
    for (const p of [0, 0.5, 2, 5, 10, 17.2, 25, 33, 41, 49]) {
      expect(classifyLuck(p).tier).toBe(classifyLuck(100 - p).tier);
    }
  });

  it("direction is lucky above the median, unlucky below, average exactly at it", () => {
    expect(classifyLuck(50.1).direction).toBe("lucky");
    expect(classifyLuck(49.9).direction).toBe("unlucky");
    expect(classifyLuck(50).direction).toBe("average");
  });

  it("clamps out-of-range percentiles instead of throwing", () => {
    expect(() => classifyLuck(150)).not.toThrow();
    expect(classifyLuck(150).tier).toBe(classifyLuck(100).tier);
    expect(classifyLuck(-20).tier).toBe(classifyLuck(0).tier);
  });
});

describe("tierLabel", () => {
  it("is just the tier name for common (direction doesn't matter for the typical case)", () => {
    expect(tierLabel("common", "average")).toBe("Common");
    expect(tierLabel("common", "lucky")).toBe("Common");
  });
  it("appends 'good luck' / 'bad luck' for every tier above common", () => {
    expect(tierLabel("uncommon", "lucky")).toBe("Uncommon good luck");
    expect(tierLabel("rare", "unlucky")).toBe("Rare bad luck");
    expect(tierLabel("epic", "lucky")).toBe("Epic good luck");
    expect(tierLabel("legendary", "unlucky")).toBe("Legendary bad luck");
  });
});
