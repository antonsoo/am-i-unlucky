/** Formatting helpers shared by all mode panels. */

export function fmtInt(n: number): string {
  if (!Number.isFinite(n)) return "∞"; // ∞
  return Math.round(n).toLocaleString("en-US");
}

export function fmtNum(n: number, digits = 1): string {
  if (Number.isNaN(n)) return "—";
  if (!Number.isFinite(n)) return "∞";
  return n.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}

/** `fmtNum` with an English ordinal suffix from its last digits: 71st, 12th, 17.2nd, 99.9th. */
export function fmtOrdinal(n: number, digits = 1): string {
  const text = fmtNum(n, digits);
  const lastTwo = text.replace(/\D/g, "").slice(-2);
  const last = lastTwo.slice(-1);
  if (lastTwo.length === 2 && lastTwo.startsWith("1")) return `${text}th`;
  if (last === "1") return `${text}st`;
  if (last === "2") return `${text}nd`;
  if (last === "3") return `${text}rd`;
  return `${text}th`;
}

export function fmtPercent(p: number, digits = 2): string {
  if (Number.isNaN(p)) return "—";
  const v = p * 100;
  if (v > 0 && v < Math.pow(10, -digits)) return `<${Math.pow(10, -digits)}%`;
  return `${v.toLocaleString("en-US", { maximumFractionDigits: digits })}%`;
}

export function fmtDays(days: number): string {
  if (!Number.isFinite(days)) return "∞";
  if (days === 1) return "1 day";
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
