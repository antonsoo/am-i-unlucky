/** Independent daily/weekly batches, retaining every successful copy. */
import { binomialPmf, clampProbability, kahanSum } from "./numeric.js";
import { binomialSurvival } from "./simple.js";

export const MAX_TIME_SOURCES = 12;
export const MAX_TIME_COPIES = 100;
export const MAX_BATCH_ATTEMPTS = 1_000_000;
/** Counts stay below Number.MAX_SAFE_INTEGER, even at the largest batch size. */
export const MAX_TIME_DAYS = 1_000_000_000;

/** The original daily-only API; fractional attempts were never an exact model. */
export interface AttemptSource {
  name: string;
  p: number;
  runsPerDay: number;
}

export interface ScheduledAttemptSource {
  name: string;
  p: number;
  attempts: number;
  /** First batch at the end of this day, then every 1 or 7 days. */
  everyDays: number;
}

export interface TimeToDropInput {
  sources: (AttemptSource | ScheduledAttemptSource)[];
  k: number;
}

export interface TimePoint {
  n: number;
  fromDay: number;
  /** Probability of finishing in [fromDay, n], not a sampled one-day PMF. */
  pmf: number;
  cdf: number;
}

export interface TimeToDropResult {
  possible: boolean;
  /** At least one copy on day 1 (weekly batches first arrive on day 7). */
  dailySuccessRate: number;
  /** Long-run average, not an assumption of fractional daily attempts. */
  totalRunsPerDay: number;
  /** null means floating-point overflow; Infinity means no productive source. */
  expectedDays: number | null;
  expectedHours: number | null;
  /** null means beyond MAX_TIME_DAYS; Infinity means impossible. */
  daysFor: { p50: number | null; p90: number | null; p99: number | null };
  probabilityWithinDays: (days: number) => number;
  distribution: (maxPoints?: number) => TimePoint[];
}

function sourcesFor(
  input: TimeToDropInput["sources"],
): ScheduledAttemptSource[] {
  if (input.length > MAX_TIME_SOURCES) {
    throw new RangeError(`Use at most ${MAX_TIME_SOURCES} attempt sources.`);
  }
  return input.map((source) => {
    const normalized =
      "runsPerDay" in source
        ? {
            name: source.name,
            p: source.p,
            attempts: source.runsPerDay,
            everyDays: 1,
          }
        : { ...source };
    const { p, attempts, everyDays } = normalized;
    if (!Number.isFinite(p) || p < 0 || p > 1) {
      throw new RangeError("Each drop rate must be between 0 and 100%.");
    }
    if (
      !Number.isSafeInteger(attempts) ||
      attempts < 0 ||
      attempts > MAX_BATCH_ATTEMPTS
    ) {
      throw new RangeError(
        `Attempts must be whole numbers from 0 to ${MAX_BATCH_ATTEMPTS.toLocaleString("en-US")}. For weekly attempts, choose Weekly instead of a fractional daily rate.`,
      );
    }
    if (everyDays !== 1 && everyDays !== 7) {
      throw new RangeError(
        "Choose a Daily or Weekly schedule for every source.",
      );
    }
    return normalized;
  });
}

function anySuccess(sources: ScheduledAttemptSource[], days: number): number {
  let logMiss = 0;
  for (const source of sources) {
    const n = source.attempts * Math.floor(days / source.everyDays);
    // In particular, avoid 0 * log(0) for an inactive guaranteed source.
    if (n > 0) logMiss += n * Math.log1p(-source.p);
  }
  return clampProbability(-Math.expm1(logMiss));
}

/** Exact at-least-one probability for integer daily batches; preserves tiny p. */
export function combinedDailyRate(sources: AttemptSource[]): number {
  return anySuccess(sourcesFor(sources), 1);
}

function unitMass(k: number): Float64Array {
  const mass = new Float64Array(k);
  mass[0] = 1;
  return mass;
}

function batchMass(n: number, p: number, k: number): Float64Array {
  return Float64Array.from({ length: k }, (_, j) => binomialPmf(n, p, j));
}

