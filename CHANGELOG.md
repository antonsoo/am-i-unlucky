# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-09-24

### Added

- Core math library (`src/math/`), pure TypeScript, zero runtime dependencies:
  - Closed-form geometric / negative-binomial tails via the regularized
    incomplete beta function, evaluated with a continued-fraction algorithm.
  - An exact dynamic-programming solver for pity systems (soft pity, hard
    pity, 50/50-with-guarantee), modeled as a Markov chain over
    (pity counter, guarantee flag, copies obtained).
  - Inclusion-exclusion for weighted "collect every item" problems, with a
    seeded Monte Carlo cross-check.
  - Multi-source, runs-per-day time-to-drop conversion.
  - A rate parser accepting `"1/512"`, `"0.2%"`, and `"0.002"` forms.
- Four calculator modes in the UI: Simple drop, Pity system, Collection, and
  Time to drop, each with its own inputs, stats, and distribution chart.
- Presets: a generic soft-pity gacha archetype, two shiny-hunt presets citing
  Pokémon's documented 1/4096 and 3/4096-with-Shiny-Charm rates, and generic
  "MMO rare drop" / "loot box" archetypes.
- Shareable URLs (full input state in the query string) and a rarity-colored
  "luck card" PNG export (canvas-rendered, common through legendary tiers).
- Light and dark themes, keyboard-accessible tab navigation, a focus-trapped
  export modal, and `prefers-reduced-motion` support.
- Test suite (`tests/`): 136 tests across 10 files, including SciPy-generated
  oracle fixtures (`scripts/oracle.py`) for the closed-form math and a large
  seeded simulation cross-check for the pity dynamic program.
- `docs/MATH.md`: full derivations for every formula the app uses.
- CI (lint, typecheck, test, build, and an oracle-fixture drift check) and a
  GitHub Pages deployment workflow.
