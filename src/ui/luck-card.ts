/** Renders the shareable "luck card" PNG onto a canvas. */
import {
  classifyLuck,
  tierLabel,
  TIER_COLORS,
  type LuckTier,
} from "../math/tiers.js";

import type { LuckObservation } from "../math/luck.js";
import { comparisonRows, luckVerdict, meterPercentile } from "./verdict.js";

export interface LuckCardData {
  headline: string;
  observation: LuckObservation;
  modeLabel: string;
  detail: string;
}

const W = 1080;
const H = 1350;

let fontsReady: Promise<void> | undefined;

/** Request the card faces during page load, before a later offline export. */
export function prepareLuckCardFonts(): Promise<void> {
  fontsReady ??= Promise.allSettled(
    [
      "800 64px 'Bricolage Grotesque'",
      "600 78px 'IBM Plex Mono'",
      "400 42px 'IBM Plex Sans'",
    ].map((font) => document.fonts.load(font, "Aa09%.,/<>—")),
  ).then(() => undefined); // Failed faces use fallback after every load has settled.
  return fontsReady;
}

const TIER_GLOW: Record<LuckTier, string> = {
  common: "#3a3f55",
  uncommon: "#0f3d2c",
  rare: "#0f2b57",
  epic: "#3b1259",
  legendary: "#5a3c06",
};

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function renderLuckCard(
  canvas: HTMLCanvasElement,
  data: LuckCardData,
): void {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.setAttribute("role", "img");
  canvas.setAttribute(
    "aria-label",
    `${data.headline} ${comparisonRows(data.observation)
      .map((row) => `${row.label}: ${row.value}`)
      .join(". ")}`,
  );

  const { tier, direction } = classifyLuck(meterPercentile(data.observation));
  const tierColor = TIER_COLORS[tier];
  const glow = TIER_GLOW[tier];

  // Background: deep ink base with a radial glow in the tier color.
  ctx.fillStyle = "#0f1120";
  ctx.fillRect(0, 0, W, H);
  const radial = ctx.createRadialGradient(
    W / 2,
    H * 0.36,
    40,
    W / 2,
    H * 0.36,
    W * 0.85,
  );
  radial.addColorStop(0, glow);
  radial.addColorStop(1, "#0f1120");
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, W, H);

  // Card border.
  ctx.strokeStyle = tierColor;
  ctx.lineWidth = 6;
  roundRect(ctx, 40, 40, W - 80, H - 80, 36);
  ctx.stroke();

  // Eyebrow.
  ctx.fillStyle = "#aab0d6";
  ctx.font = "600 30px 'IBM Plex Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText("AM I UNLUCKY?", W / 2, 160);
  ctx.fillStyle = "#848aad";
  ctx.font = "600 26px 'IBM Plex Mono', monospace";
  ctx.fillText(data.modeLabel.toUpperCase(), W / 2, 200);

  // Tier badge.
  ctx.font = "800 64px 'Bricolage Grotesque', sans-serif";
  ctx.fillStyle = tierColor;
  ctx.fillText(tier.toUpperCase(), W / 2, 330);

  // A completed run has three disjoint outcomes. A censored run has two.
  // Never promote the strict-later share to a unique rank among tied players.
  const rows = comparisonRows(data.observation);
  const column = (W - 120) / rows.length;
  rows.forEach((row, index) => {
    const x = 60 + column * (index + 0.5);
    ctx.font = "600 78px 'IBM Plex Mono', monospace";
    ctx.fillStyle = "#f5f6fb";
    ctx.fillText(row.value, x, 555, column - 20);
    ctx.font = "600 22px 'IBM Plex Mono', monospace";
    ctx.fillStyle = "#aab0d6";
    ctx.fillText(row.label.toUpperCase(), x, 610, column - 12);
  });
  ctx.font = "600 30px 'IBM Plex Mono', monospace";
  ctx.fillStyle = "#aab0d6";
  ctx.fillText(
    luckVerdict(data.observation).headline.toUpperCase(),
    W / 2,
    680,
  );

  // Headline sentence.
  ctx.font = "400 42px 'IBM Plex Sans', sans-serif";
  ctx.fillStyle = "#edeffb";
  wrapText(ctx, data.headline, W / 2, 760, W - 200, 52);

  // Tier + direction, spelled out the same way the in-app badge does
  // ("rare bad luck", "epic good luck", "common") so the card never
  // disagrees with what the page just showed.
  ctx.font = "600 30px 'IBM Plex Mono', monospace";
  ctx.fillStyle = "#aab0d6";
  ctx.fillText(tierLabel(tier, direction).toLowerCase(), W / 2, 900);

  // Detail line.
  ctx.font = "400 28px 'IBM Plex Sans', sans-serif";
  ctx.fillStyle = "#8288a3";
  wrapText(ctx, data.detail, W / 2, 1010, W - 220, 38);

  // Footer.
  ctx.font = "600 26px 'IBM Plex Mono', monospace";
  ctx.fillStyle = "#565b78";
  ctx.fillText("am-i-unlucky — exact drop-rate & pity math", W / 2, H - 90);
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void {
  const words = text.split(" ");
  let line = "";
  let cursorY = y;
  const lines: string[] = [];
  for (const word of words) {
    const test = line.length > 0 ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line.length > 0) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line.length > 0) lines.push(line);
  for (const l of lines.slice(0, 3)) {
    ctx.fillText(l, cx, cursorY);
    cursorY += lineHeight;
  }
}
