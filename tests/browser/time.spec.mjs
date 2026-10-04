import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { auditBrowser, controlWorkers } from "./helpers.mjs";

function query(
  sources = [{ name: "Daily quest", rate: "2%", attempts: 1, everyDays: 1 }],
  k = 1,
  days = 30,
) {
  return `?${new URLSearchParams({ mode: "time", sources: JSON.stringify(sources), k: String(k), days: String(days) })}`;
}
async function ready(page, search = "?mode=time") {
  await page.goto(`./${search}`);
  await expect(page.locator("#time-status")).toHaveText("Estimate updated.");
}
async function settled(page) {
  await expect(page.locator("#time-status")).toHaveText("Estimate updated.");
  await expect(page.locator("#time-results")).toHaveAttribute(
    "aria-busy",
    "false",
  );
}
function source(page, index = 1) {
  return page.getByRole("group", { name: `Source ${index}`, exact: true });
}

auditBrowser(test);

test("daily batches keep every copy and expose exact budget probabilities", async ({
  page,
}) => {
  await ready(
    page,
    query(
      [{ name: "Guaranteed", rate: "100%", attempts: 10, everyDays: 1 }],
      5,
      1,
    ),
  );
  await expect(page.getByTestId("budget-chance")).toHaveText("100%");
  await expect(page.getByTestId("p99")).toHaveText("1 day");
  await expect(page.getByTestId("expected-days")).toHaveText("1 day");
  await source(page).getByLabel("Rate per attempt").fill("50%");
  await source(page).getByLabel("Attempts per batch").fill("2");
  await page.getByLabel("Copies needed").fill("2");
  await settled(page);
  await expect(page.getByTestId("budget-chance")).toHaveText("25%");
  await expect(page.getByTestId("expected-days")).toHaveText("2.2 days");
  await page.getByLabel("Day budget").fill("2");
  await settled(page);
  await expect(page.getByTestId("budget-chance")).toHaveText("68.75%");
});

test("weekly attempts occur at week boundaries", async ({ page }) => {
  await ready(
    page,
    query(
      [{ name: "Weekly raid", rate: "50%", attempts: 2, everyDays: 7 }],
      2,
      6,
    ),
  );
  await expect(page.getByTestId("budget-chance")).toHaveText("0%");
  await expect(page.getByTestId("expected-days")).toHaveText("15.6 days");
  await expect(page.getByTestId("p50")).toHaveText("14 days");
  await page.getByLabel("Day budget").fill("7");
  await settled(page);
  await expect(page.getByTestId("budget-chance")).toHaveText("25%");
  await page.getByLabel("Day budget").fill("13");
  await settled(page);
  await expect(page.getByTestId("budget-chance")).toHaveText("25%");
});

test("mixed daily and weekly sources match a hand-computable schedule", async ({
  page,
}) => {
  await ready(
    page,
    query(
      [
        { name: "Daily", rate: "50%", attempts: 1, everyDays: 1 },
        { name: "Weekly", rate: "100%", attempts: 1, everyDays: 7 },
      ],
      2,
      7,
    ),
  );
  await expect(page.getByTestId("budget-chance")).toHaveText("99.22%");
  await expect(page.getByTestId("p99")).toHaveText("7 days");
  await expect(
    page.getByRole("img", { name: "Distribution chart over completed days" }),
  ).toBeVisible();
});

test("legacy whole daily links migrate; fractional rates require an explicit correction", async ({
  page,
}) => {
  await ready(
    page,
    query([{ name: "Old daily", rate: "100%", runsPerDay: 5 }], 5, 1),
  );
  await expect(page.getByTestId("p50")).toHaveText("1 day");
  await expect(source(page).getByLabel("Attempts per batch")).toHaveValue("5");
  await page.goto(
    `./${query([{ name: "Old weekly-ish", rate: "50%", runsPerDay: 0.2 }])}`,
  );
  await expect(page.locator("#time-results")).toContainText("whole numbers");
  await expect(source(page).getByLabel("Attempts per batch")).toHaveValue(
    "0.2",
  );
  await expect(
    page.getByRole("button", { name: "Copy shareable link" }),
  ).toBeDisabled();
  await source(page).getByLabel("Attempts per batch").fill("1");
  await source(page).getByLabel("Schedule", { exact: true }).selectOption("7");
  await settled(page);
  await expect(page.getByTestId("expected-days")).toHaveText("14 days");
});

