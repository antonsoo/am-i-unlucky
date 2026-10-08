"""Draw hazard.svg and fifty.svg from results.json. Plain SVG, no dependencies.

Usage: python3 -I figure.py <study dir>
"""
import json, sys

root = sys.argv[1]
R = json.load(open(f"{root}/results.json"))
BG, INK, GRID, MUTE = "#ffffff", "#1b1f24", "#e3e6ea", "#5b6570"
BLUE, ORANGE = "#1f6fb2", "#c9731c"
FONT = "font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif"


class Panel:
    def __init__(self, x, y, w, h, xr, yr, xt, yt, xfmt, yfmt, xlabel, ylabel, title):
        self.x, self.y, self.w, self.h, self.xr, self.yr = x, y, w, h, xr, yr
        self.xt, self.yt, self.xfmt, self.yfmt = xt, yt, xfmt, yfmt
        self.xlabel, self.ylabel, self.title = xlabel, ylabel, title

    def px(self, v):
        return self.x + (v - self.xr[0]) / (self.xr[1] - self.xr[0]) * self.w

    def py(self, v):
        return self.y + self.h - (v - self.yr[0]) / (self.yr[1] - self.yr[0]) * self.h

    def frame(self):
        o = [f'<text x="{self.x}" y="{self.y - 14}" style="{FONT};font-size:13px;font-weight:600" fill="{INK}">{self.title}</text>']
        for v in self.yt:
            o.append(f'<line x1="{self.x}" x2="{self.x + self.w}" y1="{self.py(v):.1f}" y2="{self.py(v):.1f}" stroke="{GRID}"/>')
            o.append(f'<text x="{self.x - 7}" y="{self.py(v) + 4:.1f}" text-anchor="end" style="{FONT};font-size:11px" fill="{MUTE}">{self.yfmt(v)}</text>')
        for v in self.xt:
            o.append(f'<line x1="{self.px(v):.1f}" x2="{self.px(v):.1f}" y1="{self.y + self.h}" y2="{self.y + self.h + 4}" stroke="{MUTE}"/>')
            o.append(f'<text x="{self.px(v):.1f}" y="{self.y + self.h + 17}" text-anchor="middle" style="{FONT};font-size:11px" fill="{MUTE}">{self.xfmt(v)}</text>')
        o.append(f'<line x1="{self.x}" x2="{self.x + self.w}" y1="{self.y + self.h}" y2="{self.y + self.h}" stroke="{MUTE}"/>')
        o.append(f'<text x="{self.x + self.w / 2}" y="{self.y + self.h + 34}" text-anchor="middle" style="{FONT};font-size:11px" fill="{MUTE}">{self.xlabel}</text>')
        o.append(f'<text transform="translate({self.x - 48},{self.y + self.h / 2}) rotate(-90)" text-anchor="middle" style="{FONT};font-size:11px" fill="{MUTE}">{self.ylabel}</text>')
        return o

    def band(self, xs, lo, hi, color):
        pts = [(self.px(a), self.py(v)) for a, v in zip(xs, lo)] + [(self.px(a), self.py(v)) for a, v in reversed(list(zip(xs, hi)))]
        return f'<polygon points="{" ".join(f"{a:.1f},{b:.1f}" for a, b in pts)}" fill="{color}" fill-opacity="0.22" stroke="none"/>'

    def line(self, xs, ys, color, width=1.6, dash=None):
        pts = " ".join(f"{self.px(a):.1f},{self.py(b):.1f}" for a, b in zip(xs, ys))
        d = f' stroke-dasharray="{dash}"' if dash else ""
        return f'<polyline points="{pts}" fill="none" stroke="{color}" stroke-width="{width}"{d} stroke-linejoin="round"/>'

    def dots(self, xs, ys, color, r=2.2):
        return "".join(f'<circle cx="{self.px(a):.1f}" cy="{self.py(b):.1f}" r="{r}" fill="{color}"/>' for a, b in zip(xs, ys))

    def text(self, x, y, s, color, anchor="start", size=11, weight=400):
        return f'<text x="{self.px(x):.1f}" y="{y:.1f}" text-anchor="{anchor}" style="{FONT};font-size:{size}px;font-weight:{weight}" fill="{color}">{s}</text>'


