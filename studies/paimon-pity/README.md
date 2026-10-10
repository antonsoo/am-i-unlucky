# The soft-pity preset against 27 million logged five-stars

The pity calculator is exact for whatever model it is given: a base rate, a soft-pity ramp, a hard pity, a 50/50 with a guarantee. Whether that model resembles any real game was never checked. The bundled preset ("0.6% base, soft pity from pull 74, hard pity 90, 50/50 with guarantee") is recognisably one game's limited-character banner, and the README admitted its curve was not from data. So a player asking "is 150 pulls for one copy unlucky?" got an exact answer to a question about an invented system.

paimon.moe, a community wish tracker, publishes per-banner tallies of the five-stars its users have logged, by pull number. This study reads them for Genshin Impact's character event banners and compares them with the preset, pull by pull and then in the numbers the tool reports.

**What came out**

- **The curve held where the logs can speak.** Over 98 banner phases and 26,919,356 logged five-stars, the chance of a five-star on pulls 74 to 83 is within 0.25 points of the preset's 6-points-a-pull ramp in banner phases from version 5.0 on (7,657,036 five-stars) and within 0.74 points before 5.0. Before soft pity the logs read 0.65%, against the preset's 0.6%; whether the 0.05 points is real or the mark of the biases below depends on a parameter the data cannot fix (see The measure), so "the curve held" is conditional on the preset being right below pull 74.
- **The logged tail above pull 84 is probably contamination.** From pull 86 the logged chance falls below the ramp (by 3 points at 86, 9 at 87, 20 at 88, 33 at 89 for 5.0 and later) and is not monotone. Counted as streaks that reached each pull, the logs hold 5,430 at pull 86 where the ramp leaves 5,061, 321 at 88 where it leaves 167, 95 at 89 where it leaves 16, 35 at 90 where it leaves 1: about 150 extra long streaks in 7.66 million, not a lower hazard. The new preset uses the ramp there. Those pulls are 0.25% of five-stars; for one copy the 50% / 90% / 99% points are 80 / 155 / 161 pulls under the preset and under the logged table alike, and the mean moves from 93.4 to 91.7.
- **The 50/50 is what the preset had wrong, and it matters.** The preset's 50% matches the logs before 5.0 (50.1% by one estimator, 50.0% by another, over 61 banner phases). The publisher's February 2025 post gives 55.000% for something it words as the share of five-stars that are the promotional character; the tool reads it as the win rate on a roll with no guarantee. Moving the preset from 50% to 55% takes the chance of one featured copy within 90 pulls from 59.4% to 63.5%, and within 600 pulls for seven copies from 32.2% to 39.3%. That is a bigger change than anything in the hazard curve.
- **The logs do not show the publisher's figure.** There is no change at version 5.0 in the logs. The win rate rises across versions 5.1 to 5.5 and is flat from 5.5, at 57 to 60% by two estimators, not 55%. The cause is not known.
- **The tracker's published denominators are not usable as they come.** The site publishes a count of pulls at each pity alongside the five-stars, but the server builds it only from users who got at least one five-star in that banner. Hazards computed from it are inflated by 5% at pull 1 and 32% at pull 30. Counting the streaks that ended at pull n or later avoids that condition, and it carries the other biases listed below.

**What changed in the tool (source checkout, unreleased).** A new pity preset, "Genshin Impact character banner, as logged (Oct 2026)", runs the same Markov chain on a per-pull table: logged values for pulls 1 to 84, the archetype's ramp above, and the 55% featured chance. Its label carries the source, retrieval date and sample size, and the results panel and the exported luck card name it as community data whenever it is in use. The old preset stays, relabelled as an archetype with its 50/50 stated as the rule before the publisher's 55%. `PityConfig` gained an optional `rates` table; nothing is simulated. The answers are exact arithmetic for the table; the table itself has sampling error and bias.

## The data

