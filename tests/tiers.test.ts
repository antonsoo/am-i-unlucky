import { describe, expect, it } from "vitest";
import { classifyLuck } from "../src/math/tiers.js";

describe("classifyLuck", () => {
  it("is common near the median", () => {
    expect(classifyLuck(50).tier).toBe("common");
    expect(classifyLuck(50).direction).toBe("average");
  });
  it("is legendary at the extremes, both lucky and unlucky", () => {
    expect(classifyLuck(99.9).tier).toBe("legendary");
    expect(classifyLuck(99.9).direction).toBe("lucky");
    expect(classifyLuck(0.1).tier).toBe("legendary");
    expect(classifyLuck(0.1).direction).toBe("unlucky");
  });
  it("is symmetric around the median", () => {
    expect(classifyLuck(20).tier).toBe(classifyLuck(80).tier);
    expect(classifyLuck(5).tier).toBe(classifyLuck(95).tier);
  });
  it("clamps out-of-range percentiles", () => {
    expect(() => classifyLuck(150)).not.toThrow();
    expect(classifyLuck(150).tier).toBe(classifyLuck(100).tier);
  });
});
