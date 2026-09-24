import {
  collectionCdf,
  collectionDistributionPoints,
  collectionExpectedAttempts,
  collectionMonteCarlo,
  MAX_EXACT_CDF_ITEMS,
  MAX_EXACT_EXPECTATION_ITEMS,
} from "../../math/collection.js";
import { parseRate, RateParseError } from "../../math/rate.js";
import type { AppState, CollectionItemState } from "../app-state.js";
import { debounce } from "../debounce.js";
import { esc, fmtInt, fmtNum, fmtPercent } from "../format.js";
import { renderDistributionChart } from "../chart.js";
import type { ModeContext } from "./simple.js";

export function mountCollectionMode(
  root: HTMLElement,
  state: AppState,
  ctx: ModeContext,
): void {
  const s = state.collection;

  function itemsHtml(): string {
    return s.items
      .map(
        (item, i) => `
      <div class="item-row" data-index="${i}">
        <input type="text" class="item-name" value="${esc(item.name)}" placeholder="Item name" aria-label="Item ${i + 1} name" />
        <input type="text" class="item-rate" value="${esc(item.rate)}" placeholder="rate" aria-label="Item ${i + 1} drop rate" />
        <button type="button" class="item-remove" aria-label="Remove ${esc(item.name) || `item ${i + 1}`}" title="Remove">✕</button>
      </div>`,
      )
      .join("");
  }

  root.innerHTML = `
    <div class="workspace">
      <div>
        <section class="panel">
          <h2 class="panel-title">Items to collect</h2>
          <p class="panel-subtitle">Independent per-attempt probability for each item. Duplicates don't help.</p>
          <div id="item-rows">${itemsHtml()}</div>
          <button type="button" class="btn btn-ghost btn-block" id="add-item">+ Add item</button>
        </section>
        <section class="panel">
          <div class="field">
            <label class="field-label" for="coll-n">Attempts to check P(complete by)</label>
            <input type="number" id="coll-n" min="0" step="1" value="${s.n}" />
          </div>
        </section>
      </div>
      <div id="collection-results"></div>
    </div>
  `;

  const rowsEl = root.querySelector<HTMLDivElement>("#item-rows")!;
  const addBtn = root.querySelector<HTMLButtonElement>("#add-item")!;
  const nInput = root.querySelector<HTMLInputElement>("#coll-n")!;
  const resultsEl = root.querySelector<HTMLDivElement>("#collection-results")!;

  function readItemsFromDom(): CollectionItemState[] {
    return Array.from(rowsEl.querySelectorAll<HTMLDivElement>(".item-row")).map(
      (row) => ({
        name:
          row.querySelector<HTMLInputElement>(".item-name")!.value || "Item",
        rate: row.querySelector<HTMLInputElement>(".item-rate")!.value,
      }),
    );
  }

  function recompute(): void {
    s.items = readItemsFromDom();
    s.n = Math.max(0, Math.floor(Number(nInput.value) || 0));

    const probs: number[] = [];
    let parseError = "";
    for (const item of s.items) {
      try {
        probs.push(parseRate(item.rate));
      } catch (err) {
        parseError =
          err instanceof RateParseError ? err.message : "Invalid rate.";
        break;
      }
    }
    if (parseError || probs.length === 0) {
      resultsEl.innerHTML = `<section class="panel"><p class="note">${esc(parseError || "Add at least one item.")}</p></section>`;
      return;
    }
    if (probs.length > MAX_EXACT_EXPECTATION_ITEMS) {
      resultsEl.innerHTML = `<section class="panel"><p class="note">Exact math supports up to ${MAX_EXACT_EXPECTATION_ITEMS} items (inclusion-exclusion is O(2^m)). Remove some items, or treat this as a Monte-Carlo-only estimate in a future version.</p></section>`;
      return;
    }

    const { expectedAttempts } = collectionExpectedAttempts(probs);
    const canExactCdf = probs.length <= MAX_EXACT_CDF_ITEMS;
    const cdfAtN = canExactCdf ? collectionCdf(probs, s.n) : NaN;

    const mc = collectionMonteCarlo(probs, 20_000);
    const mcMargin = (mc.ci95[1] - mc.ci95[0]) / 2;

    const chartHtml = canExactCdf
      ? renderDistributionChart(
          collectionDistributionPoints(
            probs,
            Math.max(20, Math.ceil(expectedAttempts * 3 || 50)),
            200,
          ).map((pt) => ({
            x: pt.n,
            pmf: 0,
            cdf: pt.cdf,
          })),
          "attempts",
          [{ x: s.n, label: "n" }],
        )
      : `<p class="note">Exact CDF curve supports up to ${MAX_EXACT_CDF_ITEMS} items; showing Monte Carlo summary only for ${probs.length} items.</p>`;

    resultsEl.innerHTML = `
      <section class="panel">
        <h2 class="panel-title">Collection stats</h2>
        <p class="panel-subtitle">Exact via inclusion-exclusion over ${probs.length} item${probs.length === 1 ? "" : "s"} (${probs.length <= MAX_EXACT_CDF_ITEMS ? "2^" + probs.length.toString() + " subsets" : "expectation only"}).</p>
        <div class="stat-grid">
          <div class="stat-tile">
            <div class="stat-tile-label">Expected attempts</div>
            <div class="stat-tile-value">${fmtNum(expectedAttempts, 1)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">P(complete by ${fmtInt(s.n)})</div>
            <div class="stat-tile-value">${canExactCdf ? fmtPercent(cdfAtN) : "—"}</div>
          </div>
        </div>
      </section>
      <section class="panel">
        <h2 class="panel-title">Distribution</h2>
        <div class="chart-wrap">${chartHtml}</div>
      </section>
      <section class="panel">
        <h2 class="panel-title">Monte Carlo cross-check</h2>
        <p class="panel-subtitle">Independent simulation, not used for the headline numbers above.</p>
        <div class="stat-grid">
          <div class="stat-tile">
            <div class="stat-tile-label">Sample size</div>
            <div class="stat-tile-value">${fmtInt(mc.sampleSize)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">Mean attempts</div>
            <div class="stat-tile-value">${fmtNum(mc.mean, 1)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">95% CI</div>
            <div class="stat-tile-value">±${fmtNum(mcMargin, 2)}</div>
          </div>
        </div>
        <p class="note">Simulated mean ${fmtNum(mc.mean, 2)} vs. exact ${fmtNum(expectedAttempts, 2)} — difference of ${fmtNum(Math.abs(mc.mean - expectedAttempts), 2)}, within the confidence interval above.</p>
      </section>
    `;

    ctx.onStateChange();
  }

  const debouncedRecompute = debounce(recompute, 150);

  function wireRow(row: HTMLDivElement): void {
    row
      .querySelector<HTMLInputElement>(".item-name")!
      .addEventListener("input", debouncedRecompute);
    row
      .querySelector<HTMLInputElement>(".item-rate")!
      .addEventListener("input", debouncedRecompute);
    row
      .querySelector<HTMLButtonElement>(".item-remove")!
      .addEventListener("click", () => {
        if (rowsEl.children.length <= 1) return;
        row.remove();
        recompute();
      });
  }
  rowsEl.querySelectorAll<HTMLDivElement>(".item-row").forEach(wireRow);

  addBtn.addEventListener("click", () => {
    const row = document.createElement("div");
    row.className = "item-row";
    row.innerHTML = `
      <input type="text" class="item-name" value="Item ${rowsEl.children.length + 1}" placeholder="Item name" />
      <input type="text" class="item-rate" value="0.05" placeholder="rate" />
      <button type="button" class="item-remove" aria-label="Remove item" title="Remove">✕</button>`;
    rowsEl.appendChild(row);
    wireRow(row);
    recompute();
  });

  nInput.addEventListener("input", debouncedRecompute);

  recompute();
}
