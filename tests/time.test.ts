import { describe, expect, it } from "vitest";
import { combinedDailyRate, timeToDrop } from "../src/math/time.js";
import { binomialSurvival } from "../src/math/simple.js";

describe("combinedDailyRate", () => {
  it("matches a single source's per-run rate when runsPerDay=1", () => {
    expect(
      combinedDailyRate([{ name: "a", p: 0.1, runsPerDay: 1 }]),
    ).toBeCloseTo(0.1, 12);
  });
  it("combines multiple runs of one source as 1-(1-p)^runs", () => {
    const q = combinedDailyRate([{ name: "a", p: 0.05, runsPerDay: 3 }]);
    expect(q).toBeCloseTo(1 - Math.pow(0.95, 3), 12);
  });
  it("combines independent sources multiplicatively on the miss side", () => {
    const q = combinedDailyRate([
      { name: "daily", p: 0.1, runsPerDay: 1 },
      { name: "weekly-ish", p: 0.5, runsPerDay: 0.2 },
    ]);
    const expected = 1 - Math.pow(0.9, 1) * Math.pow(0.5, 0.2);
    expect(q).toBeCloseTo(expected, 12);
  });
  it("is 0 for no sources", () => {
    expect(combinedDailyRate([])).toBe(0);
  });
});

describe("timeToDrop", () => {
  it("expected days equals k / dailyRate", () => {
    const result = timeToDrop({
      sources: [{ name: "a", p: 0.02, runsPerDay: 5 }],
      k: 2,
    });
    expect(result.expectedDays).toBeCloseTo(2 / result.dailySuccessRate, 9);
    expect(result.expectedHours).toBeCloseTo(result.expectedDays * 24, 9);
  });
  it("probabilityWithinDays matches the binomial survival on the daily rate", () => {
    const sources = [{ name: "a", p: 0.05, runsPerDay: 2 }];
    const result = timeToDrop({ sources, k: 1 });
    const q = combinedDailyRate(sources);
    expect(result.probabilityWithinDays(30)).toBeCloseTo(
      binomialSurvival(30, q, 1),
      9,
    );
  });
  it("rejects a non-positive k", () => {
    expect(() =>
      timeToDrop({ sources: [{ name: "a", p: 0.5, runsPerDay: 1 }], k: 0 }),
    ).toThrow();
  });
});
