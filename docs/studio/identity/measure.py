"""Measure the Studio identity tokens: opaque pairs, selection ring coverage, and glass text contrast.

Usage: python3 -I docs/studio/identity/measure.py [--check-readme]
Run from the repo root. Needs numpy and ImageMagick's `magick` to decode the fixture photos. Writes nothing.
Glass method: backdrop = sample, then CSS saturate() matrix in gamma-encoded sRGB (what Chromium does for
filter functions), clamped, then source-over with the tint alpha in gamma-encoded sRGB. Photos are
downscaled to 320 px wide (one sample per 4 CSS px at 1280) and blurred with sigma = blur / 4.
"""
import io, re, subprocess, sys, zipfile
import numpy as np

ROOT = "docs/studio/identity"
css = open(f"{ROOT}/tokens.css").read()
T = {k: v.strip() for k, v in re.findall(r"--([a-z0-9-]+):\s*([^;]+);", css)}

def parse(v):
    v = v.strip()
    if v.startswith("#"):
        return np.array([int(v[i:i + 2], 16) for i in (1, 3, 5)], float) / 255, 1.0
    m = re.match(r"rgba\(([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\)", v)
    return np.array([float(m[1]), float(m[2]), float(m[3])]) / 255, float(m[4])

def color(name):
    rgb, a = parse(T[name])
    assert a == 1.0, f"{name} is translucent"
    return rgb

def lin(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)

def lum(c):
    l = lin(np.asarray(c, float))
    return 0.2126 * l[..., 0] + 0.7152 * l[..., 1] + 0.0722 * l[..., 2]

def ratio(a, b):
    la, lb = lum(a), lum(b)
    return (np.maximum(la, lb) + 0.05) / (np.minimum(la, lb) + 0.05)

def oklch(c):
    l = lin(np.asarray(c, float))
    lms = np.cbrt(np.array([[0.4122214708, 0.5363325363, 0.0514459929], [0.2119034982, 0.6806995451, 0.1073969566], [0.0883024619, 0.2817188376, 0.6299787005]]) @ l)
    L, a, b = np.array([[0.2104542553, 0.7936177850, -0.0040720468], [1.9779984951, -2.4285922050, 0.4505937099], [0.0259040371, 0.7827717662, -0.8086757660]]) @ lms
    return f"oklch({L:.3f} {np.hypot(a, b):.3f} {np.degrees(np.arctan2(b, a)) % 360:.0f})"

def saturate(px, s):
    m = np.array([[0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s],
                  [0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s],
                  [0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s]])
    return np.clip(px @ m.T, 0, 1)

def decode(data, sigma):
    blur = ["-blur", f"0x{sigma}"] if sigma else []
    raw = subprocess.run(["magick", "-", "-resize", "320x", *blur, "-depth", "8", "rgb:-"], input=data, capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, 3) / 255

PHOTOS = {
    "replacement-banner.jpg": open("fixtures/images/replacement-banner.jpg", "rb").read(),
    "replacement-hero.jpg": open("fixtures/images/replacement-hero.jpg", "rb").read(),
    "agency header-bg.jpg": zipfile.ZipFile("fixtures/zips/startbootstrap-agency.zip").read("dist/assets/img/header-bg.jpg"),
    "agency portfolio/2.jpg": zipfile.ZipFile("fixtures/zips/startbootstrap-agency.zip").read("dist/assets/img/portfolio/2.jpg"),
}
SOLIDS = {
    "white": "#FFFFFF", "black": "#000000", "red": "#FF0000", "green": "#00FF00", "blue": "#0000FF",
    "yellow": "#FFFF00", "magenta": "#FF00FF", "cyan": "#00FFFF", "agency yellow": "#FFC800", "landwind blue": "#1A56DB",
}

def table(head, rows):
    print("| " + " | ".join(head) + " |\n|" + "---|" * len(head))
    for r in rows:
        print("| " + " | ".join(str(x) for x in r) + " |")
    print()

failed = []

def check(value, need, label):
    if value < need:
        failed.append(f"{label}: {value:.2f} < {need}")
    return f"{value:.2f}" + ("" if value >= need else " FAIL")

# 1. Opaque pairs
print("## Opaque pairs\n")
PAIRS = [
    ("ink", "surface", 4.5), ("ink-2", "surface", 4.5), ("ink-3", "surface", 4.5), ("ink-3", "surface-sunk", 4.5),
    ("ink", "ws-ground", 4.5), ("ink-2", "ws-ground", 4.5), ("ink", "accent-soft", 4.5), ("accent", "accent-soft", 4.5),
    ("accent", "surface", 4.5), ("on-accent", "accent", 4.5), ("on-accent", "accent-hover", 4.5), ("on-accent", "accent-pressed", 4.5),
    ("success", "surface", 4.5), ("success", "success-soft", 4.5), ("warning", "surface", 4.5), ("warning", "warning-soft", 4.5),
    ("error", "surface", 4.5), ("error", "error-soft", 4.5), ("on-accent", "error", 4.5), ("on-tip", "tip", 4.5),
    ("control-edge", "surface", 3.0), ("accent", "surface", 3.0), ("accent", "ws-ground", 3.0), ("ws-ground-edge", "ws-ground", 1.0),
]
table(["Foreground", "Background", "Ratio", "Needs"],
      [(f"`{f}` {T[f]}", f"`{b}` {T[b]}", check(ratio(color(f), color(b)), n, f"{f} on {b}"), n) for f, b, n in PAIRS])

