#!/usr/bin/env python3
"""120-digit reference formulas, independent of production's positive mean DP.

Evaluate unpaired inclusion-exclusion directly with Decimal powers, including
tiny rates, unequal sets, early tails and the 16-item exact-work boundary.
Also check small CDFs by enumerating every possible sequence of drop outcomes.
No JavaScript implementation, simulation, expm1 pairing or mean DP is reused.
"""
from decimal import Decimal, localcontext
from itertools import product
from math import prod
from pathlib import Path
import json
import random

OUT = Path(__file__).resolve().parent.parent / "tests/oracle/collection-fixtures.json"


def reference(rates, probes):
    p = list(map(Decimal, rates))
    m = len(p)
    mean = Decimal(0)
    cdf = [Decimal(1)] * len(probes)
    for mask in range(1, 1 << m):
        mass = sum(p[i] for i in range(m) if mask & (1 << i))
        sign = 1 if mask.bit_count() % 2 else -1
        mean += sign / mass
        for j, n in enumerate(probes):
            # Decimal rejects 0**0; the probability of no events in 0 trials is 1.
            cdf[j] -= sign * ((1 - mass) ** n if n else 1)
    if m <= 3:
        outcomes = p + [1 - sum(p)]
        for n in range(m, min(m + 3, 6)):
            if n not in probes:
                continue
            enumerated = sum(
                prod(outcomes[i] for i in sequence)
                for sequence in product(range(m + 1), repeat=n)
                if all(i in sequence for i in range(m))
            )
            assert abs(enumerated - cdf[probes.index(n)]) < Decimal("1e-110")
    for j, n in enumerate(probes):
        if n < m:
            assert abs(cdf[j]) < Decimal("1e-110")
            cdf[j] = Decimal(0)
    return {"probabilities": list(map(float, p)), "expectedAttempts": float(mean),
            "points": [{"n": n, "cdf": float(max(0, min(1, value)))} for n, value in zip(probes, cdf)]}


with localcontext() as context:
    context.prec = 120
    cases = [
        ["1"], ["0.5", "0.5"], ["0.3", "0.2", "0.1", "0.05"],
        ["1e-20"], ["1e-20", "0.2"], ["1e-20", "2e-20"],
        ["1e-25", "2e-25", "3e-25", "0.1"],
        ["0.0625"] * 16, ["0.0001"] * 16,
        ["0.5"] + ["0.00000001"] * 15,
    ]
    rng = random.Random(20261003)
    for _ in range(30):
        m = rng.randint(1, 9)
        cases.append([str(Decimal(rng.randint(1, 900)) / (1000 * m)) for _ in range(m)])
    fixtures = []
    for rates in cases:
        probes = sorted({0, 1, 2, 3, 4, 5, len(rates), len(rates) + 1, 30, 60, 255, 256, 257, 1000, 10**9})
        if min(map(Decimal, rates)) < Decimal("1e-15"):
            probes.append(10**20)
        fixtures.append(reference(rates, probes))
OUT.write_text(json.dumps(fixtures, indent=2) + "\n")
print(f"Wrote {len(fixtures)} independent Decimal collection fixtures to {OUT}")
