"""Check retained browser observations; run from any directory with Python 3."""

import json
from pathlib import Path

ROOT = Path(__file__).parent
before = json.loads((ROOT / "before/results.json").read_text())
after = json.loads((ROOT / "after/results.json").read_text())
assert len(before) == len(after) == 4
summary = {"invalidInputs": 0, "calculationLimitControls": 0, "validResultsUnchanged": 0,
           "pngImageChunksUnchanged": 0, "pngBytesUnchanged": 0}
counts = []
for old, new in zip(before, after):
    assert (old["browser"], old["width"]) == (new["browser"], new["width"])
    assert old["errors"] == new["errors"] == []
    assert old["offlineRequests"] == new["offlineRequests"] == []
    assert len(old["invalid"]) == len(new["invalid"]) == 13
    for previous, current in zip(old["invalid"], new["invalid"]):
        assert (previous["field"], previous["value"]) == (current["field"], current["value"])
        assert current["displayed"] == current["value"]
        assert current["stats"] == current["card"] == 0
        assert current["pending"]["stats"] == 0 and not current["pending"]["card"]
        if current["value"] == "1/100000000000000000":
            assert current["shareEnabled"] and previous["copied"] == current["copied"]
            summary["calculationLimitControls"] += 1
        else:
            assert current["ariaInvalid"] == "true"
            assert not current["shareEnabled"] and current["pending"]["shareDisabled"]
            assert current["copied"] is None
            summary["invalidInputs"] += 1
            counts.append((previous, current))
    assert len(old["valid"]) == len(new["valid"]) == 11
    for previous, current in zip(old["valid"], new["valid"]):
        assert {k: v for k, v in previous.items() if k != "png"} == {
            k: v for k, v in current.items() if k != "png"}
        summary["validResultsUnchanged"] += 1
        if "png" in previous:
            p, c = previous["png"], current["png"]
            assert (p["width"], p["height"]) == (c["width"], c["height"]) == (1080, 1350)
            # Firefox's private deBG chunk differs between captures. Compare all
            # other chunks, including every IDAT byte hash, without hiding it.
            assert [x for x in p["chunks"] if x["type"] != "deBG"] == [
                x for x in c["chunks"] if x["type"] != "deBG"]
            summary["pngImageChunksUnchanged"] += 1
            summary["pngBytesUnchanged"] += p["sha256"] == c["sha256"]
summary["before"] = {key: sum(bool(p[key]) for p, _ in counts) for key in ["shareEnabled", "stats", "card"]}
summary["after"] = {key: sum(bool(c[key]) for _, c in counts) for key in ["shareEnabled", "stats", "card"]}
print(json.dumps(summary, indent=2))
