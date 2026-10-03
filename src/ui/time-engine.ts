import type { TimePlan, TimePlanRequest } from "./time-plan.js";

/** Each request owns its worker. Aborting actually stops synchronous math. */
export function runTimePlan(
  request: TimePlanRequest,
  signal: AbortSignal,
): Promise<TimePlan> {
  return new Promise((resolve, reject) => {
    let worker: Worker | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let settled = false;
    function finish(result?: TimePlan, error?: unknown): void {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      worker?.terminate();
      if (result) resolve(result);
      else
        reject(
          error instanceof Error
            ? error
            : new Error("Unable to calculate this schedule."),
        );
    }
    function abort(): void {
      finish(
        undefined,
        new DOMException("Calculation cancelled.", "AbortError"),
      );
    }
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener("abort", abort, { once: true });
    try {
      worker = new Worker(new URL("./time-worker.ts", import.meta.url), {
        type: "module",
      });
      worker.onmessage = (
        event: MessageEvent<{ result?: TimePlan; error?: string }>,
      ) => {
        finish(
          event.data?.result,
          new Error(
            event.data?.error ??
              "The calculation returned no result. Try again.",
          ),
        );
      };
      worker.onerror = (event) => {
        event.preventDefault();
        finish(
          undefined,
          new Error(
            "The calculator could not start. Check your connection and try again.",
          ),
        );
      };
      worker.addEventListener("messageerror", () => {
        finish(
          undefined,
          new Error("The calculation could not be read. Try again."),
        );
      });
      timer = setTimeout(() => {
        finish(
          undefined,
          new Error(
            "The calculation took too long. Try fewer sources or copies, then try again.",
          ),
        );
      }, 15_000);
      worker.postMessage(request);
    } catch (error) {
      finish(undefined, error);
    }
  });
}
