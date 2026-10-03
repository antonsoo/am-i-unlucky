import { describe, expect, it } from "vitest";
import {
  combinedDailyRate,
  MAX_TIME_DAYS,
  timeToDrop,
  timeToDropDistribution,
  type ScheduledAttemptSource,
} from "../src/math/time.js";

const daily = (p: number, attempts = 1): ScheduledAttemptSource => ({
  name: "Daily",
  p,
  attempts,
  everyDays: 1,
});
const weekly = (p: number, attempts = 1): ScheduledAttemptSource => ({
  name: "Weekly",
  p,
  attempts,
  everyDays: 7,
});

/** Independent oracle: enumerate every single Bernoulli attempt, including an absorbing target. */
function enumerate(
  sources: ScheduledAttemptSource[],
  k: number,
  days: number,
): number[] {
  let mass: number[] = Array.from({ length: k + 1 }, (_, i) =>
    i === 0 ? 1 : 0,
  );
  const cdf = [0];
  for (let day = 1; day <= days; day++) {
    for (const source of sources) {
      if (day % source.everyDays !== 0) continue;
      for (let attempt = 0; attempt < source.attempts; attempt++) {
        const next = new Array<number>(k + 1).fill(0);
        for (let j = 0; j <= k; j++) {
          next[j]! += mass[j]! * (1 - source.p);
          next[Math.min(k, j + 1)]! += mass[j]! * source.p;
        }
        mass = next;
      }
    }
    cdf.push(mass[k]!);
  }
  return cdf;
}

describe("time-to-drop accumulated copies", () => {
  it("counts all copies in the first daily batch", () => {
    const result = timeToDrop({ sources: [daily(1, 10)], k: 5 });
    expect(result.expectedDays).toBe(1);
    expect(result.daysFor).toEqual({ p50: 1, p90: 1, p99: 1 });
    expect(result.probabilityWithinDays(0.99)).toBe(0);
    expect(result.probabilityWithinDays(1)).toBe(1);
  });

  it("counts all attempts for multiple daily copies", () => {
    const result = timeToDrop({ sources: [daily(0.5, 2)], k: 2 });
    expect(result.probabilityWithinDays(1)).toBeCloseTo(0.25, 14);
    expect(result.probabilityWithinDays(2)).toBeCloseTo(11 / 16, 14);
    expect(result.expectedDays).toBeCloseTo(20 / 9, 13);
  });

  it("has no weekly successes before the first complete week", () => {
    const result = timeToDrop({ sources: [weekly(0.5, 2)], k: 2 });
    expect(result.probabilityWithinDays(6)).toBe(0);
    expect(result.probabilityWithinDays(7)).toBeCloseTo(0.25, 14);
    expect(result.probabilityWithinDays(13)).toBeCloseTo(0.25, 14);
    expect(result.probabilityWithinDays(14)).toBeCloseTo(11 / 16, 14);
    expect(result.expectedDays).toBeCloseTo(140 / 9, 12);
    expect(result.daysFor.p50).toBe(14);
    expect(result.dailySuccessRate).toBe(0);
    expect(result.totalRunsPerDay).toBeCloseTo(2 / 7, 14);
  });

  for (const sources of [
    [daily(0.5, 3)],
    [daily(0.25, 2), weekly(0.75, 3)],
    [daily(0.5), daily(0.25, 2)],
    [weekly(1, 2), daily(0.125)],
  ]) {
    for (const k of [1, 2, 5, 10]) {
      it(`matches individual-attempt enumeration: ${JSON.stringify(sources)}, k=${k}`, () => {
        const cdf = enumerate(sources, k, 400);
        const result = timeToDrop({ sources, k });
        for (let day = 0; day <= 30; day++) {
          expect(result.probabilityWithinDays(day)).toBeCloseTo(cdf[day]!, 12);
        }
        // After 400 days all chosen distributions have negligible remaining mass.
        const expected = cdf.slice(0, -1).reduce((sum, p) => sum + 1 - p, 0);
        expect(result.expectedDays).toBeCloseTo(expected, 10);
        for (const [key, target] of [
          ["p50", 0.5],
          ["p90", 0.9],
          ["p99", 0.99],
        ] as const) {
          expect(result.daysFor[key]).toBe(cdf.findIndex((p) => p >= target));
        }
      });
    }
  }

  it("retains the daily-only API for integer batch sizes", () => {
    expect(
      timeToDrop({ sources: [{ name: "Daily", p: 0.5, runsPerDay: 2 }], k: 2 })
        .expectedDays,
    ).toBeCloseTo(20 / 9, 13);
    expect(
      combinedDailyRate([
        { name: "A", p: 0.1, runsPerDay: 1 },
        { name: "B", p: 0.5, runsPerDay: 2 },
      ]),
    ).toBeCloseTo(0.775, 14);
  });

  it("uses a snapshot of caller-owned sources", () => {
    const sources = [daily(0.5, 2)];
    const result = timeToDrop({ sources, k: 2 });
    sources[0]!.p = 1;
    sources[0]!.attempts = 0;
    expect(result.probabilityWithinDays(3)).toBeCloseTo(57 / 64, 14);
  });

  it("keeps the same fair-coin median when identical attempts are split across sources", () => {
    for (const k of [2, 3, 5, 10, 25, 50, 100]) {
      const sources = [daily(0.5, 1), daily(0.5, 2 * k - 2)];
      const result = timeToDrop({ sources, k });
      expect(result.probabilityWithinDays(1)).toBeCloseTo(0.5, 12);
      expect(result.daysFor.p50, `k=${k}`).toBe(1);
    }
  });

  it("keeps exact medians for complementary rates and guaranteed copies", () => {
    for (const k of [2, 5, 10, 25, 50, 100]) {
      const result = timeToDrop({
        sources: [daily(0.25, k - 1), daily(0.75, k - 1), daily(0.5)],
        k,
      });
      expect(result.daysFor.p50, `k=${k}`).toBe(1);
    }
    expect(
      timeToDrop({ sources: [daily(1), daily(0.5, 3)], k: 3 }).daysFor.p50,
    ).toBe(1);
  });
});

