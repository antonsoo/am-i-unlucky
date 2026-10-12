"""Independent finite sums and existing exact absorbing-chain reference values.

Simple T_k uses combinatorial fractions, not the application's floating-point
PMF recurrence. Pity uses the 80-digit output of scripts/pity-oracle.py, whose
rational state-transition matrix is independent of the application code.
"""
from decimal import Decimal, localcontext
from fractions import Fraction as F
from hashlib import sha256
from math import comb
from pathlib import Path
import json

root = Path(__file__).resolve().parents[2]

def decimal(value):
    with localcontext() as ctx:
        ctx.prec = 80
        return str(Decimal(value.numerator) / Decimal(value.denominator))

def cdf(n, p, k):
    if k > n:
        return F(0)
    return 1 - sum(F(comb(n, j)) * p ** j * (1 - p) ** (n - j)
                   for j in range(k))

simple = []
for p in [F(1, 512), F(1, 100), F(1, 10), F(1, 2), F(9, 10), F(99, 100), F(1)]:
    for k in [1, 2, 5]:
        for n in sorted({k, k + 1, 10, 100}):
            before = cdf(n - 1, p, k)
            at = F(comb(n - 1, k - 1)) * p ** k * (1 - p) ** (n - k)
            after = 1 - cdf(n, p, k)
            assert before + at + after == 1
            simple.append({"p": float(p), "pFraction": str(p), "n": n, "k": k,
                           "expected": {key: decimal(value) for key, value in
                                        [("earlier", before), ("tied", at), ("later", after)]}})
pity_path = root / 'tests/oracle/pity-fixtures.json'
pity_bytes = pity_path.read_bytes()
pity = []
for source in json.loads(pity_bytes)['cases']:
    previous = F(0)
    histories = []
    for n, cdf_text in enumerate(source['cdf1Through32'], 1):
        current = F(cdf_text)
        histories.append({"n": n, "expected": {"earlier": decimal(previous),
                         "tied": decimal(current - previous), "later": decimal(1 - current)}})
        previous = current
    pity.append({key: source[key] for key in ['config', 'initial', 'target']} | {"histories": histories})
output = {"method": __doc__.strip(), "pityOracleSourceSha256": sha256(pity_bytes).hexdigest(),
          "simple": simple, "pity": pity}
(root / 'studies/tied-outcomes/oracle.json').write_text(json.dumps(output, indent=2) + '\n')
print(len(simple), 'simple comparisons;', sum(len(c['histories']) for c in pity), 'pity comparisons')
