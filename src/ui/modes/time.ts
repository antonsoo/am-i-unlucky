import { timeToDrop, timeToDropDistribution } from "../../math/time.js";
import { parseRate, RateParseError } from "../../math/rate.js";
import type { AppState, TimeSourceState } from "../app-state.js";
import { debounce } from "../debounce.js";
import { esc, fmtDays, fmtInt, fmtNum, fmtPercent } from "../format.js";
import { renderDistributionChart } from "../chart.js";
import type { ModeContext } from "./simple.js";

export function mountTimeMode(
  root: HTMLElement,
  state: AppState,
  ctx: ModeContext,
): void {
  const s = state.time;

  function rowsHtml(): string {
    return s.sources
      .map(
        (src, i) => `
      <div class="source-row" data-index="${i}">
        <input type="text" class="src-name" value="${esc(src.name)}" placeholder="Source name" aria-label="Source ${i + 1} name" />
        <input type="text" class="src-rate" value="${esc(src.rate)}" placeholder="rate" aria-label="Source ${i + 1} rate" />
        <input type="number" class="src-runs" value="${src.runsPerDay}" min="0" step="any" placeholder="runs/day" aria-label="Source ${i + 1} runs per day" />
        <button type="button" class="item-remove" aria-label="Remove source" title="Remove">✕</button>
      </div>`,
      )
      .join("");
  }

  root.innerHTML = `
    <div class="workspace">
      <div>
        <section class="panel">
          <h2 class="panel-title">Attempt sources</h2>
          <p class="panel-subtitle">Each source has its own rate and how many runs/day it gives you.</p>
          <div class="source-row" style="font-size:0.72rem;color:var(--ink-faint);font-weight:600;text-transform:uppercase;">
            <span>Source</span><span>Rate</span><span>Runs/day</span><span></span>
          </div>
          <div id="source-rows">${rowsHtml()}</div>
          <button type="button" class="btn btn-ghost btn-block" id="add-source">+ Add source</button>
        </section>
        <section class="panel">
          <div class="field">
            <label class="field-label" for="time-k">Copies needed</label>
            <input type="number" id="time-k" min="1" step="1" value="${s.k}" />
          </div>
        </section>
      </div>
      <div id="time-results"></div>
    </div>
  `;

  const rowsEl = root.querySelector<HTMLDivElement>("#source-rows")!;
  const addBtn = root.querySelector<HTMLButtonElement>("#add-source")!;
  const kInput = root.querySelector<HTMLInputElement>("#time-k")!;
  const resultsEl = root.querySelector<HTMLDivElement>("#time-results")!;

  function readSourcesFromDom(): TimeSourceState[] {
    return Array.from(
      rowsEl.querySelectorAll<HTMLDivElement>(".source-row"),
    ).map((row) => ({
      name: row.querySelector<HTMLInputElement>(".src-name")!.value || "Source",
      rate: row.querySelector<HTMLInputElement>(".src-rate")!.value,
      runsPerDay: Math.max(
        0,
        Number(row.querySelector<HTMLInputElement>(".src-runs")!.value) || 0,
      ),
    }));
  }

  function recompute(): void {
    s.sources = readSourcesFromDom();
    s.k = Math.max(1, Math.floor(Number(kInput.value) || 1));

    const parsed: { name: string; p: number; runsPerDay: number }[] = [];
    let parseError = "";
    for (const src of s.sources) {
      try {
        parsed.push({
          name: src.name,
          p: parseRate(src.rate),
          runsPerDay: src.runsPerDay,
        });
      } catch (err) {
        parseError =
          err instanceof RateParseError ? err.message : "Invalid rate.";
        break;
      }
    }
    if (parseError || parsed.length === 0) {
      resultsEl.innerHTML = `<section class="panel"><p class="note">${esc(parseError || "Add at least one source.")}</p></section>`;
      return;
    }

    const result = timeToDrop({ sources: parsed, k: s.k });
    const points = timeToDropDistribution(parsed, s.k, 200);
    const chartHtml =
      result.dailySuccessRate > 0
        ? renderDistributionChart(
            points.map((pt) => ({ x: pt.n, pmf: pt.pmf, cdf: pt.cdf })),
            "days",
            [
              { x: result.daysFor.p50, label: "50%" },
              { x: result.daysFor.p90, label: "90%" },
              { x: result.daysFor.p99, label: "99%" },
            ],
          )
        : `<p class="note">Every source has a zero rate — this can never happen.</p>`;

    resultsEl.innerHTML = `
      <section class="panel">
        <h2 class="panel-title">Time to drop</h2>
        <p class="panel-subtitle">Combined across ${parsed.length} source${parsed.length === 1 ? "" : "s"}, ${fmtNum(result.totalRunsPerDay, 2)} runs/day total.</p>
        <div class="stat-grid">
          <div class="stat-tile">
            <div class="stat-tile-label">Daily success rate</div>
            <div class="stat-tile-value">${fmtPercent(result.dailySuccessRate)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">Expected time</div>
            <div class="stat-tile-value">${fmtDays(result.expectedDays)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">50% by</div>
            <div class="stat-tile-value">${fmtInt(result.daysFor.p50)} days</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">90% by</div>
            <div class="stat-tile-value">${fmtInt(result.daysFor.p90)} days</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">99% by</div>
            <div class="stat-tile-value">${fmtInt(result.daysFor.p99)} days</div>
          </div>
        </div>
      </section>
      <section class="panel">
        <h2 class="panel-title">Distribution</h2>
        <div class="chart-wrap">${chartHtml}</div>
      </section>
    `;

    ctx.onStateChange();
  }

  const debouncedRecompute = debounce(recompute, 150);

  function wireRow(row: HTMLDivElement): void {
    row
      .querySelectorAll("input")
      .forEach((el) => el.addEventListener("input", debouncedRecompute));
    row
      .querySelector<HTMLButtonElement>(".item-remove")!
      .addEventListener("click", () => {
        if (rowsEl.children.length <= 1) return;
        row.remove();
        recompute();
      });
  }
  rowsEl.querySelectorAll<HTMLDivElement>(".source-row").forEach(wireRow);

  addBtn.addEventListener("click", () => {
    const row = document.createElement("div");
    row.className = "source-row";
    row.innerHTML = `
      <input type="text" class="src-name" value="Source ${rowsEl.children.length + 1}" placeholder="Source name" />
      <input type="text" class="src-rate" value="1%" placeholder="rate" />
      <input type="number" class="src-runs" value="1" min="0" step="any" placeholder="runs/day" />
      <button type="button" class="item-remove" aria-label="Remove source" title="Remove">✕</button>`;
    rowsEl.appendChild(row);
    wireRow(row);
    recompute();
  });

  kInput.addEventListener("input", debouncedRecompute);

  recompute();
}