# 2. Selection ring
print("## Selection ring over any background\n")
print("A pixel counts as covered when the ring or its white halo reaches 3:1 against it. Worst case is the background luminance where both are weakest.\n")
grid = np.linspace(0, 1, 2001)
greys = np.stack([grid] * 3, axis=1)
raw = {k: decode(v, 0) for k, v in PHOTOS.items()}
rows = []
for name, hexv in [("Studio accent", T["accent"]), ("Proof cyan", "#0A86D6")]:
    ring, _ = parse(hexv)
    halo = color("select-halo")
    worst = np.min(np.maximum(ratio(ring, greys), ratio(halo, greys)))
    cells = [f"{name} {hexv}", oklch(ring), f"{ratio(ring, np.ones(3)):.2f}", f"{ratio(ring, np.zeros(3)):.2f}", f"{worst:.2f}"]
    for k, px in raw.items():
        cover = np.maximum(ratio(ring, px), ratio(halo, px)) >= 3
        cells.append(f"{100 * (1 - cover.mean()):.1f}%")
    rows.append(cells)
table(["Ring", "OKLCH", "On white", "On black", "Worst any grey", *[f"Uncovered in {k}" for k in raw]], rows)

# 3. Glass
print("## Glass levels: worst text contrast\n")
STATUS = [("accent", 4.5), ("success", 4.5), ("warning", 4.5), ("error", 4.5)]
LEVEL_TEXT = {  # glass-2 carries labels and status words only; meta text and form edges live on glass-3
    "glass-2": [("ink", 4.5), ("ink-2", 4.5), *STATUS],
    "glass-3": [("ink", 4.5), ("ink-2", 4.5), ("ink-3", 4.5), *STATUS, ("control-edge", 3.0)],
}
for level, TEXT in LEVEL_TEXT.items():
    tint, alpha = parse(T[f"{level}-tint"])
    blur = float(re.search(r"blur\(([\d.]+)px\)", T[f"{level}-filter"])[1])
    sat = float(re.search(r"saturate\(([\d.]+)\)", T[f"{level}-filter"])[1])
    backs = {k: parse(v)[0][None, :] for k, v in SOLIDS.items()}
    backs.update({k: decode(v, blur / 4) for k, v in PHOTOS.items()})
    comp = {k: alpha * tint + (1 - alpha) * saturate(px, sat) for k, px in backs.items()}
    print(f"### {level}: tint {T[f'{level}-tint']}, {T[f'{level}-filter']}\n")
    print("Composited surface luminance: " + ", ".join(f"{k} {lum(v).min():.3f}" for k, v in comp.items() if k in ("white", "black", "blue", "replacement-banner.jpg")) + " (minimum over pixels).\n")
    rows = []
    for tok, need in TEXT:
        fg = color(tok)
        per = {k: float(np.min(ratio(fg, v))) for k, v in comp.items()}
        wk = min(per, key=per.get)
        rows.append((f"`{tok}` {T[tok]}", f"{per['white']:.2f}", f"{per['black']:.2f}", f"{min(per[k] for k in SOLIDS if k not in ('white', 'black')):.2f}",
                     f"{min(per[k] for k in PHOTOS):.2f}", check(per[wk], need, f"{tok} on {level} over {wk}") + f" ({wk})", need))
    table(["Text", "Over white", "Over black", "Over saturated (worst)", "Over photos (worst pixel)", "Worst", "Needs"], rows)

ink2, _ = parse(T["ink-2"])
tint, _ = parse(T["glass-2-tint"])
need_alpha = next(a for a in np.arange(0.5, 1.0001, 0.005) if ratio(ink2, a * tint) >= 4.5)
print(f"Lowest glass-2 alpha that keeps `ink-2` at 4.5:1 over black: {need_alpha:.3f} (shipped {parse(T['glass-2-tint'])[1]}).\n")

if "--check-readme" in sys.argv:
    readme = open(f"{ROOT}/README.md").read()
    block = re.search(r"```css\n(.*?)```", readme, re.S)[1]
    if block.strip() != css.strip():
        failed.append("README.md css block differs from tokens.css")

if failed:
    print("FAILURES:\n" + "\n".join(failed))
sys.exit(1 if failed else 0)
