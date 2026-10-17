# Publishing the probability comparison repair

The live demo was checked directly before deployment on 2026-10-16. Both
Chromium and Firefox labelled first-try success at a 90% drop rate **Unlucky**,
claiming 90% of players finished sooner. In a two-roll model with a 50/50 first
roll and a guaranteed win after a loss, finishing on roll two was also
**Unlucky**, with **Legendary bad luck** on the downloaded card.

These are the exact synthetic models in
[the original study](../tied-outcomes/README.md); they do not establish a game's
actual rates. The independent earlier/tied/later shares are 0/90/10% and
50/50/0%. The corrected source already exists; this work makes it available in
the hosted demo after fresh review.

[The hosted-before receipt](results/tied-before/receipt.json) records actual
queries, page and canvas text, served asset hashes and downloaded PNGs. All
twelve before images were opened and inspected. The desktop and 375 px pages
fit, but their verdict and card are mathematically wrong.

## Reviewed production build

A clean archive of `72a37c4b370298166c36eda10b9897c68540ffcc` was installed
with Node 24.21.0 and npm 11.19.0. `npm ci`, lint, strict TypeScript, formatting,
build, 407 unit tests in each of the default and comma-decimal locales, and
142 existing Chromium/Firefox browser workflows passed.
[The check receipt](results/clean-checks.json) retains commands, exit statuses
and hashes of the unedited logs. The application and production assets are
unchanged by the publication scripts and documentation added afterward.

The [fresh local replay](results/tied-local.json) covers both cases in both
browsers at 1440 and 375 px. Its static server is stopped before the first
card is opened. All eight actual PNG downloads have the corrected three shares
and Common rating, with no subsequent HTTP requests, page errors, CSP
violations or horizontal overflow. All sixteen local page/card captures were
opened and inspected; the shares and tie band are readable at both sizes.

To replay the actual hosted workflows and retain their downloads:

```sh
npm ci
node studies/publication/tied-workflow.mjs https://antonsoo.github.io/am-i-unlucky/ after /tmp/tied-hosted
```

Use `before` only against the older deployed build; it deliberately expects
its incorrect Unlucky headline. Build with `npm run build`; the complete static
output is `dist/`. Hosted publication is verified separately below once its
canonical files match this production build. No registry release or tag is
created.
