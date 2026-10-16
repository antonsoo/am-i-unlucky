# Simple inputs must describe the displayed result

At baseline `b9a9a62d99dc1488263e162a5cf2291d20d13e14`, entering **1.5 copies**
with 4 attempts and a 50% rate left the field at 1.5 but displayed an **Unlucky**
verdict for **one copy**. The copied URL contained `k=1`, and the card was
exportable. Fractional attempts were also floored. Blank and negative attempts
became zero; blank, zero and negative copies became one.

Core fix: `fd4d372e3592331115f1d33f62379595305ee5b7`. Counts now use the numeric
control's value without flooring or clamping. Validation happens on every edit;
errors remain attached to the relevant field. Invalid drafts survive switching
away and back. The previous result and card disappear immediately, before the
120 ms recalculation debounce. Valid settings can still be shared immediately.

## Browser observations

Constructed inputs, not player histories. Chromium and Firefox, each at 1440 and
375 CSS pixels, using actual production builds with the network disabled after
initial load. The clipboard API is replaced with a recorder; PNG downloads use
the real export path. No page errors or network requests occurred while offline.

| Observation                                                               | Baseline | Corrected |
| ------------------------------------------------------------------------- | -------: | --------: |
| Invalid-input trials                                                      |       48 |        48 |
| Invalid inputs still shareable                                            |       48 |         0 |
| Invalid inputs displaying statistics                                      |       28 |         0 |
| Invalid inputs offering a card                                            |       20 |         0 |
| Previous card present immediately after an edit, including limit controls |       52 |         0 |

The 48 invalid trials comprise 36 count edits and 12 invalid-rate edits. Four
additional calculation-limit controls use a valid rate of `1/100000000000000000`:
both versions show the limit message and allow sharing those exact settings.
This fix does not reject valid settings merely because a calculation is outside
the supported search range.

All **44 valid observations** retained identical result text, chart SVG hashes,
share queries and drawn card text. The **32 actual PNG downloads** retained
identical non-`deBG` chunk hashes, including image data. All 16 Chromium PNGs
were byte-identical. Firefox's private `deBG` chunk differed; complete PNG byte
identity is not claimed there. Chunk groups retain counts, total payload size
and a SHA-256 of the ordered payload hashes joined with newline characters.

- [Before observations](before/results.json), [after observations](after/results.json),
  [machine-checked comparison](comparison.json).
- Desktop: [before](before/chromium-1440.png), [after](after/chromium-1440.png).
- Phone: [before](before/firefox-375.png), [after](after/firefox-375.png).
  All eight retained screenshots were visually inspected.

## Reproduce

Install the locked dependencies and build each checkout, then serve the builds
on separate local ports. From the corrected checkout, run:

```sh
node studies/simple-inputs/browser.mjs http://127.0.0.1:4332/am-i-unlucky/ studies/simple-inputs/before
node studies/simple-inputs/browser.mjs http://127.0.0.1:4331/am-i-unlucky/ studies/simple-inputs/after
python3 studies/simple-inputs/compare.py
```

The baseline build used an archive of the baseline commit and the checkout's
locked dependencies. A separate archive of the core fix received a fresh
`npm ci` under Node 24.21.0: ESLint, TypeScript, 407 unit tests, Vite build and
142 Chromium/Firefox browser tests passed. The new browser regressions cover
invalid drafts, mode switches, shared URLs, immediate sharing and stale cards.
[Artifact hashes](artifacts.json) verify all 204 core archive files, 35 production
build files and all 35 files fetched from the server used for the replay.

Number-input parsing and JavaScript numeric precision are unchanged. This is
input validation, not exact arbitrary-precision decimal parsing. The probability
algorithms, presets, dependencies and package version are unchanged. These are
source changes only; this study does not claim a hosted deployment or release.
