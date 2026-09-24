import { classifyLuck } from "../math/tiers.js";
import { esc } from "./format.js";

/** Renders the signature "luck meter": a five-tier rarity gauge with a needle and readout. */
export function renderLuckMeter(
  percentile: number,
  headline: string,
  sub: string,
): string {
  const { tier, direction } = classifyLuck(percentile);
  const clamped = Math.min(100, Math.max(0, percentile));
  const directionWord = direction === "average" ? "about average" : direction;

  return `
    <div class="luck-meter" role="img" aria-label="Luck percentile: ${clamped.toFixed(1)}, ${esc(tier)} tier, ${esc(directionWord)}">
      <div class="luck-meter-track">
        <div class="luck-meter-needle" style="left: ${clamped}%;"></div>
      </div>
      <div class="luck-meter-scale">
        <span>Common</span><span>Uncommon</span><span>Rare</span><span>Epic</span><span>Legendary</span>
      </div>
    </div>
    <div class="luck-readout">
      <span class="luck-readout-number" style="color: var(--${tier})">${headline}</span>
      <span class="tier-badge ${tier}">${tier}</span>
    </div>
    <p class="luck-readout-label">${sub}</p>
  `;
}
