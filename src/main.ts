import "./style.css";
import {
  decodeState,
  encodeState,
  type AppState,
  type Mode,
} from "./ui/app-state.js";
import { mountSimpleMode } from "./ui/modes/simple.js";
import { mountPityMode } from "./ui/modes/pity.js";
import { mountCollectionMode } from "./ui/modes/collection.js";
import { mountTimeMode } from "./ui/modes/time.js";
import { renderLuckCard, type LuckCardData } from "./ui/luck-card.js";
import { debounce } from "./ui/debounce.js";

const MODES: { id: Mode; label: string; key: string }[] = [
  { id: "simple", label: "Simple drop", key: "1" },
  { id: "pity", label: "Pity system", key: "2" },
  { id: "collection", label: "Collection", key: "3" },
  { id: "time", label: "Time to drop", key: "4" },
];

const MODE_INTRO: Record<Mode, { title: string; body: string }> = {
  simple: {
    title: "Am I unlucky?",
    body: "Plug in a fixed drop rate and see exactly how unlucky (or lucky) your run really was — computed from the true negative-binomial distribution, not a rule of thumb.",
  },
  pity: {
    title: "Pity system calculator",
    body: "Soft pity, hard pity, and 50/50 guarantees make the odds path-dependent. This runs an exact dynamic-programming pass over the pity state machine instead of a simulation.",
  },
  collection: {
    title: "Collection completion",
    body: "How many attempts to collect every item in a set with unequal drop rates? Exact via inclusion-exclusion, cross-checked with Monte Carlo.",
  },
  time: {
    title: "Time to drop",
    body: "Turn attempt rates and runs-per-day into a realistic time estimate, in hours, days, or months.",
  },
};

function applyStoredTheme(): void {
  try {
    const stored = localStorage.getItem("aiu-theme");
    if (stored === "light" || stored === "dark") {
      document.documentElement.dataset.theme = stored;
    }
  } catch {
    // localStorage unavailable (private browsing, etc.) — system preference still applies via CSS.
  }
}

const SUN_ICON =
  '<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.4M12 19.6V22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2 12h2.4M19.6 12H22M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7"/>';
const MOON_ICON =
  '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4 6.8 6.8 0 0 0 20 14.5Z"/>';

function isDarkEffective(): boolean {
  const current = document.documentElement.dataset.theme;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return current ? current === "dark" : prefersDark;
}

function syncThemeIcon(): void {
  const svg = document.querySelector<SVGElement>("#theme-btn svg");
  if (svg) svg.innerHTML = isDarkEffective() ? MOON_ICON : SUN_ICON;
}

function toggleTheme(): void {
  const next = isDarkEffective() ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem("aiu-theme", next);
  } catch {
    // ignore
  }
  syncThemeIcon();
}

function buildShell(): {
  app: HTMLElement;
  tabsEl: HTMLElement;
  mainEl: HTMLElement;
  liveEl: HTMLElement;
} {
  const app = document.getElementById("app")!;
  app.innerHTML = `
    <div class="page">
      <header class="site-header">
        <div class="header-row">
          <div class="brand">
            <svg class="brand-die" viewBox="0 0 32 32" aria-hidden="true">
              <path d="M16 2 29 9.5V22.5L16 30 3 22.5V9.5Z" fill="none" stroke="var(--legendary)" stroke-width="2" stroke-linejoin="round"/>
              <circle cx="16" cy="16" r="3.4" fill="var(--legendary)"/>
            </svg>
            <span>am I unlucky?</span>
          </div>
          <div class="header-actions">
            <button type="button" class="icon-btn" id="share-btn" aria-label="Copy shareable link" title="Copy shareable link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="10.6" x2="15.4" y2="6.4"/><line x1="8.6" y1="13.4" x2="15.4" y2="17.6"/></svg>
            </button>
            <button type="button" class="icon-btn" id="theme-btn" aria-label="Toggle light and dark theme" title="Toggle theme">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.4M12 19.6V22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2 12h2.4M19.6 12H22M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7"/></svg>
            </button>
            <a class="icon-btn" href="https://github.com/antonsoo/am-i-unlucky" target="_blank" rel="noopener" aria-label="View source on GitHub" title="View source on GitHub">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.73.5.5 5.73.5 12c0 5.09 3.29 9.4 7.86 10.93.57.1.79-.25.79-.55v-2c-3.2.7-3.88-1.54-3.88-1.54-.52-1.34-1.28-1.69-1.28-1.69-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a10.9 10.9 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.77.12 3.06.74.8 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .3.21.66.8.55A10.52 10.52 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z"/></svg>
            </a>
          </div>
        </div>
        <nav class="mode-tabs" role="tablist" aria-label="Calculator mode" id="mode-tabs"></nav>
      </header>
      <main id="main-content"></main>
      <footer class="site-footer">
        <p>Exact wherever feasible; Monte Carlo cross-checks shown where it isn't. See <a href="https://github.com/antonsoo/am-i-unlucky/blob/main/docs/MATH.md" target="_blank" rel="noopener">docs/MATH.md</a> for derivations. MIT licensed — <a href="https://github.com/antonsoo/am-i-unlucky" target="_blank" rel="noopener">source on GitHub</a>.</p>
      </footer>
    </div>
    <div class="sr-live" role="status" aria-live="polite" id="live-region"></div>
  `;
  return {
    app,
    tabsEl: document.getElementById("mode-tabs")!,
    mainEl: document.getElementById("main-content")!,
    liveEl: document.getElementById("live-region")!,
  };
}