test("invalid numeric input is explained rather than clamped or silently rounded", async ({
  page,
}) => {
  await ready(page);
  for (const [label, value, message] of [
    ["Copies needed", "2.5", "Copies needed must be a whole number"],
    ["Day budget", "-1", "day budget must be a whole number"],
    ["Day budget", "", "day budget must be a whole number"],
  ]) {
    await page.getByLabel(label).fill(value);
    await expect(page.locator("#time-results")).toContainText(message);
    await expect(page.getByTestId("budget-chance")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Copy shareable link" }),
    ).toBeDisabled();
    await page.getByLabel(label).fill(label === "Copies needed" ? "1" : "30");
    await settled(page);
  }
  await source(page).getByLabel("Attempts per batch").fill("-1");
  await expect(page.locator("#time-results")).toContainText(
    "Attempts must be whole numbers",
  );
});

test("very rare rates are distinct from impossible schedules", async ({
  page,
}) => {
  await ready(
    page,
    query(
      [
        {
          name: "Rare",
          rate: "0.00000000000000000001",
          attempts: 1,
          everyDays: 1,
        },
      ],
      1,
      1,
    ),
  );
  await expect(page.getByTestId("budget-chance")).toHaveText("<0.01%");
  await expect(page.getByTestId("p99")).toHaveText("Over 1,000,000,000 days");
  await expect(page.locator("#time-results")).toContainText(
    "does not mean the drop is impossible",
  );
  await source(page).getByLabel("Rate per attempt").fill("0");
  await settled(page);
  await expect(page.getByTestId("p99")).toHaveText("Not reachable");
  await expect(page.locator("#time-results")).toContainText(
    "No source has both",
  );
});

test("source controls have labels, bounded counts, and useful focus after add/remove", async ({
  page,
}) => {
  await ready(page);
  const add = page.getByRole("button", { name: "+ Add source", exact: true });
  await add.click();
  await expect(
    source(page, 2).getByLabel("Name", { exact: true }),
  ).toBeFocused();
  await expect(source(page, 2).getByLabel("Rate per attempt")).toHaveValue(
    "1%",
  );
  await expect(
    source(page, 2).getByLabel("Schedule", { exact: true }),
  ).toHaveValue("1");
  await page
    .getByRole("button", { name: "Remove source 2", exact: true })
    .click();
  await expect(source(page).getByLabel("Name", { exact: true })).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Remove source 1", exact: true }),
  ).toBeDisabled();
  for (let i = 1; i < 12; i++) await add.click();
  await expect(add).toBeDisabled();
  await expect(page.getByRole("group")).toHaveCount(12);
  await settled(page);
});

test("immediate sharing captures the edited schedule before the debounce", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (text) => {
          window.copiedLink = text;
        },
      },
    });
  });
  await ready(page);
  await page.getByLabel("Copies needed").fill("3");
  await page.getByLabel("Day budget").fill("7");
  await source(page).getByLabel("Schedule", { exact: true }).selectOption("7");
  await page.getByRole("button", { name: "Copy shareable link" }).click();
  const link = await page.evaluate(() => window.copiedLink);
  const params = new URL(link).searchParams;
  expect(params.get("k")).toBe("3");
  expect(params.get("days")).toBe("7");
  expect(JSON.parse(params.get("sources"))[0].everyDays).toBe(7);
  await page.goto(link);
  await settled(page);
  await expect(page.getByLabel("Copies needed")).toHaveValue("3");
});

