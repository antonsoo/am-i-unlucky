import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { auditBrowser, controlWorkers } from "./helpers.mjs";

auditBrowser(test);
function query(rates, n = 60) {
  return `?${new URLSearchParams({ mode: "collection", n: String(n), items: JSON.stringify(rates.map((rate, i) => ({ name: `Drop ${i + 1}`, rate }))) })}`;
}
async function settled(page) {
  await expect(page.locator("#collection-status")).toHaveText(
    "Collection updated.",
  );
  await expect(page.locator("#collection-results")).toHaveAttribute(
    "aria-busy",
    "false",
  );
}
async function ready(page, search = "?mode=collection") {
  await page.goto(`./${search}`);
  await settled(page);
}
function item(page, n = 1) {
  return page.getByRole("group", { name: `Item ${n}`, exact: true });
}

test("default collection explains its model and matches calculated odds", async ({
  page,
}) => {
  await ready(page);
  await expect(page.getByTestId("collection-chance")).toHaveText("95.22%");
  await expect(page.getByTestId("collection-mean")).toHaveText("24");
  await expect(page.getByTestId("collection-completed")).toHaveText(
    "20,000 / 20,000",
  );
  await expect(page.getByTestId("collection-agreement")).toContainText(
    "inside",
  );
  await expect(page.locator("#collection-total")).toHaveText(
    "65% listed items; 35% other outcomes per attempt.",
  );
  await expect(
    page.getByRole("heading", { name: "How drops are counted" }),
  ).toBeVisible();
  await page.getByLabel("Attempt budget").fill("3");
  await settled(page);
  await expect(page.getByTestId("collection-chance")).toHaveText("0%");
});

test("zero-rate sets finish promptly and can be corrected", async ({
  page,
}) => {
  await ready(page, query(["0", "50%"], 1e9));
  await expect(page.getByTestId("collection-mean")).toHaveText("Not reachable");
  await expect(page.getByTestId("collection-chance")).toHaveText("0%");
  await expect(page.getByTestId("collection-completed")).toHaveCount(0);
  await item(page).getByLabel("Rate per attempt").fill("50%");
  await page.getByLabel("Attempt budget").fill("2");
  await settled(page);
  await expect(page.getByTestId("collection-chance")).toHaveText("50%");
  await expect(page.getByTestId("collection-mean")).toHaveText("3");
});

