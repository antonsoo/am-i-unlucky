import { classifyLuck, tierLabel } from "../math/tiers.js";
import { esc, fmtNum } from "./format.js";
import { luckVerdict } from "./verdict.js";

/**
 * Renders the signature "luck meter": a verdict headline the reader doesn't
 * have to invert ("Unlucky" / "Lucky" / "About average"), a two-sided rarity
 * gauge centered on "average" with the needle placed by raw percentile, and
 * a rarity badge — all derived from the same `classifyLuck` call, so the
 * badge, the needle's position, and the verdict can never disagree with
 * each other.
 */
export function renderLuckMeter(
  percentile: number,
  contextSentence: string,
): string {
  const { tier, direction } = classifyLuck(percentile);
  const verdict = luckVerdict(percentile);
  const clamped = Math.min(100, Math.max(0, percentile));
  const badge = tierLabel(tier, direction);

  return `
    <div class="luck-verdict">
      <h3 class="luck-verdict-headline luck-${verdict.tone}">${verdict.headline}</h3>
      <p class="luck-verdict-detail">${esc(verdict.detail)}</p>
    </div>
    <div class="luck-meter" role="img" aria-label="Luck percentile: ${clamped.toFixed(1)}, ${esc(badge)}">
      <div class="luck-meter-track">
        <div class="luck-meter-needle" style="left: ${clamped}%;"></div>
      </div>
      <div class="luck-meter-scale">
        <span class="luck-meter-scale-end">Unlucky</span>
        <span class="luck-meter-scale-center">Average</span>
        <span class="luck-meter-scale-end">Lucky</span>
      </div>
    </div>
    <div class="luck-readout">
      <span class="tier-badge ${tier}">${esc(badge)}</span>
      <span class="luck-readout-precise">${fmtNum(clamped, 1)}th percentile — ${esc(contextSentence)}</span>
    </div>
  `;
}