for (const clipboard of ["missing", "rejected"]) {
  test(`share link remains copyable when clipboard is ${clipboard}`, async ({
    page,
  }) => {
    await page.addInitScript((mode) => {
      Object.defineProperty(navigator, "clipboard", {
        value:
          mode === "missing"
            ? undefined
            : {
                writeText: async () => {
                  throw new Error("Denied");
                },
              },
      });
    }, clipboard);
    await ready(page);
    await page.getByRole("button", { name: "Copy shareable link" }).click();
    const dialog = page.getByRole("dialog", { name: "Copy your link" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Shareable link")).toBeFocused();
    expect(
      new URL(
        await dialog.getByLabel("Shareable link").inputValue(),
      ).searchParams.get("mode"),
    ).toBe("time");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Copy shareable link" }),
    ).toBeFocused();
  });
}

test("edits terminate pending workers and ignore already-delivered stale replies", async ({
  page,
}) => {
  await controlWorkers(page);
  await ready(page);
  await page.evaluate(() => {
    window.holdReplies = true;
  });
  await page.getByLabel("Day budget").fill("2");
  await page.waitForFunction(() => window.heldReplies.length === 1);
  await expect(page.locator("#time-results")).toHaveAttribute(
    "aria-busy",
    "true",
  );
  const before = await page.evaluate(() => window.terminatedWorkers);
  await page.evaluate(() => {
    window.holdReplies = false;
  });
  await page.getByLabel("Day budget").fill("50");
  await settled(page);
  await expect(page.getByTestId("budget-chance")).toHaveText("63.58%");
  expect(await page.evaluate(() => window.terminatedWorkers)).toBeGreaterThan(
    before,
  );
  await page.evaluate(() => {
    window.heldReplies.shift()();
  });
  await expect(page.getByTestId("budget-chance")).toHaveText("63.58%");
});

test("navigation cancels old calculations and keeps the selected mode's URL", async ({
  page,
}) => {
  await controlWorkers(page);
  await ready(page);
  await page.evaluate(() => {
    window.holdReplies = true;
  });
  await page.getByLabel("Day budget").fill("2");
  await page.waitForFunction(() => window.heldReplies.length === 1);
  await page.getByRole("tab", { name: "Simple drop" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Am I unlucky?",
  );
  await page.evaluate(() => {
    window.heldReplies.shift()();
  });
  await expect(page).toHaveURL(/mode=simple/);
  await page.evaluate(() => {
    window.holdReplies = false;
  });
  await page.getByRole("tab", { name: "Time to drop" }).click();
  await settled(page);
  await expect(page.getByLabel("Day budget")).toHaveValue("2");
});

for (const failure of [
  "failWorker",
  "failPost",
  "emptyReply",
  "unreadableReply",
]) {
  test(`worker ${failure} is recoverable without a reload`, async ({
    page,
  }) => {
    await controlWorkers(page);
    await ready(page);
    await page.evaluate((flag) => {
      window[flag] = true;
    }, failure);
    await page.getByLabel("Day budget").fill("50");
    await expect(page.locator("#time-status")).toHaveText(
      "The estimate could not be calculated.",
    );
    await expect(page.locator("#time-results")).toHaveAttribute(
      "aria-busy",
      "false",
    );
    await page.getByRole("button", { name: "Try again" }).click();
    await settled(page);
    await expect(page.getByTestId("budget-chance")).toHaveText("63.58%");
  });
}

test("timed-out workers stop, ignore late replies, and can retry", async ({
  page,
}) => {
  await controlWorkers(page);
  await ready(page);
  await page.clock.install();
  await page.evaluate(() => {
    window.holdReplies = true;
  });
  await page.getByLabel("Day budget").fill("50");
  await page.clock.fastForward(200);
  await page.waitForFunction(() => window.heldReplies.length === 1);
  await page.clock.fastForward(15_001);
  await expect(page.locator("#time-results")).toContainText("took too long");
  await page.evaluate(() => {
    window.holdReplies = false;
    window.heldReplies.shift()();
  });
  await expect(page.locator("#time-status")).toHaveText(
    "The estimate could not be calculated.",
  );
  await page.getByRole("button", { name: "Try again" }).click();
  await page.clock.fastForward(200);
  await settled(page);
  await expect(page.getByTestId("budget-chance")).toHaveText("63.58%");
});

for (const [mode, tab, selector, value, key] of [
  ["simple", "Simple drop", "#simple-rate", "25%", "rate"],
  ["pity", "Pity system", "#pity-budget", "31", "budget"],
  ["collection", "Collection", "#coll-n", "17", "n"],
]) {
  test(`${mode} captures edits for immediate sharing and mode changes`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: async (text) => {
            window.copiedLink = text;
          },
        },
      });
    });
    await page.goto(`./?mode=${mode}`);
    await page.locator(selector).evaluate((input, newValue) => {
      input.value = newValue;
      input.dispatchEvent(new window.Event("input", { bubbles: true }));
      document.getElementById("share-btn").click();
      document.getElementById("tab-time").click();
    }, value);
    const url = new URL(await page.evaluate(() => window.copiedLink));
    expect(url.searchParams.get(key)).toBe(value);
    await settled(page);
    await page.getByRole("tab", { name: tab }).click();
    await expect(page.locator(selector)).toHaveValue(value);
  });
}

