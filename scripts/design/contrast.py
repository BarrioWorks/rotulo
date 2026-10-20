"""Print WCAG contrast ratios for the color token pairs Pagehaven relies on.

Usage: python3 -I scripts/design/contrast.py [assets/static/css/app.css]
Reads colour tokens from the :root block, so the table always reflects the shipped values. Exits 1 if a pair is below its minimum.
"""
import re, sys

css = open(sys.argv[1] if len(sys.argv) > 1 else "assets/static/css/app.css").read()
root = css[css.index(":root {"):css.index("}", css.index(":root {"))]
T = {k: v.strip() for k, v in re.findall(r"--([a-z0-9-]+):\s*([^;]+);", root)}

def token(name):
    value = T[name]
    alias = re.fullmatch(r"var\(--([a-z0-9-]+)\)", value)
    return token(alias[1]) if alias else value

T["white"] = "#FFFFFF"

# Control borders are measured against their surface fill. The selection ring
# is measured together with its halo below, including on dark backgrounds.
# (foreground, background, minimum, what it is)
PAIRS = [
    ("ink", "surface", 4.5, "primary text"), ("ink", "ground", 4.5, "primary text"), ("ink", "sunken", 4.5, "primary text"),
    ("ink-2", "surface", 4.5, "secondary text"), ("ink-2", "ground", 4.5, "secondary text"), ("ink-2", "sunken", 4.5, "secondary text"),
    ("ink-3", "surface", 4.5, "meta, placeholder"), ("ink-3", "ground", 4.5, "meta, placeholder"), ("ink-3", "sunken", 4.5, "meta, disabled label"),
    ("ink-3", "surface-hover", 4.5, "meta on hovered row"), ("ink-2", "neutral-soft", 4.5, "draft pill"),
    ("on-primary", "primary", 4.5, "primary button"), ("on-primary", "primary-hover", 4.5, "primary button hover"),
    ("link", "surface", 4.5, "link"), ("link", "ground", 4.5, "link"), ("link-hover", "surface", 4.5, "link hover"),
    ("success", "surface", 4.5, "success text"), ("success", "success-soft", 4.5, "published pill"),
    ("warning", "surface", 4.5, "warning text"), ("warning", "warning-soft", 4.5, "changes pill"),
    ("error", "surface", 4.5, "error text"), ("error", "error-soft", 4.5, "error alert"),
    ("on-primary", "error", 4.5, "destructive button, error toast"), ("on-primary", "error-hover", 4.5, "destructive hover"),
    ("on-toast", "toast", 4.5, "toast, tooltip"), ("on-primary", "select-strong", 4.5, "selection slug"),
    ("ink", "select-soft", 4.5, "text on selected row"),
    ("link", "select-soft", 4.5, "current page row label"), ("ink-3", "neutral-soft", 4.5, "meta on a neutral note"),
    ("ink-2", "surface-pressed", 4.5, "label on a pressed control"),
    ("control-border", "surface", 3.0, "input and secondary button edge"),
    ("select", "surface", 3.0, "focus ring, selection on white"), ("select", "ground", 3.0, "focus ring on ground"),
    ("ink", "surface", 3.0, "pressed segment, switch on"),
    ("select", "select-soft", 3.0, "current page icon"),
    ("ink", "warning-soft", 4.5, "warning toast text"), ("warning", "warning-soft", 3.0, "warning toast icon"),
]

def rgb(h):
    return [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]

def lum(h):
    c = rgb(h) if isinstance(h, str) else h
    c = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]

def ratio(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)

failed = False
print("| Foreground | Background | Ratio | Needs | Use |\n|---|---|---|---|---|")
for fg, bg, need, use in PAIRS:
    r = ratio(token(fg), token(bg))
    failed |= r < need
    print(f"| `{fg}` {token(fg)} | `{bg}` {token(bg)} | {r:.2f} | {need} | {use}{'  FAIL' if r < need else ''} |")
# The accent and opaque white halo together must cover arbitrary site pixels.
for step in range(2001):
    grey = step / 2000
    linear = grey / 12.92 if grey <= 0.04045 else ((grey + 0.055) / 1.055) ** 2.4
    contrasts = [(max(lum(token(name)), linear) + 0.05) / (min(lum(token(name)), linear) + 0.05)
                 for name in ("select-ring", "select-halo")]
    if max(contrasts) < 3:
        print(f"FAIL selection ring plus halo over grey {grey:.4f}")
        failed = True
# Port of identity/measure.py's CSS saturate + source-over model, using
# only the standard library so the check gate needs no image/numpy dependency.
def composite(backdrop, tint, alpha, saturation):
    matrix = (
        (0.213 + 0.787 * saturation, 0.715 - 0.715 * saturation, 0.072 - 0.072 * saturation),
        (0.213 - 0.213 * saturation, 0.715 + 0.285 * saturation, 0.072 - 0.072 * saturation),
        (0.213 - 0.213 * saturation, 0.715 - 0.715 * saturation, 0.072 + 0.928 * saturation),
    )
    saturated = [min(1, max(0, sum(a * b for a, b in zip(row, backdrop)))) for row in matrix]
    return [alpha * a + (1 - alpha) * b for a, b in zip(tint, saturated)]

STATUS = [(name, 4.5) for name in ("accent", "success", "warning", "error")]
LEVEL_TEXT = {
    "glass-2": [("ink", 4.5), ("ink-2", 4.5), *STATUS],
    "glass-3": [("ink", 4.5), ("ink-2", 4.5), ("ink-3", 4.5), *STATUS, ("control-edge", 3.0)],
}
BACKDROPS = {
    "white": "#FFFFFF", "black": "#000000", "red": "#FF0000", "green": "#00FF00",
    "blue": "#0000FF", "yellow": "#FFFF00", "magenta": "#FF00FF", "cyan": "#00FFFF",
    "agency yellow": "#FFC800", "landwind blue": "#1A56DB",
}
for level, text in LEVEL_TEXT.items():
    values = [float(v) for v in re.fullmatch(r"rgba\(([^)]+)\)", token(f"{level}-tint"))[1].split(",")]
    tint, alpha = [v / 255 for v in values[:3]], values[3]
    saturation = float(re.search(r"saturate\(([\d.]+)\)", token(f"{level}-filter"))[1])
    for backdrop, colour in BACKDROPS.items():
        surface = composite(rgb(colour), tint, alpha, saturation)
        for fg, need in text:
            r = ratio(token(fg), surface)
            failed |= r < need
            print(f"| `{fg}` | {level} over {backdrop} | {r:.2f} | {need} |{' FAIL' if r < need else ''} |")
sys.exit(1 if failed else 0)
