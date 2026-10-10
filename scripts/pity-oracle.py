"""Exact rational absorbing-chain oracle, independent of the renewal implementation.

Each pull is one transition in (copies, pity, guarantee). Solve the complete
linear systems for E[T] and E[T^2], including infinitely many returns to a state.
No truncation or Monte Carlo is used for these moments.
"""
from decimal import Decimal, localcontext
from fractions import Fraction as F
import json
from pathlib import Path


def solve(a, b):
    rows = [list(row) + [value] for row, value in zip(a, b)]
    n = len(rows)
    for col in range(n):
        pivot = next(i for i in range(col, n) if rows[i][col])
        rows[col], rows[pivot] = rows[pivot], rows[col]
        scale = rows[col][col]
        rows[col] = [v / scale for v in rows[col]]
        for i in range(n):
            if i != col and rows[i][col]:
                scale = rows[i][col]
                rows[i] = [v - scale * p for v, p in zip(rows[i], rows[col])]
    return [row[-1] for row in rows]


def decimal(value):
    with localcontext() as ctx:
        ctx.prec = 80
        return str(Decimal(value.numerator) / Decimal(value.denominator))


def case(hard, target, featured, guarantee, advanced):
    rates = [F((i * 3 + 1) % 5, 5) for i in range(hard - 1)] + [F(1)]
    states = [(c, p, g) for c in range(target) for p in range(hard)
              for g in range(2 if guarantee else 1)]
    index = {state: i for i, state in enumerate(states)}
    q = [[F(0) for _ in states] for _ in states]
    for i, (copies, pity, g) in enumerate(states):
        rate = rates[pity]
        win = F(1) if guarantee and g else featured
        transitions = [((copies, min(pity + 1, hard - 1), g), 1 - rate),
                       ((copies + 1, 0, 0), rate * win),
                       ((copies, 0, int(guarantee)), rate * (1 - win))]
        for dest, mass in transitions:
            if dest[0] < target:
                q[i][index[dest]] += mass
    a = [[F(int(i == j)) - value for j, value in enumerate(row)] for i, row in enumerate(q)]
    mean = solve(a, [F(1)] * len(states))
    second = solve(a, [1 + 2 * sum(v * m for v, m in zip(row, mean)) for row in q])
    initial = (0, hard - 1 if advanced else 0, int(advanced and guarantee))
    selected = index[initial]
    survival = [F(0)] * len(states)
    survival[selected] = F(1)
    cdf = []
    for _ in range(32):
        survival = [sum(survival[i] * q[i][j] for i in range(len(states))) for j in range(len(states))]
        cdf.append(decimal(1 - sum(survival)))
    return {"config": {"baseRate": 0, "softPityStart": 1, "softPityIncrement": 0,
                       "hardPity": hard, "featuredRate": float(featured),
                       "hasGuarantee": guarantee, "rates": list(map(float, rates))},
            "initial": {"pity": initial[1], "guaranteed": bool(initial[2])}, "target": target,
            "mean": decimal(mean[selected]),
            "variance": decimal(second[selected] - mean[selected] ** 2),
            "cdf1Through32": cdf}


cases = [case(hard, target, f, guarantee, advanced)
         for hard in (1, 3, 4) for target in (1, 3)
         for guarantee in (False, True)
         for f in ([F(0), F(1, 10000), F(1, 2), F(1)] if guarantee else [F(1, 10000), F(1, 2), F(1)])
         for advanced in (False, True)]
path = Path(__file__).resolve().parents[1] / 'tests/oracle/pity-fixtures.json'
path.write_text(json.dumps({"method": "Exact rational linear systems (I-Q)m=1 and (I-Q)s=1+2Qm",
                            "cases": cases}, indent=2) + '\n')
print(f'{len(cases)} exact rational Markov-chain cases -> {path.name}')