**Source.** `https://api.paimon.moe/wish?banner=<id>`, the request the site's own "Global Wish Stats" page (`https://paimon.moe/wish/tally`) makes when you open a banner. One GET per banner, in order, 2.5 seconds apart, no login, no individual history: 107 scripted requests plus a handful of manual probes. Banner ids are the front end's own: 300001 to 300106 for character event banners (each id is one banner phase; from version 2.3 two phases run at once; the list is in the MIT-licensed front end repository, pinned in `manifest.json`), and 200001 for the standard banner. The first eight (versions 1.0 to 1.2) answer "data is not available yet"; 98 return tallies, covering versions 1.3 to 7.1, phases started 2021-03-02 to 2026-09-23. Retrieved 2026-10-08. The server (read at the commit in `manifest.json`) recomputes only the latest two character phases every two hours, so older tallies are snapshots from when they were last computed; the tally time stamps run from 2026-09-28 to 2026-10-08.

**Terms.** No terms of use and no `robots.txt` exist (that path returns the app shell). The privacy policy (`https://paimon.moe/privacy-policy`) says players who tick "Submit pity for global wish stats" have their pity counts and five-star records aggregated, and that these feed the stats page; it says the service never stores UIDs, passwords or names. The tallies are aggregates the site chose to publish. The raw tallies stay in a gitignored cache (`studies/paimon-pity/cache/`) and are not redistributed; `results.json` holds only the pooled counts by pull number. No licence is stated for the tallies themselves. `banners.json` is an extract of banner dates, versions and featured characters from the tracker's front end, which is MIT-licensed; its notice is in `LICENSE-paimon-moe.txt`.

**Size.** 26,919,356 logged five-stars across the 98 banner phases; 33,761,252 user-banner submissions (0.80 five-stars per submission); 1,677,260,131 tallied pulls of every rarity. For versions 5.0 to 7.1 (37 banner phases): 7,657,036 five-stars, 475,138,852 pulls. Tallies of different banner phases are pooled by summing the counts at each pull number.

**What the five-star counts are.** `pityCount.legendary[n]` is the number of five-stars logged on a banner phase at pull n of a streak (pull n since the previous five-star, wherever that was; the counter runs across banners). It sums to the phase's five-star total. The client submits at most the last seven banner phases of each user's history (`src/functions/wishTally.js` in the front end, commit 0a88d53).

**The yardsticks.**

- The publisher's post, "Capturing Radiance" Mechanic: You Ask, I Answer! (`https://genshin.hoyoverse.com/en/news/detail/125274`, published 2024-08-16). The page is client-rendered; the text was read from the JSON the page loads (URL and hash in `manifest.json`). Its figures appear in a paragraph headed "Update on February 10, 2025", which is after versions 5.0 to 5.3 were live. The sentence: "Including the possibility of triggering "Capturing Radiance," when winning a 5-star character in the event wish, there is a consolidated probability of 55.000% it will be the promotional character." It adds a base chance of triggering the mechanic of 0.018%, and a guarantee of the trigger "the next time you obtain a 5-star character" if the promotional character was the second 5-star on three consecutive occasions. It says the mechanic arrives after the Version 5.0 update; the tracker's banner list puts the first version 5.0 phase at 2024-08-28. Read literally, "winning a 5-star character in the event wish ... 55.000% it will be the promotional character" is the share of all five-stars that are the featured character. The logs contradict that reading (the featured share is 70% from 5.0). The tool and the wiki read it as the win rate on a roll with no guarantee, which is an interpretation, not the post's wording.
- The community wiki's Wish page (`https://genshin-impact.fandom.com/wiki/Wish`, CC BY-SA), read as wikitext: a 1.6% "consolidated rate, with guarantees" for the event character wish, "one 5-star character per 62.5 wishes", soft pity starting "at approximately the 74th wish", and the statement that the terms "pity", "banner" and "soft pity" are unofficial and that the existence and start of soft pity were "determined from player testing". Its Character Event Wish page (`https://genshin-impact.fandom.com/wiki/Character_Event_Wish`) has a Rates table with a base rate of 0.6% and two average rates with pity for a five-star character: 1.6% under the column headed "(Official)" and 1.6052% under "(Community Estimation)", the latter citing a bilibili estimate from 9.45 million wishes. The base-rate column carries no marking. The per-pull table beneath it (0.6% up to pull 73, "0.6% + (X - 73) × 6%" for 74 to 89, 100% at 90) is cited to the community estimate, not marked official. So the wiki gives the 1.6% as official and the 0.6% base unmarked; the in-game odds page was not retrieved. The estimate's 1.6052% is 62.30 pulls per five-star, the archetype's 62.297, and its hazard at pull 89 is 96.6%.

