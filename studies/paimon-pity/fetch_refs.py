"""Fetch the reference texts the study cites and write manifest.json:
the publisher's own Q&A on "Capturing Radiance", the Fandom wiki's Wish page
(wikitext, for the 0.6% / 1.6% / soft-pity statements), and the pinned commits
of the tracker's front-end and API. Combines them with cache/manifest.json
(the per-banner tallies from fetch.py).

Usage: python3 -I fetch_refs.py <study dir>
"""
import datetime, hashlib, json, subprocess, sys, urllib.request

UA = "am-i-unlucky-study/0.1 (research; contact anton@praviel.com)"
root = sys.argv[1]
REFS = {
    "hoyoverse_capturing_radiance_qa": {
        "page": "https://genshin.hoyoverse.com/en/news/detail/125274",
        "fetched": "https://sg-public-api-static.hoyoverse.com/content_v2_user/app/a1b1f9d3315447cc/getContent?iAppId=32&iInfoId=125274&sLangKey=en-us",
        "note": "the JSON the official page itself loads; the page is client-rendered",
    },
    "fandom_wish_page_wikitext": {
        "page": "https://genshin-impact.fandom.com/wiki/Wish",
        "fetched": "https://genshin-impact.fandom.com/api.php?action=parse&page=Wish&prop=wikitext&format=json",
        "note": "community wiki (CC BY-SA); says 1.6% is the consolidated rate, that 'pity', 'banner' and 'soft pity' are unofficial terms, and that soft pity was found by player testing",
    },
    "fandom_character_event_wish_wikitext": {
        "page": "https://genshin-impact.fandom.com/wiki/Character_Event_Wish",
        "fetched": "https://genshin-impact.fandom.com/api.php?action=parse&page=Character_Event_Wish&prop=wikitext&format=json",
        "note": "community wiki (CC BY-SA); its Rates table lists base 0.6% and an average rate with pity of 1.6% under '(Official)' and 1.6052% under '(Community Estimation)', citing a bilibili estimate from 9.45M wishes; the per-pull table (0.6% to pull 73, +6 points a pull from 74 to 89, 100% at 90) is cited to that estimate",
    },
}
out = {"retrieved": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"), "references": {}}
for key, r in REFS.items():
    req = urllib.request.Request(r["fetched"], headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as resp:
        body = resp.read()
    out["references"][key] = {**r, "status": 200, "bytes": len(body), "sha256": hashlib.sha256(body).hexdigest()}
    if key.startswith("hoyoverse"):
        d = json.loads(body)["data"]
        c = d.get("content", d)
        out["references"][key]["published"] = c["dtStartTime"]
        out["references"][key]["title"] = c["sTitle"]


def head(url):
    return subprocess.run(["git", "ls-remote", url, "HEAD"], capture_output=True, text=True, timeout=60).stdout.split()[0]


out["code"] = {
    "paimon-moe (front end, MIT)": {"url": "https://github.com/MadeBaruna/paimon-moe", "HEAD_when_retrieved": head("https://github.com/MadeBaruna/paimon-moe.git")},
    "paimon-moe-api (server, read for how the tallies are built)": {"url": "https://github.com/MadeBaruna/paimon-moe-api", "HEAD_when_retrieved": head("https://github.com/MadeBaruna/paimon-moe-api.git")},
    "privacy policy (states the submissions are opt-in and aggregated)": {"url": "https://paimon.moe/privacy-policy"},
}
out["tallies"] = json.load(open(f"{root}/cache/manifest.json"))
json.dump(out, open(f"{root}/manifest.json", "w"), indent=1)
print("wrote manifest.json")
