"""Write the type specimens in docs/studio/identity/specimens/ from one template, and the icon sprite inside board.html.

Usage: python3 -I docs/studio/identity/build_specimens.py <font dir> <lucide icons dir>
<font dir> holds <slug>-latin.woff2 files: the latin subset Google Fonts serves for each family with
`css2?family=<Name>:wght@400..700` and a Chrome user agent. <lucide icons dir> holds Lucide's icons/*.svg.
Pages load fonts from /fonts/ and photos from /img/, so serve a folder where identity/ is this folder,
fonts/ is <font dir> and img/ is fixtures/images. Nothing here is copied into the app.
"""
import html, os, pathlib, re, sys

FONT_DIR, ICON_DIR = map(pathlib.Path, sys.argv[1:3])
OUT = pathlib.Path(__file__).parent / "specimens"

FACES = [
    # slug, family, designer, licence url
    ("onest", "Onest", "Dmitri Voloshin for Simpals", "https://github.com/simpals/onest/blob/main/OFL.txt"),
    ("inter", "Inter", "Rasmus Andersson", "https://github.com/rsms/inter/blob/master/LICENSE.txt"),
    ("geist", "Geist", "Vercel with basement.studio", "https://github.com/vercel/geist-font/blob/main/LICENSE.txt"),
    ("schibsted-grotesk", "Schibsted Grotesk", "Bakken & Baeck for Schibsted", "https://github.com/schibsted/schibsted-grotesk/blob/main/OFL.txt"),
    ("manrope", "Manrope", "Mikhail Sharanda", "https://github.com/googlefonts/manrope/blob/master/OFL.txt"),
    ("dm-sans", "DM Sans", "Colophon Foundry", "https://github.com/googlefonts/dm-fonts/blob/main/Sans/OFL.txt"),
    ("figtree", "Figtree", "Erik Kennedy", "https://github.com/erikdkennedy/figtree/blob/master/OFL.txt"),
]
ICONS = ["undo-2", "redo-2", "monitor", "smartphone", "settings", "search", "chevron-down", "check", "plus", "ellipsis", "x", "globe", "image-up", "circle-check", "triangle-alert", "link", "type", "pencil", "eye"]

def sprite():
    out = []
    for name in ICONS:
        body = re.search(r"<svg[^>]*>(.*)</svg>", (ICON_DIR / f"{name}.svg").read_text(), re.S)[1]
        out.append(f'<symbol id="{name}" viewBox="0 0 24 24">{" ".join(body.split())}</symbol>')
    return '<svg width="0" height="0" style="position:absolute" aria-hidden="true">' + "".join(out) + "</svg>"

SPRITE = sprite()

def ic(name, cls=""):
    return f'<svg class="icon {cls}" aria-hidden="true"><use href="#{name}"/></svg>'

def kb(path):
    return f"{os.path.getsize(path) / 1000:.1f} KB"

TOOLBAR = f"""
<div class="bar">
  <div class="capsule glass-2"><button class="tb-btn crumb"><span class="site">Agency</span><span class="slash">/</span><span class="page">Home</span>{ic("chevron-down", "icon-16")}</button></div>
  <div class="capsule glass-2">
    <button class="tb-btn icon-only" aria-label="Undo">{ic("undo-2")}</button><button class="tb-btn icon-only" aria-label="Redo" disabled>{ic("redo-2")}</button>
    <span class="tb-sep"></span>
    <div class="seg"><button aria-pressed="true">Edit</button><button aria-pressed="false">Preview</button></div>
    <span class="tb-sep"></span>
    <div class="seg icons"><button aria-pressed="true" aria-label="Computer">{ic("monitor")}</button><button aria-pressed="false" aria-label="Phone">{ic("smartphone")}</button></div>
  </div>
  <div class="right">
    <div class="capsule glass-2"><button class="tb-btn icon-only" aria-label="Website settings">{ic("settings")}</button></div>
    <div class="capsule glass-2"><span class="status"><span class="dot"></span>Saved · <b>2 changes</b> not published</span><button class="btn-publish">Publish</button></div>
  </div>
</div>"""

SWITCHER = f"""
<div class="panel glass-2 switcher">
  <div class="search">{ic("search", "icon-16")}Find a page<kbd>Ctrl K</kbd></div>
  <div class="row tall is-current"><span class="thumb" style="background-image:url(/img/replacement-banner.jpg)"></span><span class="grow">Home<span class="row-meta">Edited 2 hours ago</span></span>{ic("check", "check")}</div>
  <div class="row tall is-hover"><span class="thumb"></span><span class="grow">Services<span class="row-meta">Edited yesterday</span></span>{ic("ellipsis", "icon-16")}</div>
  <div class="row tall"><span class="thumb"></span><span class="grow">Portfolio<span class="row-meta">12 pictures</span></span></div>
  <div class="row tall"><span class="thumb"></span><span class="grow">About us<span class="row-meta">Edited 3 Oct</span></span></div>
  <hr>
  <div class="row add">{ic("plus", "icon-16")}Add a page</div>
</div>"""

SETTINGS = f"""
<div class="sheet glass-3 settings">
  <h2>Website settings</h2>
  <p class="lead">Changes here apply to every page.</p>
  <div class="tabs"><span class="on">General</span><span>Pages</span><span>Domains</span><span>Versions</span></div>
  <div class="field"><label>Website name</label><div class="input focus">Agency</div><span class="hint">Shown in the browser tab and in search results.</span></div>
  <div class="switch-row"><span class="grow"><b style="font-weight:500;font-size:var(--fs-control)">Show in search engines</b><span class="hint">Google and Bing can list this website.</span></span><span class="switch"></span></div>
</div>"""