## The measure

For each pull n from 1 to 89, the hazard is `successes(n) / survivors(n)`, where `successes(n)` is the number of five-stars logged at pull n and `survivors(n)` is the number logged at pull n or later: the streaks that got as far as pull n and ended. At pull 90 the logged hazard is 1 by construction, because the server discards whole user-banner records (with all their pulls) when any pity in them is above 90.

This estimator avoids the site's conditioning on success. It is not free of bias, and three things follow from using completed streaks only.

1. **Left truncation.** A history starts at a pull the tracker can see; the streak it is inside at that moment has already been running for an unknown time. The tracker counts it from zero, so the first five-star of every history is logged at too low a pull number.
2. **Missing last streaks.** A history ends inside an unfinished streak, which never appears as a five-star and is therefore absent from `survivors`.
3. **The site's own denominators condition on success.** `countEachPity` is the sum, over user-banner records with at least one five-star, of the pulls made at each pity. A user who pulled 40 times on a banner and got nothing contributes nothing, although they were at risk at pulls 1 to 40.

`sim.py` draws streak lengths from the preset's own hazard, so the truth is known, and builds histories the way the logs are built: users with K completed streaks, a left-truncated first streak (a random moment lands in a streak with probability proportional to its length), a final streak cut off, pulls cut into banner windows. Then it applies each estimator.

| Scenario (truth: the archetype, 0.6% flat, ramp to 100% at 90)                          | Result                                                                                                        |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| A. 3,000,000 independent complete streaks                                               | survivor estimator within 0.0029 of the truth at every pull from 1 to 84 (this case is exact by construction) |
| B. 4 completed streaks per user (first-streak share 25%)                                | base 0.84 to 1.1%; mean 55.8 pulls per five-star                                                              |
| B. 12 completed streaks per user (first-streak share 8.3%)                              | base 0.66 to 0.72%; mean 60.1; ramp at 74 to 80 within 0.2 points                                             |
| B. 40 completed streaks per user (first-streak share 2.5%)                              | base 0.61 to 0.65%; mean 61.7                                                                                 |
| C. as the 12-streak case, banner windows of 30 pulls on average, site-style denominator | hazard 0.71% at pull 1, 1.26% at pull 30 (truth 0.6%); the survivor estimator reads 0.71% at both             |

K, the number of completed streaks per user, is a free parameter, and the table shows how far the answer depends on it. The first-streak share it sets is what moves the base rate and the mean. The logs sit between the K = 12 and K = 40 rows (0.65% and 61.1 pulls for 5.0 and later; 0.71% and 60.0 before). K was chosen to match; the match is a calibration, not a test. It also cannot be literal: the client submits at most seven banner phases per user, and the logs hold 0.80 five-stars per submission, so a user contributes a handful of streaks at most, and truncation applies only to users whose whole history begins inside the window, a share the tallies do not give. What the simulation does show is that left truncation plus cut-off streaks can lift a true 0.6% to the 0.65 to 0.72% seen here and shorten the mean by a few percent, so the logs are compatible with the archetype below pull 74, not evidence for it: if the true base were 0.65% the logs would read the same way. The sub-73 comparison is therefore conditional on the archetype.

