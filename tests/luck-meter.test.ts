import { describe, expect, it } from "vitest";
import { luckPercentile } from "../src/math/simple.js";
import { fmtNum, fmtOrdinal } from "../src/ui/format.js";
import { renderLuckMeter } from "../src/ui/luck-meter.js";

describe("renderLuckMeter for a player still waiting", () => {
  it("reads the best case as the drop coming on the next attempt, not on the last one", () => {
    // A coin-flip drop, still missing after 3 tries: 12.5% of players would need
    // more than 3, but a drop on try 4 only beats the 6.25% who need more than 4.
    const now = luckPercentile(3, 0.5, 1);
    const next = luckPercentile(4, 0.5, 1);
    expect(now).toBeCloseTo(12.5, 10);
    expect(next).toBeCloseTo(6.25, 10);
    const html = renderLuckMeter(now, "ctx", false, next);
    expect(html).toContain(
      "At best the 6.3rd percentile, if it comes on your next attempt",
    );
    expect(html).toContain("87.5% of players would have it by now.");
    expect(html).toContain('style="left: 6.25%;"');
  });

  it("reads a finished run exactly as before", () => {
    const html = renderLuckMeter(71, "ctx");
    expect(html).toContain("71st percentile");
    expect(html).toContain("You beat 71% of players.");
  });
});

describe("fmtOrdinal / fmtNum", () => {
  it("picks the English ordinal suffix from the last digits", () => {
    expect(
      [
        "1",
        "2",
        "3",
        "4",
        "11",
        "12",
        "13",
        "21",
        "22",
        "101",
        "17.2",
        "99.9",
        "0.5",
      ].map((t) => fmtOrdinal(Number(t))),
    ).toEqual([
      "1st",
      "2nd",
      "3rd",
      "4th",
      "11th",
      "12th",
      "13th",
      "21st",
      "22nd",
      "101st",
      "17.2nd",
      "99.9th",
      "0.5th",
    ]);
  });

  it("formats NaN as a dash, not as infinity", () => {
    expect(fmtNum(Number.NaN)).toBe("—");
    expect(fmtNum(Number.POSITIVE_INFINITY)).toBe("∞");
  });
});
