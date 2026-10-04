/** Each request owns its worker. Aborting actually stops synchronous math. */
export function runCalculation<Request, Result>(
  createWorker: () => Worker,
  request: Request,
  signal: AbortSignal,
  timeoutMessage: string,
): Promise<Result> {
  return new Promise((resolve, reject) => {
    let worker: Worker | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let settled = false;
    function finish(result?: Result, error?: unknown): void {
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
            : new Error("Unable to complete this calculation."),
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
      worker = createWorker();
      worker.onmessage = (
        event: MessageEvent<{ result?: Result; error?: string }>,
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
        finish(undefined, new Error(timeoutMessage));
      }, 15_000);
      worker.postMessage(request);
    } catch (error) {
      finish(undefined, error);
    }
  });
}
