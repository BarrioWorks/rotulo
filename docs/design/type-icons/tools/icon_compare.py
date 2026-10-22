"""Render docs/design/type-icons/specimens/icons-compare.html.

Usage: python3 -I icon_compare.py <dir with untarred lucide-static, tabler-icons, phosphor-icons-core> <current icons.svg> <out.html>
"""
import html, pathlib, re, runpy, sys
here = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(here))
from svgparts import inner, viewbox

GLYPHS = runpy.run_path(str(here / 'glyphs.py'))['GLYPHS']
root, current, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]), pathlib.Path(sys.argv[3])
def one(pattern):
    return next(root.glob(pattern))
L, T, P = one('lucide-static-*/package/icons'), one('tabler-icons-*/package/icons/outline'), one('phosphor-icons-core-*/package/assets/regular')
cur = dict(re.findall(r'<symbol id="i-([a-z-]+)" viewBox="0 0 24 24">(.*?)</symbol>', current.read_text()))

def stroke(body, size, sw):
    return f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round">{body}</svg>'
def filled(path, size):
    t = path.read_text()
    return f'<svg width="{size}" height="{size}" viewBox="{viewbox(t)}" fill="currentColor">{inner(t)}</svg>'

rows = []
for sid, c, l, t, p, action in GLYPHS:
    cells = [f'<td class="act">{html.escape(action)}<code>i-{sid}</code></td>']
    cells.append('<td>' + (''.join(stroke(cur[c], s, 1.7) for s in (15, 18)) if c in cur else '<span class="none">none</span>') + f'<code>{c or ""}</code></td>')
    for d, n in ((L, l), (T, t)):
        b = inner((d / f'{n}.svg').read_text())
        cells.append(f'<td>{stroke(b, 16, 1.5)}{stroke(b, 20, 1.5)}<code>{n}</code></td>')
    cells.append(f'<td>{filled(P / f"{p}.svg", 16)}{filled(P / f"{p}.svg", 20)}<code>{p}</code></td>')
    rows.append('<tr>' + ''.join(cells) + '</tr>')

out.write_text(f'''<!doctype html><html lang="en"><meta charset="utf-8"><title>Rótulo icon candidates</title>
<style>
body{{margin:0;padding:32px;background:#f8f7f4;color:#1c1b18;font:14px/1.4 system-ui,sans-serif}}
h1{{font-size:20px;margin:0 0 4px}} p{{margin:0 0 20px;color:#57534b;max-width:70ch}}
table{{border-collapse:collapse;background:#fff;border:1px solid rgba(40,34,24,.12);border-radius:12px}}
th,td{{padding:7px 14px;border-bottom:1px solid rgba(40,34,24,.08);text-align:left;vertical-align:middle}}
th{{font-size:12px;color:#57534b;font-weight:600}}
td svg{{display:inline-block;vertical-align:middle;margin-right:10px;color:#1c1b18}}
td.act{{width:270px}} code{{display:block;font:11px ui-monospace,monospace;color:#6f6a61;margin-top:2px}}
.none{{color:#b0aa9f;font-size:12px}}
</style>
<h1>Icon candidates for every Rótulo action</h1>
<p>Current sprite at its real sizes (15 and 18 px, 1.7 stroke). Lucide and Tabler at the proposed 16 and 20 px with a 1.5 stroke. Phosphor Regular is filled outlines, so its weight cannot follow a CSS stroke token.</p>
<table><tr><th>Action</th><th>Current sprite</th><th>Lucide (ISC)</th><th>Tabler (MIT)</th><th>Phosphor Regular (MIT)</th></tr>
{''.join(rows)}</table></html>
''')
print(len(rows), 'rows ->', out)