function openLuckCardModal(data: LuckCardData): void {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="Luck card">
      <h2>Your luck card</h2>
      <canvas id="luck-card-canvas" width="1080" height="1350"></canvas>
      <div class="modal-actions">
        <button type="button" class="btn btn-primary btn-block" id="download-card">Download PNG</button>
        <button type="button" class="btn btn-ghost" id="close-card">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);
  const canvas =
    backdrop.querySelector<HTMLCanvasElement>("#luck-card-canvas")!;
  renderLuckCard(canvas, data);

  const previouslyFocused = document.activeElement as HTMLElement | null;
  const downloadBtn =
    backdrop.querySelector<HTMLButtonElement>("#download-card")!;
  const closeBtn = backdrop.querySelector<HTMLButtonElement>("#close-card")!;
  downloadBtn.focus();

  function close(): void {
    backdrop.remove();
    document.removeEventListener("keydown", onKey);
    previouslyFocused?.focus();
  }
  function onKey(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      close();
      return;
    }
    if (e.key === "Tab") {
      // Minimal focus trap: the modal only has two focusable controls.
      e.preventDefault();
      (document.activeElement === downloadBtn ? closeBtn : downloadBtn).focus();
    }
  }
  document.addEventListener("keydown", onKey);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });
  closeBtn.addEventListener("click", close);
  downloadBtn.addEventListener("click", () => {
    const link = document.createElement("a");
    link.download = "am-i-unlucky-luck-card.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
}

function main(): void {
  applyStoredTheme();
  const { tabsEl, mainEl, liveEl } = buildShell();

  let state: AppState = decodeState(window.location.search);

  const updateUrl = debounce(() => {
    const query = encodeState(state);
    const url = `${window.location.pathname}?${query}`;
    window.history.replaceState(null, "", url);
  }, 300);

  function switchMode(mode: Mode): void {
    if (mode === state.mode) return;
    state.mode = mode;
    renderTabs();
    renderMain();
    updateUrl();
    tabsEl.querySelector<HTMLButtonElement>(`[data-mode="${mode}"]`)?.focus();
  }

  function renderTabs(): void {
    tabsEl.innerHTML = MODES.map(
      (m, i) => `
      <button type="button" id="tab-${m.id}" class="mode-tab" role="tab" aria-selected="${m.id === state.mode}"
        aria-controls="mode-mount" tabindex="${m.id === state.mode ? "0" : "-1"}" data-mode="${m.id}" data-index="${i}">
        ${m.label} <span class="tab-key">${m.key}</span>
      </button>`,
    ).join("");
    const buttons = Array.from(
      tabsEl.querySelectorAll<HTMLButtonElement>(".mode-tab"),
    );
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        switchMode(btn.dataset.mode as Mode);
      });
      btn.addEventListener("keydown", (e: KeyboardEvent) => {
        const index = Number(btn.dataset.index);
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          const dir = e.key === "ArrowRight" ? 1 : -1;
          const next =
            buttons[(index + dir + buttons.length) % buttons.length]!;
          switchMode(next.dataset.mode as Mode);
        }
      });
    });
  }

  function renderMain(): void {
    const intro = MODE_INTRO[state.mode];
    mainEl.innerHTML = `
      <div class="intro">
        <h1>${intro.title}</h1>
        <p>${intro.body}</p>
      </div>
      <div id="mode-mount" role="tabpanel" aria-labelledby="tab-${state.mode}" tabindex="-1"></div>
    `;
    const mount = document.getElementById("mode-mount")!;
    const ctx = {
      onStateChange: () => {
        updateUrl();
      },
      openLuckCard: openLuckCardModal,
    };
    switch (state.mode) {
      case "simple":
        mountSimpleMode(mount, state, ctx);
        break;
      case "pity":
        mountPityMode(mount, state, ctx);
        break;
      case "collection":
        mountCollectionMode(mount, state, ctx);
        break;
      case "time":
        mountTimeMode(mount, state, ctx);
        break;
    }
  }

  syncThemeIcon();
  document.getElementById("theme-btn")!.addEventListener("click", toggleTheme);
  document.getElementById("share-btn")!.addEventListener("click", () => {
    const query = encodeState(state);
    const url = `${window.location.origin}${window.location.pathname}?${query}`;
    void navigator.clipboard
      .writeText(url)
      .then(() => {
        liveEl.textContent = "Link copied to clipboard.";
      })
      .catch(() => {
        liveEl.textContent = url;
      });
  });

  window.addEventListener("popstate", () => {
    state = decodeState(window.location.search);
    renderTabs();
    renderMain();
  });

  renderTabs();
  renderMain();
}

main();
