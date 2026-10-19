import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { URL, fileURLToPath } from "node:url";
const [output, sourceCheckout] = process.argv.slice(2);
if (!output) throw new Error("Usage: compile.mjs OUTPUT_DIR [SOURCE_CHECKOUT]");
const root = fileURLToPath(new URL("../../", import.meta.url));
const sourceRoot = sourceCheckout ? resolve(sourceCheckout) : root;
const result = spawnSync(
  process.execPath,
  [
    resolve(root, "node_modules/typescript/bin/tsc"),
    "--outDir",
    resolve(output),
    "--rootDir",
    resolve(sourceRoot, "src"),
    "--noEmit",
    "false",
    "--module",
    "ESNext",
    "--moduleResolution",
    "Bundler",
    "--target",
    "ES2022",
    "--skipLibCheck",
    "--strict",
    "--noUncheckedIndexedAccess",
    "--exactOptionalPropertyTypes",
    resolve(sourceRoot, "src/math/time.ts"),
  ],
  { stdio: "inherit" },
);
process.exitCode = result.status ?? 1;