def svg(w, h, body, title, desc):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-labelledby="t d">'
            f'<title id="t">{title}</title><desc id="d">{desc}</desc><rect width="{w}" height="{h}" fill="{BG}"/>' + "".join(body) + "</svg>")


pre, post = R["pooled"]["pre-5.0"], R["pooled"]["5.0+"]
PRE = R["preset"]["hazard"]
src = R["sources"]

# --- hazard.svg ---------------------------------------------------------------
body = [f'<text x="70" y="26" style="{FONT};font-size:15px;font-weight:700" fill="{INK}">Five-star chance per pull in logged Genshin Impact character banners, against the tool\'s archetype</text>']
p1 = Panel(70, 70, 380, 230, (1, 73), (0, 0.012), [1, 10, 20, 30, 40, 50, 60, 73], [0, 0.002, 0.004, 0.006, 0.008, 0.010, 0.012],
           lambda v: str(v), lambda v: f"{v * 100:.1f}%", "pull number", "chance of a five-star on that pull",
           "Before soft pity (pulls 1 to 73)")
body += p1.frame()
xs = list(range(1, 74))
for d, c in ((pre, ORANGE), (post, BLUE)):
    body.append(p1.band(xs, d["ci_lo"][:73], d["ci_hi"][:73], c))
    body.append(p1.line(xs, d["hazard"][:73], c))
body.append(p1.line(xs, PRE[:73], INK, 1.6, "5 4"))
for i, (lab, c, dash) in enumerate((("logged, before 5.0", ORANGE, None), ("logged, 5.0 and later", BLUE, None), ("archetype: 0.6% flat", INK, "5 4"))):
    yy = p1.y + 16 + 16 * i
    body.append(f'<line x1="{p1.x + 10}" x2="{p1.x + 34}" y1="{yy - 4}" y2="{yy - 4}" stroke="{c}" stroke-width="2"' + (f' stroke-dasharray="{dash}"' if dash else "") + "/>")
    body.append(f'<text x="{p1.x + 40}" y="{yy}" style="{FONT};font-size:11px" fill="{INK}">{lab}</text>')

p2 = Panel(550, 70, 320, 230, (70, 90), (0, 1), [70, 74, 78, 82, 86, 90], [0, 0.25, 0.5, 0.75, 1],
           lambda v: str(v), lambda v: f"{v * 100:.0f}%", "pull number", "chance of a five-star on that pull",
           "Soft pity and hard pity (pulls 70 to 90)")
body += p2.frame()
xs2 = list(range(70, 91))
for d, c in ((pre, ORANGE), (post, BLUE)):
    body.append(p2.band(xs2, d["ci_lo"][69:90], d["ci_hi"][69:90], c))
    body.append(p2.line(xs2, d["hazard"][69:90], c))
    body.append(p2.dots(xs2, d["hazard"][69:90], c, 1.8))
body.append(p2.line(xs2, PRE[69:90], INK, 1.6, "5 4"))
body.append(p2.text(70.3, p2.py(0.93), "dashed: archetype", INK))
body.append(p2.text(70.3, p2.py(0.86), "(+6 points a pull from 74)", INK))

p3 = Panel(70, 380, 800, 170, (1, 89), (-0.5, 0.1), [1, 10, 20, 30, 40, 50, 60, 70, 74, 80, 85, 89], [-0.4, -0.3, -0.2, -0.1, 0, 0.1],
           lambda v: str(v), lambda v: f"{v * 100:+.0f}" if v else "0", "pull number", "logged minus archetype, points",
           "Gap between logged and archetype hazard (percentage points)")
body += p3.frame()
xs3 = list(range(1, 90))
for d, c in ((pre, ORANGE), (post, BLUE)):
    body.append(p3.line(xs3, [d["hazard"][n - 1] - PRE[n - 1] for n in xs3], c))