LADDER_TEXT = "Saved · 2 changes not published"
LADDER_GLYPHS = "Il1 0O rn m g 1280 × 800 · 125%"

def ladder():
    rows = []
    for px, w in [(11, 500), (12, 400), (13, 500), (15, 400), (22, 600)]:
        rows.append(f"""<div class="lad"><span class="px">{px} px · {w}</span>
          <span class="chip glass-2" style="font-size:{px}px;font-weight:{w}">{LADDER_TEXT}</span>
          <span style="font-size:{px}px;font-weight:{w}">{LADDER_GLYPHS}</span></div>""")
    return "\n".join(rows)

PAGE_CSS = """
section, .face { font-family: var(--font-ui); }
body { background: var(--ws-ground); width: 1280px; }
.head { display: flex; align-items: baseline; gap: 16px; padding: 18px 24px; background: var(--surface); border-bottom: 1px solid var(--rule); }
.head h1 { margin: 0; font: 600 22px/1.2 var(--font-ui); letter-spacing: -0.015em; }
.head p { margin: 0; font: 400 12px/1.4 var(--font-ui); color: var(--ink-3); }
.head a { color: var(--accent); }
.stage { position: relative; height: 560px; background: #222 url(/img/replacement-banner.jpg) center/cover; }
.stage.light { height: 300px; background: #FFF; }
.fake { position: absolute; left: 120px; right: 120px; top: 120px; display: grid; gap: 14px; }
.fake i { display: block; height: 14px; border-radius: 3px; background: #ECECEF; }
.fake i:first-child { width: 60%; height: 38px; background: #1F2937; }
.bar { position: absolute; top: 12px; left: 12px; right: 12px; display: flex; justify-content: space-between; align-items: flex-start; }
.bar .right { display: flex; gap: 8px; }
.switcher { position: absolute; top: 64px; left: 12px; }
.settings { position: absolute; top: 76px; right: 24px; }
.ladder { padding: 16px 24px 24px; display: grid; gap: 10px; background: #FFF; }
.lad { display: grid; grid-template-columns: 110px auto 1fr; align-items: center; gap: 20px; }
.lad .px { font: 500 11px/1 ui-monospace, monospace; color: var(--ink-3); }
.lad .chip { display: inline-flex; align-items: center; height: auto; min-height: 28px; padding: 6px 12px; border-radius: 999px; white-space: nowrap; }
.metrics { font: 400 12px/1.4 var(--font-ui); color: var(--ink-2); }
"""

MEASURE_JS = """
document.fonts.ready.then(() => {
  const c = document.createElement("canvas").getContext("2d");
  for (const el of document.querySelectorAll("[data-metrics]")) {
    const fam = el.dataset.metrics;
    c.font = `500 100px "${fam}"`;
    const x = c.measureText("x").actualBoundingBoxAscent, H = c.measureText("H").actualBoundingBoxAscent;
    c.font = `500 13px "${fam}"`;
    const w = c.measureText("Saved · 2 changes not published").width;
    el.textContent = `x-height ${(x / 100).toFixed(3)} em · cap ${(H / 100).toFixed(3)} em · x/cap ${(x / H).toFixed(2)} · status line at 13 px/500: ${w.toFixed(0)} px wide · loaded: ${document.fonts.check(`500 13px "${fam}"`)}`;
  }
});
"""

def page(title, faces_css, body):
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>{html.escape(title)}</title>
<link rel="stylesheet" href="../tokens.css"><link rel="stylesheet" href="../studio.css">
<style>{faces_css}{PAGE_CSS}</style></head>
<body>{SPRITE}{body}<script>{MEASURE_JS}</script></body></html>
"""

def face_css(slug, family):
    return f'@font-face {{ font-family: "{family} Spec"; src: url(/fonts/{slug}-latin.woff2) format("woff2"); font-weight: 100 900; font-display: block; }}\n'

def header(slug, family, designer, lic):
    size = kb(FONT_DIR / f"{slug}-latin.woff2")
    return f"""<div class="head"><h1>{family}</h1><p>{designer} · SIL Open Font License 1.1 (<a href="{lic}">licence</a>) · latin variable woff2 {size}</p>
<p class="metrics" data-metrics="{family} Spec"></p></div>"""

OUT.mkdir(exist_ok=True)
for slug, family, designer, lic in FACES:
    body = f"""<div class="face" style="--font-ui: '{family} Spec', system-ui">{header(slug, family, designer, lic)}
<div class="stage">{TOOLBAR}{SWITCHER}{SETTINGS}</div>
<div class="stage light"><div class="fake"><i></i><i></i><i style="width:80%"></i><i style="width:70%"></i></div>{TOOLBAR}</div>
<div class="ladder">{ladder()}</div></div>"""
    (OUT / f"{slug}.html").write_text(page(f"{family} specimen", face_css(slug, family), body))

all_css = "".join(face_css(s, f) for s, f, _, _ in FACES)
strips = "".join(f"""<section style="--font-ui: '{f} Spec', system-ui">{header(s, f, d, l)}
<div class="stage" style="height:68px">{TOOLBAR}</div><div class="ladder">{ladder()}</div></section>""" for s, f, d, l in FACES)
(OUT / "compare.html").write_text(page("All faces, same controls", all_css, strips))
board = OUT.parent / "board.html"
if board.exists():
    b = board.read_text()
    b = re.sub(r"<!-- sprite -->.*?<!-- /sprite -->", lambda m: f"<!-- sprite -->{SPRITE}<!-- /sprite -->", b, flags=re.S)
    board.write_text(b)
print("wrote", ", ".join(sorted(p.name for p in OUT.glob("*.html"))))
