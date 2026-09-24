import { describe, expect, it } from "vitest";
import { decodeState, defaultState, encodeState } from "../src/ui/app-state.js";

describe("app-state URL round trip", () => {
  it("round-trips the simple mode fields", () => {
    const state = defaultState();
    state.mode = "simple";
    state.simple = { rate: "1/4096", n: 4096, k: 2 };
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
      sources: [{ name: "Daily", rate: "2%", runsPerDay: 3 }],
      k: 2,
    };
    const decoded = decodeState(`?${encodeState(state)}`);
    expect(decoded.mode).toBe("time");
    expect(decoded.time).toEqual(state.time);
  });

  it("falls back to defaults for an empty query string", () => {
    const decoded = decodeState("");
    expect(decoded).toEqual(defaultState());
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
});
