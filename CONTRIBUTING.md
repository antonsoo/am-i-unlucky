# Contributing

## Setup

```bash
npm install
```

## Common tasks

```bash
npm run dev        # start the Vite dev server
npm test           # vitest
npm run lint        # eslint, strict + type-checked
npm run typecheck   # tsc --noEmit, strict mode
npm run build       # tsc --noEmit && vite build
npm run fmt:write   # prettier --write
```

Please keep `npm run lint`, `npm run typecheck`, and `npm test` green before
opening a PR — CI enforces all three, plus a production build.

## Regenerating the SciPy oracle fixtures

The closed-form math in `src/math/` is cross-checked against
[SciPy](https://scipy.org/) in `tests/oracle.test.ts`. The fixtures it reads
are committed at `tests/oracle/fixtures.json` so CI doesn't need Python, but
if you add or change a case in `scripts/oracle.py`, regenerate them with
[`uv`](https://docs.astral.sh/uv/):

```bash
uv run --with scipy python3 scripts/oracle.py
```

CI also regenerates and diffs this file on every push, so a stale commit
will fail the `oracle-fixtures` job.

## Adding new math

If you add a new closed-form result, please add both:

1. A property-based or edge-case unit test in `tests/` (see the existing
   files for the conventions: `p = 0`/`p = 1`, tiny `p`, huge `n`, etc.).
2. Either an oracle cross-check (if SciPy or another independent library has
   an equivalent) or a large seeded simulation cross-check (see
   `tests/pity.test.ts` for the pattern), and a short derivation in
   `docs/MATH.md`.

## Reporting issues

Please include the exact inputs (rate, pity config, etc.) that produced an
unexpected result — that's usually enough to turn into a regression test.
