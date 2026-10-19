/* global window, document, navigator, innerWidth */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";
import { URL, URLSearchParams, pathToFileURL } from "node:url";
import { chromium, firefox, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const source = (page, n = 1) =>
  page.getByRole("group", { name: `Source ${n}`, exact: true });
async function settled(page) {
  await expect(page.locator("#time-status")).toHaveText("Estimate updated.");
  await expect(page.locator("#time-results")).toHaveAttribute(
    "aria-busy",
    "false",
  );
}
export async function exercise(
  page,
  { url, width, engine, output, before = false },
) {
  const errors = [],
    external = [],
    csp = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== new URL(url).origin)
      external.push(request.url());
  });
  await page.exposeFunction("nextBatchCsp", (directive) => csp.push(directive));
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (event) =>
      window.nextBatchCsp(event.violatedDirective),
    );
    // Only the OS clipboard is unavailable. App responses and workers are real.
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
  });
  await page.setViewportSize({ width, height: 1000 });
  const query = new URLSearchParams({
    mode: "time",
    sources: JSON.stringify([
      { name: "Weekly raid", rate: "50%", attempts: 1, everyDays: 7 },
    ]),
    k: "1",
    days: "2",
  });
  await page.goto(new URL("?" + query, url).href);
  await settled(page);
  await expect(page.getByTestId("expected-days")).toHaveText("14 days");
  await expect(page.getByTestId("budget-chance")).toHaveText("0%");
  await expect(page.getByTestId("p50")).toHaveText("7 days");
  if (before) {
    await expect(
      page.getByLabel("First batch (day)", { exact: true }),
    ).toHaveCount(0);
  } else {
    await source(page)
      .getByLabel("First batch (day)", { exact: true })
      .fill("2");
    await settled(page);
    await expect(page.getByTestId("expected-days")).toHaveText("9 days");
    await expect(page.getByTestId("budget-chance")).toHaveText("50%");
    await expect(page.getByTestId("p50")).toHaveText("2 days");
    await expect(page.getByTestId("p90")).toHaveText("23 days");
    await expect(page.getByTestId("p99")).toHaveText("44 days");
  }
  await page.evaluate(() => document.fonts.ready);
  const oneSource = await page.locator("#time-results").innerText();
  if (
    output &&
    ((engine === "chromium" && width === 1440) ||
      (engine === "firefox" && width === 375))
  )
    await page.screenshot({
      path: join(output, `${engine}-${width}.png`),
      fullPage: true,
    });
  let sharedFirstDay, twoSource;
  if (!before) {
    await page.getByRole("button", { name: "Copy shareable link" }).click();
    const dialog = page.getByRole("dialog", { name: "Copy your link" });
    await expect(dialog).toBeVisible();
    const link = await dialog.getByLabel("Shareable link").inputValue();
    const sources = JSON.parse(new URL(link).searchParams.get("sources"));
    assert.equal(sources[0].firstDay, 2);
    sharedFirstDay = sources[0].firstDay;
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await page.goto(link);
    await settled(page);
    await expect(
      source(page).getByLabel("First batch (day)", { exact: true }),
    ).toHaveValue("2");
    await expect(page.getByTestId("expected-days")).toHaveText("9 days");
    await source(page)
      .getByLabel("First batch (day)", { exact: true })
      .fill("3");
    await settled(page);
    await expect(page.getByTestId("expected-days")).toHaveText("10 days");
    await source(page)
      .getByLabel("First batch (day)", { exact: true })
      .fill("2");
    await page
      .getByRole("button", { name: "+ Add source", exact: true })
      .click();
    await source(page, 2).getByLabel("Rate per attempt").fill("50%");
    await source(page, 2)
      .getByLabel("Schedule", { exact: true })
      .selectOption("7");
    await expect(
      source(page, 2).getByLabel("First batch (day)", { exact: true }),
    ).toHaveValue("7");
    await source(page, 2)
      .getByLabel("First batch (day)", { exact: true })
      .fill("5");
    await settled(page);
    await expect(page.getByTestId("expected-days")).toHaveText("5.3 days");
    await expect(page.getByTestId("p90")).toHaveText("12 days");
    await expect(page.getByTestId("p99")).toHaveText("23 days");
    const svg = await page
      .getByRole("img", { name: "Distribution chart over completed days" })
      .evaluate((node) => node.outerHTML);
    assert(!/NaN|Infinity/.test(svg));
    twoSource = {
      firstDays: [2, 5],
      expectedDays: "5.3 days",
      p90: "12 days",
      p99: "23 days",
      svgSha256: createHash("sha256").update(svg).digest("hex"),
    };
    if (output && engine === "chromium" && width === 1440)
      await page.screenshot({
        path: join(output, "two-weekly-sources.png"),
        fullPage: true,
      });
    await source(page)
      .getByLabel("First batch (day)", { exact: true })
      .fill("8");
    await expect(page.locator("#time-error")).toContainText("First batch day");
    await expect(page.getByTestId("expected-days")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Copy shareable link" }),
    ).toBeDisabled();
    await source(page)
      .getByLabel("First batch (day)", { exact: true })
      .fill("2");
    await settled(page);
    await expect(page.getByTestId("expected-days")).toHaveText("5.3 days");
    await source(page, 2)
      .getByLabel("Schedule", { exact: true })
      .selectOption("1");
    await settled(page);
    await expect(
      source(page, 2).getByLabel("First batch (day)", { exact: true }),
    ).toHaveValue("1");
    await page.getByRole("button", { name: "Copy shareable link" }).click();
    const finalLink = await page
      .getByRole("dialog", { name: "Copy your link" })
      .getByLabel("Shareable link")
      .inputValue();
    const finalSources = JSON.parse(
      new URL(finalLink).searchParams.get("sources"),
    );
    await page
      .getByRole("dialog", { name: "Copy your link" })
      .getByRole("button", { name: "Close", exact: true })
      .click();
    assert.equal(finalSources[1].firstDay, undefined);
    assert.equal(finalSources[1].everyDays, 1);
  }
  const violations = (await new AxeBuilder({ page }).analyze()).violations;
  assert.deepEqual(violations, []);
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  assert.deepEqual(csp, []);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  return {
    width,
    before,
    oneSource,
    sharedFirstDay,
    twoSource,
    legacyBoundaryPreserved: true,
    errors,
    external,
    csp,
    accessibilityViolations: violations,
    overflow: false,
  };
}
if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  const [url, output, phase] = process.argv.slice(2);
  assert(url && output && ["before", "after"].includes(phase));
  await mkdir(output, { recursive: true });
  const workflows = [];
  for (const [engine, type] of [
    ["chromium", chromium],
    ["firefox", firefox],
  ]) {
    const browser = await type.launch();
    try {
      for (const width of [1440, 375]) {
        const context = await browser.newContext({
          colorScheme: width === 375 ? "light" : "dark",
          reducedMotion: "reduce",
        });
        try {
          workflows.push({
            engine,
            version: browser.version(),
            ...(await exercise(await context.newPage(), {
              url,
              width,
              engine,
              output,
              before: phase === "before",
            })),
          });
        } finally {
          await context.close();
        }
      }
    } finally {
      await browser.close();
    }
  }
  await writeFile(
    join(output, "browser.json"),
    JSON.stringify(
      {
        checkedAtUtc: new Date().toISOString(),
        url,
        phase,
        scope:
          "Actual UI, worker calculations and share-link reloads. Constructed independent weekly models, not observed game histories. OS clipboard is deliberately unavailable to exercise the real fallback dialog. App/network/worker responses are not mocked. Worker scripts load from the same origin; no cold-offline claim.",
        workflows,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({ phase, workflows: workflows.length, errors: 0 }),
  );
}
