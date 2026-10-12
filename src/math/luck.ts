/** Discrete completion evidence, not an arbitrarily chosen rank among ties. */
export interface CompletedLuck {
  kind: "completed";
  /** P(T < n), P(T = n), P(T > n), respectively. */
  earlier: number;
  tied: number;
  later: number;
}

/** A censored history only establishes that completion takes more than n. */
export interface WaitingLuck {
  kind: "waiting";
  /** P(T <= n) and P(T > n), respectively. */
  completed: number;
  waiting: number;
}

export type LuckObservation = CompletedLuck | WaitingLuck;

/**
 * Ties occupy [P(T > n), P(T >= n)] in the reversed rank distribution.
 * Choose the point nearest the median for a conservative meter/rarity label.
 * This is a display position, not a unique percentile assigned within ties.
 * On either side, rarity therefore uses an inclusive tail: the probability
 * of finishing this soon or sooner, or taking this long or longer.
 */
export function luckPosition(observation: LuckObservation): number {
  if (observation.kind === "waiting")
    return Math.min(50, 100 * observation.waiting);
  const low = 100 * observation.later;
  const high = Math.min(100, 100 * (observation.later + observation.tied));
  return Math.max(low, Math.min(50, high));
}
