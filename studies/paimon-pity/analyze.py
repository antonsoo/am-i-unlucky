"""Empirical hazard and 50/50 statistics from the cached paimon.moe tallies.

Reads cache/<banner>.json (written by fetch.py), banners.json (meta.py) and
sim.json (sim.py); writes results.json.
Usage: python3 -I analyze.py <study dir> <sim.json>
"""
import json, os, sys, glob

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # python -I drops the script dir
from hazard_lib import HARD, preset_hazard, survivors_from_successes, wilson, pmf_from_hazard

root = sys.argv[1]
M = json.load(open(f"{root}/banners.json"))
BANNERS = M["banners"]
FIVE = set(M["five_star_characters"])
manifest = json.load(open(f"{root}/cache/manifest.json"))
sim = json.load(open(sys.argv[2]))

data = {}
for b in BANNERS:
    p = f"{root}/cache/{b['id']}.json"
    if os.path.exists(p):
        data[b["id"]] = json.load(open(p))
meta = {b["id"]: b for b in BANNERS}
std = json.load(open(f"{root}/cache/200001.json"))


def era_of(bid):
    return "5.0+" if float(meta[bid]["version"]) >= 5.0 else "pre-5.0"


def pool(ids, key=lambda d: d["pityCount"]["legendary"]):
    s = [0] * (HARD + 1)
    for i in ids:
        v = key(data[i])
        for n in range(1, HARD + 1):
            s[n] += v[n]
    return s


def summarize(s):
    S = survivors_from_successes(s)
    total = sum(s)
    h, lo, hi = [None], [None], [None]
    for n in range(1, HARD + 1):
        h.append(s[n] / S[n] if S[n] else None)
        a, b = wilson(s[n], S[n])
        lo.append(a)
        hi.append(b)
    mean = sum(n * s[n] for n in range(1, HARD + 1)) / total
    return {"five_stars": total, "successes": s[1:], "survivors": S[1:], "hazard": h[1:], "ci_lo": lo[1:], "ci_hi": hi[1:],
            "mean_pulls_per_five_star": mean, "consolidated_rate": 1 / mean,
            "share_reaching_pull_74": S[74] / total, "share_reaching_pull_85": S[85] / total,
            "share_at_or_after_pull_74": sum(s[74:]) / total}


ids_all = sorted(data)
ids_pre = [i for i in ids_all if era_of(i) == "pre-5.0"]
ids_post = [i for i in ids_all if era_of(i) == "5.0+"]
R = {}
R["sources"] = {
    "endpoint": "https://api.paimon.moe/wish?banner=<id>",
    "character_banner_ids_requested": "300001-300106 plus 200001 (standard)",
    "character_banners_with_data": len(ids_all),
    "character_banners_without_data": sorted(int(k) for k, v in manifest.items() if v["status"] != 200),
    "retrieved_between": [min(v["retrieved"] for v in manifest.values()), max(v["retrieved"] for v in manifest.values())],
    "tally_times": [min(d["time"] for d in data.values()), max(d["time"] for d in data.values())],
    "banner_versions": [meta[ids_all[0]]["version"], meta[ids_all[-1]]["version"]],
    "banner_start_dates": [meta[ids_all[0]]["start"][:10], meta[ids_all[-1]]["start"][:10]],
    "tallied_pulls_all": sum(d["total"]["all"] for d in data.values()),
    "tallied_user_banner_records": sum(d["total"]["users"] for d in data.values()),
    "banners_pre_5_0": len(ids_pre), "banners_5_0_plus": len(ids_post),
    "tallied_pulls_5_0_plus": sum(data[i]["total"]["all"] for i in ids_post),
    "tallied_user_banner_records_5_0_plus": sum(data[i]["total"]["users"] for i in ids_post),
    "banner_start_dates_5_0_plus": [meta[ids_post[0]]["start"][:10], meta[ids_post[-1]]["start"][:10]],
}
R["pooled"] = {"all": summarize(pool(ids_all)), "pre-5.0": summarize(pool(ids_pre)), "5.0+": summarize(pool(ids_post)),
               "standard_200001": summarize([0] + std["pityCount"]["legendary"][1:HARD + 1])}

# preset (the archetype) against the logs
PRE = [preset_hazard(n) for n in range(1, HARD + 1)]
pm = pmf_from_hazard(PRE)
R["preset"] = {"hazard": PRE, "mean_pulls_per_five_star": sum(n * pm[n] for n in range(1, HARD + 1))}
R["preset"]["consolidated_rate"] = 1 / R["preset"]["mean_pulls_per_five_star"]
cmp_ = {}
for era in ("all", "pre-5.0", "5.0+"):
    h = R["pooled"][era]["hazard"]
    d = [h[n - 1] - PRE[n - 1] for n in range(1, HARD)]  # n = 1..89 (n=90 is 1 by construction)
    outside = [n for n in range(1, HARD) if not (R["pooled"][era]["ci_lo"][n - 1] <= PRE[n - 1] <= R["pooled"][era]["ci_hi"][n - 1])]
    cmp_[era] = {
        "max_abs_diff_1_to_73": max(abs(x) for x in d[:73]),
        "max_abs_diff_74_to_83": max(abs(x) for x in d[73:83]),
        "diff_84_to_89": {str(n): d[n - 1] for n in range(84, 90)},
        "pulls_where_preset_is_outside_95ci": outside,
        "share_of_five_stars_logged_at_pulls_85_to_89": sum(R["pooled"][era]["successes"][84:89]) / R["pooled"][era]["five_stars"],
    }
