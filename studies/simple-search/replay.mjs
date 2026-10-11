// node studies/simple-search/replay.mjs BASELINE_MODULE CURRENT_MODULE OUTPUT
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL, URL } from "node:url";

const [baseline, current, output] = process.argv.slice(2);
if (!output) throw new Error("Supply BASELINE_MODULE CURRENT_MODULE OUTPUT");
const oracle = JSON.parse(
  await readFile(new URL("oracle.json", import.meta.url), "utf8"),
);
function run(module, method, args) {
  const script = `import * as math from ${JSON.stringify(pathToFileURL(resolve(module)).href)};
    try { const result=math[${JSON.stringify(method)}](...${JSON.stringify(args)});
      console.log(JSON.stringify({value:result},(_,v)=>v===Infinity?"Infinity":v));
    } catch(error){console.log(JSON.stringify({error:error.name,message:error.message}));}`;
  const child = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", script],
    { encoding: "utf8", timeout: 3000 },
  );
  if (child.error?.code === "ETIMEDOUT") return { timeoutMs: 3000 };
  assert.equal(child.status, 0, child.stderr);
  return JSON.parse(child.stdout);
}
const cases = [];
for (const item of oracle.cases) {
  const before = run(baseline, "attemptsForConfidence", [
    1,
    item.p,
    item.target,
  ]);
  const after = run(current, "attemptsForConfidence", [1, item.p, item.target]);
  if (item.withinSearchLimit) {
    assert.equal(typeof after.value, "number");
    const error = Math.abs(after.value - Number(item.attempts));
    assert.ok(error <= Math.max(1, Number(item.attempts) * 1e-12));
    cases.push({ ...item, before, after, absoluteAttemptError: error });
  } else {
    assert.equal(after.error, "RangeError");
    assert.match(after.message, /calculation limit/);
    cases.push({ ...item, before, after });
  }
}
const controls = [];
for (const input of [
  { p: 1 / 512, n: 900, k: 1 },
  { p: 0.02, n: 200, k: 3 },
  { p: 1e-12, n: 1000000000000, k: 1 },
  { p: 0, n: 900, k: 1 },
  { p: 1, n: 10, k: 3 },
]) {
  const before = run(baseline, "simpleDrop", [input]);
  const after = run(current, "simpleDrop", [input]);
  assert.deepEqual(after, before);
  controls.push({ input, result: after, unchanged: true });
}
await writeFile(
  output,
  JSON.stringify(
    {
      node: process.version,
      baselineTimeoutIsIsolatedInChild: true,
      oracle: oracle.method,
      scope:
        "Single-copy milestones only; integer comparisons admit binary64 CDF rounding near large milestones. Other copy counts retain the existing SciPy probability oracle.",
      cases,
      controls,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({
    cases: cases.length,
    withinLimit: cases.filter((c) => c.withinSearchLimit).length,
    maxAbsoluteAttemptError: Math.max(
      ...cases.map((c) => c.absoluteAttemptError ?? 0),
    ),
    controls: controls.length,
  }),
);
