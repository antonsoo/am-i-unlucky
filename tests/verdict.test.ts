import { describe, expect, it } from "vitest";
import { luckVerdict, meterPercentile } from "../src/ui/verdict.js";

describe("luckVerdict", () => {
  it("leads with 'Lucky' above the 60th percentile and states the percentile directly", () => {
    const v = luckVerdict(71);
    expect(v.headline).toBe("Lucky");
    expect(v.detail).toBe("You beat 71% of players.");
  });

  it("leads with 'Unlucky' below the 40th percentile and states the complement", () => {
    // 900 attempts at 1/512 odds for 1 copy lands at the 17.2nd percentile.
    const v = luckVerdict(17.2);
    expect(v.headline).toBe("Unlucky");
    expect(v.detail).toBe("82.8% of players would have gotten it sooner.");
  });

  it("is 'About average' in the middle band", () => {
    const v = luckVerdict(50);
    expect(v.headline).toBe("About average");
    expect(v.detail).toBe("Right in the middle of the pack.");
  });

  it("exposes a stable tone independent of which side of 50 it's on, for styling", () => {
    // 41 is below the median (classifyLuck's direction would be "unlucky")
    // but still within the verdict's wider "About average" band — the tone
    // must follow the verdict's own band, not classifyLuck's, or the
    // headline text and its color would disagree.
    expect(luckVerdict(41).tone).toBe("average");
    expect(luckVerdict(41).headline).toBe("About average");
    expect(luckVerdict(71).tone).toBe("lucky");
    expect(luckVerdict(17.2).tone).toBe("unlucky");
  });

  it("the average band covers roughly the 40th-60th percentile, inclusive", () => {
    expect(luckVerdict(40).headline).toBe("About average");
    expect(luckVerdict(60).headline).toBe("About average");
    expect(luckVerdict(39.9).headline).toBe("Unlucky");
    expect(luckVerdict(60.1).headline).toBe("Lucky");
  });

  it("clamps out-of-range percentiles instead of producing nonsense text", () => {
    expect(luckVerdict(150).headline).toBe("Lucky");
    expect(luckVerdict(-10).headline).toBe("Unlucky");
  });
});

describe("luckVerdict for a player still waiting", () => {
  it("calls a long dry streak unlucky, stated as who would have it by now", () => {
    // Still no drop after 900 attempts at 1/512: 82.8% of players would have it.
    const v = luckVerdict(17.2, false);
    expect(v.headline).toBe("Unlucky");
    expect(v.detail).toBe("82.8% of players would have it by now.");
    expect(v.tone).toBe("unlucky");
  });

  it("never calls a player lucky before the drop comes", () => {
    // 100 attempts at 1/512 without it: 82.2% of players are still waiting too.
    const v = luckVerdict(82.2, false);
    expect(v.headline).toBe("Not unlucky yet");
    expect(v.detail).toBe(
      "Only 17.8% of players would have it by now, so still waiting is normal.",
    );
    expect(v.tone).toBe("average");
    expect(luckVerdict(40, false).headline).toBe("Not unlucky yet");
    expect(luckVerdict(39.9, false).headline).toBe("Unlucky");
  });

  it("keeps the meter's needle off the lucky side", () => {
    expect(meterPercentile(82.2, false)).toBe(50);
    expect(meterPercentile(17.2, false)).toBe(17.2);
    expect(meterPercentile(82.2, true)).toBe(82.2);
  });
});
