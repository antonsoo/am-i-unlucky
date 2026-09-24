import {
  pityDistribution,
  pityDistributionPoints,
  pityLuckPercentile,
  summarizePity,
} from "../../math/pity.js";
import type { AppState } from "../app-state.js";
import { debounce } from "../debounce.js";
import { esc, fmtInt, fmtNum, fmtPercent } from "../format.js";
import { renderLuckMeter } from "../luck-meter.js";
import { renderDistributionChart } from "../chart.js";
import { PITY_PRESETS } from "../../presets.js";
import type { ModeContext } from "./simple.js";

export function mountPityMode(
  root: HTMLElement,
  state: AppState,
  ctx: ModeContext,
): void {
  const s = state.pity;

  root.innerHTML = `
    <div class="workspace">
      <div>
        <section class="panel">
          <h2 class="panel-title">Pity configuration</h2>
          <p class="panel-subtitle">Soft pity ramps the rate linearly; hard pity guarantees a hit.</p>
          <div class="field-row">
            <div class="field">
              <label class="field-label" for="pity-base">Base rate</label>
              <input type="text" id="pity-base" value="${fmtPct(s.baseRate)}" />
            </div>
            <div class="field">
              <label class="field-label" for="pity-hard">Hard pity (pull #)</label>
              <input type="number" id="pity-hard" min="1" step="1" value="${s.hardPity}" />
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label class="field-label" for="pity-soft">Soft pity starts at pull</label>
              <input type="number" id="pity-soft" min="1" step="1" value="${s.softPityStart}" />
            </div>
            <div class="field">
              <label class="field-label" for="pity-inc">Ramp per pull</label>
              <input type="text" id="pity-inc" value="${fmtPct(s.softPityIncrement)}" />
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label class="field-label" for="pity-feat">Featured rate</label>
              <input type="text" id="pity-feat" value="${fmtPct(s.featuredRate)}" />
            </div>
            <div class="field">
              <label class="field-label" style="visibility:hidden">.</label>
              <label class="checkbox-field"><input type="checkbox" id="pity-guar" ${s.hasGuarantee ? "checked" : ""}/> Guarantee after a loss</label>
            </div>
          </div>
        </section>
        <section class="panel">
          <h2 class="panel-title">Your situation</h2>
          <div class="field-row">
            <div class="field">
              <label class="field-label" for="pity-pity0">Current pity counter</label>
              <input type="number" id="pity-pity0" min="0" step="1" value="${s.pity}" />
            </div>
            <div class="field">
              <label class="field-label" style="visibility:hidden">.</label>
              <label class="checkbox-field"><input type="checkbox" id="pity-g0" ${s.guaranteed ? "checked" : ""}/> On guarantee now</label>
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label class="field-label" for="pity-target">Copies wanted</label>
              <input type="number" id="pity-target" min="1" step="1" value="${s.target}" />
            </div>
            <div class="field">
              <label class="field-label" for="pity-budget">Pull budget</label>
              <input type="number" id="pity-budget" min="0" step="1" value="${s.budget}" />
            </div>
          </div>
          <div class="field">
            <label class="field-label" for="pity-actual">"How lucky was my history?" — pulls it actually took <span class="field-hint">optional</span></label>
            <input type="number" id="pity-actual" min="0" step="1" value="${s.actualPulls}" />
          </div>
        </section>
        <section class="panel">
          <h2 class="panel-title">Presets</h2>
          <div class="preset-list">
            ${PITY_PRESETS.map(
              (p) => `
              <button type="button" class="preset-chip" data-preset="${p.id}">
                <span class="preset-chip-name">${esc(p.label)}</span>
                <span class="preset-chip-desc">${esc(p.description)}</span>
              </button>`,
            ).join("")}
          </div>
        </section>
      </div>
      <div id="pity-results"></div>
    </div>
  `;

  const els = {
    base: root.querySelector<HTMLInputElement>("#pity-base")!,
    hard: root.querySelector<HTMLInputElement>("#pity-hard")!,
    soft: root.querySelector<HTMLInputElement>("#pity-soft")!,
    inc: root.querySelector<HTMLInputElement>("#pity-inc")!,
    feat: root.querySelector<HTMLInputElement>("#pity-feat")!,
    guar: root.querySelector<HTMLInputElement>("#pity-guar")!,
    pity0: root.querySelector<HTMLInputElement>("#pity-pity0")!,
    g0: root.querySelector<HTMLInputElement>("#pity-g0")!,
    target: root.querySelector<HTMLInputElement>("#pity-target")!,
    budget: root.querySelector<HTMLInputElement>("#pity-budget")!,
    actual: root.querySelector<HTMLInputElement>("#pity-actual")!,
  };
  const resultsEl = root.querySelector<HTMLDivElement>("#pity-results")!;

  function parsePct(raw: string, fallback: number): number {
    const trimmed = raw.trim();
    if (trimmed.endsWith("%")) {
      const v = Number(trimmed.slice(0, -1)) / 100;
      return Number.isFinite(v) ? v : fallback;
    }
    const v = Number(trimmed);
    return Number.isFinite(v) ? v : fallback;
  }

  function recompute(): void {
    const hardPity = Math.max(1, Math.floor(Number(els.hard.value) || 1));
    const config = {
      baseRate: Math.min(1, Math.max(0, parsePct(els.base.value, s.baseRate))),
      hardPity,
      softPityStart: Math.min(
        hardPity,
        Math.max(1, Math.floor(Number(els.soft.value) || 1)),
      ),
      softPityIncrement: Math.max(
        0,
        parsePct(els.inc.value, s.softPityIncrement),
      ),
      featuredRate: Math.min(
        1,
        Math.max(0, parsePct(els.feat.value, s.featuredRate)),
      ),
      hasGuarantee: els.guar.checked,
    };
    const pity0 = Math.min(
      hardPity - 1,
      Math.max(0, Math.floor(Number(els.pity0.value) || 0)),
    );
    const target = Math.max(1, Math.floor(Number(els.target.value) || 1));
    const budget = Math.max(0, Math.floor(Number(els.budget.value) || 0));
    const actualPulls = Math.max(0, Math.floor(Number(els.actual.value) || 0));

    Object.assign(s, config, {
      pity: pity0,
      guaranteed: els.g0.checked,
      target,
      budget,
      actualPulls,
    });

    let dist;
    try {
      dist = pityDistribution(
        config,
        { pity: pity0, guaranteed: els.g0.checked },
        target,
      );
    } catch (err) {
      resultsEl.innerHTML = `<section class="panel"><p class="note">${esc(err instanceof Error ? err.message : "Invalid configuration.")}</p></section>`;
      return;
    }
    const summary = summarizePity(dist);
    const withinBudget = summary.probabilityWithinBudget(budget);
    const historyPercentile = pityLuckPercentile(dist, actualPulls);

    const points = pityDistributionPoints(dist, 220);
    const chartHtml = renderDistributionChart(
      points.map((pt) => ({ x: pt.pulls, pmf: pt.pmf, cdf: pt.cdf })),
      "pulls",
      [
        { x: summary.pullsFor.p50, label: "50%" },
        { x: summary.pullsFor.p90, label: "90%" },
        { x: summary.pullsFor.p99, label: "99%" },
      ],
    );

    const luckHtml = renderLuckMeter(
      historyPercentile,
      `based on ${fmtInt(actualPulls)} pulls chasing ${target} cop${target === 1 ? "y" : "ies"}`,
    );

    resultsEl.innerHTML = `
      <section class="panel">
        <h2 class="panel-title">How lucky was my history?</h2>
        <p class="panel-subtitle">Computed from the exact pull-by-pull distribution, not a simulation.</p>
        ${luckHtml}
        <div class="stat-grid">
          <div class="stat-tile">
            <div class="stat-tile-label">Expected pulls</div>
            <div class="stat-tile-value">${fmtNum(summary.expectedPulls, 1)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">Std. deviation</div>
            <div class="stat-tile-value">${fmtNum(summary.stdDevPulls, 1)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">P(success within ${fmtInt(budget)})</div>
            <div class="stat-tile-value">${fmtPercent(withinBudget)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">50% by</div>
            <div class="stat-tile-value">${fmtInt(summary.pullsFor.p50)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">90% by</div>
            <div class="stat-tile-value">${fmtInt(summary.pullsFor.p90)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">99% by</div>
            <div class="stat-tile-value">${fmtInt(summary.pullsFor.p99)}</div>
          </div>
        </div>
        <button type="button" class="btn btn-primary" id="pity-export" style="margin-top:16px;">Export luck card</button>
      </section>
      <section class="panel">
        <h2 class="panel-title">Distribution</h2>
        <p class="panel-subtitle">
          ${dist.exact ? "Exact — computed via dynamic programming over the pity Markov chain; the shown horizon is a true upper bound." : `Not exactly bounded without the guarantee mechanic, so this truncates at a generous horizon (undistributed tail mass: ${fmtPercent(dist.tailMass, 4)}).`}
        </p>
        <div class="chart-wrap">${chartHtml}</div>
      </section>
      <section class="panel">
        <details class="callout">
          <summary>Why can't I just use E[attempts] = 1/rate here?</summary>
          <p>Because the rate isn't constant. Once you're inside the soft-pity window the per-pull chance climbs every pull, and a lost 50/50 deterministically changes your next roll's odds. Both break the "memoryless" assumption that closed-form geometric/negative-binomial math relies on. This tool instead runs an exact dynamic-programming pass over the pity state machine (pity counter × guarantee flag × copies obtained) — see <a href="https://github.com/antonsoo/am-i-unlucky/blob/main/docs/MATH.md" target="_blank" rel="noopener">docs/MATH.md</a> for the derivation.</p>
        </details>
      </section>
    `;

    const exportBtn =
      resultsEl.querySelector<HTMLButtonElement>("#pity-export");
    exportBtn?.addEventListener("click", () => {
      ctx.openLuckCard({
        headline: `Took ${fmtInt(actualPulls)} pulls for ${target} cop${target === 1 ? "y" : "ies"} under pity.`,
        percentile: historyPercentile,
        modeLabel: "Pity system",
        detail: `Expected ${fmtNum(summary.expectedPulls, 0)} pulls. P(success within ${fmtInt(budget)}) = ${fmtPercent(withinBudget)}.`,
      });
    });

    ctx.onStateChange();
  }

  const debouncedRecompute = debounce(recompute, 150);
  Object.values(els).forEach((el) => {
    el.addEventListener(
      el.type === "checkbox" ? "change" : "input",
      debouncedRecompute,
    );
  });

  root.querySelectorAll<HTMLButtonElement>("[data-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const preset = PITY_PRESETS.find((p) => p.id === btn.dataset.preset);
      if (!preset) return;
      els.base.value = fmtPct(preset.config.baseRate);
      els.hard.value = String(preset.config.hardPity);
      els.soft.value = String(preset.config.softPityStart);
      els.inc.value = fmtPct(preset.config.softPityIncrement);
      els.feat.value = fmtPct(preset.config.featuredRate);
      els.guar.checked = preset.config.hasGuarantee;
      recompute();
    });
  });

  recompute();
}

function fmtPct(p: number): string {
  return `${(p * 100).toString()}%`;
}
