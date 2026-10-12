import { describe, expect, it } from "vitest";
import {
  simpleLuckComparison,
  simpleWaitingComparison,
} from "../src/math/simple.js";
import { fmtNum, fmtOrdinal } from "../src/ui/format.js";
import { renderLuckMeter } from "../src/ui/luck-meter.js";

describe("renderLuckMeter", () => {
  it("shows all three disjoint outcomes instead of treating ties as faster players", () => {
    const html = renderLuckMeter(simpleLuckComparison(1, 0.9, 1)!, "ctx");
    expect(html).toContain("About average");
    expect(html).toContain("Finished sooner</dt><dd>0%");
    expect(html).toContain("Same attempt</dt><dd>90%");
    expect(html).toContain("Took longer</dt><dd>10%");
    expect(html).toContain("The outlined band includes ties");
    expect(html).not.toContain("90% of players would have gotten it sooner");
  });
  it("shows observed waiting, not a completed-rank claim", () => {
    const html = renderLuckMeter(simpleWaitingComparison(3, 0.5, 1), "ctx");
    expect(html).toContain("Still waiting too</dt><dd>12.5%");
    expect(html).toContain("87.5% of players would have it by now.");
    expect(html).not.toContain("At best");
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
