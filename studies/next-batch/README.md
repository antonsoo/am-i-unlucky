# Plan from the next weekly batch

Time mode now lets each weekly source start on a chosen day of its first week,
then repeat every seven days. The former interface only modeled weekly batches
on days 7, 14, 21, and so on. That original model was consistent with its stated
assumptions; the new control adds other starting schedules.

| Constructed independent model                     | Mean remaining days | 50% by | 90% by | 99% by |
| ------------------------------------------------- | ------------------: | -----: | -----: | -----: |
| One weekly 50% attempt, first day 7 (old default) |                  14 |      7 |     28 |     49 |
| Same rate and spacing, first day 2                |                   9 |      2 |     23 |     44 |
| Two weekly 50% sources, first days 2 and 5        |                16/3 |      2 |     12 |     23 |

In the second row, the chance of finishing within two days is 50%; under the
old day-7 starting schedule it is 0%. No drop rate changed. These are editable
mathematical models, **not observed game histories or measured player luck**.

The new **First batch (day)** control is a whole number from 1 through the
source's period. Daily sources start on day 1. Weekly sources may start on
days 1–7. Every batch finishes at that day's end. Separate sources keep their
own starting days, and the choices survive a copied URL and reload. Switching
cadence starts at its conventional boundary; the first day remains editable.
An omitted `firstDay` retains the old default `firstDay = everyDays`.

## Independent reference and retained behavior

[oracle.py](oracle.py) uses Python's exact `Fraction` arithmetic without importing
production code. It advances individual Bernoulli attempts day by day for CDFs.
For the full mean, it solves the separate linear system

```text
state = (day phase 0..6, copies held 0..k-1)
E[state] - sum(P(next | state) * E[next]) = 1 day
E[completed] = 0
```

This has `7*k` transient states. Gaussian elimination uses rational numbers;
no finite time horizon or Monte Carlo estimate supplies the mean. The production
code instead uses its existing positive recurrence over a complete repeating
cycle, with source counts and within-cycle elapsed probabilities now respecting
the chosen first days. Both models keep the entire future tail.

The [reference summary](oracle-summary.json) and [complete compressed rational
oracle](oracle.json.gz) cover 134 constructed schedules: every pair of first-week
days for two weekly sources and two copy targets, daily/weekly mixtures,
guaranteed batches, the seven single-source closed forms and the actual two-source
browser example. Across 9,514 checked CDF values, maximum absolute error is
`2.665e-15`; maximum mean error is `1.777e-15` days. Every milestone agrees.
These tolerances describe this cohort, rather than all representable inputs.

Ten synchronized-boundary controls retain the old scalar results, sampled CDFs,
milestones and complete default chart arrays exactly. The [before core record](before/core.json)
was reproduced from an archive of `0f38c85`; the [after record](after/core.json)
asserts equality with it before reporting new schedules. Legacy daily source
links keep their existing migration and fractional-input refusal policies.

## Actual browser workflows

The [before](before/browser.json) and [after](after/browser.json) replays use
Chromium and Firefox at 1440px dark and 375px light widths. The old app shows
its valid day-7 result and has no first-day control. The candidate changes to
day 2, observes the 9-day mean and shifted milestones, copies the actual fallback
share URL, reloads it, edits the day again, and combines sources with days 2/5.
An invalid day 8 clears results and disables sharing; correction recovers them.
Switching the second source to daily restores its day-1 default.

No app responses or calculation workers are mocked. The OS clipboard alone is
deliberately unavailable so the real fallback dialog exposes the copied URL.
Worker scripts keep their existing same-origin loading behavior; this study
makes no cold-offline claim. All four workflows have zero page/CSP/external
request errors, accessibility violations and document overflow.

[Desktop before](before/chromium-1440.png), [desktop after](after/chromium-1440.png),
[phone before](before/firefox-375.png), [phone after](after/firefox-375.png) and
[two separate weekly sources](after/two-weekly-sources.png) are unedited real app
screenshots. All were opened and visually reviewed. The added field uses the
existing layout, labels, focus treatment and numeric controls.

## Reproduce

```sh
npm ci
python studies/next-batch/oracle.py
node studies/next-batch/compile.mjs studies/next-batch/cache/core
node studies/next-batch/replay.mjs studies/next-batch/cache/core OUTPUT_DIR after
npm run build
node studies/next-batch/browser.mjs SERVED_APP_URL OUTPUT_DIR after
```

To replay the pinned old core, materialize `git archive 0f38c85` into a separate
directory, pass that directory as `compile.mjs`'s second argument, and use
`before` in `replay.mjs`. The compiler comes from the current installed lockfile;
the old input source comes from the archive. To reproduce old browser behavior,
build and serve that older checkout separately. The recorded URLs identify the
builds used here.

First days are relative whole days, rather than calendar dates, weekdays,
time zones or times within a day. Models still require fixed independent rates,
no pity and no missed batches. A first batch delayed beyond one complete period
is unsupported. Existing 12-source, 100-copy, million-attempt batch and billion-day
confidence-search limits remain. Means retain their separate overflow policy.
This is a source capability; package and hosted publication need separate checks.
