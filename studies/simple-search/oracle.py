"""Independent single-copy milestones; Python 3.11+ standard library only."""
import decimal
import json
from pathlib import Path

D = decimal.Decimal
rows = []
with decimal.localcontext() as ctx:
    ctx.prec = 90
    for p in [1 / 512, 1e-6, 1e-12, 1e-14, 3e-15, 1e-15, 1e-17]:
        for target in [0.5, 0.9, 0.99, 0.999]:
            quantile = (
                (D(1) - D.from_float(target)).ln() / (D(1) - D.from_float(p)).ln()
            ).to_integral_value(rounding=decimal.ROUND_CEILING)
            rows.append({"p": p, "target": target, "attempts": str(quantile),
                         "withinSearchLimit": quantile <= D("1e15")})
result = {"method": "90-digit Decimal inversion of P(T <= n) = 1 - (1-p)^n, with p and target taken as their exact binary64 values. k=1 only. This is independent of the binomial PMF and recurrence used by the app.", "cases": rows}
Path(__file__).with_name("oracle.json").write_text(json.dumps(result, indent=2) + "\n")
