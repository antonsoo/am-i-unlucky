import { expect } from "@playwright/test";

export async function controlWorkers(page) {
  await page.addInitScript(() => {
    const NativeWorker = Worker;
    window.heldReplies = [];
    window.terminatedWorkers = 0;
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        if (window.failWorker) {
          window.failWorker = false;
          throw new Error("Worker startup unavailable.");
        }
        super(...args);
      }
      set onmessage(handler) {
        super.onmessage = handler
          ? (event) => {
              if (window.emptyReply) {
                window.emptyReply = false;
                handler.call(
                  this,
                  new window.MessageEvent("message", { data: null }),
                );
                return;
              }
              if (window.unreadableReply) {
                window.unreadableReply = false;
                this.dispatchEvent(new window.MessageEvent("messageerror"));
                return;
              }
              if (window.holdReplies)
                window.heldReplies.push(() => handler.call(this, event));
              else handler.call(this, event);
            }
          : null;
      }
      postMessage(...args) {
        if (window.failPost) {
          window.failPost = false;
          throw new Error("Worker message unavailable.");
        }
        return super.postMessage(...args);
      }
      terminate() {
        window.terminatedWorkers++;
        super.terminate();
      }
    };
  });
}

export function auditBrowser(test) {
  test.beforeEach(async ({ page }) => {
    const errors = [];
    const external = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      if (!request.url().startsWith("http://127.0.0.1:4194/"))
        external.push(request.url());
    });
    await page.exposeFunction("testDiagnostics", () => ({ errors, external }));
    await page.addInitScript(() => {
      window.cspViolations = [];
      window.rejections = [];
      document.addEventListener("securitypolicyviolation", (event) =>
        window.cspViolations.push(event.violatedDirective),
      );
      window.addEventListener("unhandledrejection", (event) =>
        window.rejections.push(String(event.reason)),
      );
    });
  });
  test.afterEach(async ({ page }) => {
    expect(await page.evaluate(() => window.testDiagnostics())).toEqual({
      errors: [],
      external: [],
    });
    expect(await page.evaluate(() => window.cspViolations)).toEqual([]);
    expect(await page.evaluate(() => window.rejections)).toEqual([]);
  });
}
