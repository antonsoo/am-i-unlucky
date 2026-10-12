import type { LuckObservation } from "../math/luck.js";
import { classifyLuck, tierLabel } from "../math/tiers.js";
import { esc } from "./format.js";
import { comparisonRows, luckVerdict, meterPercentile } from "./verdict.js";

/** Rank ties stay visible; the rarity label uses the inclusive outcome tail. */
export function renderLuckMeter(
  observation: LuckObservation,
  contextSentence: string,
): string {
  const shown = meterPercentile(observation);
  const { tier, direction } = classifyLuck(shown);
  const verdict = luckVerdict(observation);
  const badge = tierLabel(tier, direction);
  const rows = comparisonRows(observation);
  const description = rows.map((r) => `${r.label}: ${r.value}`).join("; ");
  const completed = observation.kind === "completed";

  return `
    <div class="luck-verdict">
      <h3 class="luck-verdict-headline luck-${verdict.tone}">${verdict.headline}</h3>
      <p class="luck-verdict-detail">${esc(verdict.detail)}</p>
    </div>
    <dl class="luck-comparison">${rows.map((r) => `<div><dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd></div>`).join("")}</dl>
    <div class="luck-meter" role="img" aria-label="${esc(description)}. ${esc(badge)}. ${completed ? "The outlined band includes same-attempt ties; the marker uses the point nearest average." : "No completion time is assumed while you are still waiting."}">
      <div class="luck-meter-track">
        ${completed ? `<div class="luck-meter-ties" style="left: ${100 * observation.later}%; width: ${100 * observation.tied}%;"></div>` : ""}
        <div class="luck-meter-needle" style="left: ${shown}%;"></div>
      </div>
      <div class="luck-meter-scale"><span>Unlucky</span><span class="luck-meter-scale-center">Average</span><span>Lucky</span></div>
    </div>
    <div class="luck-readout">
      <span class="tier-badge ${tier}">${esc(badge)}</span>
      <span class="luck-readout-precise">${esc(contextSentence)}</span>
    </div>
    <p class="field-note">${completed ? "The outlined band includes ties. Rarity counts outcomes at least as extreme as yours, including same-attempt finishes." : "This compares the wait so far; it does not assume the drop arrives on the next attempt."}</p>
  `;
}
