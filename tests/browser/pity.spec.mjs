import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { auditBrowser, controlWorkers } from "./helpers.mjs";

const rare =
  "?mode=pity&base=1&soft=1&inc=0&hard=1&feat=0.0001&guar=0&pity0=0&g0=0&target=1&budget=100000&actual=100000";
const tile = (page, label) =>
  page
    .locator("#pity-results .stat-tile")
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator(".stat-tile-value");
const settled = (page) =>
  expect(page.locator("#pity-status")).toHaveText("Estimate updated.");
async function ready(page, query = rare) {
  await page.goto(`./${query}`);
  await settled(page);
}
auditBrowser(test);

test("rare featured rolls keep full moments and disclose uncomputed tails", async ({
  page,
}) => {
  await ready(page);
  await expect(tile(page, "Expected pulls")).toHaveText("10,000");
  await expect(tile(page, "Std. deviation")).toHaveText("9,999.5");
  for (const q of ["50% by", "90% by", "99% by"])
    await expect(tile(page, q)).toHaveText(">5,000");
  await expect(tile(page, "P(success within 100,000)")).toHaveText(
    "Not calculated",
  );
  await expect(page.locator("#pity-results")).toContainText("60.6515% remains");
  await expect(page.locator("#pity-results .chart-marker")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Export luck card" }),
  ).toBeDisabled();
  await page.locator("#pity-actual").fill("");
  await settled(page);
  await expect(tile(page, "Expected pulls")).toHaveText("10,000");
  await expect(page.locator("#pity-results")).toContainText(
    "Enter the additional pulls",
  );
  await page.getByLabel("Pull budget", { exact: true }).fill("5000");
  await page.locator("#pity-actual").fill("100");
  await settled(page);
  await expect(tile(page, "P(success within 5,000)")).toHaveText("39.35%");
  await expect(
    page.getByRole("button", { name: "Export luck card" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Export luck card" }).click();
  await expect(page.getByRole("dialog", { name: "Luck card" })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PNG" }).click();
  expect((await download).suggestedFilename()).toBe(
    "am-i-unlucky-luck-card.png",
  );
});

test("impossible and certain outcomes are not assigned a fabricated luck verdict", async ({
  page,
}) => {
  await ready(page);
  await page.getByLabel("Featured rate", { exact: true }).fill("0%");
  await settled(page);
  await expect(tile(page, "Expected pulls")).toHaveText("∞");
  await expect(tile(page, "50% by")).toHaveText("Impossible");
  await expect(tile(page, "P(success within 100,000)")).toHaveText("0%");
  await expect(
    page.getByRole("button", { name: "Export luck card" }),
  ).toBeDisabled();
  await page.getByLabel("Guarantee after a loss").check();
  await settled(page);
  await expect(tile(page, "Expected pulls")).toHaveText("2");
  await expect(tile(page, "50% by")).toHaveText("2");
  await expect(page.locator("#pity-results")).toContainText(
    "no luck variation",
  );
  await expect(page.locator("#pity-results .luck-meter")).toHaveCount(0);
});

test("invalid input cannot silently become a different experiment or a shareable result", async ({
  page,
}) => {
  await ready(page);
  for (const [id, value, message, restore] of [
    ["#pity-hard", "1.5", "Hard pity must be a positive whole number", "1"],
    [
      "#pity-feat",
      "-5%",
      "Featured rate must be from 0% through 100%",
      "0.01%",
    ],
    ["#pity-target", "", "Copies wanted must be a positive whole number", "1"],
    ["#pity-pity0", "1", "Current pity must be a whole number", "0"],
  ]) {
    await page.locator(id).fill(value);
    await expect(page.getByRole("alert")).toContainText(message);
    await expect(
      page.getByRole("button", { name: "Copy shareable link" }),
    ).toBeDisabled();
    await expect(page.locator("#pity-export")).toHaveCount(0);
    await page.locator(id).fill(restore);
    await settled(page);
  }
});

test("replaced calculations and abandoned tabs cannot restore stale pity results", async ({
  page,
}) => {
  await controlWorkers(page);
  await ready(page);
  await page.evaluate(() => {
    window.holdReplies = true;
  });
  await page.locator("#pity-budget").fill("1");
  await page.waitForFunction(() => window.heldReplies.length === 1);
  await page.evaluate(() => {
    window.holdReplies = false;
  });
  await page.locator("#pity-budget").fill("5000");
  await settled(page);
  await page.evaluate(() => window.heldReplies.shift()());
  await expect(tile(page, "P(success within 5,000)")).toHaveText("39.35%");
  await page.evaluate(() => {
    window.holdReplies = true;
  });
  await page.locator("#pity-budget").fill("2");
  await page.waitForFunction(() => window.heldReplies.length === 1);
  await page.getByRole("tab", { name: /Simple drop/ }).click();
  await page.evaluate(() => {
    window.holdReplies = false;
    window.heldReplies.shift()();
  });
  await expect(page.locator("#pity-results")).toHaveCount(0);
  expect(
    await page.evaluate(() => window.terminatedWorkers),
  ).toBeGreaterThanOrEqual(4);
});

for (const failure of [
  "failWorker",
  "failPost",
  "emptyReply",
  "unreadableReply",
]) {
  test(`pity worker ${failure} recovers without changing the inputs`, async ({
    page,
  }) => {
    await controlWorkers(page);
    await ready(page);
    await page.evaluate((flag) => {
      window[flag] = true;
    }, failure);
    await page.locator("#pity-budget").fill("5000");
    await expect(page.getByRole("alert")).toBeVisible();
    await page.getByRole("button", { name: "Try again" }).click();
    await settled(page);
    await expect(tile(page, "Expected pulls")).toHaveText("10,000");
  });
}

test("pity remains readable and accessible at phone and desktop sizes", async ({
  page,
}) => {
  for (const colorScheme of ["light", "dark"]) {
    for (const width of [375, 1440]) {
      await page.emulateMedia({ colorScheme });
      await page.setViewportSize({ width, height: 1000 });
      await ready(page);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    }
  }
});

test("a large real calculation can be cancelled by switching modes", async ({
  page,
}) => {
  await controlWorkers(page);
  await page.goto(`./${rare.replace("target=1", "target=4000")}`);
  await expect(page.locator("#pity-status")).toHaveText(
    "Calculating pity odds...",
  );
  await page.getByRole("tab", { name: /Simple drop/ }).click({ timeout: 2000 });
  await expect(page.locator("#simple-results")).toBeVisible();
  expect(
    await page.evaluate(() => window.terminatedWorkers),
  ).toBeGreaterThanOrEqual(1);
});