test("rare collections stay possible without misleading censored averages", async ({
  page,
}) => {
  await ready(page, query(["0.00000000000000000001"], 1e9));
  await expect(page.getByTestId("collection-chance")).toHaveText("<0.01%");
  await expect(page.getByTestId("collection-mean")).toHaveText("1.000e+20");
  await expect(page.getByTestId("collection-completed")).toHaveText(
    "0 / 20,000",
  );
  await expect(page.getByTestId("collection-sim-mean")).toHaveText(
    "Not estimated",
  );
  await expect(page.getByTestId("collection-interval")).toHaveText(
    "Unavailable",
  );
  await expect(page.locator("#collection-results")).toContainText(
    "Completion is possible",
  );
  await expect(page.locator("#collection-results")).toContainText(
    "averaging only completed runs would understate the wait",
  );
  await page.getByRole("tab", { name: "Simple drop" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Am I unlucky?",
  );
});

test("large sets use labeled simulation with uncertainty and bounded charts", async ({
  page,
}) => {
  await ready(page, query(Array(32).fill("2%"), 200));
  await expect(page.locator("#collection-results")).toContainText(
    "Estimated chance within 200 attempts",
  );
  await expect(page.locator("#collection-results")).toContainText(
    "Approximate 95% interval",
  );
  await expect(page.locator("#collection-results")).toContainText(
    "Exact calculations support up to 16 items",
  );
  await expect(page.getByTestId("collection-completed")).toHaveText(
    "20,000 / 20,000",
  );
  expect(
    (await page.locator(".chart-cdf").getAttribute("d")).split("L").length,
  ).toBeLessThanOrEqual(160);
  await expect(page.getByRole("button", { name: "+ Add item" })).toBeDisabled();
});

test("large censored sets do not show zero-width probability intervals or a completion mean", async ({
  page,
}) => {
  await ready(page, query(Array(17).fill("0.00000000000000000001"), 1e9));
  await expect(page.getByTestId("collection-mean")).toHaveText("Not estimated");
  await expect(page.locator("#collection-results")).toContainText(
    "0% to 0.019%",
  );
  await expect(page.getByTestId("collection-agreement")).toBeEmpty();
});

test("simulation disagreement is reported instead of claiming every interval agrees", async ({
  page,
}) => {
  await ready(page, query(["0.006", "0.033"]));
  await expect(page.getByTestId("collection-agreement")).toContainText(
    "outside",
  );
  await expect(page.getByTestId("collection-agreement")).toContainText(
    "agreement is not guaranteed",
  );
});

test("invalid loot tables recover without silently normalizing", async ({
  page,
}) => {
  await page.goto(`./${query(["80%", "80%"], 2)}`);
  await expect(page.locator("#collection-error")).toContainText("at most 100%");
  await expect(item(page).getByLabel("Rate per attempt")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(
    page.getByRole("button", { name: "Copy shareable link" }),
  ).toBeDisabled();
  await expect(item(page).getByLabel("Rate per attempt")).toHaveValue("80%");
  await item(page, 2).getByLabel("Rate per attempt").fill("20%");
  await settled(page);
  await expect(page.getByTestId("collection-chance")).toHaveText("32%");
  for (const value of ["2.5", "-1", "", "1000000001"]) {
    await page.getByLabel("Attempt budget").fill(value);
    await expect(page.locator("#collection-error")).toContainText(
      "whole number",
    );
    await expect(page.getByTestId("collection-chance")).toHaveCount(0);
    await expect(page.getByLabel("Attempt budget")).toHaveAttribute(
      "aria-describedby",
      "collection-error",
    );
    await expect(
      page.getByRole("button", { name: "Copy shareable link" }),
    ).toBeDisabled();
  }
  await page.getByLabel("Attempt budget").fill("0");
  await settled(page);
  await expect(page.getByTestId("collection-chance")).toHaveText("0%");
});

test("added items have labels, meaningful focus, and a working cap", async ({
  page,
}) => {
  await ready(page, query(Array(31).fill("1%")));
  await page.getByRole("button", { name: "+ Add item" }).click();
  await expect(
    item(page, 32).getByLabel("Name", { exact: true }),
  ).toBeFocused();
  await expect(item(page, 32).getByLabel("Rate per attempt")).toHaveValue("1%");
  await expect(page.getByRole("button", { name: "+ Add item" })).toBeDisabled();
  await page
    .getByRole("button", { name: "Remove item 32", exact: true })
    .click();
  await expect(
    item(page, 31).getByLabel("Name", { exact: true }),
  ).toBeFocused();
  await expect(page.getByRole("button", { name: "+ Add item" })).toBeEnabled();
  await settled(page);
  await ready(page, query(["100%"], 1));
  await expect(
    page.getByRole("button", { name: "Remove item 1", exact: true }),
  ).toBeDisabled();
  await expect(page.getByTestId("collection-mean")).toHaveText("1");
});

test("edits abort workers and late results cannot cross edits or navigation", async ({
  page,
}) => {
  await controlWorkers(page);
  await ready(page);
  await page.evaluate(() => {
    window.holdReplies = true;
  });
  await page.getByLabel("Attempt budget").fill("2");
  await page.waitForFunction(() => window.heldReplies.length === 1);
  await page.evaluate(() => {
    window.holdReplies = false;
  });
  await page.getByLabel("Attempt budget").fill("3");
  await settled(page);
  await page.evaluate(() => {
    window.heldReplies.shift()();
  });
  await expect(page.locator("#collection-results")).toContainText(
    "within 3 attempts",
  );
  await page.evaluate(() => {
    window.holdReplies = true;
  });
  await page.getByLabel("Attempt budget").fill("4");
  await page.waitForFunction(() => window.heldReplies.length === 1);
  await page.getByRole("tab", { name: "Time to drop" }).click();
  await page.evaluate(() => {
    window.holdReplies = false;
    window.heldReplies.shift()();
  });
  await expect(page.locator("#collection-results")).toHaveCount(0);
  await page.getByRole("tab", { name: "Collection" }).click();
  await settled(page);
  await expect(page.getByLabel("Attempt budget")).toHaveValue("4");
  expect(await page.evaluate(() => window.terminatedWorkers)).toBeGreaterThan(
    3,
  );
});

for (const failure of [
  "failWorker",
  "failPost",
  "emptyReply",
  "unreadableReply",
]) {
  test(`collection worker ${failure} can retry`, async ({ page }) => {
    await controlWorkers(page);
    await ready(page);
    await page.evaluate((flag) => {
      window[flag] = true;
    }, failure);
    await page.getByLabel("Attempt budget").fill("3");
    await expect(page.locator("#collection-status")).toHaveText(
      "The collection could not be calculated.",
    );
    await expect(page.locator("#collection-results")).toHaveAttribute(
      "aria-busy",
      "false",
    );
    await page.getByRole("button", { name: "Try again" }).click();
    await settled(page);
    await expect(page.getByTestId("collection-chance")).toHaveText("0%");
  });
}

test("collection worker timeout terminates and ignores late results", async ({
  page,
}) => {
  await controlWorkers(page);
  await ready(page);
  await page.clock.install();
  await page.evaluate(() => {
    window.holdReplies = true;
  });
  await page.getByLabel("Attempt budget").fill("3");
  await page.clock.fastForward(200);
  await page.waitForFunction(() => window.heldReplies.length === 1);
  await page.clock.fastForward(15001);
  await expect(page.locator("#collection-results")).toContainText(
    "took too long",
  );
  await page.evaluate(() => {
    window.holdReplies = false;
    window.heldReplies.shift()();
  });
  await expect(page.locator("#collection-status")).toHaveText(
    "The collection could not be calculated.",
  );
  await page.getByRole("button", { name: "Try again" }).click();
  await page.clock.fastForward(200);
  await settled(page);
});

test("failed collection assets recover and input text remains inert", async ({
  page,
}) => {
  await page.route("**/assets/collection-worker-*.js", (route) =>
    route.abort(),
  );
  await page.goto("./?mode=collection");
  await expect(page.locator("#collection-results")).toContainText(
    "could not start",
  );
  await page.unroute("**/assets/collection-worker-*.js");
  await page.getByRole("button", { name: "Try again" }).click();
  await settled(page);
  const payload =
    '<img src="https://example.invalid/attack" onerror="window.injected=true">';
  await item(page).getByLabel("Name", { exact: true }).fill(payload);
  await settled(page);
  await item(page).getByLabel("Rate per attempt").fill(payload);
  await expect(page.locator("#collection-error")).toContainText(payload);
  expect(await page.evaluate(() => window.injected)).toBeUndefined();
  await ready(page, "?mode=collection&items=not-json");
  await expect(item(page).getByLabel("Name", { exact: true })).toHaveValue(
    "Item A",
  );
});

for (const width of [320, 1360])
  for (const colorScheme of ["light", "dark"]) {
    test(`collection accessibility at ${width}px in ${colorScheme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ colorScheme });
      await ready(page);
      await page.getByRole("button", { name: "+ Add item" }).click();
      await settled(page);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await item(page, 5).getByLabel("Rate per attempt").fill("90%");
      await expect(page.locator("#collection-error")).toBeVisible();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    });
  }

test("mobile users can reach results directly from the budget", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await ready(page);
  await expect(page.getByLabel("Attempt budget")).toBeInViewport();
  await page.getByRole("button", { name: "View results" }).click();
  await expect(
    page.getByRole("region", { name: "Collection results" }),
  ).toBeFocused();
  await expect(page.getByTestId("collection-chance")).toBeInViewport();
  await expect(page).not.toHaveURL(/#/);
});

test("oversized shared tables stay editable until the extra item is removed", async ({
  page,
}) => {
  await page.goto(`./${query(Array(33).fill("1%"))}`);
  await expect(page.locator("#collection-error")).toHaveText(
    "Use at most 32 items.",
  );
  await expect(
    page.getByRole("button", { name: "Copy shareable link" }),
  ).toBeDisabled();
  await expect(page.getByRole("group")).toHaveCount(33);
  await page
    .getByRole("button", { name: "Remove item 33", exact: true })
    .click();
  await settled(page);
  await expect(page.getByRole("group")).toHaveCount(32);
  await expect(
    page.getByRole("button", { name: "Copy shareable link" }),
  ).toBeEnabled();
});
