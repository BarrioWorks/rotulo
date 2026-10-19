"""Render one type specimen per candidate into docs/design/type-icons/specimens/.

Usage: python3 -I type_specimen.py
Fonts load from the Fontsource CDN (jsDelivr), latin subset, variable wght axis.
Icons come from ../proposed-icons.svg, inlined so each page stands alone.
"""
import html, pathlib, re

here = pathlib.Path(__file__).resolve().parent
outdir = here.parent / 'specimens'
CDN = 'https://cdn.jsdelivr.net/npm/@fontsource-variable/{slug}/files/{slug}-latin-wght-normal.woff2'

FACES = {
    'inter':             ('Inter', 'SIL OFL 1.1', 'github.com/rsms/inter', '100 900'),
    'geist':             ('Geist', 'SIL OFL 1.1', 'github.com/vercel/geist-font', '100 900'),
    'manrope':           ('Manrope', 'SIL OFL 1.1', 'github.com/sharanda/manrope', '200 800'),
    'plus-jakarta-sans': ('Plus Jakarta Sans', 'SIL OFL 1.1', 'github.com/tokotype/PlusJakartaSans', '200 800'),
    'dm-sans':           ('DM Sans', 'SIL OFL 1.1', 'github.com/googlefonts/dm-fonts', '100 1000'),
    'instrument-sans':   ('Instrument Sans', 'SIL OFL 1.1', 'github.com/Instrument/instrument-sans', '400 700'),
    'schibsted-grotesk': ('Schibsted Grotesk', 'SIL OFL 1.1', 'github.com/schibsted/schibsted-grotesk', '400 900'),
    'newsreader':        ('Newsreader', 'SIL OFL 1.1', 'github.com/productiontype/Newsreader', '200 800'),
}
# page slug -> (ui face slug or None for system, display face slug or None for same as ui)
PAGES = {
    'system-current': (None, None),
    'inter': ('inter', None),
    'geist': ('geist', None),
    'manrope': ('manrope', None),
    'plus-jakarta-sans': ('plus-jakarta-sans', None),
    'dm-sans': ('dm-sans', None),
    'instrument-sans': ('instrument-sans', None),
    'instrument-sans-newsreader': ('instrument-sans', 'newsreader'),
    'inter-newsreader': ('inter', 'newsreader'),
    'schibsted-grotesk': ('schibsted-grotesk', None),
    'schibsted-grotesk-newsreader': ('schibsted-grotesk', 'newsreader'),
}
SYSTEM = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif'

sprite = (here.parent / 'proposed-icons.svg').read_text()
symbols = dict(re.findall(r'<symbol id="i-([a-z-]+)" viewBox="0 0 24 24">(.*?)</symbol>', sprite))
def ic(name, size=16):
    return f'<svg class="ic" width="{size}" height="{size}" viewBox="0 0 24 24" aria-hidden="true">{symbols[name]}</svg>'

def face_css(slug):
    name, _lic, _repo, wr = FACES[slug]
    return f"@font-face{{font-family:'{name} Spec';src:url({CDN.format(slug=slug)}) format('woff2');font-weight:{wr};font-display:swap}}"

