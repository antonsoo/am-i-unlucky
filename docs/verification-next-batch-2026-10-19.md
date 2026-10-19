# Next weekly batch: clean source verification

Source `0621e98` adds an independently chosen first batch day to each weekly
source. Full-tail means, CDFs, milestones, charts, editing and shared URLs retain
that timing. Omitted values keep the existing boundary defaults. This extends
the old synchronized model; its previous day-7 answers were consistent with
its stated assumptions.

The [independent reference](../studies/next-batch/README.md) retains exact rational
day enumeration and a separate phase-state linear-system mean. All 134 modeled
schedules and 9,514 CDF checks agree within stated double-precision tolerances;
ten synchronized controls retain their complete recorded output exactly.
An archived `0f38c85` core separately reproduces those controls. Before this
publication, all [35 canonical old site files](../studies/next-batch/before/hosted-bytes.json)
matched the old source build, and [four actual public workflows](../studies/next-batch/before/hosted-browser.json)
confirmed its day-7 result and absence of the new control.

A fresh `git archive 0621e98`, with no copied dependencies/build, was checked
using Node 24.21.0 and npm 11.19.0:

| Check                                            | Result                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------- |
| `npm ci`                                         | 137 packages; zero reported audit vulnerabilities                   |
| Lint, strict types, formatting, production build | Passed                                                              |
| Unit suite                                       | 418 tests in 21 files, default and German locales, with two workers |
| Production browser suite                         | 146 Chromium/Firefox workflows passed                               |
| Independent core replay on the clean build       | 134 phased models and 10 unchanged boundary controls passed         |
| Build versus working Node 26 output              | All 35 files byte-identical, including workers and source maps      |

```sh
npm ci
npm run lint
npm run typecheck
npm run fmt
npm test -- --maxWorkers=2
LC_ALL=de_DE.UTF-8 LANG=de_DE.UTF-8 npm test -- --maxWorkers=2
npm run build
node studies/next-batch/compile.mjs studies/next-batch/cache/core
node studies/next-batch/replay.mjs studies/next-batch/cache/core OUTPUT_DIR after
npm run test:browser
```

The [verification receipt](../studies/next-batch/verification.json) retains all
35 generated-file hashes. The source study additionally checks actual share
fallback URLs, reloads, independently phased sources, invalid-day result
retirement, disabled sharing and correction. The clipboard-unavailable control
mocks only that OS capability; workers and app responses are real. Workers keep
their existing same-origin script loading, without a cold-offline guarantee.

All before/after desktop and 375px screenshots were opened and inspected.
The paired schedule/first-day inputs fit the existing design, and all four
focused accessibility scans have zero violations. The first day remains
editable after a cadence change, with an explicit valid range.

These are whole-day independent rate models, not player histories, date/time-zone
forecasts or empirical game validation. Existing numerical, overflow, source,
copy and search limits remain. This is a static application; no registry
package or tag was released by this work.
