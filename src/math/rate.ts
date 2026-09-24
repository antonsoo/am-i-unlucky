/**
 * Parsing and formatting for drop-rate inputs. Players quote rates in
 * whatever form their game's wiki uses, so we accept the three common
 * spellings and normalize to a probability in (0, 1].
 */

export class RateParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateParseError";
  }
}

/**
 * Parse a rate string in one of these forms:
 *  - fraction: "1/512", "3 / 1024"
 *  - percent:  "0.2%", "1.5 %"
 *  - decimal:  "0.002", "1" (100%), "0"
 * Returns a probability in [0, 1].
 */
export function parseRate(input: string): number {
  const raw = input.trim();
  if (raw.length === 0) {
    throw new RateParseError("Rate cannot be empty.");
  }

  const fractionMatch = /^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/.exec(raw);
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);
    if (denominator === 0) {
      throw new RateParseError("Denominator cannot be zero.");
    }
    return validate(numerator / denominator, raw);
  }

  const percentMatch = /^(\d+(?:\.\d+)?)\s*%$/.exec(raw);
  if (percentMatch) {
    return validate(Number(percentMatch[1]) / 100, raw);
  }

  const decimalMatch = /^\d+(?:\.\d+)?$/.exec(raw);
  if (decimalMatch) {
    return validate(Number(raw), raw);
  }

  throw new RateParseError(
    `Could not parse "${input}" as a rate. Use a fraction (1/512), a percent (0.2%), or a decimal (0.002).`,
  );
}

function validate(p: number, raw: string): number {
  if (!Number.isFinite(p) || p < 0 || p > 1) {
    throw new RateParseError(
      `Rate "${raw}" must resolve to a probability between 0 and 1 (got ${p}).`,
    );
  }
  return p;
}

/** Format a probability back to a human-friendly "1 in N" string when it divides cleanly. */
export function formatRateAsOdds(p: number): string {
  if (p <= 0) return "never";
  if (p >= 1) return "always";
  const n = 1 / p;
  const rounded = Math.round(n);
  if (Math.abs(n - rounded) < 1e-9) {
    return `1 in ${rounded.toLocaleString()}`;
  }
  return `1 in ${n.toFixed(1)}`;
}

/** Format a probability as a percentage string with sensible precision. */
export function formatRateAsPercent(p: number): string {
  const pct = p * 100;
  if (pct === 0) return "0%";
  if (pct >= 1) return `${pct.toPrecision(4).replace(/\.?0+$/, "")}%`;
  // Small rates need more significant digits to not display as "0%".
  return `${pct.toPrecision(2)}%`;
}