def page(slug, ui, disp):
    ui_name = f"'{FACES[ui][0]} Spec', {SYSTEM}" if ui else SYSTEM
    disp_name = f"'{FACES[disp][0]} Spec', Georgia, serif" if disp else ui_name
    faces = ''.join(face_css(s) for s in {ui, disp} if s)
    title = 'System stack (current; renders as DejaVu Sans on Linux)' if not ui else FACES[ui][0] + (f' + {FACES[disp][0]} display' if disp else '')
    lic = '' if not ui else ' · '.join(f'{FACES[s][0]}: {FACES[s][1]}, {FACES[s][2]}' for s in (ui, disp) if s)
    disp_w = 500 if disp else 600
    disp_track = '-0.01em' if disp else '-0.025em'
    versions = [(14, 'Live', '3 minutes ago', 18, '1,018 KB'), (13, None, 'Yesterday', 18, '1,011 KB'), (12, None, '12 Oct', 17, '964 KB'), (11, None, '2 Oct', 11, '711 KB')]
    vrows = ''.join(
        f'<li><div class="vh"><span>Version {n}</span>' + (f'<span class="pill ok"><i></i>{live}</span>' if live else '') +
        f'</div><div class="meta tnum">{when} · {files} files · {kb}</div>' +
        ('' if live else '<div class="vact"><button class="btn sm sec">Make live</button><button class="btn sm ghost">Edit this version</button></div>') + '</li>'
        for n, live, when, files, kb in versions)
    cards = ''.join(
        f'<div class="card"><div class="thumb t{i}"></div><div class="cb"><div class="rowb"><span class="ct">{t}</span><span class="pill {pc}"><i></i>{p}</span></div>'
        f'<div class="meta">Edited {e} · {pg}</div></div></div>'
        for i, (t, p, pc, e, pg) in enumerate([
            ('Harbor Bakery', 'Published', 'ok', '8 minutes ago', '4 pages'),
            ('Studio Mira Ceramics', 'Draft', 'draft', 'yesterday', '1 page'),
            ('Agency', 'Published', 'ok', '3 days ago', '2 pages')]))
    numrows = ''.join(f'<tr><td>Version {v}</td><td class="r">{kb}</td></tr>' for v, kb in ((11, '1,018 KB'), (14, '711 KB'), (101, '96 KB'), (7, '10,240 KB')))
    water = ''.join(f'<div class="wf" style="font-size:{s}px"><b>{s}px</b> Edited 10 minutes ago · 2 pages · Il1 0O rn m · Select the part around this one</div>' for s in (11, 12, 13, 14, 15))
    return f'''<!doctype html><html lang="en"><meta charset="utf-8"><title>{html.escape(title)} · Pagehaven specimen</title>
<style>
{faces}
:root{{--ui:{ui_name};--disp:{disp_name};--bg:#f8f7f4;--sunk:#f1efea;--surf:#fff;--ink:#1c1b18;--ink2:#57534b;--ink3:#6f6a61;--line:rgba(40,34,24,.09);--line2:rgba(40,34,24,.16);--acc:#2f5ce0;--acct:#2448b8;--accs:#edf1fd}}
*{{box-sizing:border-box}} body{{margin:0;background:var(--bg);color:var(--ink);font-family:var(--ui);font-size:15px;line-height:1.55;-webkit-font-smoothing:antialiased;font-optical-sizing:auto}}
.wrap{{width:1240px;margin:0 auto;padding:28px 0 40px}}
.spec-h{{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid var(--line2);padding-bottom:12px;margin-bottom:22px}}
.spec-h h1{{font:600 22px/1.2 var(--ui);letter-spacing:-.015em;margin:0}} .spec-h span{{font-size:12.5px;color:var(--ink3)}}
.ic{{fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;flex:none}}
.grid{{display:grid;grid-template-columns:268px 1fr;gap:20px}}
.panel{{background:var(--surf);border:1px solid var(--line);border-radius:14px;box-shadow:0 1px 2px rgba(28,24,16,.05),0 2px 6px rgba(28,24,16,.04)}}
.top{{grid-column:1/-1;display:flex;align-items:center;gap:12px;height:56px;padding:0 14px}}
.top .name{{font:600 15px/1.3 var(--ui);letter-spacing:-.006em}} .sp{{flex:1}}
.ib{{width:32px;height:32px;display:grid;place-items:center;border-radius:8px;color:var(--ink2)}} .ib.dis{{color:#b6b1a8}}
.seg{{display:flex;background:var(--sunk);border-radius:10px;padding:3px;gap:2px}}
.seg b{{display:flex;align-items:center;gap:6px;font:500 13px/1 var(--ui);height:28px;padding:0 10px;border-radius:7px;color:var(--ink2)}}
.seg b.on{{background:#fff;color:var(--ink);box-shadow:0 1px 2px rgba(28,24,16,.08)}}
.saved{{display:flex;align-items:center;gap:7px;font:400 13px/1 var(--ui);color:var(--ink2)}} .saved i{{width:6px;height:6px;border-radius:50%;background:#18734c}}
.btn{{display:inline-flex;align-items:center;gap:7px;height:36px;padding:0 14px;border-radius:10px;font:500 14px/1 var(--ui);border:1px solid transparent;background:none;color:var(--ink);letter-spacing:-.003em;white-space:nowrap}}
.btn.pri{{background:var(--acc);color:#fff}} .btn.sec{{background:#fff;border-color:var(--line2)}} .btn.ghost{{color:var(--ink2)}}
.btn.sm{{height:30px;padding:0 10px;font-size:13px;border-radius:8px}} .btn.blk{{width:100%;justify-content:center}}
.side{{padding:6px 0}} .sum{{display:flex;justify-content:space-between;align-items:center;padding:12px 16px 6px;font:600 13px/1.35 var(--ui);color:var(--ink)}}
.pg{{display:flex;align-items:center;gap:9px;margin:0 8px;padding:7px 10px;border-radius:8px;font:400 14px/1.4 var(--ui);color:var(--ink)}} .pg .ic{{color:var(--ink3)}}
.pg.cur{{background:var(--accs);color:var(--acct);font-weight:500}} .pg.cur .ic{{color:var(--acc)}}
.sb{{padding:4px 16px 14px;border-bottom:1px solid var(--line)}} .st{{display:flex;align-items:center;gap:7px;font-size:13px;color:var(--ink2);margin:4px 0 10px}} .st i{{width:6px;height:6px;border-radius:50%;background:#94590b}}
.addr{{display:flex;align-items:center;gap:8px;padding:9px 10px;border-radius:10px;background:var(--bg);border:1px solid var(--line);font:500 13px/1.35 var(--ui);color:var(--acct);margin-bottom:10px}}
.h3{{font:600 12px/1.3 var(--ui);color:var(--ink2);margin:16px 0 8px;letter-spacing:.01em}}
ul{{list-style:none;margin:0;padding:0}} li{{padding:8px 0;border-top:1px solid var(--line)}} li:first-child{{border-top:0}}
.vh{{display:flex;align-items:center;gap:8px;font:500 14px/1.35 var(--ui)}} .meta{{font:400 13px/1.45 var(--ui);color:var(--ink3)}}
.tnum{{font-variant-numeric:tabular-nums}} .vact{{display:flex;gap:4px;margin-top:6px}}
.pill{{display:inline-flex;align-items:center;gap:5px;height:20px;padding:0 8px;border-radius:99px;font:500 12px/1 var(--ui)}} .pill i{{width:5px;height:5px;border-radius:50%;background:currentColor}}
.pill.ok{{background:#e6f4ec;color:#18734c}} .pill.draft{{background:var(--sunk);color:var(--ink2)}}
.canvas{{background:var(--sunk);border-radius:14px;padding:18px;display:flex;flex-direction:column;gap:18px}}
.ftb{{align-self:flex-start;background:#fff;border-radius:12px;box-shadow:0 2px 4px rgba(28,24,16,.04),0 12px 32px rgba(28,24,16,.1);padding:4px}}
.ftb-row{{display:flex;align-items:center;gap:2px}} .ftb-l{{font:500 12px/1 var(--ui);color:var(--ink3);padding:0 8px 0 6px}}
.tb{{display:flex;align-items:center;gap:6px;height:32px;padding:0 9px;border-radius:8px;font:500 13px/1 var(--ui);color:var(--ink)}} .tb.on{{background:var(--accs);color:var(--acct)}}
.tb.io{{width:32px;padding:0;justify-content:center;color:var(--ink2)}} .sep{{width:1px;height:18px;background:var(--line2);margin:0 4px}}
.ftp{{border-top:1px solid var(--line);margin-top:4px;padding:12px 10px 8px;display:grid;grid-template-columns:1fr 1fr;gap:12px}}
.lab{{font:500 13px/1.35 var(--ui);color:var(--ink);display:block;margin-bottom:6px}}
.inp{{height:34px;border:1px solid var(--line2);border-radius:9px;display:flex;align-items:center;justify-content:space-between;padding:0 10px;font:400 14px/1 var(--ui)}}
.tip{{align-self:flex-start;background:#22201c;color:#f7f5f0;font:400 12.5px/1.35 var(--ui);padding:6px 9px;border-radius:7px;margin-top:-8px}}
.tip kbd{{font:500 11.5px/1 var(--ui);color:#c9c4b9;margin-left:6px}}
.site{{background:#fff;border-radius:10px;padding:28px 32px;font-family:Georgia,serif;color:#2a2018}} .site h2{{font-size:34px;margin:0 0 6px}} .site p{{margin:0;color:#6b5d4f}}
.row2{{display:grid;grid-template-columns:1.5fr 1fr;gap:20px;margin-top:20px}}
.dash{{padding:22px}} .ph{{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:16px}}
.ph h2{{font-family:var(--disp);font-size:28px;line-height:1.15;font-weight:{disp_w};letter-spacing:{disp_track};margin:0}} .ph p{{margin:2px 0 0;color:var(--ink2);font-size:15px}}
.cards{{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}} .card{{border:1px solid var(--line);border-radius:12px;overflow:hidden}}
.thumb{{height:84px;background:linear-gradient(135deg,#e9dccb,#d7c2a6)}} .t1{{background:linear-gradient(135deg,#dfe6e2,#b9c9c0)}} .t2{{background:linear-gradient(135deg,#1f2733,#3a4656)}}
.cb{{padding:10px 12px 12px}} .rowb{{display:flex;justify-content:space-between;align-items:center;gap:8px}} .ct{{font:600 15px/1.3 var(--ui);letter-spacing:-.006em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.drop{{padding:28px;text-align:center;border:1.5px dashed var(--line2);border-radius:18px;background:#fff}}
.drop .ic{{color:var(--acc)}} .drop h3{{font-family:var(--disp);font-size:21px;line-height:1.25;font-weight:{disp_w};letter-spacing:{'-0.005em' if disp else '-0.012em'};margin:12px 0 4px}} .drop p{{margin:0 auto 14px;max-width:34ch;color:var(--ink2)}} .lim{{font-size:13px;color:var(--ink3);margin-top:12px}}
.row3{{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px}} .box{{padding:20px 22px}}
.disp{{font-family:var(--disp);font-size:52px;line-height:1.05;font-weight:{disp_w};letter-spacing:{'-0.015em' if disp else '-0.032em'};margin:0 0 10px;text-wrap:balance}}
.wf{{white-space:nowrap;overflow:hidden;color:var(--ink);line-height:1.5}} .wf b{{display:inline-block;width:44px;font-weight:500;color:var(--ink3)}}
.nums{{display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:14px}} .nums div{{line-height:1.6}} td{{padding:0 0 0 0}} td.r{{text-align:right;padding-left:24px}} .nums small{{display:block;font-size:12px;color:var(--ink3)}}
.empty{{text-align:center;padding:8px 0 4px}} .empty h3{{font-family:var(--disp);font-size:21px;font-weight:{disp_w};margin:4px 0}} .empty p{{color:var(--ink2);max-width:40ch;margin:0 auto}}
</style>
<body><div class="wrap">
<div class="spec-h"><h1>{html.escape(title)}</h1><span>{html.escape(lic) or 'No web font loaded'}</span></div>
<div class="grid">
  <div class="panel top">
    <span class="ib">{ic('chevron-left',18)}</span><span class="name">Harbor Bakery</span><span class="sp"></span>
    <span class="ib">{ic('undo',18)}</span><span class="ib dis">{ic('redo',18)}</span>
    <span class="seg"><b class="on">{ic('edit-mode')}Edit</b><b>{ic('preview')}Preview</b></span>
    <span class="seg"><b class="on">{ic('desktop')}</b><b>{ic('phone')}</b></span><span class="sp"></span>
    <span class="saved"><i></i>Saved</span><span class="btn sm ghost">View website {ic('view-live')}</span><span class="btn pri">Publish</span>
  </div>
  <div class="panel side">
    <div class="sum">Pages {ic('chevron-down')}</div>
    <div class="pg cur">{ic('home-page')}Home</div><div class="pg">{ic('page')}About us</div><div class="pg">{ic('page')}Menu &amp; prices</div>
    <div class="pg" style="color:var(--ink2)">{ic('add-page')}Add page</div>
    <div class="sum" style="border-top:1px solid var(--line);margin-top:8px">Publishing {ic('chevron-down')}</div>
    <div class="sb"><div class="st"><i></i>Unpublished changes</div>
      <div class="addr">{ic('domain')}harbor-bakery.pagehaven.site</div>
      <span class="btn sec blk">Publish changes</span>
      <div class="h3">Version history</div><ul>{vrows}</ul></div>
  </div>
  <div class="canvas">
    <div class="ftb"><div class="ftb-row"><span class="ftb-l">Heading</span>
      <span class="tb">{ic('edit-text')}Edit text</span><span class="tb">{ic('link')}Link</span><span class="tb on">{ic('text-style')}Style</span><span class="tb">{ic('background')}Background</span>
      <span class="sep"></span><span class="tb io">{ic('move-up')}</span><span class="tb io">{ic('move-down')}</span><span class="tb io">{ic('duplicate')}</span><span class="tb io">{ic('hide')}</span><span class="tb io">{ic('remove')}</span><span class="sep"></span><span class="tb io">{ic('select-parent')}</span></div>
      <div class="ftp"><div><span class="lab">Size</span><div class="inp">48 {ic('chevron-down',14)}</div></div><div><span class="lab">Weight</span><div class="inp">Bold {ic('chevron-down',14)}</div></div></div></div>
    <div class="tip">Select the part around this one<kbd>Esc</kbd></div>
    <div class="ftb"><div class="ftb-row"><span class="ftb-l">Image</span><span class="tb">{ic('replace-image')}Replace image</span><span class="tb">Description</span><span class="tb">{ic('link')}Link</span></div></div>
    <div class="site"><h2>Fresh bread, every morning.</h2><p>The owner's own site stays the loudest thing on screen.</p></div>
  </div>
</div>
<div class="row2">
  <div class="panel dash"><div class="ph"><div><h2>Your websites</h2><p>3 websites. Click one to edit it.</p></div><span class="btn pri">{ic('upload')}Import website</span></div><div class="cards">{cards}</div></div>
  <div class="drop">{ic('upload',24)}<h3>Drop your website ZIP here</h3><p>Use the finished website your tool exported, with its pages, pictures and fonts.</p><span class="btn sec">Choose a file</span><div class="lim tnum">ZIP files up to 25 MB, with up to 2000 files.</div></div>
</div>
<div class="row3">
  <div class="panel box"><p class="disp">Your AI-built website. Yours to edit.</p><div class="empty"><h3>Bring in your first website</h3><p>Export your website as a ZIP from Lovable, Bolt, v0 or Claude, and import it here.</p></div></div>
  <div class="panel box">{water}
    <div class="nums" style="margin-top:14px"><div><small>Tabular (tnum)</small><table class="tnum">{numrows}</table></div><div><small>Proportional (default)</small><table>{numrows}</table></div></div></div>
</div>
</div></body></html>
'''

for slug, (ui, disp) in PAGES.items():
    (outdir / f'{slug}.html').write_text(page(slug, ui, disp))
print('wrote', len(PAGES), 'specimens to', outdir)
