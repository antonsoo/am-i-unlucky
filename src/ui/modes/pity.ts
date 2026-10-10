import { runPityPlan } from "../pity-engine.js";
import { validatePityRequest, type PityPlan } from "../pity-plan.js";
import type { PityConfig } from "../../math/pity.js";
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
  let tableId = s.table;
  let pending: AbortController | undefined;
  ctx.signal.addEventListener("abort", () => pending?.abort(), { once: true });
  const activeTable = () =>
    tableId === undefined
      ? undefined
      : PITY_PRESETS.find((p) => p.id === tableId && p.config.rates);

  root.innerHTML = `
    <div class="workspace pity-workspace">
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
          <p class="note" id="pity-table-note" role="status"></p>
        </section>
      </div>
      <div><p id="pity-status" class="field-note" role="status" aria-live="polite"></p><div id="pity-results" aria-busy="false"></div></div>
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
  const statusEl = root.querySelector<HTMLElement>("#pity-status")!;
  const tableNote = root.querySelector<HTMLElement>("#pity-table-note")!;

  function showTableNote(): void {
    const table = activeTable();
    tableNote.textContent = table?.measured
      ? `Using measured per-pull rates (${table.measured.source}, retrieved ${table.measured.retrieved}). The base rate, soft pity and ramp fields are not used while they apply; editing any of them or the hard pity switches back to the curve those fields describe.`
      : "";
    tableNote.hidden = table === undefined;
  }
  showTableNote();

  function number(raw: string): number {
    return raw.trim() === "" ? NaN : Number(raw);
  }
  function parsePct(raw: string): number {
    const trimmed = raw.trim();
    return trimmed.endsWith("%")
      ? number(trimmed.slice(0, -1)) / 100
      : number(trimmed);
  }

  function readInputs() {
    const hardPity = number(els.hard.value);
    const table = activeTable();
    const config: PityConfig = {
      baseRate: parsePct(els.base.value),
      hardPity,
      softPityStart: number(els.soft.value),
      softPityIncrement: parsePct(els.inc.value),
      featuredRate: parsePct(els.feat.value),
      hasGuarantee: els.guar.checked,
      ...(table?.config.rates ? { rates: table.config.rates } : {}),
    };
    const pity0 = number(els.pity0.value);
    const target = number(els.target.value);
    const budget = number(els.budget.value);
    const actualPulls =
      els.actual.value.trim() === "" ? 0 : number(els.actual.value);

    const { rates: _rates, ...stored } = config;
    void _rates;
    if (tableId === undefined) delete s.table;
    else s.table = tableId;
    Object.assign(s, stored, {
      pity: pity0,
      guaranteed: els.g0.checked,
      target,
      budget,
      actualPulls,
    });
    return { config, pity0, target, budget, actualPulls };
  }
  function updateShareAvailability(): void {
    const { config, pity0, target, budget, actualPulls } = readInputs();
    try {
      validatePityRequest({
        config,
        initial: { pity: pity0, guaranteed: els.g0.checked },
        target,
        budget,
        actualPulls,
      });
      ctx.setShareEnabled(true);
    } catch {
      ctx.setShareEnabled(false);
    }
  }
  ctx.registerCapture(updateShareAvailability);

  async function recompute(): Promise<void> {
    pending?.abort();
    const controller = new AbortController();
    pending = controller;
    updateShareAvailability();
    resultsEl.replaceChildren();
    resultsEl.setAttribute("aria-busy", "true");
    statusEl.textContent = "Calculating pity odds...";
    const { config, pity0, target, budget, actualPulls } = readInputs();
    let plan: PityPlan;
    try {
      plan = await runPityPlan(
        {
          config,
          initial: { pity: pity0, guaranteed: els.g0.checked },
          target,
          budget,
          actualPulls,
        },
        controller.signal,
      );
    } catch (err) {
      if (controller.signal.aborted) return;
      resultsEl.innerHTML = `<section class="panel"><p class="note" role="alert">${esc(err instanceof Error ? err.message : "Invalid configuration.")}</p></section>`;
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "btn btn-ghost";
      retry.textContent = "Try again";
      retry.addEventListener("click", () => {
        void recompute();
      });
      resultsEl.firstElementChild?.append(retry);
      resultsEl.setAttribute("aria-busy", "false");
      statusEl.textContent =
        "Calculation unavailable. Check the inputs and try again.";
      return;
    }
    if (controller.signal.aborted) return;
    const { withinBudget, historyPercentile, points } = plan;
    const canRateHistory = historyPercentile !== null && plan.stdDevPulls !== 0;
    const milestone = (value: number | null) =>
      value === null
        ? `>${fmtInt(plan.horizon)}`
        : value === Infinity
          ? "Impossible"
          : fmtInt(value);
    const budgetText =
      withinBudget === null ? "Not calculated" : fmtPercent(withinBudget);
    const tablePreset = activeTable();
    const tableLabel = tablePreset?.measured
      ? `${tablePreset.label} (community data, not the publisher's odds)`
      : "";
    const chartHtml = renderDistributionChart(
      points.map((pt) => ({ x: pt.pulls, pmf: pt.pmf, cdf: pt.cdf })),
      "pulls",
      [
        { x: plan.pullsFor.p50, label: "50%" },
        { x: plan.pullsFor.p90, label: "90%" },
        { x: plan.pullsFor.p99, label: "99%" },
      ].flatMap((marker) =>
        marker.x === null ? [] : [{ ...marker, x: marker.x }],
      ),
    );

    const luckHtml =
      plan.stdDevPulls === 0
        ? `<p class="note">Completion is fixed at ${fmtInt(plan.expectedPulls)} pulls; there is no luck variation under these settings.</p>`
        : historyPercentile === null
          ? `<p class="note">${
              plan.impossible
                ? "The featured item cannot drop with a 0% featured rate and no guarantee."
                : actualPulls === 0
                  ? "Enter the additional pulls you used to assess a completed history."
                  : actualPulls > plan.horizon && !plan.exact
                    ? `History beyond ${fmtInt(plan.horizon)} pulls has not been calculated.`
                    : "That completion time has no recorded probability under these settings; check your history and starting pity."
            }</p>`
          : renderLuckMeter(
              historyPercentile,
              `based on ${fmtInt(actualPulls)} pulls chasing ${target} cop${target === 1 ? "y" : "ies"}`,
            );

    resultsEl.innerHTML = `
      <section class="panel">
        <h2 class="panel-title">How lucky was my history?</h2>
        <p class="panel-subtitle">For additional pulls from the starting pity counter above. The percentile is the share of players taking strictly more pulls; ties are excluded.${tableLabel ? ` Exact for the table in use; the table itself is measured and carries sampling error and bias: ${esc(tableLabel)}.` : ""}</p>
        ${luckHtml}
        <div class="stat-grid">
          <div class="stat-tile">
            <div class="stat-tile-label">Expected pulls</div>
            <div class="stat-tile-value">${fmtNum(plan.expectedPulls, 1)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">Std. deviation</div>
            <div class="stat-tile-value">${fmtNum(plan.stdDevPulls, 1)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">P(success within ${fmtInt(budget)})</div>
            <div class="stat-tile-value">${budgetText}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">50% by</div>
            <div class="stat-tile-value">${milestone(plan.pullsFor.p50)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">90% by</div>
            <div class="stat-tile-value">${milestone(plan.pullsFor.p90)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">99% by</div>
            <div class="stat-tile-value">${milestone(plan.pullsFor.p99)}</div>
          </div>
        </div>
        <p class="field-note">Mean and standard deviation use the full probability model, including the unplotted tail.</p>
        ${!plan.exact && !plan.impossible ? `<p class="note">The distribution is calculated through ${fmtInt(plan.horizon)} pulls; ${fmtPercent(plan.tailMass, 4)} remains after that. A milestone shown as &gt;${fmtInt(plan.horizon)} has not been reached in that calculation. Later budget and history probabilities are not calculated.</p>` : ""}
        <button type="button" class="btn btn-primary" id="pity-export" ${!canRateHistory ? "disabled" : ""} style="margin-top:16px;">Export luck card</button>
      </section>
      <section class="panel">
        <h2 class="panel-title">Distribution</h2>
        <p class="panel-subtitle">
          ${plan.impossible ? "No successful outcome under these settings." : plan.exact ? "Complete finite distribution under these settings." : `Partial distribution through ${fmtInt(plan.horizon)} pulls. Its remaining probability is not redistributed into the plot.`}
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
      if (
        !canRateHistory ||
        historyPercentile === null ||
        controller.signal.aborted
      )
        return;
      ctx.openLuckCard({
        headline: `Took ${fmtInt(actualPulls)} pulls for ${target} cop${target === 1 ? "y" : "ies"} under pity.`,
        percentile: historyPercentile,
        modeLabel: tableLabel ? "Pity system, community data" : "Pity system",
        detail: `Expected ${fmtNum(plan.expectedPulls, 0)} pulls. P(success within ${fmtInt(budget)}) = ${budgetText}.${tableLabel ? ` Rates: ${tableLabel}.` : ""}`,
      });
    });

    resultsEl.setAttribute("aria-busy", "false");
    statusEl.textContent = "Estimate updated.";
    ctx.setShareEnabled(true);
    ctx.onStateChange();
  }

  const debouncedRecompute = debounce(
    () => {
      void recompute();
    },
    150,
    ctx.signal,
  );
  const inputChanged = () => {
    pending?.abort();
    updateShareAvailability();
    resultsEl.replaceChildren();
    statusEl.textContent = "Waiting for input...";
    debouncedRecompute();
  };
  for (const el of [els.base, els.hard, els.soft, els.inc]) {
    el.addEventListener("input", () => {
      if (tableId === undefined) return;
      tableId = undefined;
      showTableNote();
    });
  }
  Object.values(els).forEach((el) => {
    el.addEventListener(
      el.type === "checkbox" ? "change" : "input",
      inputChanged,
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
      tableId = preset.config.rates ? preset.id : undefined;
      showTableNote();
      void recompute();
    });
  });

  void recompute();
}

function fmtPct(p: number): string {
  return `${(p * 100).toString()}%`;
}
