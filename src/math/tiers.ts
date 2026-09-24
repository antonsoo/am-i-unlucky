/**
 * "Luck tiers" for the luck meter and the shareable luck card: a fun,
 * rarity-flavored label for how extreme a percentile is, in either
 * direction. A run in the 1st percentile (brutally unlucky) is just as
 * shareable as one in the 99th (absurdly lucky), so tiers are symmetric
 * around the median — a tier is about how far into a *tail* you are, not
 * which tail.
 *
 * The tier boundaries are nested percentile bands, working outward from the
 * median: the middle 50% of outcomes (25th-75th percentile) is "common",
 * the next 25 points out on either side is "uncommon", then 10, then 2,
 * then the outermost 0.5% is "legendary". Concretely, using `tailPercent`
 * (how far you are from the *nearer* edge of the distribution, 0 = the most
 * extreme possible outcome, 50 = dead center):
 *
 *   legendary  tailPercent <= 0.5   (top/bottom 0.5%)
 *   epic       tailPercent <= 2     (top/bottom 2%)
 *   rare       tailPercent <= 10    (top/bottom 10%)
 *   uncommon   tailPercent <= 25    (top/bottom 25%)
 *   common     otherwise            (the middle 50%)
 */
export type LuckTier = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type LuckDirection = "lucky" | "unlucky" | "average";

export interface LuckClassification {
  tier: LuckTier;
  direction: LuckDirection;
  /** How far from the nearer edge of the distribution, in percentile points: 0 = most extreme, 50 = dead center. */
  tailPercent: number;
}

/** Ascending by extremity: the first threshold whose bound isn't exceeded wins. */
const TIER_THRESHOLDS: { tailAtMost: number; tier: LuckTier }[] = [
  { tailAtMost: 0.5, tier: "legendary" },
  { tailAtMost: 2, tier: "epic" },
  { tailAtMost: 10, tier: "rare" },
  { tailAtMost: 25, tier: "uncommon" },
  { tailAtMost: 50, tier: "common" },
];

export function classifyLuck(percentile: number): LuckClassification {
  const clamped = Math.min(100, Math.max(0, percentile));
  const tailPercent = Math.min(clamped, 100 - clamped);
  const tier =
    TIER_THRESHOLDS.find((t) => tailPercent <= t.tailAtMost)?.tier ?? "common";
  const direction: LuckDirection =
    clamped > 50 ? "lucky" : clamped < 50 ? "unlucky" : "average";
  return { tier, direction, tailPercent };
}

/** "Rare bad luck", "Epic good luck", "Common" (the tier badge text — direction only matters once you leave "common"). */
export function tierLabel(tier: LuckTier, direction: LuckDirection): string {
  if (tier === "common") return "Common";
  const word = tier.charAt(0).toUpperCase() + tier.slice(1);
  return `${word} ${direction === "unlucky" ? "bad luck" : "good luck"}`;
}

export const TIER_COLORS: Record<LuckTier, string> = {
  common: "#9aa5b1",
  uncommon: "#3fb950",
  rare: "#3f8ef7",
  epic: "#b366f6",
  legendary: "#f7a83f",
};