The intervals in the figure are Wilson intervals that treat each five-star as independent. They are too narrow: the same player appears in many banner phases.

## Results

![Logged hazard against the archetype](hazard.svg)

Hazard on pull n, pooled over banner phases from version 5.0 to 7.1 (`results.json`, `pooled["5.0+"]`):

| Pull | Archetype | Logged, 5.0 and later (95% interval) | Streaks that reached it | Logged, before 5.0 |
| ---: | --------: | -----------------------------------: | ----------------------: | -----------------: |
|    1 |      0.6% |                 0.64% (0.64 to 0.65) |               7,657,036 |              0.69% |
|   30 |      0.6% |                 0.65% (0.64 to 0.65) |               6,327,372 |              0.71% |
|   73 |      0.6% |                 0.65% (0.65 to 0.66) |               4,785,013 |              0.77% |
|   74 |      6.6% |                 6.61% (6.59 to 6.64) |               4,753,701 |              6.76% |
|   76 |     18.6% |              18.60% (18.57 to 18.64) |               3,879,258 |             18.68% |
|   78 |     30.6% |              30.54% (30.48 to 30.59) |               2,383,657 |             30.59% |
|   80 |     42.6% |              42.53% (42.43 to 42.62) |               1,051,436 |             42.43% |
|   82 |     54.6% |              54.35% (54.18 to 54.53) |                 311,775 |             54.29% |
|   83 |     60.6% |              60.39% (60.13 to 60.64) |                 142,320 |             59.86% |
|   84 |     66.6% |              65.82% (65.42 to 66.21) |                  56,380 |             65.12% |
|   85 |     72.6% |              71.83% (71.19 to 72.46) |                  19,273 |             68.72% |
|   86 |     78.6% |              75.51% (74.34 to 76.63) |                   5,430 |             68.60% |
|   87 |     84.6% |              75.86% (73.49 to 78.09) |                   1,330 |             59.58% |
|   88 |     90.6% |              70.40% (65.19 to 75.13) |                     321 |             47.72% |
|   89 |     96.6% |              63.16% (53.12 to 72.17) |                      95 |             52.08% |

Two odd-numbered halves of the 5.0-and-later banner phases (4,822,881 and 2,834,155 five-stars) differ by at most 0.54 points at any pull from 1 to 84. The halves share players, so this checks stability, not independence.

Consolidated rate, from the mean pulls per five-star: archetype 62.3 pulls (1.605%); the wiki's community estimate from 9.45 million wishes 62.3 (1.6052%); the wiki's official 1.6%, 62.5; logged 5.0 and later 61.1 (1.636%); logged before 5.0 60.0 (1.668%). The logs are 2 to 4% short of the wiki's figures, the direction and rough size the biases above produce.

**The tail.** Streaks that reached pull n, from the 4,753,701 that reached pull 74, against what the archetype's ramp leaves (`results.json`, `tail_check`):

| Pull                  |     84 |     85 |    86 |    87 |  88 |  89 |  90 |
| --------------------- | -----: | -----: | ----: | ----: | --: | --: | --: |
| Ramp leaves           | 55,305 | 18,472 | 5,061 | 1,083 | 167 |  16 |   1 |
| Logged, 5.0 and later | 56,380 | 19,273 | 5,430 | 1,330 | 321 |  95 |  35 |

Through pull 86 the two agree within 7%. The excess is small in absolute terms (about 150 streaks at pull 88, 80 at pull 89, 35 at pull 90, of 7.66 million) and the hazard it produces is non-monotone, which a ramp cannot be. The excess is what a few hundred miscounted histories would give, for instance duplicated or phantom pulls that make a streak look longer than it was; the whole-record deletion above 90 removes some such cases and would leave others. The cause was not isolated, and the two eras disagree at pull 88 (70.4% and 47.7%). The community estimate puts the hazard at 96.6% at pull 89. The preset uses the logged values to pull 84 and the ramp above, because the logs are well determined there (56,380 streaks at pull 84) and are not above.

