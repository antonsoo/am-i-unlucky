import { classifyLuck, tierLabel } from "../math/tiers.js";
import { esc, fmtOrdinal } from "./format.js";
import { luckVerdict, meterPercentile } from "./verdict.js";

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
  finished = true,
  /** For a player still waiting: the percentile if it comes on the next attempt. */
  bestCase = percentile,
): string {
  const reading = finished ? percentile : bestCase;
  const shown = meterPercentile(reading, finished);
  const { tier, direction } = classifyLuck(shown);
  const verdict = luckVerdict(percentile, finished);
  const clamped = Math.min(100, Math.max(0, reading));
  const badge = tierLabel(tier, direction);
  const precise = finished
    ? `${fmtOrdinal(clamped, 1)} percentile`
    : `At best the ${fmtOrdinal(clamped, 1)} percentile, if it comes on your next attempt`;

  return `
    <div class="luck-verdict">
      <h3 class="luck-verdict-headline luck-${verdict.tone}">${verdict.headline}</h3>
      <p class="luck-verdict-detail">${esc(verdict.detail)}</p>
    </div>
    <div class="luck-meter" role="img" aria-label="Luck percentile: ${finished ? "" : "at best "}${clamped.toFixed(1)}, ${esc(badge)}">
      <div class="luck-meter-track">
        <div class="luck-meter-needle" style="left: ${shown}%;"></div>
      </div>
      <div class="luck-meter-scale">
        <span class="luck-meter-scale-end">Unlucky</span>
        <span class="luck-meter-scale-center">Average</span>
        <span class="luck-meter-scale-end">Lucky</span>
      </div>
    </div>
    <div class="luck-readout">
      <span class="tier-badge ${tier}">${esc(badge)}</span>
      <span class="luck-readout-precise">${esc(precise)} — ${esc(contextSentence)}</span>
    </div>
  `;
}
