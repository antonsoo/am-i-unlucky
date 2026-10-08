"""Shared helpers: the tool's preset hazard, the survivor-based estimator and
the segment-length pmf. Pure Python, no third-party packages."""
import math

HARD = 90


def preset_hazard(n, base=0.006, soft=74, inc=0.06, hard=HARD):
    """Chance of a five-star on pull n (1-indexed) under the archetype in
    src/presets.ts. Mirrors itemTierRate() in src/math/pity.ts."""
    if n >= hard:
        return 1.0
    if n < soft:
        return base
    return min(1.0, base + (n - soft + 1) * inc)


def pmf_from_hazard(h):
    """h[n-1] = hazard at pull n. Returns pmf[n] for n = 0..len(h)."""
    pmf = [0.0] * (len(h) + 1)
    surv = 1.0
    for n in range(1, len(h) + 1):
        pmf[n] = surv * h[n - 1]
        surv *= 1 - h[n - 1]
    return pmf


def survivors_from_successes(s):
    """s[n] = five-stars logged at pity n (index 0 unused), n = 1..HARD.
    Survivors to pull n = segments that ended at pull n or later."""
    S = [0] * (len(s) + 1)
    for n in range(len(s) - 1, 0, -1):
        S[n] = S[n + 1] + s[n]
    return S[: len(s)]


def hazard_from_successes(s):
    S = survivors_from_successes(s)
    return [None] + [s[n] / S[n] if S[n] else None for n in range(1, len(s))]


def wilson(k, n, z=1.96):
    if n == 0:
        return (None, None)
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    w = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (max(0.0, c - w), min(1.0, c + w))