### What the tool answers

The retained `answers.json` predates the [pity-tail correction](../pity-tails/README.md),
with source at `9f505f7`. Its history-percentile fields include ties; current
source excludes ties, consistently with simple mode. The bounded-model means,
milestones and budget probabilities in the tables below are unaffected. Keep
that convention in mind when replaying the script against newer source.

The same chain, four settings (`answers.mjs`, `answers.json`). Fresh pity counter, 50/50 pending, one copy:

|                                                                              | Archetype, 50/50 (released 0.4.0 preset) | Archetype hazard, 55% | Logged hazard, 50/50 | Logged hazard, 55% (new preset) |
| ---------------------------------------------------------------------------- | ---------------------------------------: | --------------------: | -------------------: | ------------------------------: |
| Mean pulls                                                                   |                                     93.4 |                  90.3 |                 91.7 |                            88.7 |
| Std. dev.                                                                    |                                     43.1 |                  42.6 |                 43.2 |                            42.7 |
| 50% / 90% / 99% by                                                           |                           80 / 155 / 161 |        79 / 155 / 161 |       80 / 155 / 161 |                  79 / 155 / 161 |
| P(within 90 pulls)                                                           |                                    59.4% |                 63.5% |                60.3% |                           64.3% |
| P(within 120 pulls)                                                          |                                    70.5% |                 73.4% |                71.9% |                           74.7% |
| Share of players who would need at least as many pulls as a 150-pull history |                                    20.9% |                 18.8% |                19.4% |                           17.5% |

Two copies, 50/50 pending:

|                     | Archetype, 50/50 | Archetype hazard, 55% | Logged hazard, 50/50 | Logged hazard, 55% |
| ------------------- | ---------------: | --------------------: | -------------------: | -----------------: |
| Mean pulls          |            186.9 |                 180.7 |                183.4 |              177.3 |
| 50% / 90% / 99% by  |  183 / 265 / 314 |       174 / 253 / 313 |      179 / 260 / 314 |    170 / 249 / 313 |
| P(within 180 pulls) |            48.7% |                 53.2% |                50.7% |              55.2% |
| P(within 270 pulls) |            90.9% |                 92.6% |                91.8% |              93.3% |

Seven copies: mean 654.1, 632.3, 642.0, 620.6 pulls; P(within 600) 32.2%, 39.3%, 36.1%, 43.3%; P(within 800) 89.9%, 93.1%, 91.6%, 94.3%. On a guarantee, one copy: mean 62.3 and 61.1 (archetype and logged), 50% / 90% / 99% by 76 / 80 / 83 in all four.

Reading across: the hazard curve moves the answers by about 2% (total variation distance between the one-copy distributions, archetype against logged hazard with the same 50/50: 0.025). The 50/50 moves them by about 3 to 4% in the mean and 4 to 7 points in budget probabilities. Both together: 5%, and up to 11 points for seven copies. The "released" column is the 0.4.0 preset with the code of 0.4.0; the three others need this checkout.

The 55% is memoryless in the tool: every roll with no guarantee is won with probability 0.55. The publisher's mechanic has memory (the guaranteed trigger after consecutive occasions), so the answers for several copies are approximate in a way not quantified here; one copy from a fresh counter is least affected.

### The 50/50

![Win rate by version](fifty.svg)

`list[].guaranteed` counts copies the tracker's client flagged as guaranteed (the previous five-star was not featured). Featured, flagged and non-featured five-star counts per banner phase give two readings.

- **Labelled win rate**, `(featured - flagged) / (featured - flagged + non-featured)`: 51.9% for the 61 banner phases before 5.0 (interval 51.88 to 51.93, which treats rolls as independent and ignores the bias below), 57.1% for the 37 from 5.0.
- **Featured share** of all five-stars: 66.7% before 5.0, 70.3% from 5.0. If every roll is won with probability w when not guaranteed and a loss guarantees the next, the share is 1/(2 - w): 66.7% for w = 0.5 and 69.0% for w = 0.55.

