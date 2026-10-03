export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  ms: number,
  signal?: AbortSignal,
): ((...args: Args) => void) & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = (): void => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  const run = (...args: Args): void => {
    cancel();
    if (signal?.aborted) return;
    timer = setTimeout(() => {
      timer = undefined;
      fn(...args);
    }, ms);
  };
  signal?.addEventListener("abort", cancel, { once: true });
  return Object.assign(run, { cancel });
}
