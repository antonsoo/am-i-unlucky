import { describe, expect, it } from "vitest";
import {
  itemTierRate,
  pityDistribution,
  summarizePity,
  type PityConfig,
} from "../src/math/pity.js";
import { PITY_PRESETS } from "../src/presets.js";

const archetype = PITY_PRESETS.find((p) => p.id === "soft-pity-gacha")!.config;
const logged = PITY_PRESETS.find(
  (p) => p.id === "genshin-logged-2026-10",
)!.config;

describe("measured per-pull table", () => {
  it("replaces the curve before hard pity and leaves hard pity alone", () => {
    const cfg: PityConfig = { ...archetype, rates: [0.01, 0.02, 0.5] };
    expect(itemTierRate(0, cfg)).toBe(0.01);
    expect(itemTierRate(2, cfg)).toBe(0.5);
    // beyond the table the parametric curve takes over
    expect(itemTierRate(10, cfg)).toBeCloseTo(0.006);
    expect(itemTierRate(89, cfg)).toBe(1);
  });

  it("reproduces the parametric chain exactly when the table is the curve", () => {
    const table = Array.from({ length: archetype.hardPity }, (_, i) =>
      itemTierRate(i, archetype),
    );
    const a = pityDistribution(archetype, { pity: 0, guaranteed: false }, 2);
    const b = pityDistribution(
      { ...archetype, rates: table },
      { pity: 0, guaranteed: false },
      2,
    );
    expect(b.pmf.length).toBe(a.pmf.length);
    for (let t = 0; t < a.pmf.length; t++) {
      expect(b.pmf[t]).toBeCloseTo(a.pmf[t]!, 14);
    }
  });
});

describe("logged Genshin Impact character-banner preset", () => {
  it("is a 90-entry probability table that ends at hard pity", () => {
    const rates = logged.rates!;
    expect(rates).toHaveLength(90);
    expect(rates.every((r) => r >= 0 && r <= 1)).toBe(true);
    expect(rates[89]).toBe(1);
    // the logged ramp is still the archetype's to within a point at its steepest
    expect(Math.abs(rates[79]! - itemTierRate(79, archetype))).toBeLessThan(
      0.01,
    );
  });

  it("matches an independent renewal-theory calculation for one copy", () => {
    // Pulls to the first featured copy from a fresh counter: a five-star arrives after L1 pulls;
    // featured with probability w, otherwise a second, guaranteed, five-star follows after L2.
    const w = logged.featuredRate;
    const rates = logged.rates!;
    const g = new Float64Array(91);
    let surv = 1;
    for (let n = 1; n <= 90; n++) {
      const h = n === 90 ? 1 : rates[n - 1]!;
      g[n] = surv * h;
      surv *= 1 - h;
    }
    const f = new Float64Array(181);
    for (let a = 1; a <= 90; a++) {
      f[a] = (f[a] ?? 0) + w * g[a]!;
      for (let b = 1; b <= 90; b++) {
        f[a + b] = (f[a + b] ?? 0) + (1 - w) * g[a]! * g[b]!;
      }
    }
    const d = pityDistribution(logged, { pity: 0, guaranteed: false }, 1);
    for (let t = 0; t <= 180; t++) {
      expect(d.pmf[t] ?? 0).toBeCloseTo(f[t]!, 12);
    }
    const mean = f.reduce((s, p, t) => s + p * t, 0);
    expect(summarizePity(d).expectedPulls).toBeCloseTo(mean, 9);
  });

  it("keeps the archetype's parametric fields and says where its table comes from", () => {
    const preset = PITY_PRESETS.find((p) => p.id === "genshin-logged-2026-10")!;
    expect(preset.measured?.retrieved).toBe("2026-10-08");
    expect(preset.config.featuredRate).toBe(0.55);
    expect(archetype.rates).toBeUndefined();
    expect(archetype.featuredRate).toBe(0.5);
  });
});
