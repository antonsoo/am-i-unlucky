/**
 * A small hand-rolled SVG chart: pmf as a filled area (left axis, scaled to
 * its own max) plus cdf as a line (right axis, 0-1). No charting dependency
 * — this is the only visualization the app needs, and keeping it inline SVG
 * keeps the bundle tiny and the colors trivially theme-aware via CSS vars.
 */
export interface ChartPoint {
  x: number;
  pmf: number;
  cdf: number;
}

export interface ChartMarker {
  x: number;
  label: string;
}

const WIDTH = 640;
const HEIGHT = 260;
const PAD_LEFT = 8;
const PAD_RIGHT = 8;
const PAD_TOP = 14;
const PAD_BOTTOM = 30;

export function renderDistributionChart(
  points: ChartPoint[],
  xLabel: string,
  markers: ChartMarker[] = [],
): string {
  if (points.length < 2) {
    return `<p class="note">Not enough data to chart yet.</p>`;
  }
  const xs = points.map((p) => p.x);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const pmfMax = Math.max(...points.map((p) => p.pmf), 1e-12);

  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const sx = (x: number) =>
    PAD_LEFT + ((x - xMin) / Math.max(1, xMax - xMin)) * plotW;
  const syPmf = (v: number) => PAD_TOP + plotH - (v / pmfMax) * plotH;
  const syCdf = (v: number) => PAD_TOP + plotH - v * plotH;

  const areaPath =
    `M ${sx(points[0]!.x).toFixed(2)} ${(PAD_TOP + plotH).toFixed(2)} ` +
    points
      .map((p) => `L ${sx(p.x).toFixed(2)} ${syPmf(p.pmf).toFixed(2)}`)
      .join(" ") +
    ` L ${sx(points[points.length - 1]!.x).toFixed(2)} ${(PAD_TOP + plotH).toFixed(2)} Z`;

  const cdfPath = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${sx(p.x).toFixed(2)} ${syCdf(p.cdf).toFixed(2)}`,
    )
    .join(" ");

  const markerLines = markers
    .filter((m) => m.x >= xMin && m.x <= xMax)
    .map((m) => {
      const x = sx(m.x).toFixed(2);
      return `<line x1="${x}" y1="${PAD_TOP}" x2="${x}" y2="${PAD_TOP + plotH}" class="chart-marker" />
        <text x="${x}" y="${PAD_TOP - 2}" class="chart-marker-label" text-anchor="middle">${m.label}</text>`;
    })
    .join("");

  const xTicks: { value: number; anchor: string }[] = [
    { value: xMin, anchor: "start" },
    { value: Math.round((xMin + xMax) / 2), anchor: "middle" },
    { value: xMax, anchor: "end" },
  ];
  const xTickLabels = xTicks
    .map(
      (t) =>
        `<text x="${sx(t.value).toFixed(2)}" y="${HEIGHT - 8}" class="chart-axis-label" text-anchor="${t.anchor}">${t.value.toLocaleString(
          "en-US",
        )}</text>`,
    )
    .join("");

  return `
  <svg viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="Distribution chart over ${xLabel}" class="chart-svg">
    <style>
      .chart-svg { width: 100%; height: auto; font-family: var(--font-mono, monospace); }
      .chart-area { fill: color-mix(in srgb, var(--accent, #4a63e0) 28%, transparent); }
      .chart-cdf { fill: none; stroke: var(--legendary, #b8790a); stroke-width: 2; }
      .chart-axis-label { fill: var(--ink-faint, #8288a3); font-size: 10px; }
      .chart-marker { stroke: var(--ink-faint, #8288a3); stroke-width: 1; stroke-dasharray: 3 3; }
      .chart-marker-label { fill: var(--ink-dim, #565b78); font-size: 9px; }
      .chart-baseline { stroke: var(--border, #d7dbe8); stroke-width: 1; }
    </style>
    <line x1="${PAD_LEFT}" y1="${PAD_TOP + plotH}" x2="${WIDTH - PAD_RIGHT}" y2="${PAD_TOP + plotH}" class="chart-baseline" />
    <path d="${areaPath}" class="chart-area" />
    <path d="${cdfPath}" class="chart-cdf" />
    ${markerLines}
    ${xTickLabels}
    <text x="${WIDTH / 2}" y="${HEIGHT}" class="chart-axis-label" text-anchor="middle">${xLabel}</text>
  </svg>`;
}
