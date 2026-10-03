import { expect, it } from "vitest";
import { combinedDailyRate, timeToDrop } from "../src/math/time.js";

it("counts every guaranteed copy within a day's batch", () => {
  const result = timeToDrop({
    sources: [{ name: "Guaranteed", p: 1, runsPerDay: 10 }],
    k: 5,
  });
  expect(result.expectedDays).toBe(1);
  expect(result.probabilityWithinDays(1)).toBe(1);
  expect(result.daysFor.p99).toBe(1);
});

it("preserves a small nonzero per-attempt probability", () => {
  expect(combinedDailyRate([{ name: "Rare", p: 1e-20, runsPerDay: 1 }])).toBe(
    1e-20,
  );
});
