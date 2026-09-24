import { negativeBinomialDistribution, simpleDrop } from "../../math/simple.js";
import {
  formatRateAsOdds,
  formatRateAsPercent,
  parseRate,
  RateParseError,
} from "../../math/rate.js";
import type { AppState } from "../app-state.js";
import { debounce } from "../debounce.js";
import { esc, fmtInt, fmtNum, fmtPercent } from "../format.js";
import { renderLuckMeter } from "../luck-meter.js";
import { renderDistributionChart } from "../chart.js";
import { SIMPLE_PRESETS } from "../../presets.js";
import type { LuckCardData } from "../luck-card.js";

export interface ModeContext {
  onStateChange: () => void;
  openLuckCard: (data: LuckCardData) => void;
}

export function mountSimpleMode(
  root: HTMLElement,
  state: AppState,
  ctx: ModeContext,
): void {
  const s = state.simple;

  root.innerHTML = `
    <div class="workspace">
      <div>
        <section class="panel">
          <h2 class="panel-title">Inputs</h2>
          <p class="panel-subtitle">A fixed per-attempt rate, no pity. Works for shiny hunts, loot boxes, rare drops.</p>
          <div class="field">
            <label class="field-label" for="simple-rate">Drop rate <span class="field-hint">1/512, 0.2%, or 0.002</span></label>
            <input type="text" id="simple-rate" value="${esc(s.rate)}" inputmode="decimal" autocomplete="off" />
            <div class="field-error" id="simple-rate-error"></div>
          </div>
          <div class="field-row">
            <div class="field">
              <label class="field-label" for="simple-n">Attempts made</label>
              <input type="number" id="simple-n" min="0" step="1" value="${s.n}" />
            </div>
            <div class="field">
              <label class="field-label" for="simple-k">Copies needed</label>
              <input type="number" id="simple-k" min="1" step="1" value="${s.k}" />
            </div>
          </div>
        </section>
        <section class="panel">
          <h2 class="panel-title">Presets</h2>
          <div class="preset-list">
            ${SIMPLE_PRESETS.map(
              (p) => `
              <button type="button" class="preset-chip" data-preset="${p.id}">
                <span class="preset-chip-name">${esc(p.label)}</span>
                <span class="preset-chip-desc">${esc(p.description)}</span>
              </button>`,
            ).join("")}
          </div>
        </section>
      </div>
      <div id="simple-results"></div>
    </div>
  `;

  const rateInput = root.querySelector<HTMLInputElement>("#simple-rate")!;
  const nInput = root.querySelector<HTMLInputElement>("#simple-n")!;
  const kInput = root.querySelector<HTMLInputElement>("#simple-k")!;
  const errorEl = root.querySelector<HTMLDivElement>("#simple-rate-error")!;
  const resultsEl = root.querySelector<HTMLDivElement>("#simple-results")!;

  function recompute(): void {
    let p: number;
    try {
      p = parseRate(rateInput.value);
      errorEl.textContent = "";
    } catch (err) {
      errorEl.textContent =
        err instanceof RateParseError ? err.message : "Invalid rate.";
      resultsEl.innerHTML = `<section class="panel"><p class="note">Fix the rate above to see results.</p></section>`;
      return;
    }
    const n = Math.max(0, Math.floor(Number(nInput.value) || 0));
    const k = Math.max(1, Math.floor(Number(kInput.value) || 1));
    s.rate = rateInput.value;
    s.n = n;
    s.k = k;

    const result = simpleDrop({ p, n, k });
    // p=0 and p=1 are degenerate: everyone gets the same outcome (never, or
    // always on the k-th attempt), so a percentile against "other players"
    // is meaningless rather than 0% or 100% — show a plain note instead of
    // letting the luck meter imply an (unearned) verdict.
    const isDegenerate = p <= 0 || p >= 1;
    const showPercentile = n >= 1 && !isDegenerate;
    const oddsLabel = formatRateAsOdds(p);
    const pctLabel = formatRateAsPercent(p);

    let luckHtml: string;
    if (isDegenerate) {
      luckHtml =
        p <= 0
          ? `<p class="note">A 0% rate never succeeds, no matter how many attempts you make — there's no meaningful luck percentile here.</p>`
          : `<p class="note">A 100% rate always succeeds immediately — every player gets the same result, so there's no luck involved.</p>`;
    } else if (showPercentile) {
      luckHtml = renderLuckMeter(
        result.luckPercentile,
        `based on ${fmtInt(n)} attempts at ${oddsLabel} (${pctLabel}) odds needing ${k} cop${k === 1 ? "y" : "ies"}`,
      );
    } else {
      luckHtml = `<p class="note">Enter at least 1 attempt to see your luck percentile.</p>`;
    }

    const points = negativeBinomialDistribution(k, p, 220);
    const chartHtml = renderDistributionChart(
      points.map((pt) => ({ x: pt.n, pmf: pt.pmf, cdf: pt.cdf })),
      "attempts",
      [
        { x: result.attemptsFor.p50, label: "50%" },
        { x: result.attemptsFor.p90, label: "90%" },
        { x: result.attemptsFor.p99, label: "99%" },
      ],
    );

    resultsEl.innerHTML = `
      <section class="panel">
        <h2 class="panel-title">Your luck</h2>
        <p class="panel-subtitle">Based on the negative-binomial distribution for ${k} success${k === 1 ? "" : "es"} at ${esc(oddsLabel)} odds.</p>
        ${luckHtml}
        <div class="stat-grid">
          <div class="stat-tile">
            <div class="stat-tile-label">P(at least ${k} by ${fmtInt(n)})</div>
            <div class="stat-tile-value">${fmtPercent(result.probabilityAtLeastK)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">Expected attempts</div>
            <div class="stat-tile-value">${fmtNum(result.expectedAttempts, 1)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">50% by</div>
            <div class="stat-tile-value">${fmtInt(result.attemptsFor.p50)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">90% by</div>
            <div class="stat-tile-value">${fmtInt(result.attemptsFor.p90)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">99% by</div>
            <div class="stat-tile-value">${fmtInt(result.attemptsFor.p99)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">Std. deviation</div>
            <div class="stat-tile-value">${fmtNum(result.stdDevAttempts, 1)}</div>
          </div>
        </div>
        ${
          showPercentile
            ? `<button type="button" class="btn btn-primary" id="simple-export" style="margin-top:16px;">Export luck card</button>`
            : ""
        }
      </section>
      <section class="panel">
        <h2 class="panel-title">Distribution</h2>
        <p class="panel-subtitle">Probability mass (area) and cumulative probability (line) over attempts, with the 50/90/99% marks.</p>
        <div class="chart-wrap">${chartHtml}</div>
      </section>
      <section class="panel">
        <details class="callout">
          <summary>What's "bad luck protection", and why doesn't simple mode have it?</summary>
          <p>Bad luck protection (pity) means the odds change based on how many attempts you've made without success — usually ramping up toward a guarantee. A plain drop rate like this one is <strong>memoryless</strong>: attempt 900 has exactly the same ${esc(pctLabel)} chance as attempt 1, no matter how long you've gone without a drop. If a game promises a guarantee after N tries, that's a different system — model it in <strong>Pity system</strong> mode instead.</p>
        </details>
      </section>
    `;

    const exportBtn =
      resultsEl.querySelector<HTMLButtonElement>("#simple-export");
    exportBtn?.addEventListener("click", () => {
      ctx.openLuckCard({
        headline: `Took ${fmtInt(n)} attempts at ${oddsLabel} odds for ${k} cop${k === 1 ? "y" : "ies"}.`,
        percentile: result.luckPercentile,
        modeLabel: "Simple drop",
        detail: `P(at least ${k} by ${fmtInt(n)}) = ${fmtPercent(result.probabilityAtLeastK)}. Expected ${fmtNum(result.expectedAttempts, 0)} attempts.`,
      });
    });

    ctx.onStateChange();
  }

  const debouncedRecompute = debounce(recompute, 120);
  rateInput.addEventListener("input", debouncedRecompute);
  nInput.addEventListener("input", debouncedRecompute);
  kInput.addEventListener("input", debouncedRecompute);

  root.querySelectorAll<HTMLButtonElement>("[data-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const preset = SIMPLE_PRESETS.find((p) => p.id === btn.dataset.preset);
      if (!preset) return;
      rateInput.value = preset.rate;
      recompute();
    });
  });

  recompute();
}
