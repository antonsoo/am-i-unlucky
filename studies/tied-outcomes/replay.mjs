// Compile and exercise the selected source tree, including an archived baseline.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { pathToFileURL, URL } from "node:url";
import ts from "typescript";
const [src = "src", output = "/tmp/tied-replay.json", mode = "verify"] =
  process.argv.slice(2);
assert.ok(["verify", "baseline"].includes(mode));
const sha = (b) => createHash("sha256").update(b).digest("hex");
const oracleBytes = await readFile(new URL("./oracle.json", import.meta.url));
const oracle = JSON.parse(oracleBytes);
const work = await mkdtemp(join(tmpdir(), "tied-outcomes-"));
try {
  await writeFile(join(work, "package.json"), '{"type":"module"}');
  const hashes = [];
  const files = ["presets.ts", "logged-rates.ts"];
  for (const dir of ["math", "ui"])
    for (const file of await readdir(resolve(src, dir)))
      if (file.endsWith(".ts")) files.push(`${dir}/${file}`);
  for (const file of files) {
    const text = await readFile(resolve(src, file), "utf8");
    hashes.push({ path: file, sha256: sha(text) });
    const target = join(work, file.replace(/\.ts$/, ".js"));
    await mkdir(resolve(target, ".."), { recursive: true });
    await writeFile(
      target,
      ts.transpileModule(text, {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
        },
      }).outputText,
    );
  }
  const load = (file) => import(pathToFileURL(join(work, file)));
  const simple = await load("math/simple.js"),
    pity = await load("math/pity.js");
  const { PITY_PRESETS } = await load("presets.js");
  const error = {
    maximumAbsolute: 0,
    maximumRelative: 0,
    supported: 0,
    unsupported: 0,
  };
  function verify(actual, expected) {
    if (Number(expected.tied) === 0) {
      assert.equal(actual, null);
      error.unsupported++;
      return;
    }
    assert.ok(actual);
    for (const key of ["earlier", "tied", "later"]) {
      const want = Number(expected[key]),
        delta = Math.abs(actual[key] - want);
      error.maximumAbsolute = Math.max(error.maximumAbsolute, delta);
      if (want !== 0)
        error.maximumRelative = Math.max(
          error.maximumRelative,
          delta / Math.abs(want),
        );
      assert.ok(
        delta <= Math.max(1e-300, Math.abs(want) * 2e-10),
        `${key}: ${actual[key]} != ${want}`,
      );
    }
    error.supported++;
  }
  const simpleResults = oracle.simple.map((fixture) => {
    const { n, p, k } = fixture;
    const metrics = simple.simpleDrop({ p, n, k });
    const chart = simple.negativeBinomialDistribution(k, p, 220);
    const comparison =
      mode === "verify" ? simple.simpleLuckComparison(n, p, k) : null;
    if (mode === "verify") verify(comparison, fixture.expected);
    return {
      n,
      p,
      k,
      metrics,
      distributionSha256: sha(JSON.stringify(chart)),
      comparison,
    };
  });
  const pityResults = oracle.pity.map((fixture) => {
    const dist = pity.pityDistribution(
      fixture.config,
      fixture.initial,
      fixture.target,
    );
    const summary = pity.summarizePity(dist);
    const comparisons = fixture.histories.map((history) => {
      const comparison =
        mode === "verify" ? pity.pityLuckComparison(dist, history.n) : null;
      if (mode === "verify") verify(comparison, history.expected);
      return {
        n: history.n,
        legacyStrictLaterPercent: pity.pityLuckPercentile(dist, history.n),
        comparison,
      };
    });
    return {
      config: fixture.config,
      initial: fixture.initial,
      target: fixture.target,
      distributionSha256: sha(
        JSON.stringify({ ...dist, pmf: Array.from(dist.pmf) }),
      ),
      expectedPulls: summary.expectedPulls,
      stdDevPulls: summary.stdDevPulls,
      pullsFor: summary.pullsFor,
      budgetProbabilities: fixture.histories.map((history) =>
        summary.probabilityWithinBudget(history.n),
      ),
      comparisons,
    };
  });
  const presets = [];
  for (const preset of PITY_PRESETS)
    for (const scenario of [
      { initial: { pity: 0, guaranteed: false }, target: 1 },
      { initial: { pity: 0, guaranteed: false }, target: 3 },
      { initial: { pity: 73, guaranteed: true }, target: 1 },
    ]) {
      const dist = pity.pityDistribution(
        preset.config,
        scenario.initial,
        scenario.target,
      );
      let largestTieAt = 1;
      for (let i = 2; i < dist.pmf.length; i++)
        if (dist.pmf[i] > dist.pmf[largestTieAt]) largestTieAt = i;
      const summary = pity.summarizePity(dist);
      const comparison =
        mode === "verify" ? pity.pityLuckComparison(dist, largestTieAt) : null;
      presets.push({
        id: preset.id,
        ...scenario,
        distributionSha256: sha(
          JSON.stringify({ ...dist, pmf: Array.from(dist.pmf) }),
        ),
        expectedPulls: summary.expectedPulls,
        stdDevPulls: summary.stdDevPulls,
        pullsFor: summary.pullsFor,
        largestTieAt,
        largestTie: dist.pmf[largestTieAt],
        comparison,
      });
    }
  await writeFile(
    output,
    JSON.stringify(
      {
        node: process.version,
        mode,
        oracleSha256: sha(oracleBytes),
        compiledSourceHashes: hashes,
        simple: simpleResults,
        pity: pityResults,
        presets,
        oracleCheck: mode === "verify" ? error : null,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `${simpleResults.length} simple, ${pityResults.length} rational pity models, ${presets.length} bundled-preset scenarios (${mode})`,
    error,
  );
} finally {
  await rm(work, { recursive: true, force: true });
}
