import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { timeToDrop, type ScheduledAttemptSource } from "../src/math/time.js";
import { defaultState, decodeState, encodeState } from "../src/ui/app-state.js";

type Ratio = [string, string];
interface OracleCase {
  id: string;
  k: number;
  sources: {
    name: string;
    numerator: number;
    denominator: number;
    attempts: number;
    everyDays: number;
    firstDay: number;
  }[];
  mean: Ratio;
  cdf: Ratio[];
  daysFor: { p50: number; p90: number; p99: number };
}
const ratio = ([n, d]: Ratio): number => Number(n) / Number(d);
const oracle = JSON.parse(
  gunzipSync(
    readFileSync(
      new URL("../studies/next-batch/oracle.json.gz", import.meta.url),
    ),
  ).toString(),
) as { cases: OracleCase[] };
const weekly = (firstDay?: number) => ({
  name: "Weekly",
  p: 0.5,
  attempts: 1,
  everyDays: 7,
  ...(firstDay === undefined ? {} : { firstDay }),
});

describe("starting from the next weekly batch", () => {
  it("keeps the entire weekly tail while moving the first attempt to day 2", () => {
    const result = timeToDrop({ k: 1, sources: [weekly(2)] });
    expect(result.expectedDays).toBe(9);
    expect(result.expectedHours).toBe(216);
    expect(result.daysFor).toEqual({ p50: 2, p90: 23, p99: 44 });
    expect(
      [0, 1, 2, 8, 9].map((day) => result.probabilityWithinDays(day)),
    ).toEqual([0, 0, 0.5, 0.5, 0.75]);
    expect(timeToDrop({ k: 1, sources: [weekly()] }).expectedDays).toBe(14);
  });

  it("retains separate source timing when two weekly reset days differ", () => {
    const result = timeToDrop({ k: 1, sources: [weekly(2), weekly(5)] });
    expect(result.expectedDays).toBeCloseTo(16 / 3, 13);
    expect(result.daysFor).toEqual({ p50: 2, p90: 12, p99: 23 });
    expect(
      [1, 2, 4, 5, 8, 9].map((day) => result.probabilityWithinDays(day)),
    ).toEqual([0, 0.5, 0.5, 0.75, 0.75, 0.875]);
  });

  it("matches exact rational day enumeration and phase-state means for all retained schedules", () => {
    for (const row of oracle.cases) {
      const result = timeToDrop({
        k: row.k,
        sources: row.sources.map((s) => ({
          name: s.name,
          p: s.numerator / s.denominator,
          attempts: s.attempts,
          everyDays: s.everyDays,
          firstDay: s.firstDay,
        })),
      });
      expect(
        Math.abs(result.expectedDays! - ratio(row.mean)),
        row.id,
      ).toBeLessThan(3e-11);
      expect(result.daysFor, row.id).toEqual(row.daysFor);
      row.cdf.forEach((probability, day) =>
        expect(
          Math.abs(result.probabilityWithinDays(day) - ratio(probability)),
          `${row.id} day ${day}`,
        ).toBeLessThan(3e-12),
      );
    }
  });

  it.each([0, -1, 8, 1.5, NaN])(
    "refuses an invalid first weekly day: %s",
    (firstDay) => {
      expect(() => timeToDrop({ k: 1, sources: [weekly(firstDay)] })).toThrow(
        "First batch day",
      );
    },
  );
  it("refuses explicit null rather than defaulting a JavaScript caller to a full week", () => {
    const supplied = {
      ...weekly(),
      firstDay: null,
    } as unknown as ScheduledAttemptSource;
    expect(() => timeToDrop({ k: 1, sources: [supplied] })).toThrow(
      "First batch day",
    );
  });

  it("keeps daily first batches at day 1", () => {
    expect(() =>
      timeToDrop({ k: 1, sources: [{ ...weekly(2), everyDays: 1 }] }),
    ).toThrow("from 1 to 1");
  });

  it("retains the chosen first day in a shared URL and keeps invalid finite drafts actionable", () => {
    const state = defaultState();
    state.mode = "time";
    state.time.sources = [
      { name: "Raid", rate: "50%", attempts: 1, everyDays: 7, firstDay: 2 },
    ];
    expect(decodeState("?" + encodeState(state)).time).toEqual(state.time);
    state.time.sources[0]!.firstDay = 8;
    expect(
      decodeState("?" + encodeState(state)).time.sources[0]!.firstDay,
    ).toBe(8);
  });
});
