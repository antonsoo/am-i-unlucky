/** Formatting helpers shared by all mode panels. */

export function fmtInt(n: number): string {
  if (!Number.isFinite(n)) return "∞"; // ∞
  return Math.round(n).toLocaleString("en-US");
}

export function fmtNum(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return "∞";
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}

export function fmtPercent(p: number, digits = 2): string {
  if (Number.isNaN(p)) return "—";
  const v = p * 100;
  if (v > 0 && v < Math.pow(10, -digits)) return `<${Math.pow(10, -digits)}%`;
  return `${v.toLocaleString("en-US", { maximumFractionDigits: digits })}%`;
}

export function fmtDays(days: number): string {
  if (!Number.isFinite(days)) return "∞";
  if (days < 1) return `${fmtNum(days * 24, 1)} hours`;
  if (days < 60) return `${fmtNum(days, 1)} days`;
  return `${fmtNum(days / 30.44, 1)} months (${fmtInt(days)} days)`;
}

/** Escape text for safe interpolation into innerHTML template strings. */
export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}
