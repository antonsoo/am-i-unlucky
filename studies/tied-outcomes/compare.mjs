import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const [root = "studies/tied-outcomes", output = "/tmp/tied-comparison.json"] =
  process.argv.slice(2);
const read = (name) => JSON.parse(readFileSync(resolve(root, name)));
const before = read("before.json"),
  after = read("after.json");
assert.equal(before.oracleSha256, after.oracleSha256);
function withoutComparison(value) {
  if (Array.isArray(value)) return value.map(withoutComparison);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "comparison")
      .map(([key, v]) => [key, withoutComparison(v)]),
  );
}
for (const key of ["simple", "pity", "presets"])
  assert.deepEqual(
    withoutComparison(after[key]),
    withoutComparison(before[key]),
    key,
  );
assert.equal(after.oracleCheck.supported + after.oracleCheck.unsupported, 2772);
const browserBefore = read("browser-before.json"),
  browserAfter = read("browser-after.json");
assert.equal(browserBefore.results.length, 8);
assert.equal(browserAfter.results.length, 8);
const browsers = browserAfter.results.map((current, i) => {
  const previous = browserBefore.results[i];
  for (const key of ["engine", "width", "name", "query", "expected", "stats"])
    assert.deepEqual(current[key], previous[key], key);
  assert.equal(current.headline, "About average");
  for (const key of ["errors", "lateRequests", "csp"])
    assert.deepEqual(current[key], []);
  assert.ok(current.overflow <= 0);
  return {
    engine: current.engine,
    width: current.width,
    name: current.name,
    beforeHeadline: previous.headline,
    afterHeadline: current.headline,
    unchangedStatistics: true,
    lateRequestsBefore: previous.lateRequests.length,
    lateRequestsAfter: current.lateRequests.length,
  };
});
writeFileSync(
  output,
  JSON.stringify(
    {
      simpleCases: after.simple.length,
      rationalPityModels: after.pity.length,
      bundledPresetScenarios: after.presets.length,
      distributionsMomentsMilestonesAndLegacyStrictSharesIdentical: true,
      oracle: after.oracleCheck,
      browsers,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Distributions, moments, milestones, legacy strict shares and browser statistics unchanged; all eight corrected browser/card workflows agree.",
);
