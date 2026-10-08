"""Test the hazard estimators on simulated pulls with a KNOWN hazard (the
tool's own archetype), before they are applied to the logged counts.

Scenarios
  A  independent complete segments                    -> survivor estimator should be exact
  B  users with one left-truncated first segment and one dropped (censored)
     last segment, K completed segments per user      -> bias of the survivor estimator
  C  as B, but counted the way paimon.moe's published denominators are built
     (pulls per pity index, per banner window, only for user-windows with at
     least one five-star)                              -> bias of site-style hazard
  D  as C but every user-window counted                -> the proper at-risk estimator
Usage: python3 -I sim.py <out sim.json>
"""
import bisect, json, os, random, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # python -I drops the script dir
from hazard_lib import HARD, preset_hazard, pmf_from_hazard, hazard_from_successes

H = [preset_hazard(n) for n in range(1, HARD + 1)]
PMF = pmf_from_hazard(H)
CUM = []
acc = 0.0
for n in range(1, HARD + 1):
    acc += PMF[n]
    CUM.append(acc)
MEAN = sum(n * PMF[n] for n in range(1, HARD + 1))
# length-biased pmf (a random moment lands in a segment with prob. proportional to its length)
LB = [n * PMF[n] / MEAN for n in range(1, HARD + 1)]
LBCUM = []
acc = 0.0
for p in LB:
    acc += p
    LBCUM.append(acc)


def draw(rng, cum):
    return min(bisect.bisect_left(cum, rng.random() * cum[-1]) + 1, HARD)


def run(seed=7):
    rng = random.Random(seed)
    out = {"true_mean_pulls_per_five_star": MEAN, "true_consolidated_rate": 1 / MEAN}

    # A
    N = 3_000_000
    s = [0] * (HARD + 1)
    for _ in range(N):
        s[draw(rng, CUM)] += 1
    hA = hazard_from_successes(s)
    out["A"] = {"segments": N, "max_abs_error_n1_to_84": max(abs(hA[n] - H[n - 1]) for n in range(1, 85)),
                "hazard": {n: hA[n] for n in (1, 30, 73, 74, 80, 85, 88)}}

    # B, C, D
    def users(U, K, window_mean):
        s_cc = [0] * (HARD + 1)          # logged five-stars by pity (survivor estimator input)
        s_site = [0] * (HARD + 1)         # same successes, site-style
        den_site = [0] * (HARD + 1)       # pulls at pity index n-1, only windows with >=1 five-star
        den_all = [0] * (HARD + 1)        # pulls at pity index n-1, every window
        first_segments = completed = 0
        for _ in range(U):
            # left-truncated first segment: observed length = remainder after a random start
            Lstar = draw(rng, LBCUM)
            offset = rng.randrange(Lstar)          # pulls already spent before the log begins
            lengths = [Lstar - offset]
            for _k in range(K - 1):
                lengths.append(draw(rng, CUM))
            lengths.append(None)                    # final segment: still in progress when the log ends
            # pull-level timeline: (pity of the pull, was it the five-star)
            pulls = []
            for L in lengths:
                if L is None:
                    # a random moment lands in a length-biased segment; the user stopped partway through it
                    Lfull = draw(rng, LBCUM)
                    for p in range(rng.randrange(Lfull)):
                        pulls.append((p + 1, False))
                else:
                    for p in range(L):
                        pulls.append((p + 1, p + 1 == L))
            # cut into banner windows
            i = 0
            while i < len(pulls):
                w = max(1, int(rng.expovariate(1 / window_mean)))
                chunk = pulls[i:i + w]
                i += w
                has5 = any(f for _, f in chunk)
                for n, f in chunk:
                    den_all[n] += 1
                    if has5:
                        den_site[n] += 1
                    if f:
                        s_site[n] += 1
            for L in lengths[:-1]:
                s_cc[L] += 1
                completed += 1
            first_segments += 1
        return s_cc, s_site, den_site, den_all, first_segments, completed

    out["B"] = {}
    for K, wm in ((4, 120), (12, 120), (40, 120), (12, 30)):
        s_cc, s_site, den_site, den_all, fs, comp = users(20000 if K > 10 else 40000, K, wm)
        hB = hazard_from_successes(s_cc)
        hC = [None] + [s_site[n] / den_site[n] if den_site[n] else None for n in range(1, HARD + 1)]
        hD = [None] + [s_site[n] / den_all[n] if den_all[n] else None for n in range(1, HARD + 1)]
        pick = (1, 10, 30, 60, 73, 74, 80, 84, 86, 88)
        out["B"][f"K{K}_window{wm}"] = {
            "completed_segments_per_user": K, "mean_banner_window_pulls": wm,
            "users": fs, "completed_segments": comp, "first_segment_share": fs / comp,
            "mean_logged_pulls_per_five_star": sum(n * s_cc[n] for n in range(1, HARD + 1)) / comp,
            "survivor_estimator": {n: hB[n] for n in pick},
            "site_style_conditioned_denominator": {n: hC[n] for n in pick},
            "all_windows_denominator": {n: hD[n] for n in pick},
            "true": {n: H[n - 1] for n in pick},
        }
    return out


if __name__ == "__main__":
    json.dump(run(), open(sys.argv[1], "w"), indent=1)
    print("ok")
