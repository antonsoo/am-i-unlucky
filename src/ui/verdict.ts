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
  headline: "Lucky" | "Unlucky" | "About average";
  detail: string;
  /** Stable, non-localized key for styling — don't string-match `headline` for this. */
  tone: "lucky" | "unlucky" | "average";
}

export function luckVerdict(percentile: number): LuckVerdict {
  const clamped = Math.min(100, Math.max(0, percentile));
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
