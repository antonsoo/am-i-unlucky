# Same-attempt finishes are not faster players

At baseline `d18d125805ef579f861a6e0280a4b7dcd7452da0`, a first-try success
at a 90% rate was labelled **Unlucky**, saying **90% of players would have
gotten it sooner**. No player can finish before the first attempt. The error
also affected the exported PNG. In the two-roll model with a 50/50 first roll
and a guaranteed win after a loss, completion on roll two became **Legendary
bad luck**, claiming everyone finished sooner.

The independent arithmetic is small enough to inspect directly:

| Completed model history            | Earlier | Same attempt | Later |
| ---------------------------------- | ------: | -----------: | ----: |
| First attempt, 90% rate            |      0% |          90% |   10% |
| Second roll, 50/50 then guaranteed |     50% |          50% |    0% |

[cases.mjs](cases.mjs) retains both runnable share-link inputs. These are
synthetic probability models, not claims about a specific game's actual rules.
Both outcomes now read **About average / Common** and retain all three shares
on the page and in the actual downloaded card.

## Meaning of the comparison

For completion time T and observed completion n, the three values are
P(T<n), P(T=n), and P(T>n). They are mutually exclusive and sum to one.
The earlier UI used 1-P(T>n) as "sooner", incorrectly adding the ties.

In the reversed rank distribution, same-attempt finishes occupy the interval
[P(T>n), P(T>=n)]. The outlined band shows that interval. The marker uses the
point nearest the median; it does not invent a unique rank within ties. Rarity
uses the smaller inclusive tail, capped at 50%: finishing this soon or sooner,
or taking this long or longer. The headline requires more than 60% strictly
later outcomes for "Lucky", or more than 60% strictly earlier outcomes for
"Unlucky". Otherwise it says "About average". Those coarse labels are display
choices, not additional statistical findings, and "average" refers to the rank
band rather than distance from the mean.

An unfinished history is still censored. After three misses at 50%, 12.5% of
players would also be waiting and 87.5% would have finished. Its card shows
those two shares; the old 6.25% next-attempt score described an outcome that had
not happened. A claimed completed history with fewer attempts than copies, a
zero rate, or the wrong deterministic completion time is unavailable for rating.
Uncalculated or unsupported pity completions stay unavailable too.

| Source API                                                                | Current meaning                                                                              |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `simpleLuckComparison`                                                    | Earlier/tied/later probabilities; null for impossible completion                             |
| `simpleWaitingComparison`                                                 | Finished-by-now / still-waiting probabilities                                                |
| `pityLuckComparison`                                                      | Earlier/tied/later probabilities, including the live unplotted tail; null when unsupported   |
| `luckPercentile`, `SimpleDropResult.luckPercentile`, `pityLuckPercentile` | Existing strict-later percentage retained for compatibility; insufficient alone to rate ties |
| `luckPosition`                                                            | Conservative display position derived from the complete observation                          |

Small lower binomial tails are summed directly instead of subtracting a CDF
rounded to one. For example, a 50% drop still missing after 100 attempts has
positive probability 2^-100. No distribution is renormalized, and no drop rates,
means, confidence milestones or preset tables are changed. The calculations
remain floating-point models subject to the existing bounds.

## Independent checks and replay

[oracle.py](oracle.py) generates [oracle.json](oracle.json). It uses exact
combinatorial fractions for 84 simple histories, and the existing independent
rational absorbing-chain oracle's 80-digit CDF values for 2,688 pity histories
from 84 models. The input oracle hash is retained. In the working replay,
1,155 histories have supported positive-mass completions and 1,617 are correctly
unavailable. Maximum absolute probability error is below 4e-14. A separate case
checks an unbounded model with more than 60% unplotted live mass and refuses a
history beyond the computed horizon.

[replay.mjs](replay.mjs) compiles the chosen source tree and runs those cases.
It also replays both bundled pity presets from a fresh counter, for three copies,
and from advanced guaranteed pity: six model scenarios. It hashes the entire
PMF and distribution metadata, retains moments and confidence milestones, and
retains all legacy strict-later outputs. This reuses the pinned bundled table;
it is not a new community-data collection or a validation of a game's rates.
[before.json](before.json) preserves the baseline output.

```sh
npm ci
python3 studies/tied-outcomes/oracle.py
node studies/tied-outcomes/replay.mjs src /tmp/tied-replay.json
npm run build
node studies/tied-outcomes/browser.mjs dist /tmp/tied-browser.json verify /tmp/tied-screens
```

For the baseline, extract the pinned revision with `git archive`, pass that
archive's `src` to `replay.mjs`, and add `baseline` as the third argument. Build
that archive and give its `dist` to the browser script with the `baseline` mode.
The baseline's public-facing bug is retained in both browsers, not inferred
solely from a unit test.

The browser harness serves an actual production build with `Cache-Control:
no-store`, stops its HTTP server after the results and initial fonts load,
then opens the first card and saves its real PNG. It checks the displayed shares,
records the canvas's actual drawn labels and numbers, checks the downloaded PNG
signature and 1080x1350 dimensions, and records page errors, CSP violations,
requests and overflow in Chromium/Firefox at 1440 and 375 px. The integration
checks also cover keyboard focus, accessibility, waiting histories, impossible
completions, input recovery and deterministic multi-copy explanations.

This workflow exposed a second defect: the first card requested a previously
unused font after the server stopped in all eight baseline cases. The source
now prepares the card's specific faces during page load and waits before its
first paint. It uses the same prepared faces for the page and card; a failed
font download can still use the fallback rather than preventing export.
The bundled Sans files are variable fonts; one CSS face now covers their four
used weights. The previous separate declarations could request the same file
again in Firefox when a bold note below the fold became visible after load.

This work updates source only. It does not publish a registry package, release
tag, or hosted deployment. The existing live demo is not evidence of this repair.