body.append(f'<line x1="{p3.x}" x2="{p3.x + p3.w}" y1="{p3.py(0):.1f}" y2="{p3.py(0):.1f}" stroke="{INK}" stroke-dasharray="5 4"/>')
body.append(p3.text(36, p3.py(0.05), "pulls 1 to 83: within about one point", MUTE, "middle"))
body.append(p3.text(88.5, p3.py(-0.46), "from 85 the logs fall short", MUTE, "end"))
share = R["preset_vs_logged"]["5.0+"]["share_of_five_stars_logged_at_pulls_85_to_89"] * 100
for i, line in enumerate((
    f'Bands are 95% Wilson intervals. 5.0 and later: {post["five_stars"]:,} logged five-stars, {src["banners_5_0_plus"]} banner phases. Before 5.0: {pre["five_stars"]:,}, {src["banners_pre_5_0"]} banner phases.',
    f'Source: paimon.moe public tallies, retrieved {src["retrieved_between"][0][:10]}. Community data, not the publisher\'s odds.',
    f'Pulls 85 to 89 hold {share:.2f}% of the five-stars logged in 5.0 and later. The preset uses the logged values to pull 84 and the ramp above.')):
    body.append(f'<text x="70" y="{598 + 16 * i}" style="{FONT};font-size:11px" fill="{MUTE}">{line}</text>')
open(f"{root}/hazard.svg", "w").write(svg(920, 650, body, "Logged five-star hazard against the archetype",
    "Hazard by pull number for logged character banners before and after version 5.0, with the archetype preset drawn dashed."))

# --- fifty.svg ----------------------------------------------------------------
F = R["fifty_fifty_by_version"]
vers = list(F)
q = Panel(70, 70, 800, 220, (0, len(vers) - 1), (0.45, 0.65), list(range(0, len(vers), 4)), [0.5, 0.55, 0.6, 0.65],
          lambda i: vers[int(i)], lambda v: f"{v * 100:.0f}%", "version of the banner", "won, on unguaranteed rolls",
          "Share of unguaranteed five-star rolls that landed on the featured character, by version")
body = [f'<text x="70" y="26" style="{FONT};font-size:15px;font-weight:700" fill="{INK}">The 50/50 in logged pulls, version by version</text>']
body += q.frame()
xs = list(range(len(vers)))
ys = [F[v]["win_rate_on_unguaranteed_rolls"] for v in vers]
k = vers.index("5.0")
body.append(q.line(xs[: k + 1], ys[: k + 1], ORANGE))
body.append(q.dots(xs[:k], ys[:k], ORANGE))
body.append(q.line(xs[k:], ys[k:], BLUE))
body.append(q.dots(xs[k:], ys[k:], BLUE))
for lvl, lab in ((0.5, "50%: the rule before 5.0"), (0.55, "55%: the publisher's stated figure from 5.0")):
    body.append(f'<line x1="{q.x}" x2="{q.x + q.w}" y1="{q.py(lvl):.1f}" y2="{q.py(lvl):.1f}" stroke="{INK}" stroke-dasharray="5 4" stroke-opacity="0.55"/>')
    body.append(f'<text x="{q.x + 6}" y="{q.py(lvl) + (-5 if lvl > 0.5 else 14):.1f}" style="{FONT};font-size:11px" fill="{INK}">{lab}</text>')
body.append(f'<text x="70" y="338" style="{FONT};font-size:11px" fill="{MUTE}">Labelled by the tracker: a roll is guaranteed if the previous five-star was off-banner, so the first roll of an imported</text>')
body.append(f'<text x="70" y="354" style="{FONT};font-size:11px" fill="{MUTE}">history counts as a 50/50 even when it was not. This lifts every point by an estimated two points.</text>')
body.append(f'<text x="70" y="370" style="{FONT};font-size:11px" fill="{MUTE}">Source: paimon.moe public tallies, {len(vers)} versions, {src["banners_pre_5_0"] + src["banners_5_0_plus"]} banner phases, retrieved {src["retrieved_between"][0][:10]}. Community data.</text>')
open(f"{root}/fifty.svg", "w").write(svg(920, 386, body, "Featured share by version", "Win rate of the 50/50 roll by game version."))
print("wrote hazard.svg fifty.svg")
