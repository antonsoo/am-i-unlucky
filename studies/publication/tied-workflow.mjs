// Actual hosted/local user workflows; use a full site URL, before|after and an output directory.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { URL, URLSearchParams } from "node:url";
import { chromium, firefox } from "@playwright/test";
import { browserCases } from "../tied-outcomes/cases.mjs";

const [base, phase, outArg] = process.argv.slice(2);
assert.ok(base && ["before", "after"].includes(phase) && outArg);
const out = resolve(outArg);
await mkdir(out, { recursive: true });
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const rows = [];
for (const [engine, launch] of [
  ["chromium", chromium],
  ["firefox", firefox],
]) {
  const browser = await launch.launch();
  try {
    for (const entry of browserCases) {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 1000 },
        colorScheme: "dark",
        reducedMotion: "reduce",
      });
      try {
        const page = await context.newPage(),
          errors = [],
          assetErrors = [],
          requests = [],
          assets = {},
          reads = [];
        page.on("pageerror", (e) => errors.push(e.message));
        context.on("request", (r) => requests.push(r.url()));
        context.on("response", (response) => {
          const url = new URL(response.url());
          if (url.origin !== new URL(base).origin || response.status() !== 200)
            return;
          reads.push(
            (async () => {
              const bytes = await response.body();
              assets[url.pathname] = {
                bytes: bytes.length,
                sha256: sha(bytes),
              };
            })().catch((error) => assetErrors.push(error.message)),
          );
        });
        await page.addInitScript(() => {
          globalThis.cardText = [];
          const native = globalThis.CanvasRenderingContext2D.prototype.fillText;
          globalThis.CanvasRenderingContext2D.prototype.fillText = function (
            text,
            ...args
          ) {
            if (this.canvas.id === "luck-card-canvas")
              globalThis.cardText.push(String(text));
            return native.call(this, text, ...args);
          };
        });
        const url = base + "?" + new URLSearchParams(entry.query);
        await page.goto(url);
        const panel = page
          .locator(`#${entry.query.mode}-results .panel`)
          .first();
        await panel.locator(".luck-verdict-headline").waitFor();
        await page.evaluate(() => globalThis.document.fonts.ready);
        await Promise.all(reads);
        const headline = await panel
          .locator(".luck-verdict-headline")
          .innerText();
        assert.equal(
          headline,
          phase === "before" ? "Unlucky" : "About average",
        );
        const body = await panel.innerText();
        const shares = await panel
          .locator(".luck-comparison dd")
          .allTextContents();
        if (phase === "after")
          assert.deepEqual(
            shares,
            [
              entry.expected.earlier,
              entry.expected.tied,
              entry.expected.later,
            ].map((x) => `${x * 100}%`),
          );
        const capture = `${engine}-${entry.name}`;
        for (const width of [1280, 375]) {
          await page.setViewportSize({ width, height: 1000 });
          await page.evaluate(() => globalThis.scrollTo(0, 0));
          assert.ok(
            await page.evaluate(
              () =>
                globalThis.document.documentElement.scrollWidth <=
                globalThis.innerWidth,
            ),
          );
          await page.screenshot({
            path: resolve(out, `${capture}-${width}.png`),
            fullPage: true,
          });
        }
        await page.evaluate(() => globalThis.document.fonts.ready);
        await Promise.all(reads);
        await context.setOffline(true);
        const online = requests.length;
        await page
          .getByRole("button", { name: "Export luck card", exact: true })
          .click();
        const event = page.waitForEvent("download");
        await page
          .getByRole("button", { name: "Download PNG", exact: true })
          .click();
        const download = await event,
          bytes = await readFile(await download.path());
        assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
        assert.equal(bytes.readUInt32BE(16), 1080);
        assert.equal(bytes.readUInt32BE(20), 1350);
        await writeFile(resolve(out, `${capture}-card.png`), bytes);
        const cardText = await page.evaluate(() => globalThis.cardText);
        if (phase === "after") {
          for (const [i, label] of [
            "FINISHED SOONER",
            "SAME ATTEMPT",
            "TOOK LONGER",
          ].entries()) {
            const at = cardText.indexOf(label);
            assert.ok(at > 0);
            assert.equal(
              cardText[at - 1],
              `${100 * [entry.expected.earlier, entry.expected.tied, entry.expected.later][i]}%`,
            );
          }
          assert.ok(cardText.includes("COMMON"));
          assert.deepEqual(requests.slice(online), []);
        }
        await Promise.all(reads);
        if (phase === "after") assert.deepEqual(assetErrors, []);
        assert.deepEqual(errors, []);
        rows.push({
          engine,
          case: entry.name,
          url,
          headline,
          shares,
          body,
          card_text: cardText,
          card_sha256: sha(bytes),
          assets,
          errors,
          asset_errors: assetErrors,
          offline_requests: requests.slice(online),
        });
        console.log(
          `${phase} ${engine} ${entry.name}: ${headline}, actual PNG exported offline`,
        );
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}
await writeFile(
  resolve(out, "receipt.json"),
  JSON.stringify(
    {
      checked_at_utc: new Date().toISOString(),
      phase,
      synthetic_models: true,
      rows,
    },
    null,
    2,
  ) + "\n",
);