Both readings carry a bias. The tracker cannot know the guarantee state of the first five-star in a history, so it labels it "50/50"; about a third of those were guaranteed and won, which counts as 50/50 wins. With 8% of rolls first rolls, that lifts a true 50% to 51.9% (4%: 51.0%) and a true 55% to 56.6% (4%: 55.8%). The pre-5.0 numbers give a check on the rule: the featured share 66.7% implies 50.1%, with no first-roll correction needed. The labelled rate 51.9% corrects to 50.0% at 8% first rolls, but that value was chosen to fit the known 50%, so it is a calibration, not a second test.

By version (`fifty_fifty_by_version`), the labelled win rate is 51.7%, 51.4% and 51.6% for versions 4.6 to 4.8, 51.9% for 5.0 (no change), then 53.2%, 54.3%, 55.4% and 55.3% for 5.1 to 5.4, 58.2% at 5.5 and flat at 58 to 59% to 7.1. Split into groups (the split at 5.5 was drawn after seeing the data):

| Banner phases      | Labelled win rate | Featured share | w from share | w from labelled (4% / 8% first rolls) |
| ------------------ | ----------------: | -------------: | -----------: | ------------------------------------: |
| before 5.0 (61)    |             51.9% |          66.7% |        50.1% |                         51.0% / 50.0% |
| 5.0 to 5.4 (10)    |             54.0% |          68.5% |        54.0% |                         53.1% / 52.2% |
| 5.5 and later (27) |             58.7% |          71.2% |        59.5% |                         58.0% / 57.3% |

So the logs show no step at version 5.0: the rate rises across 5.1 to 5.5 and is flat from there, 7 to 9 points above the old rule and 2 to 4 above the publisher's 55%. Nothing tested here explains the rise. Candidates are a change to the mechanic, opt-in selection (players who lost may submit less), and a change in the tracker or its pipeline; none was tested. The preset uses 55%, because the logs are opt-in, the first-roll correction is an estimate, and a gap of 2 to 4 points could be a selection effect as easily as the game. The field is editable.

## What was wrong and what changed

