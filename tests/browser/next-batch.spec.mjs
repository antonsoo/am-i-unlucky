import { test } from "@playwright/test";
import { exercise } from "../../studies/next-batch/browser.mjs";
for (const width of [1440, 375]) {
  test(`weekly first batches survive editing, sharing and recovery at ${width}px`, async ({
    page,
    baseURL,
  }, info) => {
    await exercise(page, { url: baseURL, width, engine: info.project.name });
  });
}
