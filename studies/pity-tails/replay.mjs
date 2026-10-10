// Transpile the actual selected checkout, then exercise its exported math functions.
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import ts from "typescript";

const { values } = parseArgs({
  options: {
    src: { type: "string", default: "src" },
    out: { type: "string" },
    "observe-only": { type: "boolean" },
  },
});
assert(values.out, "--out is required");
const work = await mkdtemp(join(tmpdir(), "pity-tail-replay-"));
try {
  await writeFile(join(work, "package.json"), '{"type":"module"}');
  const hashes = {};
  for (const file of ["pity", "numeric"]) {
    const source = await readFile(
      resolve(values.src, `math/${file}.ts`),
      "utf8",
    );
    hashes[`math/${file}.ts`] = createHash("sha256")
      .update(source)
      .digest("hex");
    const emitted = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    });
    await writeFile(join(work, `${file}.js`), emitted.outputText);
  }
  const { pityDistribution, summarizePity, pityLuckPercentile } = await import(
    pathToFileURL(join(work, "pity.js"))
  );
  const base = {
    baseRate: 1,
    softPityStart: 1,
    softPityIncrement: 0,
    hardPity: 1,
    featuredRate: 0.0001,
    hasGuarantee: false,
  };
  const initial = { pity: 0, guaranteed: false };
  const cases = [
    {
      name: "rare-geometric",
      config: base,
      target: 1,
      budget: 100000,
      history: 100000,
      expected: {
        mean: 10000,
        sd: Math.sqrt(0.9999) / 0.0001,
        p50: null,
        p90: null,
        p99: null,
        withinBudget: null,
        historyPercentile: null,
      },
    },
    {
      name: "rare-multiple-copies",
      config: { ...base, featuredRate: 1e-6 },
      target: 3,
      budget: 100000,
      history: 100000,
      expected: {
        mean: 3000000,
        sd: Math.sqrt(3 * (1 - 1e-6)) / 1e-6,
        p50: null,
        p90: null,
        p99: null,
        withinBudget: null,
        historyPercentile: null,
      },
    },
    {
      name: "known-prefix",
      config: base,
      target: 1,
      budget: 5000,
      history: 100,
      expected: {
        mean: 10000,
        withinBudget: -Math.expm1(5000 * Math.log1p(-0.0001)),
        historyPercentile: 100 * Math.exp(100 * Math.log1p(-0.0001)),
      },
    },
    {
      name: "impossible",
      config: { ...base, featuredRate: 0 },
      target: 1,
      budget: 100000,
      history: 100,
      expected: {
        mean: Infinity,
        sd: NaN,
        p50: Infinity,
        p90: Infinity,
        p99: Infinity,
        withinBudget: 0,
        historyPercentile: null,
      },
    },
    {
      name: "forced-guarantee",
      config: { ...base, featuredRate: 0, hasGuarantee: true },
      target: 2,
      budget: 4,
      history: 3,
      expected: {
        mean: 4,
        sd: 0,
        p50: 4,
        p90: 4,
        p99: 4,
        withinBudget: 1,
        historyPercentile: null,
      },
    },
    {
      name: "half-featured",
      config: { ...base, featuredRate: 0.5 },
      target: 1,
      budget: 2,
      history: 2,
      expected: {
        mean: 2,
        sd: Math.sqrt(2),
        p50: 1,
        p90: 4,
        p99: 7,
        withinBudget: 0.75,
        historyPercentile: 25,
      },
    },
    {
      name: "bounded-pure-tier",
      config: { ...base, baseRate: 0.5, hardPity: 90, featuredRate: 1 },
      target: 1,
      budget: 1000,
      history: 1,
      expected: {
        mean: 2,
        sd: Math.sqrt(2),
        withinBudget: 1,
        historyPercentile: 50,
        exact: true,
      },
    },
    {
      name: "fractional-pity",
      config: base,
      initial: { pity: 0.5, guaranteed: false },
      target: 1,
      budget: 1,
      history: 1,
      expected: { error: true },
    },
    {
      name: "bounded-control",
      config: { ...base, featuredRate: 0.5, hasGuarantee: true },
      target: 3,
      budget: 4,
      history: 4,
      expected: {
        mean: 4.5,
        sd: Math.sqrt(0.75),
        p50: 4,
        p90: 6,
        p99: 6,
        withinBudget: 0.5,
        exact: true,
      },
    },
  ];
  const results = [];
  for (const scenario of cases) {
    const start = performance.now();
    let actual;
    try {
      const dist = pityDistribution(
        scenario.config,
        scenario.initial ?? initial,
        scenario.target,
      );
      const s = summarizePity(dist);
      actual = {
        mean: s.expectedPulls,
        sd: s.stdDevPulls,
        ...s.pullsFor,
        withinBudget: s.probabilityWithinBudget(scenario.budget),
        historyPercentile: pityLuckPercentile(dist, scenario.history),
        horizon: dist.horizon,
        tailMass: dist.tailMass,
        exact: dist.exact,
      };
    } catch (error) {
      actual = { error: true, message: error.message };
    }
    const disagreements = Object.entries(scenario.expected)
      .filter(([key, expected]) => {
        const found = actual[key];
        return (
          !Object.is(found, expected) &&
          !(
            typeof found === "number" &&
            typeof expected === "number" &&
            Number.isFinite(found) &&
            Number.isFinite(expected) &&
            Math.abs(found - expected) < 2e-11 * Math.max(1, Math.abs(expected))
          )
        );
      })
      .map(([key]) => key);
    results.push({
      ...scenario,
      actual,
      elapsedMs: performance.now() - start,
      disagreements,
    });
  }
  const report = {
    runtime: process.version,
    sourceHashes: hashes,
    scenarios: results.length,
    disagreements: results.filter((r) => r.disagreements.length).length,
    results,
  };
  await mkdir(resolve(values.out, ".."), { recursive: true });
  await writeFile(
    values.out,
    JSON.stringify(
      report,
      (_key, value) =>
        typeof value === "number" && !Number.isFinite(value)
          ? String(value)
          : value,
      2,
    ) + "\n",
  );
  console.log(
    `${report.scenarios} scenarios; ${report.disagreements} disagree with the corrected contract`,
  );
  if (report.disagreements && !values["observe-only"]) process.exitCode = 1;
} finally {
  await rm(work, { recursive: true, force: true });
}
