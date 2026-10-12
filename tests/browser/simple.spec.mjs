import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import process from "node:process";
import { auditBrowser } from "./helpers.mjs";

auditBrowser(test);

for (const width of [1440, 375]) {
  test(`invalid simple counts stay editable without results or sharing at ${width}px`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.goto("./?mode=simple&rate=0.5&n=4&k=1&got=1");
    await expect(page.locator("#simple-export")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await context.setOffline(true);
    for (const [id, values, valid] of [
      ["simple-n", ["1.5", "-1", "", "9007199254740992"], "4"],
      ["simple-k", ["1.5", "0", "-1", "", "9007199254740992"], "1"],
    ]) {
      const field = page.locator(`#${id}`);
      for (const value of values) {
        await field.fill(value);
        await expect(field).toHaveAttribute("aria-invalid", "true");
        await expect(field).toHaveValue(value);
        await expect(field).toHaveAttribute("aria-describedby", `${id}-error`);
        await expect(page.locator(`#${id}-error`)).not.toBeEmpty();
        await expect(page.locator("#share-btn")).toBeDisabled();
        await expect(page.locator("#simple-results .stat-tile")).toHaveCount(0);
        await expect(page.locator("#simple-export")).toHaveCount(0);

        // Switching modes must not turn the invalid draft into a valid count.
        await page.locator("#tab-time").click();
        await page.locator("#tab-simple").click();
        await expect(field).toHaveValue(value);
        await expect(field).toHaveAttribute("aria-invalid", "true");
        await expect(page.locator("#share-btn")).toBeDisabled();

        await field.fill(valid);
        await expect(field).not.toHaveAttribute("aria-invalid", "true");
        await expect(page.locator("#simple-export")).toBeVisible();
        await expect(page.locator("#share-btn")).toBeEnabled();
      }
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
}

test("simple edits retire the preceding card before debounce and share the corrected observation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (text) => {
          window.shared = text;
        },
      },
    });
  });
  await page.goto("./?mode=simple&rate=0.5&n=4&k=1&got=1");
  await expect(page.locator("#simple-export")).toBeVisible();
  // Inspect in the same JS task as the edit; an ordinary locator assertion can
  // miss the interval in which a stale result was still exportable.
  const pending = await page.evaluate(() => {
    const field = document.querySelector("#simple-k");
    field.value = "2";
    field.dispatchEvent(new window.Event("input", { bubbles: true }));
    return {
      disabled: document.querySelector("#share-btn").disabled,
      card: !!document.querySelector("#simple-export"),
      stats: document.querySelectorAll("#simple-results .stat-tile").length,
    };
  });
  expect(pending).toEqual({ disabled: false, card: false, stats: 0 });
  await expect(page.locator("#share-btn")).toBeEnabled();
  await page.locator("#share-btn").click();
  const query = new URL(await page.evaluate(() => window.shared)).searchParams;
  expect(Object.fromEntries(query)).toEqual({
    mode: "simple",
    rate: "0.5",
    n: "4",
    k: "2",
    got: "1",
  });
  await page.locator("#simple-export").click();
  await expect(page.locator("#luck-card-canvas")).toHaveAttribute(
    "aria-label",
    /Took 4 attempts.*for 2 copies/,
  );
});

test("fractional shared inputs and invalid rates cannot become shareable results", async ({
  page,
}) => {
  await page.goto("./?mode=simple&rate=0.5&n=4&k=1.5&got=1");
  await expect(page.locator("#simple-k")).toHaveValue("1.5");
  await expect(page.locator("#simple-k")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.locator("#share-btn")).toBeDisabled();
  await page.locator("#simple-k").fill("1");
  await expect(page.locator("#simple-export")).toBeVisible();
  for (const rate of ["", "nonsense", "120%"]) {
    await page.locator("#simple-rate").fill(rate);
    await expect(page.locator("#simple-results")).toHaveAttribute(
      "aria-busy",
      "false",
    );
    await expect(page.locator("#share-btn")).toBeDisabled();
    await expect(page.locator("#simple-export")).toHaveCount(0);
    await expect(page.locator("#simple-results .stat-tile")).toHaveCount(0);
  }
  await page.locator("#simple-rate").fill("0.5");
  await expect(page.locator("#simple-export")).toBeVisible();
  await expect(page.locator("#share-btn")).toBeEnabled();
});

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
    "Use 9,007,199,254,740,991 or fewer attempts",
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
