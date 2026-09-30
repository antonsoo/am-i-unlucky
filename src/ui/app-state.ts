/** Application state and its (de)serialization to a shareable URL query string. */
import type { PityConfig, PityUserState } from "../math/pity.js";

export type Mode = "simple" | "pity" | "collection" | "time";

export interface SimpleState {
  rate: string;
  n: number;
  k: number;
  /** Whether the k-th copy came on attempt n; false means still waiting after n attempts. */
  got: boolean;
}

export interface PityState extends PityConfig, PityUserState {
  target: number;
  budget: number;
  actualPulls: number;
}

export interface CollectionItemState {
  name: string;
  rate: string;
}

export interface CollectionState {
  items: CollectionItemState[];
  n: number;
}

export interface TimeSourceState {
  name: string;
  rate: string;
  runsPerDay: number;
}

export interface TimeState {
  sources: TimeSourceState[];
  k: number;
}

export interface AppState {
  mode: Mode;
  simple: SimpleState;
  pity: PityState;
  collection: CollectionState;
  time: TimeState;
}

export function defaultState(): AppState {
  return {
    mode: "simple",
    simple: { rate: "1/512", n: 900, k: 1, got: false },
    pity: {
      baseRate: 0.006,
      softPityStart: 74,
      softPityIncrement: 0.06,
      hardPity: 90,
      featuredRate: 0.5,
      hasGuarantee: true,
      pity: 0,
      guaranteed: false,
      target: 1,
      budget: 180,
      actualPulls: 90,
    },
    collection: {
      items: [
        { name: "Item A", rate: "0.3" },
        { name: "Item B", rate: "0.2" },
        { name: "Item C", rate: "0.1" },
        { name: "Item D", rate: "0.05" },
      ],
      n: 60,
    },
    time: {
      sources: [{ name: "Daily quest", rate: "2%", runsPerDay: 1 }],
      k: 1,
    },
  };
}

/** Build a shareable query string for the given mode's slice of state only. */
export function encodeState(state: AppState): string {
  const params = new URLSearchParams();
  params.set("mode", state.mode);
  switch (state.mode) {
    case "simple": {
      const s = state.simple;
      params.set("rate", s.rate);
      params.set("n", String(s.n));
      params.set("k", String(s.k));
      params.set("got", s.got ? "1" : "0");
      break;
    }
    case "pity": {
      const p = state.pity;
      params.set("base", String(p.baseRate));
      params.set("soft", String(p.softPityStart));
      params.set("inc", String(p.softPityIncrement));
      params.set("hard", String(p.hardPity));
      params.set("feat", String(p.featuredRate));
      params.set("guar", p.hasGuarantee ? "1" : "0");
      params.set("pity0", String(p.pity));
      params.set("g0", p.guaranteed ? "1" : "0");
      params.set("target", String(p.target));
      params.set("budget", String(p.budget));
      params.set("actual", String(p.actualPulls));
      break;
    }
    case "collection": {
      const c = state.collection;
      params.set("items", JSON.stringify(c.items));
      params.set("n", String(c.n));
      break;
    }
    case "time": {
      const t = state.time;
      params.set("sources", JSON.stringify(t.sources));
      params.set("k", String(t.k));
      break;
    }
  }
  return params.toString();
}

function num(params: URLSearchParams, key: string, fallback: number): number {
  const raw = params.get(key);
  if (raw === null) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

/** A share link's JSON is untrusted input: anything but the expected shape falls back to defaults. */
class MalformedState extends Error {}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function namedRates(raw: unknown, rateKey: "rate"): CollectionItemState[] {
  if (!Array.isArray(raw) || raw.length === 0) throw new MalformedState();
  return raw.map((item) => {
    if (
      !isRecord(item) ||
      typeof item.name !== "string" ||
      typeof item[rateKey] !== "string"
    ) {
      throw new MalformedState();
    }
    return { name: item.name, rate: item[rateKey] };
  });
}

function timeSources(raw: unknown): TimeSourceState[] {
  const named = namedRates(raw, "rate");
  return named.map((item, i) => {
    const runs = (raw as Record<string, unknown>[])[i]?.runsPerDay;
    if (typeof runs !== "number" || !Number.isFinite(runs))
      throw new MalformedState();
    return { ...item, runsPerDay: runs };
  });
}

export function decodeState(search: string): AppState {
  const base = defaultState();
  const params = new URLSearchParams(search);
  const mode = params.get("mode");
  if (
    mode === "simple" ||
    mode === "pity" ||
    mode === "collection" ||
    mode === "time"
  ) {
    base.mode = mode;
  } else {
    return base;
  }

  try {
    switch (base.mode) {
      case "simple":
        base.simple = {
          rate: params.get("rate") ?? base.simple.rate,
          n: num(params, "n", base.simple.n),
          k: num(params, "k", base.simple.k),
          // Links shared before this field existed meant "got it on attempt n".
          got: (params.get("got") ?? "1") === "1",
        };
        break;
      case "pity":
        base.pity = {
          baseRate: num(params, "base", base.pity.baseRate),
          softPityStart: num(params, "soft", base.pity.softPityStart),
          softPityIncrement: num(params, "inc", base.pity.softPityIncrement),
          hardPity: num(params, "hard", base.pity.hardPity),
          featuredRate: num(params, "feat", base.pity.featuredRate),
          hasGuarantee:
            (params.get("guar") ?? (base.pity.hasGuarantee ? "1" : "0")) ===
            "1",
          pity: num(params, "pity0", base.pity.pity),
          guaranteed:
            (params.get("g0") ?? (base.pity.guaranteed ? "1" : "0")) === "1",
          target: num(params, "target", base.pity.target),
          budget: num(params, "budget", base.pity.budget),
          actualPulls: num(params, "actual", base.pity.actualPulls),
        };
        break;
      case "collection": {
        const rawItems = params.get("items");
        const items = rawItems
          ? namedRates(JSON.parse(rawItems), "rate")
          : base.collection.items;
        base.collection = { items, n: num(params, "n", base.collection.n) };
        break;
      }
      case "time": {
        const rawSources = params.get("sources");
        const sources = rawSources
          ? timeSources(JSON.parse(rawSources))
          : base.time.sources;
        base.time = { sources, k: num(params, "k", base.time.k) };
        break;
      }
    }
  } catch {
    // Malformed share URL: fall back to defaults for that mode rather than crashing.
  }
  return base;
}