R["preset_vs_logged"] = cmp_

# split-half: odd vs even banners of the 5.0+ era (the table the preset would use)
odd = summarize(pool(ids_post[0::2]))
even = summarize(pool(ids_post[1::2]))
R["split_half_5_0_plus"] = {"max_abs_diff_1_to_84": max(abs(odd["hazard"][n - 1] - even["hazard"][n - 1]) for n in range(1, 85)),
                            "five_stars": [odd["five_stars"], even["five_stars"]]}

# the site's published denominators (countEachPity) against the survivor reconstruction
den = [0] * HARD
suc = [0] * (HARD + 1)
for i in ids_all:
    d = data[i]
    if d["countEachPity"]:
        for n in range(HARD):
            den[n] += d["countEachPity"][n]
        for n in range(1, HARD + 1):
            suc[n] += d["pityCount"]["legendary"][n]
sv = survivors_from_successes(suc)
R["site_denominator"] = {
    "banners_with_countEachPity": sum(1 for i in ids_all if data[i]["countEachPity"]),
    "hazard_with_site_denominator": {str(n): suc[n] / den[n - 1] for n in (1, 10, 30, 50, 73, 74, 80)},
    "hazard_with_survivors": {str(n): suc[n] / sv[n] for n in (1, 10, 30, 50, 73, 74, 80)},
    "site_denominator_at_pull_1_over_five_stars_logged": den[0] / sum(suc),
    "site_pulls_counted_over_tallied_pulls": sum(den) / sum(data[i]["total"]["all"] for i in ids_all if data[i]["countEachPity"]),
}

# 50/50
def fifty(ids):
    featured = guaranteed = nonfeat = 0
    for i in ids:
        feat = set(meta[i]["featured"])
        for it in data[i]["list"]:
            if it["type"] != "character":
                continue
            if it["name"] in feat:
                featured += it["count"]
                guaranteed += it["guaranteed"]
            elif it["name"] in FIVE:
                nonfeat += it["count"]
    won = featured - guaranteed
    lo, hi = wilson(won, won + nonfeat)
    return {"banners": len(ids), "featured_five_stars": featured, "of_which_flagged_guaranteed": guaranteed,
            "non_featured_five_stars": nonfeat, "win_rate_on_unguaranteed_rolls": won / (won + nonfeat),
            "win_rate_ci95": [lo, hi], "featured_share_of_five_stars": featured / (featured + nonfeat),
            "guaranteed_rolls_over_lost_rolls": guaranteed / nonfeat}


R["fifty_fifty"] = {"pre-5.0": fifty(ids_pre), "5.0+": fifty(ids_post), "all": fifty(ids_all)}
byver = {}
for i in ids_all:
    byver.setdefault(meta[i]["version"], []).append(i)
R["fifty_fifty_by_version"] = {v: {k: x[k] for k in ("banners", "non_featured_five_stars", "win_rate_on_unguaranteed_rolls", "featured_share_of_five_stars")}
                               for v, x in ((v, fifty(ii)) for v, ii in byver.items())}
# what the model predicts for the featured share, given a win rate w on unguaranteed rolls: 1 / (2 - w)
R["fifty_fifty"]["model_share"] = {"w=0.50": 1 / 1.5, "w=0.55": 1 / 1.45}

# If a share f of five-star rolls are the first of an imported history, the tracker labels them "50/50" whatever the
# true state; a fraction of them were really guaranteed (stationary share (1-w)/(2-w)) and are counted as wins.
def labelled_win_rate(w, f):
    p_guar = (1 - w) / (2 - w)
    unguar_true = 1 / (2 - w)               # share of rolls truly unguaranteed
    mislabelled = f * p_guar                # guaranteed rolls read as 50/50 (always won)
    return (w * unguar_true + mislabelled) / (unguar_true + mislabelled)


R["fifty_fifty"]["first_roll_mislabel_model"] = {
    f"w={w},first_roll_share={f}": labelled_win_rate(w, f) for w in (0.5, 0.55) for f in (0.04, 0.08)}

def implied_w_from_labelled(rate, f):
    lo, hi = 0.3, 0.9
    for _ in range(60):
        mid = (lo + hi) / 2
        if labelled_win_rate(mid, f) < rate:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


ids_55 = [i for i in ids_post if float(meta[i]["version"]) >= 5.5]
ids_50_54 = [i for i in ids_post if float(meta[i]["version"]) < 5.5]
R["fifty_fifty_implied_win_rate"] = {}
for name, ids in (("pre-5.0", ids_pre), ("5.0 to 5.4", ids_50_54), ("5.5+", ids_55)):
    x = fifty(ids)
    R["fifty_fifty_implied_win_rate"][name] = {
        "banners": len(ids), "labelled_win_rate": x["win_rate_on_unguaranteed_rolls"], "featured_share": x["featured_share_of_five_stars"],
        "from_share_1_over_2_minus_w": 2 - 1 / x["featured_share_of_five_stars"],
        "from_labelled_if_first_rolls_4pct": implied_w_from_labelled(x["win_rate_on_unguaranteed_rolls"], 0.04),
        "from_labelled_if_first_rolls_8pct": implied_w_from_labelled(x["win_rate_on_unguaranteed_rolls"], 0.08)}

R["simulation"] = sim
json.dump(R, open(f"{root}/results.json", "w"), indent=1)
print("wrote results.json")
