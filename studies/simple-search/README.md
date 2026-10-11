# Keep rare-rate searches bounded and the page responsive

Baseline `a939838` accepted `1/100000000000000000` in simple mode, then stalled
in the binary search for its median. At that scale, adding one to the lower
bound can round back to the same number. The initial interval was not subject
to the limit applied when doubling it. Both Chromium and Firefox failed to
finish loading that shared link within five seconds. A separate Node process
also timed out; the [before records](before.json) and [browser records](browser-before.json)
retain those observations. This is a deliberately constructed input, not
production usage data.

The correction bounds the first interval and every expansion at **10^15
attempts**, and checks the final interval before rejecting a milestone. Counts
must be safe integers. The app's existing error display explains that a result
exceeds the calculation limit; it stays responsive and accepts another rate.
No product UI layout or worker architecture changed.

| Case                                 | Baseline                  | Corrected                        |
| ------------------------------------ | ------------------------- | -------------------------------- |
| Median, one copy at `p=1e-17`        | Process/browser timeout   | Explicit calculation-limit error |
| 90% milestone, one copy at `p=3e-15` | Infinity                  | 767,528,364,331,348 attempts     |
| One copy, 900 attempts at `1/512`    | 82.78744888378552% by 900 | Identical complete result        |

Infinity still represents an impossible success at `p=0` or 100% confidence
for a non-deterministic distribution. A finite milestone beyond the supported
range is a different state. If any required milestone or the chart's 99.9%
extent exceeds the limit, simple mode shows the error instead of partial
results, even when its mean could be calculated independently.

## Independent check and realistic recovery

[`oracle.py`](oracle.py) inverts the geometric CDF using 90-digit Decimal
arithmetic with the exact binary64 input values. [Its 28 cases](oracle.json)
cover ordinary and extremely small rates at four confidence levels.
[`replay.mjs`](replay.mjs) runs each baseline and corrected call in an isolated
child with a timeout so the known baseline stall cannot block the study.

The [comparison](comparison.json) records 19 supported and nine explicitly
rejected milestones. Eighteen supported integer answers equal the Decimal
answer. One differs by six attempts at roughly 690 trillion, less than
`9e-15` in relative terms; this existing binary64 CDF rounding is unchanged.
This is not proof of exact integer quantiles at all scales. Five complete
ordinary/rare/degenerate result bundles match baseline exactly. The existing
SciPy probability checks still cover multiple copies.

The new browser workflow loads the formerly freezing link, sees the limit
message, then goes offline. Editing the rate to `1/512` restores all results;
unsafe attempt counts show an error; changing to `1/1000000000000` still
calculates the full result and chart. [Chromium](browser-chromium.json) and
[Firefox](browser-firefox.json) record no page errors, external requests or CSP
violations. Four real screenshots were opened and inspected: the limit message
wraps at 375px without horizontal page overflow. On mobile it follows the
existing inputs and preset list.

- [Chromium desktop](../../docs/assets/simple-search/chromium-1440.png)
- [Chromium mobile](../../docs/assets/simple-search/chromium-375.png)
- [Firefox desktop](../../docs/assets/simple-search/firefox-1440.png)
- [Firefox mobile](../../docs/assets/simple-search/firefox-375.png)

## Reproduce

Use a separate checkout/archive of `a939838` as `BASELINE_ROOT`. The generated
modules below stay inside the ignored study cache in each checkout. No model,
API key, network service or third-party Python package is needed for the oracle.

```sh
npm ci
python3 studies/simple-search/oracle.py # Python 3.11+
npx tsc "$BASELINE_ROOT/src/math/simple.ts" --outDir "$BASELINE_ROOT/studies/simple-search/cache" --module ES2022 --moduleResolution Bundler --target ES2022 --skipLibCheck
npx tsc src/math/simple.ts --outDir studies/simple-search/cache --module ES2022 --moduleResolution Bundler --target ES2022 --skipLibCheck
node studies/simple-search/replay.mjs "$BASELINE_ROOT/studies/simple-search/cache/simple.js" studies/simple-search/cache/simple.js studies/simple-search/comparison.json
npm run build
CAPTURE_SIMPLE_EVIDENCE=1 npx playwright test tests/browser/simple.spec.mjs
```

The broader check is `npm run lint`, `npm run typecheck`, `npm test`,
`npm run build`, and `npm run test:browser` from a clean install. This study
records a supported numerical range, not game-rate validation or production
performance measurements.
