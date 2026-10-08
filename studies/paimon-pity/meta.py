"""Extract the banner list (id, name, start, version, featured 5-star) and the
set of 5-star character ids from a checkout of MadeBaruna/paimon-moe (MIT).

Usage: python3 -I meta.py <paimon-moe checkout dir> <out banners.json>
The checkout is third-party text: it is read with regexes, never executed.
"""
import json, re, sys, pathlib

root = pathlib.Path(sys.argv[1])
banners_js = (root / "src/data/banners.js").read_text()
chars_js = (root / "src/data/characters.js").read_text()

m = re.search(r"\n  characters: \[(.*?)\n  \],", banners_js, re.S)
entries = re.split(r"\n    \{\n", m.group(1))[1:]
out = []
for i, e in enumerate(entries):
    g = lambda k: (re.search(rf"\n      {k}: '([^']*)'", "\n" + e) or [None, None])[1]
    feat = re.search(r"featured: \[([^\]]*)\]", e)
    featured = re.findall(r"'([^']+)'", feat.group(1)) if feat else []
    out.append({"id": 300001 + i, "name": g("name"), "shortName": g("shortName"),
                "start": g("start"), "end": g("end"), "version": g("version"),
                "featured": featured})
five = sorted(set(re.findall(r"\n  ([a-z_0-9]+): \{\n    id: '[^']+',\n    name: '[^']*',\n    rarity: 5,", chars_js)))
json.dump({"banners": out, "five_star_characters": five}, open(sys.argv[2], "w"), indent=1)
print(len(out), "banners", len(five), "five-star characters")
