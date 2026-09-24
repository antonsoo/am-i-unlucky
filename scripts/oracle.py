#!/usr/bin/env python3
"""Generate oracle fixtures for the core math library using SciPy.

Run with `uv run --with scipy python3 scripts/oracle.py`. SciPy is the
independent reference implementation: its binom/geom/nbinom distributions
are cross-checked in tests/oracle.test.ts against our pure-TS closed forms.
Output: tests/oracle/fixtures.json (committed, so CI doesn't need SciPy).
"""

import json
from pathlib import Path

from scipy import stats

OUT_PATH = Path(__file__).resolve().parent.parent / "tests" / "oracle" / "fixtures.json"

binomial_cases = [
    # (n, p, k) -> P(X >= k) for X ~ Binomial(n, p)
    (10, 0.5, 5),
    (100, 0.01, 1),
    (512, 1 / 512, 1),
    (900, 1 / 512, 1),
    (4096, 1 / 4096, 1),
    (1, 0.5, 1),
    (1, 0.5, 0),
    (0, 0.5, 0),
    (1000, 0.002, 3),
    (1_000_000, 1e-6, 1),
    (10_000_000, 1e-6, 5),
    (50, 1.0, 50),
    (50, 1.0, 1),
    (100, 0.3, 40),
    (100, 0.3, 20),
]

negbinom_cases = [
    # (k, p, n) -> P(T_k <= n) and pmf(T_k = n)
    (1, 0.5, 1),
    (1, 0.5, 10),
    (5, 0.1, 50),
    (3, 1 / 512, 900),
    (1, 1 / 4096, 4096),
    (10, 0.6, 20),
    (1, 1e-6, 1_000_000),
]

geometric_cases = [
    # (p, n) -> pmf, cdf
    (0.5, 1),
    (0.5, 5),
    (1 / 512, 512),
    (1 / 4096, 4096),
    (0.002, 1000),
    (1e-6, 500_000),
]

fixtures = {"binomial_survival": [], "negative_binomial": [], "geometric": []}

for n, p, k in binomial_cases:
    sf = float(stats.binom.sf(k - 1, n, p))  # P(X >= k) = P(X > k-1)
    fixtures["binomial_survival"].append({"n": n, "p": p, "k": k, "survival": sf})

for k, p, n in negbinom_cases:
    # scipy's nbinom counts *failures* before the k-th success, so shift by k.
    cdf = float(stats.nbinom.cdf(n - k, k, p))
    pmf = float(stats.nbinom.pmf(n - k, k, p))
    fixtures["negative_binomial"].append({"k": k, "p": p, "n": n, "cdf": cdf, "pmf": pmf})

for p, n in geometric_cases:
    pmf = float(stats.geom.pmf(n, p))
    cdf = float(stats.geom.cdf(n, p))
    fixtures["geometric"].append({"p": p, "n": n, "pmf": pmf, "cdf": cdf})

OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
OUT_PATH.write_text(json.dumps(fixtures, indent=2) + "\n")
print(f"Wrote {OUT_PATH}")
