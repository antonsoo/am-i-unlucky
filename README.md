# am I unlucky?

**Exact drop-rate and pity math for gamers. Find out whether you're unlucky, or the system is.**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Live demo](https://img.shields.io/badge/live%20demo-antonsoo.github.io-6c7bff)](https://antonsoo.github.io/am-i-unlucky/)

Players constantly ask "is 900 runs for a 1/512 drop unlucky?" or "how many pulls do I need to be 90% sure?" Answering that correctly needs real probability, and it gets genuinely hard once a pity system is involved — soft pity, hard pity, and 50/50 guarantees make the odds change every pull, so the "expected attempts = 1 / rate" formula everyone reaches for is simply wrong. Most calculators floating around either hard-code one specific game or fall back to Monte Carlo simulation with no stated error bar. This one computes exact probabilities wherever that's mathematically feasible, and says so — with sample sizes and confidence intervals — everywhere it has to fall back to simulation instead.

![Simple drop mode, light theme](./docs/assets/hero-light.png)

## Quickstart

```bash
git clone https://github.com/antonsoo/am-i-unlucky.git
cd am-i-unlucky && npm install
npm run dev
```

Open the printed `localhost` URL. That's the whole setup — no build step, no account, no server.

## Features

- **Simple drop** — a fixed rate `p`, attempts `n`, copies needed `k`, and whether you've got it yet. Get your luck percentile, `P(at least k by n)`, expected attempts, and the attempts needed for 50/90/99% confidence, from the exact negative-binomial distribution. Still waiting, you can be unlucky but never "lucky": the percentile is then only your best case.
- **Pity system** — base rate, soft-pity ramp, hard pity, and an optional 50/50-with-guarantee mechanic. Computed via an exact dynamic-programming pass over the pity Markov chain (not a simulation): expected pulls, percentiles, `P(success within budget)`, and "how lucky was my history" for a pull count you actually used.
- **Collection** — complete a set of items with unequal, independent drop rates. Exact expected attempts and completion probability via inclusion-exclusion, cross-checked against an independent Monte Carlo simulation shown side by side.
- **Time to drop** — combine daily and weekly attempt batches, count every successful copy, and see the chance of finishing within a day budget, the expected time, and 50/90/99% milestones.
- **Presets with honest labels** — a generic soft-pity gacha archetype, two shiny-hunt presets that cite Pokémon's actual documented encounter rates (1/4096, and 3/4096 with the Shiny Charm), and generic "MMO rare drop" / "loot box" archetypes. Every preset is fully editable; the UI says where each number comes from.
- **Shareable URLs** — the full input state lives in the query string, so a link reproduces exactly what you saw.
- **Luck card export** — a rarity-colored PNG ("common" through "legendary", by how far your percentile sits from the median in either direction) you can save and share.
- **Light + dark**, keyboard accessible, responsive to 320px, respects `prefers-reduced-motion`, zero tracking. Calculations run locally; time-mode workers load from the same origin and need their asset cached or a working connection.

![Pity system calculator, dark theme](./docs/assets/dark-hero.png)

## Usage examples

**Simple drop** — 900 attempts at a 1/512 rate, needing 1 copy, still waiting:

| Metric               | Value                                          |
| -------------------- | ---------------------------------------------- |
| Verdict              | Unlucky: 82.8% of players would have it by now |
| P(at least 1 by 900) | 82.79%                                         |
| Luck percentile      | at best 17.2%, if it drops on the next attempt |
| Expected attempts    | 512                                            |
| 50% / 90% / 99% by   | 355 / 1,178 / 2,356 attempts                   |

Had it dropped on attempt 900, the percentile would be exactly 17.2%
("82.8% of players would have gotten it sooner"). Still waiting after 100
attempts reads "not unlucky yet": 17.8% of players would have it by then.

**Pity system** — the bundled soft-pity gacha preset (0.6% base, soft pity from pull 74, hard pity 90, 50/50 with guarantee), asking for 1 copy from a fresh pity counter:

| Metric             | Value                |
| ------------------ | -------------------- |
| Expected pulls     | 93.4                 |
| Std. deviation     | 43.1                 |
| 50% / 90% / 99% by | 80 / 155 / 161 pulls |

![Pity system calculator, light mode](./docs/assets/pity-mode.png)

**Collection** — 4 items at rates 0.3 / 0.2 / 0.1 / 0.05, exact via inclusion-exclusion over `2^4` subsets, cross-checked against a 20,000-run Monte Carlo simulation:

| Metric            | Exact | Monte Carlo (n=20,000) |
| ----------------- | ----- | ---------------------- |
| Expected attempts | 24.00 | 23.98 ± 0.25 (95% CI)  |

The two methods agree to within the simulation's own confidence interval — see [docs/MATH.md](./docs/MATH.md) for the derivation.

![Collection mode with Monte Carlo cross-check](./docs/assets/collection-mode.png)

**Time to drop** — a 2%-per-run source at 1 run/day, needing 1 copy:

| Metric             | Value               |
| ------------------ | ------------------- |
| Expected time      | 50 days             |
| 50% / 90% / 99% by | 35 / 114 / 228 days |

For multiple copies, every successful attempt counts. With two attempts at
50% per batch and a goal of two copies:

| Schedule | Chance after 1 day | Chance after 7 days | Expected time |
| -------- | ------------------ | ------------------- | ------------- |
| Daily    | 25%                | 99.91%              | 2.22 days     |
| Weekly   | 0%                 | 25%                 | 15.56 days    |