/** Keep the states below the target; finishing is an absorbing state. */
function convolve(a: Float64Array, b: Float64Array): Float64Array {
  const out = new Float64Array(a.length);
  for (let i = 0; i < a.length; i++) {
    if (a[i] === 0) continue;
    for (let j = 0; j < b.length - i; j++) out[i + j]! += a[i]! * b[j]!;
  }
  return out;
}

/**
 * Sum independent binomials without subtracting an almost-one miss probability.
 * The direct upper tail is only needed when its mean is < k (k <= 100), so
 * even enormous attempt counts never request an expensive central tail sum.
 */
function chanceBy(
  sources: ScheduledAttemptSource[],
  k: number,
  days: number,
): number {
  if (k === 1) return anySuccess(sources, days);
  // Equal-rate attempts have one binomial count regardless of how the user
  // splits their sources. Keep that identity (and exact symmetric medians).
  const groups: { n: number; p: number }[] = [];
  for (const source of sources) {
    const n = source.attempts * Math.floor(days / source.everyDays);
    if (n === 0) continue;
    const group = groups.find(
      (g) => g.p === source.p && Number.isSafeInteger(g.n + n),
    );
    if (group) group.n += n;
    else groups.push({ n, p: source.p });
  }
  const guaranteed = groups
    .filter((g) => g.p === 1)
    .reduce((sum, g) => sum + g.n, 0);
  if (guaranteed >= k) return 1;
  k -= guaranteed;
  const random = groups.filter((g) => g.p < 1);
  // Complementary Bernoulli pairs, plus any fair coins, have a symmetric
  // count distribution. Preserve the exact 1/2 majority boundary instead
  // of letting floating-point convolution move the median by a whole day.
  const count = random.reduce((sum, g) => sum + g.n, 0);
  if (
    count === 2 * k - 1 &&
    random.every(
      (g) =>
        g.p === 0.5 ||
        random.some(
          (other) =>
            (g.p < 0.5 ? other.p === 1 - g.p : g.p === 1 - other.p) &&
            other.n === g.n,
        ),
    )
  )
    return 0.5;
  let mass = unitMass(k);
  const hitTerms: number[] = [];
  for (const { n, p } of random) {
    const batch = batchMass(n, p, k);
    const tail = new Float64Array(k + 1);
    tail[k] =
      n * p >= k
        ? clampProbability(1 - kahanSum(batch))
        : binomialSurvival(n, p, k);
    for (let r = k - 1; r >= 1; r--) {
      tail[r] = clampProbability(tail[r + 1]! + batch[r]!);
    }
    for (let j = 0; j < k; j++) hitTerms.push(mass[j]! * tail[k - j]!);
    mass = convolve(mass, batch);
  }
  return clampProbability(kahanSum(hitTerms));
}

/**
 * The schedule repeats after L=1 or 7 days. For r remaining copies,
 * E_r = (sum_{d=0}^{L-1} P(Y_d < r) + sum_{j=1}^{r-1} P(Y_L=j) E_{r-j})
 *       / P(Y_L >= 1).
 * This accounts for finishing during a cycle and for multiple copies per day.
 * See docs/MATH.md; no time horizon or simulation truncates this expectation.
 */
function expectedDays(
  sources: ScheduledAttemptSource[],
  k: number,
): number | null {
  const cycle = sources.some((s) => s.everyDays === 7) ? 7 : 1;
  const batches = sources.map((s) => batchMass(s.attempts, s.p, k));
  const elapsed = new Float64Array(k + 1);
  let mass = unitMass(k);
  for (let day = 0; day < cycle; day++) {
    let below = 0;
    for (let r = 1; r <= k; r++) {
      below += mass[r - 1]!;
      elapsed[r]! += below;
    }
    for (let i = 0; i < sources.length; i++) {
      if ((day + 1) % sources[i]!.everyDays === 0)
        mass = convolve(mass, batches[i]!);
    }
  }
  const q = anySuccess(sources, cycle);
  const expected = new Float64Array(k + 1);
  for (let r = 1; r <= k; r++) {
    const terms = [elapsed[r]!];
    for (let j = 1; j < r; j++) {
      // Once the result exceeds double precision, avoid 0 * Infinity.
      if (mass[j]! > 0) terms.push(mass[j]! * expected[r - j]!);
    }
    expected[r] = kahanSum(terms) / q;
    if (!Number.isFinite(expected[r])) return null;
  }
  return expected[k]!;
}

