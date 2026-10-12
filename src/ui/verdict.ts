import type { LuckObservation } from "../math/luck.js";
import { luckPosition } from "../math/luck.js";
import { fmtPercent } from "./format.js";

export interface LuckVerdict {
  headline: "Lucky" | "Unlucky" | "About average" | "Not unlucky yet";
  detail: string;
  tone: "lucky" | "unlucky" | "average";
}

/** Completed histories compare strictly earlier/later outcomes; ties are neither. */
export function luckVerdict(observation: LuckObservation): LuckVerdict {
  if (observation.kind === "waiting") {
    const wouldHaveIt = fmtPercent(observation.completed, 1);
    return observation.completed > 0.6
      ? {
          headline: "Unlucky",
          detail: `${wouldHaveIt} of players would have it by now.`,
          tone: "unlucky",
        }
      : {
          headline: "Not unlucky yet",
          detail: `Only ${wouldHaveIt} of players would have it by now, so still waiting is normal.`,
          tone: "average",
        };
  }
  if (observation.later > 0.6)
    return {
      headline: "Lucky",
      detail: `${fmtPercent(observation.later, 1)} of players would need more attempts than you.`,
      tone: "lucky",
    };
  if (observation.earlier > 0.6)
    return {
      headline: "Unlucky",
      detail: `${fmtPercent(observation.earlier, 1)} of players would have gotten it sooner.`,
      tone: "unlucky",
    };
  return {
    headline: "About average",
    detail: "Same-attempt finishes are ties, not faster or slower outcomes.",
    tone: "average",
  };
}

/** A waiting player never sits on the lucky side; completed ties form a band. */
export const meterPercentile = luckPosition;

/** The same evidence labels are used by the accessible UI and exported card. */
export function comparisonRows(
  observation: LuckObservation,
): { label: string; value: string }[] {
  return observation.kind === "completed"
    ? [
        { label: "Finished sooner", value: fmtPercent(observation.earlier, 1) },
        { label: "Same attempt", value: fmtPercent(observation.tied, 1) },
        { label: "Took longer", value: fmtPercent(observation.later, 1) },
      ]
    : [
        {
          label: "Finished by now",
          value: fmtPercent(observation.completed, 1),
        },
        {
          label: "Still waiting too",
          value: fmtPercent(observation.waiting, 1),
        },
      ];
}
