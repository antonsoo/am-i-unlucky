#!/usr/bin/env python3
"""Independent time fixtures: 80-digit Decimal, individual Bernoulli attempts.

Unlike the production implementation, this advances one attempt/day at a time
and sums survival probabilities over time. No binomial PMF, cycle recurrence,
binary search, or simulation is reused. The unsummed expectation is bounded
above by survival * k * 7 / best_rate (using just one productive source).
Only fixtures with a remainder below 1e-30 are written.
"""
from decimal import Decimal, localcontext
import json
from pathlib import Path
import random

OUT = Path(__file__).resolve().parent.parent / "tests/oracle/time-fixtures.json"


def fixture(sources, k):
    mass = [Decimal(1)] + [Decimal(0)] * (k - 1)
    expected = Decimal(0)
    targets = {"p50": Decimal("0.5"), "p90": Decimal("0.9"), "p99": Decimal("0.99")}
    quantiles = {}
    probes = {0, 1, 2, 3, 6, 7, 8, 13, 14, 15, 21, 30, 60, 90}
    chances = []
    best_rate = max(Decimal(s["p"]) for s in sources if s["attempts"] > 0)
    remaining_bound = Decimal(k * 7) / best_rate
    for day in range(10000):
        survival = sum(mass)
        chance = 1 - survival
        if day in probes:
            chances.append({"days": day, "chance": float(chance)})
        for key, target in targets.items():
            if key not in quantiles and chance >= target:
                quantiles[key] = day
        remainder = survival * remaining_bound
        if remainder < Decimal("1e-30") and day >= max(probes):
            break
        expected += survival
        for source in sources:
            if (day + 1) % source["everyDays"]:
                continue
            p = Decimal(source["p"])
            for _ in range(source["attempts"]):
                mass = [mass[0] * (1 - p)] + [
                    mass[j] * (1 - p) + mass[j - 1] * p for j in range(1, k)
                ]
    else:
        raise RuntimeError("Oracle failed to bound its remaining expectation")
    assert len(quantiles) == 3
    return {
        "sources": [{**s, "name": f"Source {i + 1}", "p": float(s["p"])} for i, s in enumerate(sources)],
        "k": k,
        "expectedDays": float(expected),
        "expectationRemainderBound": float(remainder),
        "daysFor": quantiles,
        "probabilities": chances,
    }


def source(p, attempts=1, every_days=1):
    return {"p": p, "attempts": attempts, "everyDays": every_days}


with localcontext() as context:
    context.prec = 80
    cases = [
        ([source("1", 10)], 5),
        ([source("0.5", 3)], 5),
        ([source("0.5", 2, 7)], 2),
        ([source("0.5", 1), source("1", 1, 7)], 2),
        ([source("0.5", 1), source("0.5", 2)], 5),
        ([source("0.02", 3), source("0.1", 2, 7)], 3),
        ([source("0", 3), source("0.2", 0), source("1", 2, 7)], 5),
    ]
    rng = random.Random(20261003)
    for _ in range(25):
        sources = [source(rng.choice(["0.05", "0.125", "0.25", "0.5", "0.75", "0.9", "1"]), rng.randint(1, 4), rng.choice([1, 7])) for _ in range(rng.randint(1, 4))]
        cases.append((sources, rng.randint(1, 8)))
    data = [fixture(sources, k) for sources, k in cases]
OUT.write_text(json.dumps(data, indent=2) + "\n")
print(f"Wrote {len(data)} independently bounded Decimal fixtures to {OUT}")