- The preset's 50% matches the logs before 5.0. From 5.1 the logs and the publisher both say a featured character is more likely on a roll with no guarantee; for a player on a current banner the 50% understated it by 5 points or more. The archetype keeps the 50%, and its description now says so.
- The hazard curve agreed with the logs to within a point up to pull 83. Nothing in the tool depended on the pulls above 84, but the tool could only say "exact for this model"; it can now say "exact for this table, and the table comes from logged pulls".
- `PityConfig.rates?` takes a per-pull table in place of the base rate and ramp (hard pity and the guarantee are unchanged). The new preset carries one, generated from `results.json` by `make_table.py` into `src/logged-rates.ts` (excluded from the formatter so the committed bytes are the generator's). The pity panel says when a table is in use, drops it as soon as the base rate, soft pity, ramp or hard pity is edited, names the preset and "community data" in the results and on the exported luck card, and keeps the table in share links as `table=<preset id>` (only ids the build ships are honoured).
- Tests: the table reproduces the parametric chain exactly when it is the parametric curve; the one-copy distribution under the new preset equals an independent renewal calculation (one streak, then a second guaranteed one with probability 1 - w) to 12 digits; the table is monotone from pull 74 and takes the ramp above 84; share links keep and sanitise the table id.

## What is left

- The logged tail above pull 84, and the rise in the 50/50 win rate between 5.1 and 5.5, are unexplained.
- The memory in the publisher's mechanic is not in the tool; the size of the effect on multi-copy answers is not quantified.
- Weapon banners and the standard banner are not used. The standard banner pools 6,647,742 five-stars but reads a base of 1.3% and 49.5 pulls per five-star, which is what scenario B gives when most histories contain few streaks; no preset was built from it. Weapon banners have a different pity (80) and a different featured rule.
- No second game was looked at.
- The first-roll share for the 50/50 correction is bracketed at 4 to 8% from the simulation and the early hazard, not taken from the tallies.

## What this does not show

- That the logs are the game. They are what opt-in tracker users submitted. The self-selected are not the average player, and a tracker user who got a bad run may be less (or more) likely to submit. The tally cannot tell.
- That the real hazard is the logged one. The logs are shorter than the wiki's figures by 2 to 4%, and one mechanism (truncation and cut-off streaks) does that; the table is not corrected for it, so the new preset is the logs as they are, a little short in the bulk.
- That the archetype is right below pull 74. The comparison there is conditional on it (see The measure).
- Anything about the publisher's real odds. The publisher's figures here are the post's 0.018%, 55.000% and the three-in-a-row guarantee, and how the 55.000% is read is the wiki's interpretation. The 0.6% base and the 6-points-a-pull ramp are the wiki's, the base unmarked and the ramp cited to a community estimate; the logs agree with the ramp, which is not a publisher confirmation.
- That the logged win rate of 57 to 60% is a change in the game. It may be one; it may be selection or the tracker.
- Independence. Intervals treat five-stars as independent draws; one player contributes many.
- Anything after 2026-10-08. The latest banner phase (version 7.1) was still accumulating.

## Reproduce

```bash
cd studies/paimon-pity
python3 -I fetch.py cache                      # about 4.5 minutes; 107 GETs, 2.5 s apart; ~1.3 MB
python3 -I fetch_refs.py .                     # the official post, the wiki pages, pinned commits -> manifest.json
git clone https://github.com/MadeBaruna/paimon-moe <dir> && git -C <dir> checkout 0a88d5391005a4331a1413966528dd1762ce2614
python3 -I meta.py <dir> banners.json          # banner list and five-star characters (read as text, never run)
python3 -I sim.py <tmp>/sim.json               # about 80 s
python3 -I analyze.py . <tmp>/sim.json         # -> results.json
python3 -I figure.py .                         # -> hazard.svg, fifty.svg
python3 -I make_table.py results.json ../../src/logged-rates.ts
# the tool's answers, from this checkout's own math
cd ../.. && npx tsc src/presets.ts --outDir <tmp>/js --module nodenext --moduleResolution nodenext --target es2022 --strict --skipLibCheck
echo '{"type":"module"}' > <tmp>/js/package.json
node studies/paimon-pity/answers.mjs <tmp>/js studies/paimon-pity/answers.json
```

The server recomputes only the latest two character banner phases every two hours, so a re-run changes the newest tallies and leaves older ones as they were; the pinned hashes are in `manifest.json`.

## References and licences

- paimon.moe tallies: `https://api.paimon.moe/wish?banner=<id>`; stats page `https://paimon.moe/wish/tally`; privacy policy `https://paimon.moe/privacy-policy`. No licence stated for the data; not redistributed here.
- paimon.moe front end, MIT: `https://github.com/MadeBaruna/paimon-moe` (commit 0a88d53; notice in `LICENSE-paimon-moe.txt`). Server, read to learn how the tallies are built: `https://github.com/MadeBaruna/paimon-moe-api` (commit 7080596); no licence file was found at its root.
- HoYoverse, "Capturing Radiance" Mechanic: You Ask, I Answer!, `https://genshin.hoyoverse.com/en/news/detail/125274`. Quoted briefly.
- Genshin Impact Wiki, Wish and Character Event Wish, `https://genshin-impact.fandom.com/wiki/Wish`, `https://genshin-impact.fandom.com/wiki/Character_Event_Wish`, CC BY-SA. Quoted briefly.
- Everything else (scripts, `results.json`, `answers.json`, figures) is this repository's, MIT.
