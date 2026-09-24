import { describe, expect, it } from "vitest";
import {
  formatRateAsOdds,
  formatRateAsPercent,
  parseRate,
  RateParseError,
} from "../src/math/rate.js";

describe("parseRate", () => {
  it("parses fractions", () => {
    expect(parseRate("1/512")).toBeCloseTo(1 / 512);
    expect(parseRate("3 / 1024")).toBeCloseTo(3 / 1024);
  });

  it("parses percentages", () => {
    expect(parseRate("0.2%")).toBeCloseTo(0.002);
    expect(parseRate("100%")).toBeCloseTo(1);
    expect(parseRate("0%")).toBe(0);
  });

  it("parses decimals", () => {
    expect(parseRate("0.002")).toBeCloseTo(0.002);
    expect(parseRate("1")).toBe(1);
    expect(parseRate("0")).toBe(0);
  });

  it("trims whitespace", () => {
    expect(parseRate("  1/512  ")).toBeCloseTo(1 / 512);
  });

  it("rejects garbage", () => {
    expect(() => parseRate("banana")).toThrow(RateParseError);
    expect(() => parseRate("")).toThrow(RateParseError);
    expect(() => parseRate("1/0")).toThrow(RateParseError);
  });

  it("rejects out-of-range probabilities", () => {
    expect(() => parseRate("2")).toThrow(RateParseError);
    expect(() => parseRate("150%")).toThrow(RateParseError);
  });
});

describe("formatRateAsOdds", () => {
  it("formats clean fractions", () => {
    expect(formatRateAsOdds(1 / 512)).toBe("1 in 512");
  });
  it("handles extremes", () => {
    expect(formatRateAsOdds(0)).toBe("never");
    expect(formatRateAsOdds(1)).toBe("always");
  });
});

describe("formatRateAsPercent", () => {
  it("formats small and large rates legibly", () => {
    expect(formatRateAsPercent(0.5)).toBe("50%");
    expect(formatRateAsPercent(1 / 4096)).not.toBe("0%");
  });
});
