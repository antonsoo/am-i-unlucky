"""Exact per-day Bernoulli enumeration and a phase-state linear-system mean.

No production modules, floating-point probability routines or simulation.
"""

import gzip
import hashlib
import json
from fractions import Fraction as F
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def source(name, numerator, denominator, attempts, period, first):
    return {
        "name": name,
        "numerator": numerator,
        "denominator": denominator,
        "attempts": attempts,
        "everyDays": period,
        "firstDay": first,
    }


def outcomes(sources, day, k):
    mass = [F(1)] + [F(0)] * k
    for item in sources:
        if day < item["firstDay"] or (day - item["firstDay"]) % item["everyDays"]:
            continue
        p = F(item["numerator"], item["denominator"])
        for _ in range(item["attempts"]):
            following = [F(0)] * (k + 1)
            for copies, probability in enumerate(mass):
                following[copies] += probability * (1 - p)
                following[min(k, copies + 1)] += probability * p
            mass = following
    return mass


def exact_mean(sources, k):
    # State: day phase (0..6), copies already held (0..k-1). Each row is
    # E[state] - sum(P[next] E[next]) = 1 day; completion has E = 0.
    size = 7 * k
    matrix = [[F(0) for _ in range(size + 1)] for _ in range(size)]
    for phase in range(7):
        day_mass = outcomes(sources, phase + 1, k)
        for copies in range(k):
            row = matrix[phase * k + copies]
            row[phase * k + copies] = F(1)
            row[-1] = F(1)
            for successes, probability in enumerate(day_mass):
                if copies + successes < k:
                    row[((phase + 1) % 7) * k + copies + successes] -= probability
    for column in range(size):
        pivot = next(i for i in range(column, size) if matrix[i][column])
        matrix[column], matrix[pivot] = matrix[pivot], matrix[column]
        divisor = matrix[column][column]
        matrix[column] = [value / divisor for value in matrix[column]]
        for i in range(size):
            if i == column or not matrix[i][column]:
                continue
            factor = matrix[i][column]
            matrix[i] = [a - factor * b for a, b in zip(matrix[i], matrix[column])]
    return matrix[0][-1]


def ratio(value):
    return [str(value.numerator), str(value.denominator)]


def observe(item):
    sources, k = item["sources"], item["k"]
    mass = [F(1)] + [F(0)] * k
    cdf = [F(0)]
    milestones = {}
    for day in range(1, 421):
        daily = outcomes(sources, day, k)
        following = [F(0)] * (k + 1)
        for held, probability in enumerate(mass):
            for gained, chance in enumerate(daily):
                following[min(k, held + gained)] += probability * chance
        mass = following
        if day <= 70:
            cdf.append(mass[k])
        for name, target in [("p50", F(1, 2)), ("p90", F(9, 10)), ("p99", F(99, 100))]:
            if name not in milestones and mass[k] >= target:
                milestones[name] = day
        if day >= 70 and len(milestones) == 3:
            break
    assert len(milestones) == 3
    return dict(
        **item,
        mean=ratio(exact_mean(sources, k)),
        cdf=list(map(ratio, cdf)),
        daysFor=milestones,
    )


def main():
    cases = []
    for first_a in range(1, 8):
        for first_b in range(1, 8):
            for k in [1, 2]:
                cases.append(
                    {
                        "id": f"weekly-{first_a}-{first_b}-k{k}",
                        "k": k,
                        "sources": [
                            source("Weekly A", 1, 2, 1, 7, first_a),
                            source("Weekly B", 1, 4, 2, 7, first_b),
                        ],
                    }
                )
    for first in range(1, 8):
        for k in [1, 3]:
            cases.append(
                {
                    "id": f"mixed-{first}-k{k}",
                    "k": k,
                    "sources": [
                        source("Daily", 1, 4, 1, 1, 1),
                        source("Weekly", 1, 10, 2, 7, first),
                    ],
                }
            )
            cases.append(
                {
                    "id": f"guaranteed-{first}-k{k}",
                    "k": k,
                    "sources": [
                        source("Weekly guaranteed", 1, 1, 2, 7, first),
                        source("Weekly fair", 1, 2, 1, 7, 5),
                    ],
                }
            )
        case = observe(
            {
                "id": f"analytic-{first}",
                "k": 1,
                "sources": [source("Weekly", 1, 2, 1, 7, first)],
            }
        )
        assert F(*map(int, case["mean"])) == first + 7
        cases.append(
            {key: value for key, value in case.items() if key in ["id", "k", "sources"]}
        )
    fair_pair = {
        "id": "two-fair-weekly-2-5",
        "k": 1,
        "sources": [
            source("Weekly fair A", 1, 2, 1, 7, 2),
            source("Weekly fair B", 1, 2, 1, 7, 5),
        ],
    }
    assert exact_mean(fair_pair["sources"], 1) == F(16, 3)
    cases.append(fair_pair)
    controls = {}
    for item in cases:
        inputs = {
            "k": item["k"],
            "sources": [dict(s, firstDay=s["everyDays"]) for s in item["sources"]],
        }
        controls.setdefault(json.dumps(inputs, sort_keys=True), inputs)
    for k in [1, 2]:
        inputs = {"k": k, "sources": [source("Legacy daily", 1, 2, 2, 1, 1)]}
        controls[json.dumps(inputs, sort_keys=True)] = inputs
    result = {
        "scope": "Constructed independent daily/weekly models, not observed game histories. Exact rational day enumeration and 7*k phase-state linear equations; no truncated expectation or Monte Carlo.",
        "cases": [observe(item) for item in cases],
        "synchronizedControls": [
            observe(dict(id=f"control-{i}", **item))
            for i, item in enumerate(controls.values())
        ],
    }
    raw = (json.dumps(result, separators=(",", ":")) + "\n").encode()
    compressed = gzip.compress(raw, compresslevel=9, mtime=0)
    (ROOT / "oracle.json.gz").write_bytes(compressed)
    summary = {
        "cases": len(result["cases"]),
        "synchronizedControls": len(result["synchronizedControls"]),
        "cdfChecks": sum(len(row["cdf"]) for row in result["cases"]),
        "exactMeans": len(result["cases"]),
        "scope": result["scope"],
        "uncompressedSha256": hashlib.sha256(raw).hexdigest(),
        "compressedSha256": hashlib.sha256(compressed).hexdigest(),
    }
    (ROOT / "oracle-summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(summary))


if __name__ == "__main__":
    main()
