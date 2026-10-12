/* global window, document, navigator, URL */
// Replay against either production build; retain observations, not inferred outcomes.
// node studies/simple-inputs/browser.mjs URL OUTPUT_DIRECTORY
import { chromium, firefox, expect } from "@playwright/test";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import path from "node:path";
import process from "node:process";

const [url, output] = process.argv.slice(2);
if (!url || !output) throw new Error("Expected URL and OUTPUT_DIRECTORY");
await mkdir(output, { recursive: true });
const invalidCases = [
  ...["1.5", "-1", "", "9007199254740992"].map((value) => ["n", value]),
  ...["1.5", "0", "-1", "", "9007199254740992"].map((value) => ["k", value]),
  ...["", "nonsense", "120%", "1/100000000000000000"].map((value) => [
    "rate",
    value,
  ]),
];
const validCases = [
  { rate: "0.5", n: "4", k: "1", got: true },
  { rate: "0.5", n: "0", k: "1", got: false },
  ...[1, 2, 3].map((n) => ({ rate: "0.5", n: String(n), k: "1", got: true })),
  ...[true, false].map((got) => ({ rate: "0.5", n: "4", k: "2", got })),
  { rate: "1/512", n: "900", k: "1", got: false },
  { rate: "0", n: "4", k: "1", got: false },
  { rate: "1", n: "1", k: "1", got: true },
  { rate: "0.5", n: "4e0", k: "2.0", got: true },
];
const all = [];
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
function groupChunks(chunks) {
  return [...new Set(chunks.map((chunk) => chunk.type))].map((type) => {
    const parts = chunks.filter((chunk) => chunk.type === type);
    return {
      type,
      count: parts.length,
      bytes: parts.reduce((sum, part) => sum + part.bytes, 0),
      // Hash the ordered payload hashes, avoiding hundreds of repeated IDAT rows.
      sha256: hash(parts.map((part) => part.sha256).join("\n")),
    };
  });
}
for (const [name, engine] of Object.entries({ chromium, firefox })) {
  const browser = await engine.launch();
  try {
    for (const width of [1440, 375]) {
      const context = await browser.newContext({
        viewport: { width, height: 950 },
      });
      const page = await context.newPage();
      const errors = [],
        offlineRequests = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.addInitScript(() => {
        window.copied = undefined;
        window.cardText = [];
        Object.defineProperty(navigator, "clipboard", {
          value: {
            writeText: async (text) => {
              window.copied = text;
            },
          },
        });
        const fillText = window.CanvasRenderingContext2D.prototype.fillText;
        window.CanvasRenderingContext2D.prototype.fillText = function (
          text,
          ...args
        ) {
          if (this.canvas.id === "luck-card-canvas") window.cardText.push(text);
          return fillText.call(this, text, ...args);
        };
      });
      await page.goto(`${url}?mode=simple&rate=0.5&n=4&k=1&got=1`);
      await expect(page.locator("#simple-export")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await context.setOffline(true);
      page.on("request", (request) => offlineRequests.push(request.url()));
      async function edit(values) {
        return page.evaluate((values) => {
          for (const [id, value] of Object.entries(values)) {
            const field = document.querySelector(`#simple-${id}`);
            if (id === "got") field.checked = value;
            else field.value = value;
          }
          document
            .querySelector("#simple-n")
            .dispatchEvent(new window.Event("input", { bubbles: true }));
          return {
            shareDisabled: document.querySelector("#share-btn").disabled,
            card: !!document.querySelector("#simple-export"),
            stats: document.querySelectorAll("#simple-results .stat-tile")
              .length,
          };
        }, values);
      }
      const invalid = [];
      for (const [field, value] of invalidCases) {
        await edit(validCases[0]);
        await expect(page.locator("#simple-export")).toBeVisible();
        const pending = await edit({ [field]: value });
        await page.waitForTimeout(300);
        const shareEnabled = await page.locator("#share-btn").isEnabled();
        await page.evaluate(() => {
          window.copied = undefined;
        });
        if (shareEnabled) await page.locator("#share-btn").click();
        const copied = await page.evaluate(() => window.copied);
        invalid.push({
          field,
          value,
          pending,
          displayed: await page.locator(`#simple-${field}`).inputValue(),
          ariaInvalid: await page
            .locator(`#simple-${field}`)
            .getAttribute("aria-invalid"),
          shareEnabled,
          copied: copied ? new URL(copied).search : null,
          card: await page.locator("#simple-export").count(),
          stats: await page.locator("#simple-results .stat-tile").count(),
          text: await page.locator("#simple-results").innerText(),
        });
        if (field === "k" && value === "1.5") {
          await page.screenshot({
            path: path.join(output, `${name}-${width}.png`),
            fullPage: true,
          });
        }
      }
      const valid = [];
      for (const input of validCases) {
        await edit(input);
        await page.waitForTimeout(300);
        await expect(page.locator("#simple-results .stat-tile")).toHaveCount(6);
        await page.locator("#share-btn").click();
        const chart = await page
          .locator("#simple-results")
          .evaluate(
            (results) => results.querySelector("svg")?.outerHTML ?? null,
          );
        const entry = {
          input,
          copied: new URL(await page.evaluate(() => window.copied)).search,
          text: await page.locator("#simple-results").innerText(),
          chart: chart
            ? { bytes: Buffer.byteLength(chart), sha256: hash(chart) }
            : null,
        };
        if (await page.locator("#simple-export").count()) {
          await page.evaluate(() => {
            window.cardText = [];
          });
          await page.locator("#simple-export").click();
          const button = page.getByRole("button", { name: "Download PNG" });
          await expect(button).toBeEnabled();
          entry.cardText = await page.evaluate(() => window.cardText);
          const download = page.waitForEvent("download");
          await button.click();
          const bytes = await readFile(await (await download).path());
          expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
          const chunks = [];
          for (let offset = 8; offset < bytes.length;) {
            const length = bytes.readUInt32BE(offset);
            const type = bytes.toString("ascii", offset + 4, offset + 8);
            const data = bytes.subarray(offset + 8, offset + 8 + length);
            chunks.push({ type, bytes: length, sha256: hash(data) });
            offset += length + 12;
          }
          entry.png = {
            bytes: bytes.length,
            sha256: hash(bytes),
            chunks: groupChunks(chunks),
            width: bytes.readUInt32BE(16),
            height: bytes.readUInt32BE(20),
          };
          await page.keyboard.press("Escape");
        }
        valid.push(entry);
      }
      expect(errors).toEqual([]);
      expect(offlineRequests).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      all.push({
        browser: name,
        version: browser.version(),
        width,
        offlineAfterLoad: true,
        invalid,
        valid,
        errors,
        offlineRequests,
      });
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
await writeFile(
  path.join(output, "results.json"),
  JSON.stringify(all, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    contexts: all.length,
    invalid: all.reduce((n, run) => n + run.invalid.length, 0),
    valid: all.reduce((n, run) => n + run.valid.length, 0),
    pngDownloads: all.reduce(
      (n, run) => n + run.valid.filter((c) => c.png).length,
      0,
    ),
  }),
);
