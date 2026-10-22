"""Build a Rótulo sprite from Lucide glyphs.

Usage: python3 -I build_sprite.py <lucide-static/icons dir> <out.svg>
Get the icons dir with `npm pack lucide-static` in an empty temp dir and untar it. Nothing is installed.
"""
import pathlib, runpy, sys
here = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(here))
from svgparts import inner

GLYPHS = runpy.run_path(str(here / 'glyphs.py'))['GLYPHS']
src, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
version = (src.parent / 'package.json').read_text().split('"version": "')[1].split('"')[0]
lines = [
    '<svg xmlns="http://www.w3.org/2000/svg">',
    f'<!-- Glyphs from Lucide {version} (https://github.com/lucide-icons/lucide). ISC License, Copyright (c) Lucide Icons and Contributors. Glyphs Lucide marks as derived from Feather: MIT License, Copyright (c) 2013-present Cole Bemis. Full texts: icons.LICENSE.txt next to this file. -->',
    '<!-- Stroke, caps and joins come from .icon in app.css. Do not hand-edit; rerun docs/design/type-icons/tools/build_sprite.py. -->',
]
for sid, _cur, lucide, *_ in GLYPHS:
    lines.append(f'<symbol id="i-{sid}" viewBox="0 0 24 24">{inner((src / f"{lucide}.svg").read_text())}</symbol>')
lines.append('</svg>')
out.write_text('\n'.join(lines) + '\n')
print(f'{len(GLYPHS)} symbols, {out.stat().st_size} bytes -> {out}')
