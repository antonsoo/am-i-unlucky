import { afterEach, expect, it, vi } from "vitest";
import { debounce } from "../src/ui/debounce.js";

afterEach(() => {
  vi.useRealTimers();
});

it("cancels a previous panel's pending callback when its lifetime ends", () => {
  vi.useFakeTimers();
  const callback = vi.fn();
  const controller = new AbortController();
  const run = debounce(callback, 150, controller.signal);
  run("old mode");
  controller.abort();
  run("already unmounted");
  vi.runAllTimers();
  expect(callback).not.toHaveBeenCalled();
});

it("captures only the most recent value and can cancel a pending URL update", () => {
  vi.useFakeTimers();
  const callback = vi.fn();
  const run = debounce(callback, 150);
  run("old");
  run("new");
  vi.advanceTimersByTime(150);
  expect(callback).toHaveBeenCalledExactlyOnceWith("new");
  run("stale history");
  run.cancel();
  vi.runAllTimers();
  expect(callback).toHaveBeenCalledTimes(1);
});