describe("time planning bounds and precision", () => {
  it("preserves tiny probabilities and labels milestones beyond the supported horizon", () => {
    const result = timeToDrop({ sources: [daily(1e-20)], k: 1 });
    expect(result.possible).toBe(true);
    expect(result.dailySuccessRate).toBe(1e-20);
    expect(result.expectedDays).toBe(1e20);
    expect(result.daysFor).toEqual({ p50: null, p90: null, p99: null });
    expect(result.probabilityWithinDays(1)).toBe(1e-20);
    expect(result.probabilityWithinDays(MAX_TIME_DAYS)).toBeGreaterThan(0);
  });

  it("does not cancel tiny multi-copy tails", () => {
    const result = timeToDrop({ sources: [daily(1e-12), daily(2e-12)], k: 2 });
    expect(result.probabilityWithinDays(1) / 2e-24).toBeCloseTo(1, 12);
    expect(result.expectedDays! / (2 / 3e-12)).toBeCloseTo(1, 10);
  });

  it("supports large batches without attempting an enormous central tail sum", () => {
    const result = timeToDrop({ sources: [daily(0.5, 1_000_000)], k: 100 });
    expect(result.probabilityWithinDays(MAX_TIME_DAYS)).toBe(1);
    expect(result.expectedDays).toBe(1);
    expect(result.daysFor.p99).toBe(1);
  });

  it("distinguishes numeric overflow from an impossible drop", () => {
    const result = timeToDrop({ sources: [daily(Number.MIN_VALUE)], k: 2 });
    expect(result.possible).toBe(true);
    expect(result.expectedDays).toBeNull();
    expect(result.daysFor.p50).toBeNull();
  });

  it.each([[], [daily(0)], [daily(1, 0)], [weekly(0, 10), daily(1, 0)]])(
    "handles no productive attempts: %j",
    (...sources) => {
      // it.each spreads an array row into arguments.
      const result = timeToDrop({ sources, k: 3 });
      expect(result.possible).toBe(false);
      expect(result.expectedDays).toBe(Infinity);
      expect(result.daysFor.p99).toBe(Infinity);
      expect(result.probabilityWithinDays(100)).toBe(0);
      expect(result.distribution()).toEqual([]);
    },
  );

  it.each([NaN, Infinity, -1, 1.1])("rejects invalid probabilities %s", (p) => {
    expect(() => timeToDrop({ sources: [daily(p)], k: 1 })).toThrow(RangeError);
  });
  it.each([NaN, Infinity, -1, 0.2, 1_000_001])(
    "rejects invalid batch sizes %s",
    (attempts) => {
      expect(() =>
        timeToDrop({ sources: [daily(0.5, attempts)], k: 1 }),
      ).toThrow(/Attempts must be whole/);
    },
  );
  it.each([0, -1, NaN, Infinity, 0.5, 101])(
    "rejects invalid targets %s",
    (k) => {
      expect(() => timeToDrop({ sources: [daily(0.5)], k })).toThrow(
        /Copies needed/,
      );
    },
  );
  it("rejects unsupported schedules and too many sources", () => {
    expect(() =>
      timeToDrop({ sources: [{ ...daily(0.5), everyDays: 2 }], k: 1 }),
    ).toThrow(/Daily or Weekly/);
    expect(() =>
      timeToDrop({
        sources: new Array<ScheduledAttemptSource>(13).fill(daily(0.5)),
        k: 1,
      }),
    ).toThrow(/at most 12/);
  });
  it("validates query days and chart budgets", () => {
    const result = timeToDrop({ sources: [daily(0.5)], k: 1 });
    for (const days of [-1, NaN, Infinity, MAX_TIME_DAYS + 1])
      expect(() => result.probabilityWithinDays(days)).toThrow(RangeError);
    for (const points of [0, 1, 1.5, 1001, NaN])
      expect(() => result.distribution(points)).toThrow(RangeError);
  });
  it("bins the whole finishing probability instead of skipping days", () => {
    const points = timeToDropDistribution([daily(0.002), weekly(0.05)], 5, 40);
    expect(points.length).toBeLessThanOrEqual(40);
    expect(points[0]).toEqual({ n: 0, fromDay: 0, pmf: 0, cdf: 0 });
    expect(points.at(-1)!.cdf).toBeGreaterThanOrEqual(0.99);
    expect(points.reduce((sum, p) => sum + p.pmf, 0)).toBeCloseTo(
      points.at(-1)!.cdf,
      14,
    );
    for (let i = 1; i < points.length; i++) {
      expect(points[i]!.fromDay).toBe(points[i - 1]!.n + 1);
      expect(points[i]!.pmf).toBeGreaterThanOrEqual(0);
    }
  });
});
