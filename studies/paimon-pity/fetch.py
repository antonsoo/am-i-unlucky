"""Fetch paimon.moe's public per-banner wish tallies (the same GET the site's
"Global Wish Stats" page makes in a browser), one banner at a time, slowly.

Usage: python3 -I fetch.py <out_dir> [first_id last_id]
Writes <out_dir>/<id>.json for each banner that has data, and manifest.json
(URL, HTTP status, sha256, bytes, retrieval time, the `time` field the site
reports for the tally). No login, no per-user endpoints.
"""
import hashlib, json, sys, time, urllib.request, urllib.error, datetime, pathlib

UA = "am-i-unlucky-study/0.1 (research; contact anton@praviel.com)"
BASE = "https://api.paimon.moe/wish?banner={}"
out = pathlib.Path(sys.argv[1])
out.mkdir(parents=True, exist_ok=True)
first, last = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (300001, 300106)
ids = [200001] + list(range(first, last + 1))
manifest = {}
mpath = out / "manifest.json"
if mpath.exists():
    manifest = json.loads(mpath.read_text())
for i in ids:
    if str(i) in manifest:
        continue
    url = BASE.format(i)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    status, body = None, b""
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                status, body = r.status, r.read()
            break
        except urllib.error.HTTPError as e:
            status, body = e.code, e.read()
            break
        except Exception:
            time.sleep(5 * (attempt + 1))
    entry = {"url": url, "status": status, "bytes": len(body),
             "retrieved": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")}
    if status == 200:
        (out / f"{i}.json").write_bytes(body)
        entry["sha256"] = hashlib.sha256(body).hexdigest()
        entry["tally_time"] = json.loads(body).get("time")
    manifest[str(i)] = entry
    mpath.write_text(json.dumps(manifest, indent=1))
    print(i, status, len(body), flush=True)
    time.sleep(2.5)
