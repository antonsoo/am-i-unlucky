import { describe, expect, it } from "vitest";
import { decodeState, defaultState, encodeState } from "../src/ui/app-state.js";

describe("app-state URL round trip", () => {
  it("round-trips the simple mode fields", () => {
    const state = defaultState();
    state.mode = "simple";
    state.simple = { rate: "1/4096", n: 4096, k: 2, got: true };
    const decoded = decodeState(`?${encodeState(state)}`);
    expect(decoded.mode).toBe("simple");
    expect(decoded.simple).toEqual(state.simple);
  });

  it("round-trips the pity mode fields, including booleans", () => {
    const state = defaultState();
    state.mode = "pity";
    state.pity = {
      ...state.pity,
      hasGuarantee: false,
      guaranteed: true,
      pity: 42,
      target: 3,
    };
    const decoded = decodeState(`?${encodeState(state)}`);
    expect(decoded.mode).toBe("pity");
    expect(decoded.pity).toEqual(state.pity);
  });

  it("round-trips collection items via JSON", () => {
    const state = defaultState();
    state.mode = "collection";
    state.collection = {
      items: [
        { name: "Sword", rate: "1/20" },
        { name: "Shield", rate: "5%" },
      ],
      n: 30,
    };
    const decoded = decodeState(`?${encodeState(state)}`);
    expect(decoded.mode).toBe("collection");
    expect(decoded.collection).toEqual(state.collection);
  });

  it("round-trips time-to-drop sources", () => {
    const state = defaultState();
    state.mode = "time";
    state.time = {
      sources: [
        { name: "Daily", rate: "2%", attempts: 3, everyDays: 1 },
        { name: "Raid", rate: "5%", attempts: 2, everyDays: 7 },
      ],
      k: 2,
      days: 14,
    };
    const decoded = decodeState(`?${encodeState(state)}`);
    expect(decoded.mode).toBe("time");
    expect(decoded.time).toEqual(state.time);
  });

  it("falls back to defaults for an empty query string", () => {
    const decoded = decodeState("");
    expect(decoded).toEqual(defaultState());
  });

  it("keeps invalid but well-formed legacy numbers for an actionable correction", () => {
    const sources = [{ name: "Weekly-ish", rate: "5%", runsPerDay: 0.2 }];
    const decoded = decodeState(
      `?mode=time&sources=${encodeURIComponent(JSON.stringify(sources))}&k=2.5&days=-1`,
    );
    expect(decoded.time).toEqual({
      sources: [
        { name: "Weekly-ish", rate: "5%", attempts: 0.2, everyDays: 1 },
      ],
      k: 2.5,
      days: -1,
    });
  });

  it("preserves a zero-day budget and unsupported numeric cadence instead of substituting daily", () => {
    const sources = [{ name: "Custom", rate: "5%", attempts: 2, everyDays: 2 }];
    const decoded = decodeState(
      `?mode=time&sources=${encodeURIComponent(JSON.stringify(sources))}&days=0`,
    );
    expect(decoded.time.days).toBe(0);
    expect(decoded.time.sources).toEqual(sources);
  });

  it("falls back to defaults for an unknown mode", () => {
    const decoded = decodeState("?mode=nonsense");
    expect(decoded).toEqual(defaultState());
  });

  it("falls back gracefully for malformed JSON in a share link, without throwing", () => {
    expect(() => decodeState("?mode=collection&items=not-json")).not.toThrow();
    const decoded = decodeState("?mode=collection&items=not-json");
    expect(decoded.collection.items).toEqual(defaultState().collection.items);
  });

  it("ignores non-numeric values for numeric fields and keeps the default", () => {
    const decoded = decodeState("?mode=simple&rate=1%2F512&n=not-a-number&k=1");
    expect(decoded.simple.n).toBe(defaultState().simple.n);
  });

  it("reads a simple-mode link from before the got field as 'got it on attempt n'", () => {
    expect(decodeState("?mode=simple&rate=1%2F512&n=20&k=1").simple.got).toBe(
      true,
    );
    expect(
      decodeState("?mode=simple&rate=1%2F512&n=20&k=1&got=0").simple.got,
    ).toBe(false);
  });

  it("falls back to defaults when a link's collection items or time sources have the wrong shape", () => {
    for (const items of ['{"name":"x"}', "[1,2]", '[{"name":"A"}]', "[]"]) {
      const decoded = decodeState(
        `?mode=collection&items=${encodeURIComponent(items)}&n=5`,
      );
      expect(decoded.collection).toEqual(defaultState().collection);
    }
    const badSources = encodeURIComponent(
      '[{"name":"Q","rate":"2%","runsPerDay":"lots"}]',
    );
    expect(decodeState(`?mode=time&sources=${badSources}&k=1`).time).toEqual(
      defaultState().time,
    );
    const good = encodeURIComponent(
      '[{"name":"Q","rate":"2%","runsPerDay":3}]',
    );
    expect(decodeState(`?mode=time&sources=${good}&k=2`).time).toEqual({
      sources: [{ name: "Q", rate: "2%", attempts: 3, everyDays: 1 }],
      k: 2,
      days: 30,
    });
  });
});
