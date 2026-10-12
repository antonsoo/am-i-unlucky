import {
  simpleLuckComparison,
  simpleWaitingComparison,
  negativeBinomialDistribution,
  simpleDrop,
} from "../../math/simple.js";
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
  signal: AbortSignal;
  registerCapture: (capture: () => void) => void;
  setShareEnabled: (enabled: boolean) => void;
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
            <input type="text" id="simple-rate" value="${esc(s.rate)}" inputmode="decimal" autocomplete="off" aria-describedby="simple-rate-error" />
            <div class="field-error" id="simple-rate-error" aria-live="polite"></div>
          </div>
          <div class="field-row">
            <div class="field">
              <label class="field-label" for="simple-n">Attempts made</label>
              <input type="number" id="simple-n" min="0" step="1" value="${Number.isFinite(s.n) ? s.n : ""}" aria-describedby="simple-n-error" />
              <div class="field-error" id="simple-n-error" aria-live="polite"></div>
            </div>
            <div class="field">
              <label class="field-label" for="simple-k">Copies needed</label>
              <input type="number" id="simple-k" min="1" step="1" value="${Number.isFinite(s.k) ? s.k : ""}" aria-describedby="simple-k-error" />
              <div class="field-error" id="simple-k-error" aria-live="polite"></div>
            </div>
          </div>
          <div class="field">
            <label class="checkbox-field"><input type="checkbox" id="simple-got" ${s.got ? "checked" : ""}/> <span id="simple-got-label">Got it on the last of those attempts</span></label>
            <p class="field-note">Leave it unchecked if you're still waiting.</p>
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
  const gotInput = root.querySelector<HTMLInputElement>("#simple-got")!;
  const gotLabel = root.querySelector<HTMLSpanElement>("#simple-got-label")!;
  const errorEl = root.querySelector<HTMLDivElement>("#simple-rate-error")!;
  const resultsEl = root.querySelector<HTMLDivElement>("#simple-results")!;

  function captureInputs(): void {
    s.rate = rateInput.value;
    s.n = nInput.valueAsNumber;
    s.k = kInput.valueAsNumber;
    s.got = gotInput.checked;
  }
  ctx.registerCapture(captureInputs);

  /** Recomputes the results, or says why it can't for numbers beyond what the math covers. */
  function recompute(): void {
    debouncedRecompute.cancel();
    try {
      const p = readInputs();
      if (p !== undefined) computeResults(p);
    } catch (err) {
      if (!(err instanceof RangeError)) throw err;
      resultsEl.innerHTML = `<section class="panel"><p class="note">${esc(err.message)}</p></section>`;
    } finally {
      resultsEl.setAttribute("aria-busy", "false");
    }
  }

  /** Validate the draft before sharing; blank fields remain missing, not zero. */
  function readInputs(): number | undefined {
    captureInputs();
    const countErrors: string[] = [];
    for (const [input, value, minimum, label] of [
      [nInput, s.n, 0, "attempts"],
      [kInput, s.k, 1, "copies"],
    ] as const) {
      const error = root.querySelector<HTMLElement>(`#${input.id}-error`)!;
      const valid = Number.isSafeInteger(value) && value >= minimum;
      const message =
        value > Number.MAX_SAFE_INTEGER
          ? `Use 9,007,199,254,740,991 or fewer ${label}.`
          : `Enter a whole number of ${label} (${minimum} or more).`;
      error.textContent = valid ? "" : message;
      if (valid) input.removeAttribute("aria-invalid");
      else {
        input.setAttribute("aria-invalid", "true");
        countErrors.push(message);
      }
    }
    let p: number | undefined;
    try {
      p = parseRate(rateInput.value);
      errorEl.textContent = "";
      rateInput.removeAttribute("aria-invalid");
    } catch (err) {
      errorEl.textContent =
        err instanceof RateParseError ? err.message : "Invalid rate.";
      // Read with the field (aria-describedby) and announced politely: the field re-checks on
      // every keystroke, so an alert would interrupt each one.
      rateInput.setAttribute("aria-invalid", "true");
    }
    if (p === undefined || countErrors.length > 0) {
      ctx.setShareEnabled(false);
      const messages = [
        ...(p === undefined ? ["Fix the rate above to see results."] : []),
        ...countErrors,
      ];
      resultsEl.innerHTML = `<section class="panel"><p class="note">${messages.map(esc).join(" ")}</p></section>`;
      return;
    }
    ctx.setShareEnabled(true);
    ctx.onStateChange();
    return p;
  }

  function computeResults(p: number): void {
    const { n, k, got } = s;
    const attemptsText = `${fmtInt(n)} attempt${n === 1 ? "" : "s"}`;
    gotLabel.textContent =
      k === 1
        ? "Got it on the last of those attempts"
        : `Got copy ${k} on the last of those attempts`;

    const result = simpleDrop({ p, n, k });
    const observation = got
      ? simpleLuckComparison(n, p, k)
      : simpleWaitingComparison(n, p, k);
    // p=0 and p=1 are degenerate: everyone gets the same outcome (never, or
    // always on the k-th attempt), so a percentile against "other players"
    // is meaningless rather than 0% or 100% — show a plain note instead of
    // letting the luck meter imply an (unearned) verdict.
    const isDegenerate = p <= 0 || p >= 1;
    const showLuck = n >= 1 && !isDegenerate && observation !== null;
    const oddsLabel = formatRateAsOdds(p);
    const pctLabel = formatRateAsPercent(p);

    let luckHtml: string;
    if (got && observation === null) {
      luckHtml = `<p class="note">That completion time is impossible under these settings. Check the attempts, copies and drop rate.</p>`;
    } else if (isDegenerate) {
      luckHtml =
        p <= 0
          ? `<p class="note">A 0% rate never succeeds, no matter how many attempts you make — there's no meaningful luck percentile here.</p>`
          : `<p class="note">At a 100% rate, copy ${k} always arrives on attempt ${k}. ${!got && n >= k ? "Still waiting after that does not match these settings." : "Every player gets the same result, so there is no luck variation."}</p>`;
    } else if (showLuck) {
      luckHtml = renderLuckMeter(
        observation,
        got
          ? `based on ${attemptsText} at ${oddsLabel} (${pctLabel}) odds needing ${k} cop${k === 1 ? "y" : "ies"}`
          : `still waiting after ${attemptsText} at ${oddsLabel} (${pctLabel}) odds, needing ${k} cop${k === 1 ? "y" : "ies"}`,
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
          // Still waiting and not yet unlucky: there is no verdict to put on a card.
          showLuck &&
          (got ||
            (observation.kind === "waiting" && observation.completed > 0.6))
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
      if (!observation) return;
      ctx.openLuckCard({
        headline: got
          ? `Took ${attemptsText} at ${oddsLabel} odds for ${k} cop${k === 1 ? "y" : "ies"}.`
          : `${attemptsText} at ${oddsLabel} odds and still waiting for ${k === 1 ? "it" : `copy ${k}`}.`,
        observation,
        modeLabel: "Simple drop",
        detail: `P(at least ${k} by ${fmtInt(n)}) = ${fmtPercent(result.probabilityAtLeastK)}. Expected ${fmtNum(result.expectedAttempts, 1)} attempts.`,
      });
    });
  }

  const debouncedRecompute = debounce(recompute, 120, ctx.signal);
  function inputChanged(): void {
    // Retire the preceding result synchronously: it no longer describes the
    // visible fields, even during the short debounce before recalculation.
    debouncedRecompute.cancel();
    if (readInputs() === undefined) {
      resultsEl.setAttribute("aria-busy", "false");
      return;
    }
    resultsEl.setAttribute("aria-busy", "true");
    resultsEl.innerHTML = `<section class="panel"><p class="note">Updating results...</p></section>`;
    debouncedRecompute();
  }
  rateInput.addEventListener("input", inputChanged);
  nInput.addEventListener("input", inputChanged);
  kInput.addEventListener("input", inputChanged);
  gotInput.addEventListener("change", recompute);

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