Weekly batches finish on days 7, 14, 21, and so on. Daily and weekly sources
can be combined. Old integer daily-rate links still work; fractional daily
attempts now explain how to choose an explicit schedule instead.

![Time to drop mode](./docs/assets/time-mode.png)

![Exported luck card](./docs/assets/luck-card.png)

## How it works

The full derivations live in [`docs/MATH.md`](./docs/MATH.md). Summary:

- **Binomial / negative-binomial tails** are summed term by term from an accurate binomial probability (Loader's saddle-point form, the algorithm behind R's `dbinom`), outward from the point asked about and away from the mean, where the terms only shrink. That keeps them exact from a handful of attempts to billions, and for $p$ as small as one in a trillion: 647 reference values from `scipy.stats.binom`, up to $n = 10^{15}$, are matched to nine significant digits — see `src/math/numeric.ts` and `docs/MATH.md`.
- **Pity systems** are modeled as a Markov chain with state `(pity counter, guarantee flag, copies obtained)` and solved by forward dynamic programming over pulls (`src/math/pity.ts`), which is exact — not simulated — whenever the guarantee mechanic bounds the DP horizon. Naive formulas fail here because the per-pull probability isn't constant (soft pity ramps it) and a lost 50/50 deterministically changes the next roll.
- **Collections** with unequal per-item rates use inclusion-exclusion over subsets of items (`src/math/collection.ts`): $E[T] = \sum_{\emptyset \neq S} (-1)^{|S|+1} / P(S)$. That's exact but $O(2^m)$, so it's capped at 24 items for the expectation and 18 for the full CDF curve, with a Monte Carlo cross-check always shown alongside.
- **Time to drop** convolves accumulated binomial copy counts from each scheduled source. Its mean uses a finite recurrence over the repeating daily/weekly cycle, without truncating time. Collapsing a day into a single success is valid only for the first copy; it gives incorrect multi-copy results.

```mermaid
stateDiagram-v2
    [*] --> Pity0
    Pity0 --> Pity0: miss (prob 1 - rate(c))
    Pity0 --> Featured: hit & win 50/50 (resets pity, copies += 1)
    Pity0 --> Guaranteed: hit & lose 50/50 (resets pity, guarantee = true)
    Guaranteed --> Guaranteed: miss (prob 1 - rate(c))
    Guaranteed --> Featured: hit (guaranteed win, resets pity, copies += 1)
    Featured --> [*]
```

## Accuracy and limitations

- Binomial, negative-binomial, and geometric results are cross-checked in `tests/oracle.test.ts` against fixtures generated by SciPy (`scripts/oracle.py`, `scipy.stats.binom`/`nbinom`/`geom`), typically agreeing to 6-9 decimal digits.
- Scheduled-time results also have 32 independent 80-digit Decimal fixtures: an individual-attempt calculation with a proven bound below `1e-30` on its remaining expected time. Time mode supports 12 sources, 100 copies, and 1,000,000 attempts per batch. Budget and milestone searches stop at 1,000,000,000 days; later milestones are labeled beyond the limit, not impossible. The mean is not truncated at that horizon. Fixed rates, independent attempts, synchronized daily/weekly starts, and no pity or missed batches are assumed.
- The pity DP is exact (zero truncated probability mass, verified by `pmf` summing to 1 to within `1e-9`) **only when the guarantee mechanic is enabled** — that's what gives the DP a true, finite horizon (`target × 2 × hardPity` pulls). With the guarantee disabled, the distribution has unbounded support in principle; the app truncates at a generous horizon and honestly reports the un-covered tail probability instead of hiding it.
- Collection mode's exact math is capped at 24 items (expectation) / 18 items (full CDF curve) because inclusion-exclusion is `O(2^m)`. Above that, only the Monte Carlo estimate is available.
- The "luck percentile" is defined as $100 \times (1 - P(T_k \le n))$ — the share of players who'd need more attempts than you did. That holds when the drop came on attempt `n`; for a player still waiting it is only an upper bound, so the verdict can be "Unlucky" or "Not unlucky yet" but not "Lucky" (see [docs/MATH.md](./docs/MATH.md)). At `n = 0` it is trivially 100%; the UI hides it until at least one attempt is entered.
- Presets are archetypes, not official data mining. Only the two shiny-hunt presets cite a specific published rate (Pokémon's documented 1/4096 base and 3/4096-with-Shiny-Charm encounter odds, in place since Generation VI); the pity preset and the MMO/loot-box presets are generic and explicitly labeled as such. Every number is editable.
- This is a client-side static site: no accounts, no analytics, nothing phones home (the page asks no other host for anything, and its Content-Security-Policy would not let it). Shared links embed your inputs in the URL query string in plain text.

## Development

```bash
npm test          # vitest
npm run lint       # eslint, strict + type-checked
npm run typecheck  # tsc --noEmit, strict mode
npm run build      # tsc --noEmit && vite build
npx playwright install chromium firefox
npm run test:browser # production build, Chromium + Firefox
```

Regenerating the SciPy oracle fixtures requires [`uv`](https://docs.astral.sh/uv/):

```bash
uv run --with scipy python3 scripts/oracle.py
python3 scripts/time-oracle.py # standard library only
```

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for more.

## Contributing

Issues and PRs are welcome. Please keep `npm run lint`, `npm run typecheck`, and `npm test` green, and add oracle or property-based coverage for any new closed-form math.

## License

[MIT](./LICENSE) © 2026 Anton Soloviev

---

<sub>Part of [Officina](https://antonsoo.github.io/officina/), a set of small open-source tools by [Anton Soloviev](https://github.com/antonsoo).</sub>
