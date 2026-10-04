import {
  MAX_COLLECTION_ITEMS,
  MAX_COLLECTION_ATTEMPTS,
  MAX_EXACT_CDF_ITEMS,
  validateCollectionBudget,
  validateCollectionProbabilities,
} from "../../math/collection.js";
import { parseRate } from "../../math/rate.js";
import { kahanSum } from "../../math/numeric.js";
import type { AppState, CollectionItemState } from "../app-state.js";
import { debounce } from "../debounce.js";
import { esc, fmtInt, fmtNum, fmtPercent } from "../format.js";
import { renderDistributionChart } from "../chart.js";
import { runCollectionPlan } from "../collection-engine.js";
import type {
  CollectionPlan,
  CollectionPlanRequest,
} from "../collection-plan.js";
import type { ModeContext } from "./simple.js";

export function mountCollectionMode(
  root: HTMLElement,
  state: AppState,
  ctx: ModeContext,
): void {
  const s = state.collection;
  let nextId = 0;
  let pending: AbortController | undefined;
  let request: CollectionPlanRequest | undefined;
  function itemHtml(item: CollectionItemState): string {
    const id = `collection-item-${nextId++}`;
    return `<fieldset class="collection-item">
      <legend>Item</legend>
      <div class="collection-item-fields">
        <div class="field"><label class="field-label" for="${id}-name">Name</label>
          <input type="text" id="${id}-name" class="item-name" value="${esc(item.name)}" maxlength="120" /></div>
        <div class="field"><label class="field-label" for="${id}-rate">Rate per attempt</label>
        <input type="text" id="${id}-rate" class="item-rate" value="${esc(item.rate)}" placeholder="5% or 1/20" required /></div>
        <button type="button" class="item-remove" aria-label="Remove item" title="Remove item">&#215;</button>
      </div>
    </fieldset>`;
  }
  root.innerHTML = `<div class="workspace collection-workspace">
    <div>
      <section class="panel">
        <div class="field"><label class="field-label" for="coll-n">Attempt budget</label>
          <input type="number" id="coll-n" value="${s.n}" min="0" max="${MAX_COLLECTION_ATTEMPTS}" step="1" required /></div>
        <p id="collection-total" class="field-note"></p>
        <button type="button" class="btn btn-ghost btn-block collection-jump">View results</button>
      </section>
      <section class="panel">
        <h2 class="panel-title">Items you still need</h2>
        <p class="panel-subtitle">One listed item at most per attempt. Collect one of each; duplicates don't help.</p>
        <div id="item-rows">${s.items.map(itemHtml).join("")}</div>
        <button type="button" class="btn btn-ghost btn-block" id="add-item">+ Add item</button>
        <p class="field-note">Up to ${MAX_COLLECTION_ITEMS} items. Already own one? Leave it out of this list.</p>
      </section>
      <section class="panel collection-assumptions">
        <h2 class="panel-title">How drops are counted</h2>
        <p>Attempts are independent, with fixed rates and no pity. Item outcomes within one attempt are mutually exclusive, so their rates must total at most 100%.</p>
        <p>The remaining chance covers everything outside this list, including no drop. Owned items and duplicates still consume an attempt. Separate rolls that can drop several listed items at once are not modeled here.</p>
      </section>
    </div>
    <div><p id="collection-status" class="field-note" role="status" aria-live="polite"></p>
      <div id="collection-results" role="region" aria-label="Collection results" tabindex="-1" aria-busy="false"></div></div>
  </div>`;
  const rowsEl = root.querySelector<HTMLDivElement>("#item-rows")!;
  const addBtn = root.querySelector<HTMLButtonElement>("#add-item")!;
  const nInput = root.querySelector<HTMLInputElement>("#coll-n")!;
  const resultsEl = root.querySelector<HTMLDivElement>("#collection-results")!;
  const statusEl =
    root.querySelector<HTMLParagraphElement>("#collection-status")!;
  const totalEl =
    root.querySelector<HTMLParagraphElement>("#collection-total")!;
  root
    .querySelector<HTMLButtonElement>(".collection-jump")!
    .addEventListener("click", () => {
      resultsEl.focus({ preventScroll: true });
      resultsEl.scrollIntoView({ block: "start" });
    });
  const number = (value: number) =>
    value >= 1e10 ? value.toExponential(3) : fmtNum(value, 2);

  function renderResult(
    result: CollectionPlan,
    snapshot: CollectionPlanRequest,
  ): void {
    const mc = result.simulation;
    const expected = !result.possible
      ? "Not reachable"
      : result.expectedAttempts === null
        ? result.analytic
          ? "Beyond numeric range"
          : "Not estimated"
        : number(result.expectedAttempts);
    const chance = result.belowResolution
      ? "&lt;0.01%"
      : esc(fmtPercent(result.probability));
    const interval = result.probabilityInterval;
    const last = result.points.at(-1);
    const agreement =
      result.agreement === null
        ? ""
        : result.agreement
          ? "The calculated mean is inside this simulation's interval."
          : "The calculated mean is outside this simulation's interval. A 95% interval can miss; agreement is not guaranteed.";
    resultsEl.innerHTML = `<section class="panel">
      <h2 class="panel-title">Completing your collection</h2>
      <p class="panel-subtitle">${result.analytic ? "Calculated from the drop table" : `Simulation estimate for ${snapshot.probabilities.length} items`}. ${snapshot.probabilities.length} distinct ${snapshot.probabilities.length === 1 ? "item" : "items"} needed.</p>
      <div class="time-budget">
        <div class="stat-tile-label">${result.analytic || !result.possible ? "Chance" : "Estimated chance"} within ${fmtInt(snapshot.n)} attempts</div>
        <div class="time-budget-value" data-testid="collection-chance">${chance}</div>
        <p>${interval ? `Approximate 95% interval: ${esc(fmtPercent(interval[0], 3))} to ${esc(fmtPercent(interval[1], 3))}.` : "Chance of having every listed item by this attempt budget."}</p>
      </div>
      <div class="stat-grid"><div class="stat-tile">
        <div class="stat-tile-label">${result.analytic ? "Expected" : "Estimated mean"} attempts</div>
        <div class="stat-tile-value" data-testid="collection-mean">${expected}</div>
      </div></div>
      ${!result.possible ? '<p class="note">At least one item has a 0% rate. The full set cannot be completed with these inputs.</p>' : '<p class="field-note">The mean is an average over repeated collections, not a deadline or a guarantee. Percentages are rounded.</p>'}
      ${result.belowResolution ? '<p class="note">Completion is possible, but the chance is below displayed precision. Extremely small probabilities may also fall below numerical resolution.</p>' : ""}
      ${!result.analytic ? `<p class="note">Exact calculations support up to ${MAX_EXACT_CDF_ITEMS} items. This larger set uses ${fmtInt(mc.trials)} seeded simulation runs; its headline numbers and chart are estimates.</p>` : ""}
    </section>
    ${
      result.possible
        ? `<section class="panel">
      <h2 class="panel-title">When you could finish</h2>
      <div class="chart-wrap">${renderDistributionChart(result.points, "attempts", [{ x: snapshot.n, label: "budget" }])}</div>
      <p class="field-note">${result.analytic ? "Calculated distribution." : "Empirical distribution from the same simulation."} Shading shows completion probability in each plotted interval; the gold line joins cumulative chances. ${last ? `Through ${fmtInt(last.x)} attempts: ${result.analytic ? "" : "estimated "}${esc(fmtPercent(last.cdf))} of collections complete.` : ""}</p>
      ${last?.x === MAX_COLLECTION_ATTEMPTS ? `<p class="note">The chart stops at ${fmtInt(MAX_COLLECTION_ATTEMPTS)} attempts. Outcomes beyond that limit are not shown.</p>` : ""}
    </section>
    <section class="panel">
      <h2 class="panel-title">${result.analytic ? "Simulation cross-check" : "Simulation evidence"}</h2>
      <p class="panel-subtitle">${result.analytic ? "A separate, seeded simulation checks the calculated mean." : "Seeded simulation of the same one-item-per-attempt model."}</p>
      <div class="stat-grid">
        <div class="stat-tile"><div class="stat-tile-label">Completed runs</div><div class="stat-tile-value" data-testid="collection-completed">${fmtInt(mc.sampleSize)} / ${fmtInt(mc.trials)}</div></div>
        <div class="stat-tile"><div class="stat-tile-label">Simulated mean</div><div class="stat-tile-value" data-testid="collection-sim-mean">${mc.mean === null ? "Not estimated" : number(mc.mean)}</div></div>
        <div class="stat-tile"><div class="stat-tile-label">Approx. 95% mean interval</div><div class="stat-tile-value" data-testid="collection-interval">${mc.ci95 === null ? "Unavailable" : `${number(mc.ci95[0])} to ${number(mc.ci95[1])}`}</div></div>
      </div>
      ${mc.censored ? `<p class="note">${fmtInt(mc.censored)} runs reached the ${fmtInt(mc.maxAttemptsPerRun)}-attempt limit without completing. The mean and its interval are withheld: averaging only completed runs would understate the wait.</p>` : '<p class="field-note">The interval uses a normal approximation for the mean across runs; it is not a range containing 95% of individual completion times.</p>'}
      <p class="note" data-testid="collection-agreement">${agreement}</p>
    </section>`
        : ""
    }`;
  }

  async function calculate(): Promise<void> {
    if (!request || ctx.signal.aborted) return;
    const snapshot = request;
    pending?.abort();
    const controller = new AbortController();
    pending = controller;
    try {
      const result = await runCollectionPlan(snapshot, controller.signal);
      if (controller.signal.aborted || ctx.signal.aborted) return;
      renderResult(result, snapshot);
      statusEl.textContent = "Collection updated.";
    } catch (error) {
      if (controller.signal.aborted || ctx.signal.aborted) return;
      resultsEl.innerHTML = `<section class="panel"><p class="note">${esc(error instanceof Error ? error.message : "Unable to calculate this collection.")}</p><button type="button" class="btn btn-ghost" id="collection-retry">Try again</button></section>`;
      resultsEl
        .querySelector<HTMLButtonElement>("#collection-retry")!
        .addEventListener("click", prepare);
      statusEl.textContent = "The collection could not be calculated.";
    } finally {
      if (pending === controller) {
        pending = undefined;
        resultsEl.setAttribute("aria-busy", "false");
      }
    }
  }
  const debouncedCalculate = debounce(
    () => {
      void calculate();
    },
    150,
    ctx.signal,
  );

  function prepare(): void {
    pending?.abort();
    pending = undefined;
    debouncedCalculate.cancel();
    request = undefined;
    const rows = Array.from(
      rowsEl.querySelectorAll<HTMLFieldSetElement>(".collection-item"),
    );
    s.items = rows.map((row) => ({
      name: row.querySelector<HTMLInputElement>(".item-name")!.value,
      rate: row.querySelector<HTMLInputElement>(".item-rate")!.value,
    }));
    s.n = nInput.valueAsNumber;
    totalEl.textContent = "";
    const markInvalid = (el: HTMLInputElement): void => {
      el.setAttribute("aria-invalid", "true");
      el.setAttribute("aria-describedby", "collection-error");
    };
    root.querySelectorAll<HTMLInputElement>("input").forEach((el) => {
      el.removeAttribute("aria-invalid");
      el.removeAttribute("aria-describedby");
      if (!el.validity.valid) markInvalid(el);
    });
    try {
      const probabilities = s.items.map((item, i) => {
        try {
          return parseRate(item.rate);
        } catch (error) {
          markInvalid(rows[i]!.querySelector<HTMLInputElement>(".item-rate")!);
          throw error;
        }
      });
      if (kahanSum(probabilities) > 1 + 4 * Number.EPSILON)
        rows.forEach((row) =>
          markInvalid(row.querySelector<HTMLInputElement>(".item-rate")!),
        );
      validateCollectionProbabilities(probabilities);
      validateCollectionBudget(s.n);
      if (!probabilities.length) throw new RangeError("Add at least one item.");
      const total = Math.min(1, kahanSum(probabilities));
      totalEl.textContent = `${fmtPercent(total)} listed items; ${fmtPercent(1 - total)} other outcomes per attempt.`;
      request = { probabilities, n: s.n };
      ctx.setShareEnabled(true);
      ctx.onStateChange();
      resultsEl.innerHTML =
        '<section class="panel"><p class="note">Calculating your collection...</p></section>';
      resultsEl.setAttribute("aria-busy", "true");
      statusEl.textContent = "Updating collection...";
      debouncedCalculate();
    } catch (error) {
      ctx.setShareEnabled(false);
      resultsEl.setAttribute("aria-busy", "false");
      resultsEl.innerHTML = `<section class="panel"><p class="note" id="collection-error">${esc(error instanceof Error ? error.message : "Check your inputs.")}</p></section>`;
      statusEl.textContent =
        "Check the inputs to calculate and share this collection.";
    }
  }
  function updateRowControls(): void {
    const rows = Array.from(
      rowsEl.querySelectorAll<HTMLFieldSetElement>(".collection-item"),
    );
    rows.forEach((row, i) => {
      row.querySelector("legend")!.textContent = `Item ${i + 1}`;
      const remove = row.querySelector<HTMLButtonElement>(".item-remove")!;
      remove.disabled = rows.length <= 1;
      remove.setAttribute("aria-label", `Remove item ${i + 1}`);
    });
    addBtn.disabled = rows.length >= MAX_COLLECTION_ITEMS;
  }
  function wireRow(row: HTMLFieldSetElement): void {
    row
      .querySelectorAll("input")
      .forEach((input) => input.addEventListener("input", prepare));
    row
      .querySelector<HTMLButtonElement>(".item-remove")!
      .addEventListener("click", () => {
        if (rowsEl.children.length <= 1) return;
        const sibling = row.nextElementSibling ?? row.previousElementSibling;
        row.remove();
        updateRowControls();
        sibling?.querySelector<HTMLInputElement>(".item-name")?.focus();
        prepare();
      });
  }
  rowsEl
    .querySelectorAll<HTMLFieldSetElement>(".collection-item")
    .forEach(wireRow);
  addBtn.addEventListener("click", () => {
    if (rowsEl.children.length >= MAX_COLLECTION_ITEMS) return;
    rowsEl.insertAdjacentHTML(
      "beforeend",
      itemHtml({ name: `Item ${rowsEl.children.length + 1}`, rate: "1%" }),
    );
    const row = rowsEl.lastElementChild as HTMLFieldSetElement;
    wireRow(row);
    updateRowControls();
    row.querySelector<HTMLInputElement>(".item-name")!.focus();
    prepare();
  });
  nInput.addEventListener("input", prepare);
  ctx.signal.addEventListener(
    "abort",
    () => {
      pending?.abort();
    },
    { once: true },
  );
  updateRowControls();
  prepare();
}
