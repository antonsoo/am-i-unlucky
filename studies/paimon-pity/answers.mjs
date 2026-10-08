// What the tool answers for the same questions under four settings, using the
// tool's own exact Markov chain (src/math/pity.ts).
//   node answers.mjs <dir with presets.js and math/ compiled by tsc> <out answers.json>
// Compile first (see README, Reproduce).
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { join, resolve } from "node:path";

const dir = resolve(process.argv[2]);
const { pityDistribution, summarizePity, pityLuckPercentile } = await import(
  pathToFileURL(join(dir, "math/pity.js")).href
);
const { PITY_PRESETS } = await import(
  pathToFileURL(join(dir, "presets.js")).href
);

const archetype = PITY_PRESETS.find((p) => p.id === "soft-pity-gacha").config;
const logged = PITY_PRESETS.find(
  (p) => p.id === "genshin-logged-2026-10",
).config;
const settings = {
  "archetype, 50/50 (released 0.4.0 preset)": {
    ...archetype,
    featuredRate: 0.5,
  },
  "archetype hazard, 55%": { ...archetype, featuredRate: 0.55 },
  "logged hazard, 50/50": { ...logged, featuredRate: 0.5 },
  "logged hazard, 55% (new preset)": logged,
};
const questions = [
  { copies: 1, guaranteed: false, budgets: [90, 120, 180], history: 150 },
  { copies: 1, guaranteed: true, budgets: [90], history: 60 },
  { copies: 2, guaranteed: false, budgets: [180, 270, 360], history: 300 },
  { copies: 7, guaranteed: false, budgets: [600, 800], history: 700 },
];
const out = {
  settings: Object.fromEntries(
    Object.entries(settings).map(([k, v]) => [
      k,
      { featuredRate: v.featuredRate, measured_table: v.rates !== undefined },
    ]),
  ),
  answers: [],
};
for (const q of questions) {
  const row = {
    copies: q.copies,
    start: q.guaranteed
      ? "fresh pity, on guarantee"
      : "fresh pity, 50/50 pending",
    history_pulls: q.history,
    results: {},
  };
  for (const [name, cfg] of Object.entries(settings)) {
    const d = pityDistribution(
      cfg,
      { pity: 0, guaranteed: q.guaranteed },
      q.copies,
    );
    const s = summarizePity(d);
    row.results[name] = {
      mean: s.expectedPulls,
      sd: s.stdDevPulls,
      p50: s.pullsFor.p50,
      p90: s.pullsFor.p90,
      p99: s.pullsFor.p99,
      within: Object.fromEntries(
        q.budgets.map((b) => [String(b), s.probabilityWithinBudget(b)]),
      ),
      luck_percentile_of_history: pityLuckPercentile(d, q.history),
      tail_mass: d.tailMass,
    };
  }
  out.answers.push(row);
}
// total variation distance between the one-copy distributions
const pm = (cfg) =>
  pityDistribution(cfg, { pity: 0, guaranteed: false }, 1).pmf;
const tv = (a, b) => {
  const n = Math.max(a.length, b.length);
  let t = 0;
  for (let i = 0; i < n; i++) t += Math.abs((a[i] ?? 0) - (b[i] ?? 0));
  return t / 2;
};
const A = pm(settings["archetype, 50/50 (released 0.4.0 preset)"]);
out.total_variation_one_copy = {
  "archetype vs archetype+55%": tv(A, pm(settings["archetype hazard, 55%"])),
  "archetype vs logged hazard (both 50/50)": tv(
    A,
    pm(settings["logged hazard, 50/50"]),
  ),
  "archetype vs new preset": tv(
    A,
    pm(settings["logged hazard, 55% (new preset)"]),
  ),
};
writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
console.log("wrote", process.argv[3]);
