/** Renders the shareable "luck card" PNG onto a canvas. */
import {
  classifyLuck,
  tierLabel,
  TIER_COLORS,
  type LuckTier,
} from "../math/tiers.js";

export interface LuckCardData {
  headline: string;
  percentile: number;
  modeLabel: string;
  detail: string;
}

const W = 1080;
const H = 1350;

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

  const { tier, direction } = classifyLuck(data.percentile);
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
  ctx.fillStyle = "#767ca3";
  ctx.font = "500 26px 'IBM Plex Mono', monospace";
  ctx.fillText(data.modeLabel.toUpperCase(), W / 2, 200);

  // Tier badge.
  ctx.font = "800 64px 'Bricolage Grotesque', sans-serif";
  ctx.fillStyle = tierColor;
  ctx.fillText(tier.toUpperCase(), W / 2, 330);

  // Big percentile number.
  ctx.font = "700 220px 'IBM Plex Mono', monospace";
  ctx.fillStyle = "#f5f6fb";
  const numberText = `${Math.round(data.percentile)}%`;
  ctx.fillText(numberText, W / 2, 620);

  // Headline sentence.
  ctx.font = "500 42px 'IBM Plex Sans', sans-serif";
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
  ctx.font = "500 26px 'IBM Plex Mono', monospace";
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
