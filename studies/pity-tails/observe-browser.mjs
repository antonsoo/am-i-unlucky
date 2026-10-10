/* global window, document, CanvasRenderingContext2D */
// Capture the actual production page and a downloaded luck card; no rendered mockups.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "@playwright/test";

const { values } = parseArgs({
  options: {
    base: { type: "string" },
    out: { type: "string" },
    prefix: { type: "string" },
  },
});
assert(
  values.base && values.out && values.prefix,
  "--base, --out and --prefix are required",
);
const query =
  "?mode=pity&base=1&soft=1&inc=0&hard=1&feat=0.0001&guar=0&pity0=0&g0=0&target=1&budget=100000&actual=100000";
await mkdir(resolve(values.prefix, ".."), { recursive: true });
const browser = await chromium.launch();
const captures = [];
try {
  for (const width of [1440, 375]) {
    const page = await browser.newPage({
      viewport: { width, height: 1050 },
      colorScheme: "light",
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(values.base + query);
    await page.waitForFunction(
      () => document.querySelectorAll("#pity-results .stat-tile").length === 6,
    );
    await page.evaluate(() => document.fonts.ready);
    const state = await page.locator("#pity-results").evaluate((el) => ({
      text: el.innerText,
      tiles: Array.from(el.querySelectorAll(".stat-tile"), (tile) => ({
        label: tile.querySelector(".stat-tile-label").textContent.trim(),
        value: tile.querySelector(".stat-tile-value").textContent.trim(),
      })),
      exportDisabled: el.querySelector("#pity-export").disabled,
    }));
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    if (width === 1440)
      await page.screenshot({
        path: `${values.prefix}-${width}.png`,
        fullPage: true,
      });
    else
      await page.screenshot({
        path: `${values.prefix}-${width}.png`,
        fullPage: true,
      });
    if (width === 1440) {
      await page.evaluate(() => {
        window.drawnCardText = [];
        const fillText = CanvasRenderingContext2D.prototype.fillText;
        CanvasRenderingContext2D.prototype.fillText = function (text, ...args) {
          window.drawnCardText.push(String(text));
          return fillText.call(this, text, ...args);
        };
      });
      await page.locator("#pity-budget").fill("5000");
      await page.locator("#pity-actual").fill("100");
      await page.waitForFunction(() => {
        const text = document.querySelector("#pity-results")?.textContent ?? "";
        return text.includes("39.35%") && text.includes("100 pulls chasing");
      });
      await page.locator("#pity-export").click();
      const download = page.waitForEvent("download");
      await page.locator("#download-card").click();
      await (await download).saveAs(`${values.prefix}-card.png`);
      state.exportedCardText = await page.evaluate(() => window.drawnCardText);
    }
    captures.push({ width, overflow, errors, ...state });
    await page.close();
  }
  await mkdir(resolve(values.out, ".."), { recursive: true });
  await writeFile(
    values.out,
    JSON.stringify({ engine: browser.version(), query, captures }, null, 2) +
      "\n",
  );
  console.log(
    `${captures.length} production-page captures; errors=${captures.flatMap((c) => c.errors).length}; overflows=${captures.filter((c) => c.overflow).length}`,
  );
} finally {
  await browser.close();
}
