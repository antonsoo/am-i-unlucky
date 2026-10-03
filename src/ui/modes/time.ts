import {
  MAX_BATCH_ATTEMPTS,
  MAX_TIME_COPIES,
  MAX_TIME_DAYS,
  MAX_TIME_SOURCES,
  validateTimeInput,
} from "../../math/time.js";
import { parseRate } from "../../math/rate.js";
import type { AppState, TimeSourceState } from "../app-state.js";
import { debounce } from "../debounce.js";
import { esc, fmtDays, fmtInt, fmtPercent } from "../format.js";
import { renderDistributionChart } from "../chart.js";
import { runTimePlan } from "../time-engine.js";
import {
  validateTimeBudget,
  type TimePlan,
  type TimePlanRequest,
} from "../time-plan.js";
import type { ModeContext } from "./simple.js";

export function mountTimeMode(
  root: HTMLElement,
  state: AppState,
  ctx: ModeContext,
): void {
  const s = state.time;
  let nextId = 0;
  let pending: AbortController | undefined;
  let request: TimePlanRequest | undefined;

  function sourceHtml(src: TimeSourceState): string {
    const id = `time-source-${nextId++}`;
    return `<fieldset class="time-source">
      <legend>Attempt source</legend>
      <div class="time-source-heading">
        <div class="field">
          <label class="field-label" for="${id}-name">Name</label>
          <input type="text" id="${id}-name" class="src-name" maxlength="120" value="${esc(src.name)}" />
        </div>
        <button type="button" class="item-remove" aria-label="Remove source" title="Remove source">&#215;</button>
      </div>
      <div class="time-source-fields">
        <div class="field">
          <label class="field-label" for="${id}-rate">Rate per attempt</label>
          <input type="text" id="${id}-rate" class="src-rate" value="${esc(src.rate)}" placeholder="2% or 1/50" required />
        </div>
        <div class="field">
          <label class="field-label" for="${id}-attempts">Attempts per batch</label>
          <input type="number" id="${id}-attempts" class="src-attempts" value="${src.attempts}" min="0" max="${MAX_BATCH_ATTEMPTS}" step="1" required />
        </div>
        <div class="field time-source-schedule">
          <label class="field-label" for="${id}-schedule">Schedule</label>
          <select id="${id}-schedule" class="src-schedule">
            ${src.everyDays !== 1 && src.everyDays !== 7 ? `<option value="${src.everyDays}" selected>Unsupported schedule (${src.everyDays} days)</option>` : ""}
            <option value="1" ${src.everyDays === 1 ? "selected" : ""}>Daily</option>
            <option value="7" ${src.everyDays === 7 ? "selected" : ""}>Weekly</option>
          </select>
          <p class="field-note src-timing"></p>
        </div>
      </div>
    </fieldset>`;
  }

  root.innerHTML = `<div class="workspace time-workspace">
    <div>
      <section class="panel">
        <h2 class="panel-title">Attempt sources</h2>
        <p class="panel-subtitle">Every successful attempt adds a copy, including several in the same batch.</p>
        <div id="source-rows">${s.sources.map(sourceHtml).join("")}</div>
        <button type="button" class="btn btn-ghost btn-block" id="add-source">+ Add source</button>
        <p class="field-note">Up to ${MAX_TIME_SOURCES} sources; whole attempts only.</p>
      </section>
      <section class="panel">
        <h2 class="panel-title">Your goal</h2>
        <div class="field-row">
          <div class="field">
            <label class="field-label" for="time-k">Copies needed</label>
            <input type="number" id="time-k" min="1" max="${MAX_TIME_COPIES}" step="1" value="${s.k}" required />
          </div>
          <div class="field">
            <label class="field-label" for="time-days">Day budget</label>
            <input type="number" id="time-days" min="0" max="${MAX_TIME_DAYS}" step="1" value="${s.days}" required />
          </div>
        </div>
      </section>
      <section class="panel time-assumptions">
        <h2 class="panel-title">How days are counted</h2>
        <p>Start before day 1. Daily batches finish at each day's end. Weekly batches finish on days 7, 14, 21, and so on.</p>
        <p>Attempts are independent, with fixed rates and no pity. All scheduled batches are completed. Reset offsets and time within a day are not modeled.</p>
      </section>
    </div>
    <div>
      <p id="time-status" class="field-note" role="status" aria-live="polite"></p>
      <div id="time-results" aria-busy="false"></div>
    </div>
  </div>`;

  const rowsEl = root.querySelector<HTMLDivElement>("#source-rows")!;
  const addBtn = root.querySelector<HTMLButtonElement>("#add-source")!;
  const kInput = root.querySelector<HTMLInputElement>("#time-k")!;
  const daysInput = root.querySelector<HTMLInputElement>("#time-days")!;
  const resultsEl = root.querySelector<HTMLDivElement>("#time-results")!;
  const statusEl = root.querySelector<HTMLParagraphElement>("#time-status")!;

  const milestone = (days: number | null): string =>
    days === null
      ? `Over ${fmtInt(MAX_TIME_DAYS)} days`
      : Number.isFinite(days)
        ? `${fmtInt(days)} ${days === 1 ? "day" : "days"}`
        : "Not reachable";

  function renderResult(result: TimePlan, snapshot: TimePlanRequest): void {
    const { k } = snapshot.input;
    const last = result.points.at(-1);
    const horizonNote =
      result.daysFor.p99 === null
        ? `<p class="note">The 99% milestone is beyond ${fmtInt(MAX_TIME_DAYS)} days, this calculator's search limit. That does not mean the drop is impossible.</p>`
        : "";
    const chart = result.possible
      ? renderDistributionChart(
          result.points.map((pt) => ({ x: pt.n, pmf: pt.pmf, cdf: pt.cdf })),
          "completed days",
          Object.entries(result.daysFor).flatMap(([key, x]) =>
            x !== null && Number.isFinite(x)
              ? [{ x, label: `${key.slice(1)}%` }]
              : [],
          ),
        )
      : "";
    const expected =
      result.expectedDays === null
        ? "Beyond numeric range"
        : result.possible
          ? fmtDays(result.expectedDays)
          : "Not reachable";
    resultsEl.innerHTML = `<section class="panel">
      <h2 class="panel-title">Your schedule</h2>
      <p class="panel-subtitle">Collect ${fmtInt(k)} ${k === 1 ? "copy" : "copies"} from ${snapshot.input.sources.length} ${snapshot.input.sources.length === 1 ? "source" : "sources"}.</p>
      <div class="time-budget">
        <div class="stat-tile-label">Chance within ${fmtInt(snapshot.days)} ${snapshot.days === 1 ? "day" : "days"}</div>
        <div class="time-budget-value" data-testid="budget-chance">${fmtPercent(result.probabilityWithinBudget)}</div>
        <p>Chance of collecting ${k === 1 ? "your copy" : `all ${fmtInt(k)} copies`} by the end of that day.</p>
      </div>
      ${!result.possible ? `<p class="note">No source has both a positive drop rate and any scheduled attempts. This goal cannot be reached with these inputs.</p>` : ""}
      <div class="stat-grid">
        <div class="stat-tile"><div class="stat-tile-label">Expected time (mean)</div><div class="stat-tile-value" data-testid="expected-days">${expected}</div></div>
        <div class="stat-tile"><div class="stat-tile-label">50% by</div><div class="stat-tile-value" data-testid="p50">${milestone(result.daysFor.p50)}</div></div>
        <div class="stat-tile"><div class="stat-tile-label">90% by</div><div class="stat-tile-value" data-testid="p90">${milestone(result.daysFor.p90)}</div></div>
        <div class="stat-tile"><div class="stat-tile-label">99% by</div><div class="stat-tile-value" data-testid="p99">${milestone(result.daysFor.p99)}</div></div>
      </div>
      <p class="field-note">The mean is an average over repeated outcomes. Each percentage marks the first whole day reaching that chance, not a guarantee.</p>
      ${horizonNote}
    </section>
    ${
      result.possible
        ? `<section class="panel">
      <h2 class="panel-title">When you could finish</h2>
      <div class="chart-wrap">${chart}</div>
      <p class="field-note">Shading shows the probability of finishing in each plotted day interval. The gold line joins cumulative probabilities at interval ends. ${last ? `The chart covers ${fmtPercent(last.cdf)} of outcomes through day ${fmtInt(last.n)}.` : ""}</p>
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
      const result = await runTimePlan(snapshot, controller.signal);
      if (controller.signal.aborted || ctx.signal.aborted) return;
      renderResult(result, snapshot);
      statusEl.textContent = "Estimate updated.";
    } catch (error) {
      if (controller.signal.aborted || ctx.signal.aborted) return;
      resultsEl.innerHTML = `<section class="panel"><p class="note">${esc(error instanceof Error ? error.message : "Unable to calculate this schedule.")}</p><button type="button" class="btn btn-ghost" id="time-retry">Try again</button></section>`;
      resultsEl
        .querySelector<HTMLButtonElement>("#time-retry")!
        .addEventListener("click", () => {
          prepare();
        });
      statusEl.textContent = "The estimate could not be calculated.";
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

  /** Capture every edit immediately, so sharing never copies the preceding input. */
  function prepare(): void {
    pending?.abort();
    pending = undefined;
    debouncedCalculate.cancel();
    request = undefined;
    s.sources = Array.from(
      rowsEl.querySelectorAll<HTMLFieldSetElement>(".time-source"),
    ).map((row) => ({
      name: row.querySelector<HTMLInputElement>(".src-name")!.value,
      rate: row.querySelector<HTMLInputElement>(".src-rate")!.value,
      attempts:
        row.querySelector<HTMLInputElement>(".src-attempts")!.valueAsNumber,
      everyDays: Number(
        row.querySelector<HTMLSelectElement>(".src-schedule")!.value,
      ),
    }));
    s.k = kInput.valueAsNumber;
    s.days = daysInput.valueAsNumber;
    rowsEl
      .querySelectorAll<HTMLFieldSetElement>(".time-source")
      .forEach((row, index) => {
        const cadence = s.sources[index]!.everyDays;
        row.querySelector(".src-timing")!.textContent =
          cadence === 1 || cadence === 7
            ? `First batch finishes on day ${cadence}.`
            : "Choose Daily or Weekly.";
      });
    function markInvalid(el: HTMLInputElement | HTMLSelectElement): void {
      el.setAttribute("aria-invalid", "true");
      el.setAttribute("aria-describedby", "time-error");
    }
    root
      .querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select")
      .forEach((el) => {
        el.removeAttribute("aria-invalid");
        el.removeAttribute("aria-describedby");
        if (!el.validity.valid) markInvalid(el);
      });
    try {
      const rows = Array.from(
        rowsEl.querySelectorAll<HTMLFieldSetElement>(".time-source"),
      );
      const input = {
        sources: s.sources.map((src, index) => {
          let p: number;
          try {
            p = parseRate(src.rate);
          } catch (error) {
            markInvalid(
              rows[index]!.querySelector<HTMLInputElement>(".src-rate")!,
            );
            throw error;
          }
          if (src.everyDays !== 1 && src.everyDays !== 7)
            markInvalid(
              rows[index]!.querySelector<HTMLSelectElement>(".src-schedule")!,
            );
          return {
            name: src.name,
            p,
            attempts: src.attempts,
            everyDays: src.everyDays,
          };
        }),
        k: s.k,
      };
      validateTimeInput(input);
      validateTimeBudget(s.days);
      request = { input, days: s.days };
      ctx.setShareEnabled(true);
      ctx.onStateChange();
      resultsEl.innerHTML = `<section class="panel"><p class="note">Calculating your schedule...</p></section>`;
      resultsEl.setAttribute("aria-busy", "true");
      statusEl.textContent = "Updating estimate...";
      debouncedCalculate();
    } catch (error) {
      ctx.setShareEnabled(false);
      resultsEl.setAttribute("aria-busy", "false");
      resultsEl.innerHTML = `<section class="panel"><p class="note" id="time-error">${esc(error instanceof Error ? error.message : "Check your inputs.")}</p></section>`;
      statusEl.textContent =
        "Check the inputs to calculate and share this schedule.";
    }
  }

  function updateRowControls(): void {
    const rows = Array.from(
      rowsEl.querySelectorAll<HTMLFieldSetElement>(".time-source"),
    );
    rows.forEach((row, index) => {
      row.querySelector("legend")!.textContent = `Source ${index + 1}`;
      const remove = row.querySelector<HTMLButtonElement>(".item-remove")!;
      remove.disabled = rows.length <= 1;
      remove.setAttribute("aria-label", `Remove source ${index + 1}`);
    });
    addBtn.disabled = rows.length >= MAX_TIME_SOURCES;
  }

  function wireRow(row: HTMLFieldSetElement): void {
    row
      .querySelectorAll("input")
      .forEach((el) => el.addEventListener("input", prepare));
    row.querySelector("select")!.addEventListener("change", prepare);
    row
      .querySelector<HTMLButtonElement>(".item-remove")!
      .addEventListener("click", () => {
        if (rowsEl.children.length <= 1) return;
        const sibling = row.nextElementSibling ?? row.previousElementSibling;
        row.remove();
        updateRowControls();
        sibling?.querySelector<HTMLInputElement>(".src-name")?.focus();
        prepare();
      });
  }
  rowsEl.querySelectorAll<HTMLFieldSetElement>(".time-source").forEach(wireRow);
  addBtn.addEventListener("click", () => {
    if (rowsEl.children.length >= MAX_TIME_SOURCES) return;
    rowsEl.insertAdjacentHTML(
      "beforeend",
      sourceHtml({
        name: `Source ${rowsEl.children.length + 1}`,
        rate: "1%",
        attempts: 1,
        everyDays: 1,
      }),
    );
    const row = rowsEl.lastElementChild as HTMLFieldSetElement;
    wireRow(row);
    updateRowControls();
    row.querySelector<HTMLInputElement>(".src-name")!.focus();
    prepare();
  });
  kInput.addEventListener("input", prepare);
  daysInput.addEventListener("input", prepare);
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
