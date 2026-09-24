/**
 * "Luck tiers" for the shareable luck card: a fun, rarity-flavored label for
 * how extreme a percentile is, in either direction. A run in the 1st
 * percentile (brutally unlucky) is just as shareable as one in the 99th
 * (absurdly lucky), so tiers are symmetric around the median.
 */
export type LuckTier = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type LuckDirection = "lucky" | "unlucky" | "average";

export interface LuckClassification {
  tier: LuckTier;
  direction: LuckDirection;
  /** 0 (median) to 100 (maximally extreme in either direction). */
  extremity: number;
}

const TIER_THRESHOLDS: { max: number; tier: LuckTier }[] = [
  { max: 20, tier: "common" },
  { max: 50, tier: "uncommon" },
  { max: 80, tier: "rare" },
  { max: 95, tier: "epic" },
  { max: Infinity, tier: "legendary" },
];

export function classifyLuck(percentile: number): LuckClassification {
  const clamped = Math.min(100, Math.max(0, percentile));
  const extremity = Math.abs(clamped - 50) * 2;
  const tier =
    TIER_THRESHOLDS.find((t) => extremity < t.max)?.tier ?? "legendary";
  const direction: LuckDirection =
    clamped > 52 ? "lucky" : clamped < 48 ? "unlucky" : "average";
  return { tier, direction, extremity };
}

export const TIER_COLORS: Record<LuckTier, string> = {
  common: "#9aa5b1",
  uncommon: "#3fb950",
  rare: "#3f8ef7",
  epic: "#b366f6",
  legendary: "#f7a83f",
};
