"""Print WCAG contrast ratios for the color token pairs Pagehaven relies on.

Usage: python3 -I scripts/design/contrast.py [assets/static/css/app.css]
Reads hex tokens from the :root block, so the table always reflects the shipped values. Exits 1 if a pair is below its minimum.
"""
import re, sys

css = open(sys.argv[1] if len(sys.argv) > 1 else "assets/static/css/app.css").read()
root = css[css.index(":root {"):css.index("}", css.index(":root {"))]
T = dict(re.findall(r"--([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})\b", root))
T["white"], T["dark-photo"] = "#FFFFFF", "#2B2B2B"

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
    ("control-border", "surface", 3.0, "input and secondary button edge"), ("control-border", "ground", 3.0, "input edge on ground"),
    ("select", "surface", 3.0, "focus ring, selection on white"), ("select", "ground", 3.0, "focus ring on ground"),
    ("select", "dark-photo", 3.0, "selection on a dark photo"), ("select", "ink", 3.0, "focus ring next to ink button"),
    ("ink", "surface", 3.0, "pressed segment, switch on"),
    ("select", "select-soft", 3.0, "current page icon"),
    ("ink", "warning-soft", 4.5, "warning toast text"), ("warning", "warning-soft", 3.0, "warning toast icon"),
]

def lum(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    c = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]

def ratio(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)

failed = False
print("| Foreground | Background | Ratio | Needs | Use |\n|---|---|---|---|---|")
for fg, bg, need, use in PAIRS:
    r = ratio(T[fg], T[bg])
    failed |= r < need
    print(f"| `{fg}` {T[fg]} | `{bg}` {T[bg]} | {r:.2f} | {need} | {use}{'  FAIL' if r < need else ''} |")
sys.exit(1 if failed else 0)
