import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { browserCases } from "../../studies/tied-outcomes/cases.mjs";
import { auditBrowser } from "./helpers.mjs";

auditBrowser(test);

async function captureCardText(page) {
  await page.addInitScript(() => {
    window.cardText = [];
    const native = window.CanvasRenderingContext2D.prototype.fillText;
    window.CanvasRenderingContext2D.prototype.fillText = function (
      text,
      ...args
    ) {
      if (this.canvas.id === "luck-card-canvas") window.cardText.push(text);
      return native.call(this, text, ...args);
    };
  });
}

for (const width of [1440, 375])
  for (const entry of browserCases) {
    test(`${entry.name} preserves ties in the offline page and actual PNG at ${width}px`, async ({
      page,
      context,
    }) => {
      await page.setViewportSize({ width, height: 950 });
      await captureCardText(page);
      // Separate CSS weight faces may request the same URL again. Exercise the
      // first offline scroll/export without HTTP-cache reuse masking that work.
      await page.route("**/*.woff2", async (route) => {
        const response = await route.fetch();
        await route.fulfill({
          response,
          headers: { ...response.headers(), "cache-control": "no-store" },
        });
      });
      await page.goto(`./?${new URLSearchParams(entry.query)}`);
      const results = page.locator(`#${entry.query.mode}-results`);
      await expect(results.locator(".luck-verdict-headline")).toHaveText(
        "About average",
      );
      const values = [
        entry.expected.earlier,
        entry.expected.tied,
        entry.expected.later,
      ].map((v) => `${100 * v}%`);
      await expect(results.locator(".luck-comparison dd")).toHaveText(values);
      await expect(results.locator(".tier-badge")).toHaveText("Common");
      await page.evaluate(() => document.fonts.ready);
      await context.setOffline(true);
      const requests = [];
      page.on("request", (r) => {
        if (/^https?:/.test(r.url())) requests.push(r.url());
      });
      if (entry.query.mode === "simple")
        await results.locator("strong").last().scrollIntoViewIfNeeded();
      const exportButton = page.getByRole("button", {
        name: "Export luck card",
      });
      await exportButton.click();
      await expect(
        page.getByRole("button", { name: "Close", exact: true }),
      ).toBeFocused();
      await expect(
        page.getByRole("button", { name: "Download PNG" }),
      ).toBeEnabled();
      const drawn = await page.evaluate(() => window.cardText);
      for (const [i, label] of [
        "FINISHED SOONER",
        "SAME ATTEMPT",
        "TOOK LONGER",
      ].entries()) {
        const index = drawn.indexOf(label);
        expect(index).toBeGreaterThan(0);
        expect(drawn[index - 1]).toBe(values[i]);
      }
      expect(drawn).toContain("COMMON");
      expect(drawn).not.toContain("legendary bad luck");
      const download = page.waitForEvent("download");
      await page.keyboard.press("Tab");
      await expect(
        page.getByRole("button", { name: "Download PNG" }),
      ).toBeFocused();
      await page.keyboard.press("Enter");
      const file = await download;
      const bytes = await readFile(await file.path());
      expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
      expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([
        1080, 1350,
      ]);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.keyboard.press("Escape");
      await expect(exportButton).toBeFocused();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      expect(requests).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    });
  }

test("waiting, impossible and recovered completed runs do not exchange meanings", async ({
  page,
  context,
}) => {
  await captureCardText(page);
  await page.goto("./?mode=simple&rate=50%25&n=3&k=1&got=0");
  const results = page.locator("#simple-results");
  await expect(results.locator(".luck-comparison dd")).toHaveText([
    "87.5%",
    "12.5%",
  ]);
  await expect(results.locator(".tier-badge")).toHaveText("Uncommon bad luck");
  await page.evaluate(() => document.fonts.ready);
  await context.setOffline(true);
  await page.getByRole("button", { name: "Export luck card" }).click();
  await expect(
    page.getByRole("button", { name: "Download PNG" }),
  ).toBeEnabled();
  expect(await page.evaluate(() => window.cardText)).toContain(
    "STILL WAITING TOO",
  );
  await page.keyboard.press("Escape");
  await page.locator("#simple-n").fill("1");
  await page.locator("#simple-k").fill("2");
  await page.locator("#simple-got").check();
  await expect(results).toContainText("That completion time is impossible");
  await expect(results.locator(".luck-verdict")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Export luck card" }),
  ).toHaveCount(0);
  await page.locator("#simple-n").fill("2");
  await expect(results.locator(".luck-comparison dd")).toHaveText([
    "0%",
    "25%",
    "75%",
  ]);
  await expect(results.locator(".luck-verdict-headline")).toHaveText("Lucky");
  await page.locator("#simple-rate").fill("100%");
  await expect(results).toContainText("copy 2 always arrives on attempt 2");
  await expect(results.locator(".luck-verdict")).toHaveCount(0);
  await page.locator("#simple-n").fill("3");
  await expect(results).toContainText("That completion time is impossible");
});

test("closing a card while its fonts load leaves focus usable and does not paint an obsolete modal", async ({
  page,
}) => {
  await captureCardText(page);
  await page.addInitScript(() => {
    const native = document.fonts.load.bind(document.fonts);
    window.pendingCardFonts = [];
    document.fonts.load = (...args) =>
      native(...args).then(
        (faces) =>
          new Promise((done) =>
            window.pendingCardFonts.push(() => done(faces)),
          ),
      );
  });
  await page.goto("./?mode=simple&rate=90%25&n=1&k=1&got=1");
  const exportButton = page.getByRole("button", { name: "Export luck card" });
  await expect(exportButton).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.pendingCardFonts.length))
    .toBe(3);
  await exportButton.click();
  await expect(
    page.getByRole("button", { name: "Preparing card…" }),
  ).toBeDisabled();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Close", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(exportButton).toBeFocused();
  await page.evaluate(async () => {
    window.pendingCardFonts.splice(0).forEach((done) => done());
    await new Promise(window.requestAnimationFrame);
  });
  expect(await page.evaluate(() => window.cardText)).toEqual([]);
  await exportButton.click();
  await expect(
    page.getByRole("button", { name: "Download PNG" }),
  ).toBeEnabled();
  expect(await page.evaluate(() => window.cardText)).toContain("COMMON");
});
