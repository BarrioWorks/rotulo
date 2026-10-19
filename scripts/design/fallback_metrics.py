"""Print size-adjust and ascent/descent overrides that make a local fallback match a web font.

Usage: python3 -I fallback_metrics.py <web sans> <local sans> <web serif> <local serif>
Liberation Sans and Serif share Arial's and Times New Roman's advance widths, so the numbers hold for those too.
"""
import sys
from fontTools.ttLib import TTFont

SAMPLE = "Your websites Import a website Publish changes Edited 10 minutes ago, 3 pages. Harbor Bakery Saved Version 3 is live"

def width(font):
    cmap, hmtx = font.getBestCmap(), font["hmtx"]
    return sum(hmtx[cmap[ord(c)]][0] for c in SAMPLE) / font["head"].unitsPerEm

def overrides(web_path, local_path):
    web, local = TTFont(web_path), TTFont(local_path)
    scale = width(web) / width(local)
    upm, hhea = web["head"].unitsPerEm, web["hhea"]
    return (f"size-adjust: {scale * 100:.1f}%; ascent-override: {hhea.ascent / upm / scale * 100:.1f}%; "
            f"descent-override: {-hhea.descent / upm / scale * 100:.1f}%; line-gap-override: 0%;")

print("sans fallback: ", overrides(sys.argv[1], sys.argv[2]))
print("serif fallback:", overrides(sys.argv[3], sys.argv[4]))