test("single-day charts have unique ticks and fully visible combined milestones", async ({
  page,
}) => {
  await ready(
    page,
    query(
      [{ name: "Guaranteed", rate: "100%", attempts: 10, everyDays: 1 }],
      5,
      1,
    ),
  );
  await expect(page.locator(".chart-marker-label")).toHaveCount(1);
  await expect(page.locator(".chart-marker-label")).toHaveText(
    "50% / 90% / 99%",
  );
  expect(
    await page.locator(".chart-marker-label").evaluate((el) => {
      const box = el.getBBox();
      return box.x >= 0 && box.x + box.width <= 640;
    }),
  ).toBe(true);
  expect(
    await page
      .locator(".chart-axis-label:not(.chart-axis-title)")
      .allTextContents(),
  ).toEqual(["0", "1"]);
});

test("worker asset failure is visible and retry loads a working worker", async ({
  page,
}) => {
  await page.route("**/assets/time-worker-*.js", (route) => route.abort());
  await page.goto("./?mode=time");
  await expect(page.locator("#time-results")).toContainText("could not start");
  await page.unroute("**/assets/time-worker-*.js");
  await page.getByRole("button", { name: "Try again" }).click();
  await settled(page);
});

test("untrusted names and rates render as text; malformed links recover", async ({
  page,
}) => {
  const payload =
    '<img src="https://example.invalid/attack" onerror="window.injected=true">';
  await ready(
    page,
    query([{ name: payload, rate: "50%", attempts: 1, everyDays: 1 }]),
  );
  await expect(source(page).getByLabel("Name", { exact: true })).toHaveValue(
    payload,
  );
  await source(page).getByLabel("Rate per attempt").fill(payload);
  await expect(page.locator("#time-status")).toContainText("Check the inputs");
  expect(await page.evaluate(() => window.injected)).toBeUndefined();
  await ready(page, "?mode=time&sources=not-json");
  await expect(source(page).getByLabel("Name", { exact: true })).toHaveValue(
    "Daily quest",
  );
});

test("keyboard tabs and history navigation discard pending panel updates", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("tab", { name: "Time to drop" }).focus();
  await page.keyboard.press("Home");
  await expect(page.getByRole("tab", { name: "Simple drop" })).toBeFocused();
  await page.getByLabel("Drop rate").fill("50%");
  await page.getByRole("tab", { name: "Time to drop" }).focus();
  await page.keyboard.press("End");
  await settled(page);
  await page.getByLabel("Day budget").fill("20");
  await page.evaluate(() => {
    window.history.pushState(null, "", "?mode=time&days=7");
    window.dispatchEvent(new window.PopStateEvent("popstate"));
  });
  await settled(page);
  await expect(page.getByLabel("Day budget")).toHaveValue("7");
  await expect(page).toHaveURL(/days=7/);
});

test("blocked local storage still permits calculation and theme changes", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("Storage disabled");
      },
    });
  });
  await ready(page);
  await page
    .getByRole("button", { name: "Toggle light and dark theme" })
    .click();
  await expect(page.getByTestId("budget-chance")).toHaveText("45.45%");
});

for (const width of [320, 1360]) {
  for (const colorScheme of ["light", "dark"]) {
    test(`time planner accessibility at ${width}px in ${colorScheme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ colorScheme });
      await ready(
        page,
        query(
          [
            { name: "Daily quest", rate: "2%", attempts: 3, everyDays: 1 },
            { name: "Weekly raid", rate: "10%", attempts: 2, everyDays: 7 },
          ],
          3,
          30,
        ),
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      const audit = await new AxeBuilder({ page }).analyze();
      expect(audit.violations).toEqual([]);
    });
  }
}
