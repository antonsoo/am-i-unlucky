import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";
import { URL, pathToFileURL } from "node:url";
const [compiled, output, phase = "after"] = process.argv.slice(2);
assert(compiled && output && ["before", "after"].includes(phase));
const { timeToDrop } = await import(
  pathToFileURL(resolve(compiled, "math/time.js"))
);
const oracle = JSON.parse(
  gunzipSync(await readFile(new URL("oracle.json.gz", import.meta.url))),
);
const input = (row, boundary = false) => ({
  k: row.k,
  sources: row.sources.map((s) => ({
    name: s.name,
    p: s.numerator / s.denominator,
    attempts: s.attempts,
    everyDays: s.everyDays,
    ...(boundary ? {} : { firstDay: s.firstDay }),
  })),
});
const ratio = ([n, d]) => Number(n) / Number(d);
function replay(row, boundary = false) {
  const actual = timeToDrop(input(row, boundary));
  const cdf = row.cdf.map((_, day) => actual.probabilityWithinDays(day));
  const errors = cdf.map((value, day) => Math.abs(value - ratio(row.cdf[day])));
  const meanError = Math.abs(actual.expectedDays - ratio(row.mean));
  assert(meanError <= 3e-11 * Math.max(1, ratio(row.mean)), row.id);
  assert(Math.max(...errors) <= 3e-12, row.id);
  assert.deepEqual(actual.daysFor, row.daysFor, row.id);
  return {
    id: row.id,
    possible: actual.possible,
    dailySuccessRate: actual.dailySuccessRate,
    totalRunsPerDay: actual.totalRunsPerDay,
    expectedDays: actual.expectedDays,
    expectedHours: actual.expectedHours,
    daysFor: actual.daysFor,
    ...(boundary
      ? { cdf, distribution: actual.distribution() }
      : {
          cdfSha256: createHash("sha256")
            .update(JSON.stringify(cdf))
            .digest("hex"),
        }),
    maxCdfError: Math.max(...errors),
    meanError,
  };
}
const controls = oracle.synchronizedControls.map((row) => replay(row, true));
const cases = phase === "after" ? oracle.cases.map((row) => replay(row)) : [];
if (phase === "after") {
  const before = JSON.parse(
    await readFile(new URL("before/core.json", import.meta.url)),
  );
  assert.deepEqual(
    controls,
    before.controls,
    "Retained synchronized-boundary results changed",
  );
}
await mkdir(output, { recursive: true });
await writeFile(
  join(output, "core.json"),
  JSON.stringify(
    { phase, node: process.version, scope: oracle.scope, controls, cases },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({
    phase,
    controls: controls.length,
    phasedModels: cases.length,
    maxCdfError: cases.length
      ? Math.max(...cases.map((row) => row.maxCdfError))
      : null,
    maxMeanError: cases.length
      ? Math.max(...cases.map((row) => row.meanError))
      : null,
  }),
);