export function validateTimeInput(
  input: TimeToDropInput,
): ScheduledAttemptSource[] {
  const { k } = input;
  if (!Number.isInteger(k) || k < 1 || k > MAX_TIME_COPIES) {
    throw new RangeError(
      `Copies needed must be a whole number from 1 to ${MAX_TIME_COPIES}.`,
    );
  }
  return sourcesFor(input.sources);
}

export function timeToDrop(input: TimeToDropInput): TimeToDropResult {
  const { k } = input;
  const sources = validateTimeInput(input);
  const active = sources.filter((s) => s.p > 0 && s.attempts > 0);
  const possible = active.length > 0;
  const cache = new Map<number, number>();
  function probabilityWithinDays(days: number): number {
    if (!Number.isFinite(days) || days < 0 || days > MAX_TIME_DAYS) {
      throw new RangeError(
        `Days must be between 0 and ${MAX_TIME_DAYS.toLocaleString("en-US")}.`,
      );
    }
    const wholeDays = Math.floor(days);
    if (!possible || wholeDays === 0) return 0;
    let chance = cache.get(wholeDays);
    if (chance === undefined) {
      chance = chanceBy(active, k, wholeDays);
      cache.set(wholeDays, chance);
    }
    return chance;
  }
  function quantile(target: number): number | null {
    if (!possible) return Infinity;
    let hi = 1;
    while (probabilityWithinDays(hi) < target && hi < MAX_TIME_DAYS) {
      hi = Math.min(MAX_TIME_DAYS, hi * 2);
    }
    if (probabilityWithinDays(hi) < target) return null;
    let lo = 0;
    while (lo + 1 < hi) {
      const mid = lo + Math.floor((hi - lo) / 2);
      if (probabilityWithinDays(mid) >= target) hi = mid;
      else lo = mid;
    }
    return hi;
  }
  const daysFor = {
    p50: quantile(0.5),
    p90: quantile(0.9),
    p99: quantile(0.99),
  };
  const mean = possible ? expectedDays(active, k) : Infinity;
  return {
    possible,
    dailySuccessRate: anySuccess(sources, 1),
    totalRunsPerDay: sources.reduce(
      (sum, s) => sum + s.attempts / s.everyDays,
      0,
    ),
    expectedDays: mean,
    expectedHours:
      mean === null || (possible && !Number.isFinite(mean * 24))
        ? null
        : mean * 24,
    daysFor,
    probabilityWithinDays,
    distribution(maxPoints = 200): TimePoint[] {
      if (!Number.isInteger(maxPoints) || maxPoints < 2 || maxPoints > 1000) {
        throw new RangeError("Use between 2 and 1,000 chart points.");
      }
      if (!possible) return [];
      const lastDay = daysFor.p99 ?? MAX_TIME_DAYS;
      const step = Math.max(1, Math.ceil(lastDay / (maxPoints - 1)));
      const points: TimePoint[] = [{ n: 0, fromDay: 0, pmf: 0, cdf: 0 }];
      let previousDay = 0;
      let previousCdf = 0;
      while (previousDay < lastDay) {
        const n = Math.min(lastDay, previousDay + step);
        const cdf = Math.max(previousCdf, probabilityWithinDays(n));
        points.push({
          n,
          fromDay: previousDay + 1,
          pmf: cdf - previousCdf,
          cdf,
        });
        previousDay = n;
        previousCdf = cdf;
      }
      return points;
    },
  };
}

export function timeToDropDistribution(
  sources: TimeToDropInput["sources"],
  k: number,
  maxPoints = 200,
): TimePoint[] {
  return timeToDrop({ sources, k }).distribution(maxPoints);
}
