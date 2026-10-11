import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import process from "node:process";
import { auditBrowser } from "./helpers.mjs";

auditBrowser(test);

function query(rate, n = 900, k = 1) {
  return `?${new URLSearchParams({ mode: "simple", rate, n: String(n), k: String(k), got: "0" })}`;
}

test("unsupported simple-drop searches remain responsive and recover offline", async ({
  page,
  context,
}, testInfo) => {
  await page.goto(`./${query("1/100000000000000000")}`);
  const results = page.locator("#simple-results");
  await expect(results).toContainText(
    "more than 1,000,000,000,000,000 attempts",
  );
  await expect(results.locator(".stat-tile")).toHaveCount(0);
  const limitText = await results.innerText();
  await context.setOffline(true);
  if (process.env.CAPTURE_SIMPLE_EVIDENCE === "1") {
    await mkdir("docs/assets/simple-search", { recursive: true });
    for (const width of [1440, 375]) {
      await page.setViewportSize({ width, height: 950 });
      await page.screenshot({
        path: `docs/assets/simple-search/${testInfo.project.name}-${width}.png`,
        fullPage: true,
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
  }
  await page.locator("#simple-rate").fill("1/512");
  await expect(results.locator(".stat-tile-value").nth(1)).toHaveText("512");
  await expect(results.locator(".stat-tile-value").nth(2)).toHaveText("355");
  const restoredStats = await results
    .locator(".stat-tile-value")
    .allTextContents();
  await page.locator("#simple-n").fill("100000000000000000");
  await expect(results).toContainText(
    "Attempts must be a non-negative safe integer",
  );
  await page.locator("#simple-n").fill("900");
  await page.locator("#simple-rate").fill("1/1000000000000");
  await expect(results.locator(".stat-tile")).toHaveCount(6);
  await expect(results).not.toContainText("calculation limit");
  const rareStats = await results.locator(".stat-tile-value").allTextContents();
  if (process.env.CAPTURE_SIMPLE_EVIDENCE === "1")
    await writeFile(
      `studies/simple-search/browser-${testInfo.project.name}.json`,
      JSON.stringify(
        {
          browser: testInfo.project.name,
          offlineAfterLoad: true,
          rejectedRate: "1/100000000000000000",
          limitText,
          restoredStats,
          rejectedUnsafeAttempts: true,
          rareRate: "1/1000000000000",
          rareStats,
          diagnostics: await page.evaluate(() => window.testDiagnostics()),
          cspViolations: await page.evaluate(() => window.cspViolations),
        },
        null,
        2,
      ) + "\n",
    );
});
