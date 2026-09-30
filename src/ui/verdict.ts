/**
 * The headline verdict ("Unlucky" / "Lucky" / "About average"): the answer
 * to the site's own question, stated directly rather than left for the
 * reader to infer from a bare percentile. This is deliberately a coarser,
 * independent threshold from the five-tier rarity badge in
 * `src/math/tiers.ts` (roughly the 40th-60th percentile reads as "About
 * average" here) — the headline says *which way* and *by how much*, the
 * badge says *how rare*.
 */
import { fmtNum } from "./format.js";

export interface LuckVerdict {
  headline: "Lucky" | "Unlucky" | "About average" | "Not unlucky yet";
  detail: string;
  /** Stable, non-localized key for styling — don't string-match `headline` for this. */
  tone: "lucky" | "unlucky" | "average";
}

/**
 * `percentile` is 100 × P(needing more attempts than n). For a player who got
 * the drop on attempt n (`finished`), that is the share of players they beat.
 * A player still waiting after n attempts will need more than n, so the same
 * number is only the best case (the drop coming on the very next attempt):
 * they can be called unlucky once most players would have it by now, but
 * never lucky.
 */
export function luckVerdict(percentile: number, finished = true): LuckVerdict {
  const clamped = Math.min(100, Math.max(0, percentile));
  if (!finished) {
    const wouldHaveIt = fmtNum(100 - clamped, 1);
    return clamped < 40
      ? {
          headline: "Unlucky",
          detail: `${wouldHaveIt}% of players would have it by now.`,
          tone: "unlucky",
        }
      : {
          headline: "Not unlucky yet",
          detail: `Only ${wouldHaveIt}% of players would have it by now, so still waiting is normal.`,
          tone: "average",
        };
  }
  if (clamped > 60) {
    return {
      headline: "Lucky",
      detail: `You beat ${fmtNum(clamped, 1)}% of players.`,
      tone: "lucky",
    };
  }
  if (clamped < 40) {
    return {
      headline: "Unlucky",
      detail: `${fmtNum(100 - clamped, 1)}% of players would have gotten it sooner.`,
      tone: "unlucky",
    };
  }
  return {
    headline: "About average",
    detail: "Right in the middle of the pack.",
    tone: "average",
  };
}

/** Where the meter's needle and badge go: a player still waiting can't sit on the lucky side. */
export function meterPercentile(percentile: number, finished = true): number {
  const clamped = Math.min(100, Math.max(0, percentile));
  return finished ? clamped : Math.min(clamped, 50);
}
