"""Generates the three direction comps (editor.html, dashboard.html) for docs/design/direction/."""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[3]
OUT = ROOT / "docs/design/direction"
SPRITE_SRC = (ROOT / "assets/static/img/icons.svg").read_text()

USED = ["chevron-left", "chevron-down", "chevron-right", "undo", "redo", "pencil", "eye", "desktop",
        "mobile", "plus", "page", "home", "globe", "external", "check", "clock", "upload", "more",
        "link", "type", "parent", "arrow-up", "arrow-down", "duplicate", "eye-off", "image",
        "settings", "info", "alert", "check-circle", "refresh", "text-color", "fill", "spacing"]


def sprite():
    out = []
    for name in USED:
        m = re.search(r'<symbol id="i-%s".*?</symbol>' % re.escape(name), SPRITE_SRC, re.S)
        out.append(m.group(0))
    return '<svg xmlns="http://www.w3.org/2000/svg" style="display:none">' + "".join(out) + "</svg>"


def ic(name, cls="icon"):
    return f'<svg class="{cls}" aria-hidden="true"><use href="#i-{name}"/></svg>'


MARK = '''<svg class="mark" viewBox="0 0 32 32" aria-hidden="true"><path d="M9 3.5h10.2c.7 0 1.4.3 1.9.8l6.6 6.6c.5.5.8 1.2.8 1.9V23A5.5 5.5 0 0 1 23 28.5H9A5.5 5.5 0 0 1 3.5 23V9A5.5 5.5 0 0 1 9 3.5Z" fill="currentColor"/><path d="M11.2 24v-4.6a4.8 4.8 0 0 1 9.6 0V24" fill="none" stroke="var(--mark-cut)" stroke-width="2.4" stroke-linecap="round"/></svg>'''

# ---------------------------------------------------------------- shared structure
BASE_CSS = r"""
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0}
body{font-family:var(--font-ui);font-size:var(--fs-body);line-height:var(--lh-body);color:var(--ink);background:var(--ground);-webkit-font-smoothing:antialiased;font-feature-settings:"ss01" 0}
::selection{background:var(--select-text)}
html{accent-color:var(--accent);caret-color:var(--accent)}
.icon{width:18px;height:18px;flex:none;fill:none;stroke:currentColor;stroke-width:var(--icon-stroke);stroke-linecap:var(--icon-cap);stroke-linejoin:var(--icon-join)}
.icon.sm{width:16px;height:16px}
.vh{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
button{font:inherit;color:inherit}
a{color:inherit}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:var(--ctl-h);padding:0 14px;border-radius:var(--r-ctl);border:1px solid transparent;background:transparent;font-size:var(--fs-ctl);font-weight:var(--fw-ctl);letter-spacing:var(--ls-ctl);text-decoration:none;white-space:nowrap;cursor:pointer}
.btn.icon-only{width:var(--ctl-h);padding:0}
.btn-primary{background:var(--primary);color:var(--on-primary)}
.btn-secondary{background:var(--surface);border-color:var(--control-border);color:var(--ink)}
.btn-ghost{color:var(--ink-2)}
.btn-ghost:hover{background:var(--hover)}
.btn[disabled]{opacity:.45;cursor:default}
.seg{display:inline-flex;padding:2px;gap:2px;border-radius:calc(var(--r-ctl) + 2px);background:var(--seg-bg);border:1px solid var(--seg-border)}
.seg button{display:inline-flex;align-items:center;gap:6px;height:calc(var(--ctl-h) - 6px);padding:0 10px;border:0;border-radius:var(--r-ctl);background:transparent;color:var(--ink-2);font-size:var(--fs-ctl);font-weight:var(--fw-ctl);cursor:pointer}
.seg button[aria-pressed=true]{background:var(--seg-on);color:var(--seg-on-ink);box-shadow:var(--seg-on-shadow)}
.dot{width:7px;height:7px;border-radius:50%;background:currentColor;flex:none}

/* editor shell */
.editor{display:grid;grid-template-columns:var(--side-w) 1fr;grid-template-rows:var(--top-h) 1fr;height:100vh;overflow:hidden}
.top{grid-column:1/-1;display:grid;grid-template-columns:var(--side-w) 1fr auto;align-items:center;background:var(--top-bg);color:var(--top-ink);border-bottom:1px solid var(--top-rule)}
.top-left{display:flex;align-items:center;gap:6px;padding:0 10px 0 8px;min-width:0;height:100%;border-right:1px solid var(--top-rule)}
.site-name{font-family:var(--font-title);font-size:var(--fs-sitename);font-weight:var(--fw-sitename);letter-spacing:var(--ls-title);margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.page-switch{margin-left:auto}
.top-center{display:flex;align-items:center;gap:10px;padding:0 16px}
.top-right{display:flex;align-items:center;gap:12px;padding:0 12px 0 0}
.divider{width:1px;height:20px;background:var(--top-rule)}
.save{display:inline-flex;align-items:center;gap:6px;font-size:var(--fs-meta);color:var(--top-ink-2)}
.save .icon{color:var(--success-on-top)}
.changes{display:inline-flex;align-items:center;gap:7px;font-size:var(--fs-meta);color:var(--top-ink-2)}
.changes .dot{color:var(--warn-on-top)}
.top .btn-ghost{color:var(--top-ink-2)}
.top .btn-ghost:hover{background:var(--top-hover)}
.top .seg{background:var(--top-seg-bg);border-color:var(--top-seg-border)}
.top .seg button{color:var(--top-ink-2)}
.top .seg button[aria-pressed=true]{background:var(--top-seg-on);color:var(--top-seg-on-ink)}

.side{background:var(--side-bg);color:var(--side-ink);border-right:1px solid var(--side-rule);overflow:auto;padding:6px 0 24px}
.sec{padding:14px 14px 16px;border-bottom:1px solid var(--side-rule)}
.sec:last-child{border-bottom:0}
.sec-h{display:flex;align-items:center;justify-content:space-between;margin:0 0 10px;font-size:var(--fs-label);font-weight:var(--fw-label);letter-spacing:var(--ls-label);text-transform:var(--tt-label);color:var(--side-ink-2)}
.sec-h .btn{height:28px;width:28px}
.pages{list-style:none;margin:0;padding:0;display:grid;gap:2px}
.pages a{display:flex;align-items:center;gap:10px;height:36px;padding:0 10px;border-radius:var(--r-row);text-decoration:none;color:var(--side-ink);font-size:var(--fs-ctl)}
.pages a .path{margin-left:auto;font-family:var(--font-mono);font-size:12px;color:var(--side-ink-3)}
.pages a[aria-current=page]{background:var(--current-bg);color:var(--current-ink);font-weight:var(--fw-ctl)}
.pages a[aria-current=page] .path{color:var(--current-ink-2)}
.pages a:hover:not([aria-current]){background:var(--hover)}
.addr{display:flex;align-items:center;gap:8px;padding:9px 10px;border:1px solid var(--side-rule);border-radius:var(--r-row);font-size:var(--fs-meta);background:var(--addr-bg)}
.addr a{color:var(--link);text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1px;font-family:var(--font-mono);font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.state{display:flex;align-items:center;gap:8px;font-size:var(--fs-ctl);font-weight:var(--fw-ctl);margin-bottom:10px}
.state .dot{color:var(--warn)}
.state small{display:block;font-weight:400;color:var(--side-ink-2);font-size:var(--fs-meta)}
.versions{list-style:none;margin:12px 0 0;padding:0}
.versions li{display:grid;grid-template-columns:1fr auto;align-items:baseline;gap:4px 10px;padding:9px 0;border-top:1px solid var(--side-rule);font-size:var(--fs-meta)}
.versions .num{font-weight:var(--fw-ctl);color:var(--side-ink);font-size:var(--fs-ctl);font-variant-numeric:tabular-nums}
.versions time{color:var(--side-ink-2)}
.versions .act{color:var(--link);font-weight:var(--fw-ctl);text-decoration:none;font-size:var(--fs-meta)}
.live{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:var(--fw-label);color:var(--success);}
.rows{list-style:none;margin:0;padding:0}
.rows a{display:flex;align-items:center;justify-content:space-between;height:40px;text-decoration:none;color:var(--side-ink);font-size:var(--fs-ctl);font-weight:var(--fw-ctl)}
.rows a .icon{color:var(--side-ink-3)}

.main{position:relative;background:var(--canvas-bg);overflow:hidden;padding:8px}
.frame{position:relative;width:1000px;height:calc(100vh - var(--top-h) - 16px);margin:0 auto;border-radius:var(--r-canvas);overflow:hidden;background:#1d1b1f;box-shadow:var(--canvas-shadow)}
.frame img.site{display:block;width:1000px;height:auto}
/* selection + hover */
.sel{position:absolute;left:52px;top:330px;width:896px;height:86px;pointer-events:none}
.hov{position:absolute;left:388px;top:470px;width:224px;height:72px;pointer-events:none}
.ftb{position:absolute;left:52px;top:272px;display:flex;align-items:center;gap:2px;padding:4px;background:var(--ftb-bg);color:var(--ftb-ink);border:var(--ftb-border);border-radius:var(--r-float);box-shadow:var(--shadow-float)}
.ftb .what{display:flex;align-items:center;gap:6px;padding:0 10px 0 8px;font-size:var(--fs-meta);font-weight:var(--fw-label);color:var(--ftb-ink-2);white-space:nowrap}
.ftb .btn{height:34px;padding:0 10px;font-size:var(--fs-ctl);color:var(--ftb-ink)}
.ftb .btn.icon-only{width:34px;padding:0}
.ftb .btn:hover,.ftb .btn.on{background:var(--ftb-hover)}
.ftb .sep{width:1px;height:20px;background:var(--ftb-rule);margin:0 4px}
.kbd{font-family:var(--font-mono);font-size:11px;color:var(--ftb-ink-3);margin-left:2px}

/* small screen */
.small-screen{display:none}
@media (max-width:899px){
  .editor{display:none}
  .small-screen{display:flex;flex-direction:column;align-items:flex-start;gap:16px;min-height:100vh;padding:32px 24px;background:var(--ground)}
  .small-screen h1{font-family:var(--font-title);font-size:var(--fs-h2);line-height:1.2;letter-spacing:var(--ls-title);font-weight:var(--fw-title);margin:8px 0 0}
  .small-screen p{margin:0;color:var(--ink-2);max-width:34ch}
  .small-screen .preview{width:100%;border-radius:var(--r-canvas);overflow:hidden;border:1px solid var(--rule)}
  .small-screen .preview img{display:block;width:100%;height:auto}
}

/* dashboard */
.app-head{display:flex;align-items:center;gap:24px;height:60px;padding:0 32px;border-bottom:1px solid var(--rule);background:var(--head-bg);color:var(--head-ink)}
.brand{display:flex;align-items:center;gap:10px;font-family:var(--font-brand);font-weight:var(--fw-brand);font-size:17px;letter-spacing:var(--ls-brand);text-decoration:none;color:inherit}
.mark{width:24px;height:24px;color:var(--mark-color)}
.nav{display:flex;gap:4px}
.nav a{display:inline-flex;align-items:center;height:34px;padding:0 10px;border-radius:var(--r-ctl);text-decoration:none;font-size:var(--fs-ctl);font-weight:var(--fw-ctl);color:var(--head-ink-2)}
.nav a[aria-current=page]{color:var(--head-ink);background:var(--head-current)}
.account{margin-left:auto;display:flex;align-items:center;gap:8px;font-size:var(--fs-ctl);color:var(--head-ink-2)}
.avatar{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:var(--avatar-bg);color:var(--avatar-ink);font-weight:700;font-size:12px}
.page{max-width:1160px;margin:0 auto;padding:40px 32px 64px}
.page-head{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:28px}
.page-head h1{font-family:var(--font-title);font-size:var(--fs-h1);line-height:var(--lh-h1);font-weight:var(--fw-title);letter-spacing:var(--ls-title);margin:0}
.page-head p{margin:6px 0 0;color:var(--ink-2)}
.btn-lg{height:44px;padding:0 18px;font-size:15px}
.pill{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 9px;border-radius:var(--r-pill);font-size:12.5px;font-weight:var(--fw-label);white-space:nowrap}
.pill-live{background:var(--success-soft);color:var(--success)}
.pill-draft{background:var(--neutral-soft);color:var(--ink-2)}
.pill-warn{background:var(--warn-soft);color:var(--warn)}
.meta{font-size:var(--fs-meta);color:var(--ink-2)}
.thumb{display:block;position:relative;overflow:hidden;background:var(--sunken)}
.thumb img{display:block;width:100%;height:100%;object-fit:cover;object-position:top}
.ph{position:absolute;inset:0;display:grid;place-items:center;font-family:var(--font-title);font-size:44px;font-weight:var(--fw-title);color:var(--ph-ink);background:var(--ph-bg)}
.addr-link{display:inline-flex;align-items:center;gap:6px;font-size:var(--fs-meta);color:var(--link);text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1px}
.addr-link .icon{color:var(--ink-3)}
"""

# ---------------------------------------------------------------- shared content
SIDEBAR = f"""
<aside class="side" aria-label="Website">
  <section class="sec">
    <h2 class="sec-h">Pages <button class="btn btn-ghost icon-only" aria-label="Add page" title="Add page">{ic('plus','icon sm')}</button></h2>
    <ul class="pages" role="list">
      <li><a href="#" aria-current="page">{ic('home','icon sm')}Home<span class="path">/</span></a></li>
      <li><a href="#">{ic('page','icon sm')}Services<span class="path">/services</span></a></li>
      <li><a href="#">{ic('page','icon sm')}Contact<span class="path">/contact</span></a></li>
    </ul>
  </section>
  <section class="sec">
    <h2 class="sec-h">Publishing</h2>
    <div class="state"><span class="dot" aria-hidden="true"></span><span>3 changes not published<small>Visitors still see version 3</small></span></div>
    <div class="addr">{ic('globe','icon sm')}<a href="#">agency.pagehaven.site</a></div>
    <ul class="versions" role="list">
      <li><span class="num">Version 3</span><span class="live">{ic('check','icon sm')}Live</span><time>Today, 10:42</time><a class="act" href="#">Edit this version</a></li>
      <li><span class="num">Version 2</span><span></span><time>Yesterday, 16:05</time><a class="act" href="#">Make live</a></li>
      <li><span class="num">Version 1</span><span></span><time>12 Oct, 09:18</time><a class="act" href="#">Make live</a></li>
    </ul>
  </section>
  <section class="sec">
    <ul class="rows" role="list">
      <li><a href="#">Your own domain{ic('chevron-right','icon sm')}</a></li>
      <li><a href="#">Page settings{ic('chevron-right','icon sm')}</a></li>
      <li><a href="#">Website settings{ic('chevron-right','icon sm')}</a></li>
      <li><a href="#">Images<span style="margin-left:auto;margin-right:8px;font-weight:400;font-size:13px;color:var(--side-ink-2)">24</span>{ic('chevron-right','icon sm')}</a></li>
    </ul>
  </section>
</aside>"""

TOOLBAR = f"""
<div class="ftb" role="toolbar" aria-label="Edit the selected heading">
  <button class="btn btn-ghost">{ic('pencil','icon sm')}Edit text</button>
  <button class="btn btn-ghost on" aria-pressed="false">{ic('text-color','icon sm')}Style</button>
  <button class="btn btn-ghost">{ic('link','icon sm')}Link</button>
  <span class="sep" aria-hidden="true"></span>
  <button class="btn btn-ghost icon-only" aria-label="Select the part around this" title="Select the part around this">{ic('parent','icon sm')}</button>
  <button class="btn btn-ghost icon-only" aria-label="More" title="More">{ic('more','icon sm')}</button>
</div>"""


def editor(d):
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Agency · Pagehaven ({d['title']} comp)</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="{d['fonts']}" rel="stylesheet">
<style>{d['tokens']}{BASE_CSS}{d['css']}</style></head>
<body>{sprite()}
<div class="small-screen">
  {MARK}
  <h1>Editing needs a bigger screen</h1>
  <p>Open Agency on a computer or a tablet held sideways to make changes. Your website itself works on every screen.</p>
  <div class="preview"><img src="../assets/agency-desktop.png" alt="Agency home page"></div>
  <a class="btn btn-secondary" href="dashboard.html">{ic('chevron-left','icon sm')}Your websites</a>
</div>
<div class="editor">
  <header class="top">
    <div class="top-left">
      <a class="btn btn-ghost icon-only" href="dashboard.html" aria-label="Back to your websites" title="Back to your websites">{ic('chevron-left')}</a>
      <h1 class="site-name">Agency</h1>
      <button class="btn btn-ghost page-switch" aria-label="Page: Home">Home{ic('chevron-down','icon sm')}</button>
    </div>
    <div class="top-center">
      <button class="btn btn-ghost icon-only" aria-label="Undo edit text" title="Undo edit text  Ctrl+Z">{ic('undo')}</button>
      <button class="btn btn-ghost icon-only" aria-label="Redo" title="Redo" disabled>{ic('redo')}</button>
      <span class="divider" aria-hidden="true"></span>
      <div class="seg" role="group" aria-label="Mode"><button aria-pressed="true">{ic('pencil','icon sm')}Edit</button><button aria-pressed="false">{ic('eye','icon sm')}Preview</button></div>
      <div class="seg" role="group" aria-label="Screen size"><button aria-pressed="true" aria-label="Computer">{ic('desktop','icon sm')}</button><button aria-pressed="false" aria-label="Phone">{ic('mobile','icon sm')}</button></div>
    </div>
    <div class="top-right">
      <span class="save" role="status">{ic('check','icon sm')}Saved</span>
      <span class="divider" aria-hidden="true"></span>
      <span class="changes"><span class="dot" aria-hidden="true"></span>3 changes not published</span>
      <button class="btn btn-primary publish">{d['publish_label']}</button>
    </div>
  </header>
  {SIDEBAR}
  <main class="main">
    <div class="frame">
      <img class="site" src="../assets/agency-desktop.png" alt="The Agency website, home page">
      <div class="hov" aria-hidden="true"></div>
      <div class="sel" aria-hidden="true">{d['sel_inner']}</div>
      {TOOLBAR}
    </div>
  </main>
</div>
</body></html>"""


CARDS = [
    dict(name="Agency", thumb="../assets/thumb-agency.png", pill='<span class="pill pill-warn"><span class="dot"></span>3 changes not published</span>',
         meta="Edited 4 minutes ago · 3 pages", addr="agency.pagehaven.site", domain=None),
    dict(name="Harbor Bakery", thumb=None, pill='<span class="pill pill-live"><span class="dot"></span>Published</span>',
         meta="Edited yesterday · 5 pages", addr="harbor-bakery.pagehaven.site", domain="www.harborbakery.com"),
    dict(name="Landwind", thumb="../assets/thumb-landwind.png", pill='<span class="pill pill-draft"><span class="dot"></span>Not published yet</span>',
         meta="Imported 12 Oct · 1 page", addr=None, domain=None),
]


def card_html(c, style):
    thumb = (f'<img src="{c["thumb"]}" alt="">' if c["thumb"] else f'<span class="ph">{c["name"][0]}</span>')
    links = ""
    if c["addr"]:
        links += f'<a class="addr-link" href="#">{ic("globe","icon sm")}{c["addr"]}</a>'
    if c["domain"]:
        links += f'<a class="addr-link" href="#">{ic("link","icon sm")}{c["domain"]}</a>'
    return f"""<li class="site">
  <a class="thumb" href="editor.html" tabindex="-1" aria-hidden="true">{thumb}</a>
  <div class="site-body">
    <div class="site-top"><a class="site-title" href="editor.html">{c['name']}</a>{c['pill']}</div>
    <p class="meta">{c['meta']}</p>
    <div class="site-links">{links}</div>
  </div>
  <div class="site-actions"><a class="btn btn-secondary" href="editor.html">{ic('pencil','icon sm')}Edit</a>{'<a class="btn btn-ghost" href="#">View website'+ic('external','icon sm')+'</a>' if c['addr'] else ''}<button class="btn btn-ghost icon-only" aria-label="More for {c['name']}">{ic('more','icon sm')}</button></div>
</li>"""


def dashboard(d):
    cards = "\n".join(card_html(c, d) for c in CARDS)
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Your websites · Pagehaven ({d['title']} comp)</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="{d['fonts']}" rel="stylesheet">
<style>{d['tokens']}{BASE_CSS}{d['dash_css']}</style></head>
<body class="dash">{sprite()}
<header class="app-head">
  <a class="brand" href="#">{MARK}Pagehaven</a>
  <nav class="nav" aria-label="Main"><a href="#" aria-current="page">Websites</a><a href="#">Help</a></nav>
  <div class="account"><span class="avatar">MO</span><span class="acct-name">Maya Ortiz</span>{ic('chevron-down','icon sm')}</div>
</header>
<main class="page">
  <div class="page-head">
    <div><h1>Your websites</h1><p>3 of 10 websites. Pick one to change it.</p></div>
    <a class="btn btn-primary btn-lg" href="#">{ic('upload')}Import a website</a>
  </div>
  <ul class="sites" role="list">
{cards}
  </ul>
</main>
</body></html>"""


# ---------------------------------------------------------------- directions
PROOF = dict(
    slug="proof", title="Proof",
    fonts="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap",
    publish_label=f"{ic('upload','icon sm')}Publish",
    tokens=r"""
:root{
 --font-ui:"Schibsted Grotesk",system-ui,sans-serif; --font-title:var(--font-ui); --font-brand:var(--font-ui); --font-mono:"Geist Mono",ui-monospace,monospace;
 --ground:#F4F3EF; --surface:#FFFFFF; --sunken:#E9E8E3; --ink:#16161A; --ink-2:#4B4A46; --ink-3:#64635E;
 --rule:#DEDDD7; --control-border:#8C8B85; --hover:rgba(22,22,26,.05);
 --accent:#0A86D6; --accent-strong:#0070B8; --link:#005F96; --accent-soft:#E3F2FB; --select-text:rgba(10,134,214,.2);
 --primary:#16161A; --on-primary:#FFFFFF;
 --success:#1B7343; --success-soft:#E6F2EA; --warn:#9A5300; --warn-soft:#FBEFD9; --error:#BA2F25; --error-soft:#FBE8E6; --neutral-soft:#ECEBE6;
 --fs-meta:13px; --fs-ctl:14px; --fs-body:15px; --fs-label:12px; --fs-sitename:15px; --fs-h2:22px; --fs-h1:30px;
 --lh-body:1.5; --lh-h1:1.1; --fw-ctl:500; --fw-label:600; --fw-title:600; --fw-sitename:600; --fw-brand:700;
 --ls-ctl:0; --ls-label:.04em; --tt-label:uppercase; --ls-title:-.02em; --ls-brand:-.02em;
 --r-ctl:4px; --r-row:4px; --r-float:6px; --r-canvas:2px; --r-pill:3px;
 --ctl-h:34px; --top-h:52px; --side-w:264px;
 --icon-stroke:1.5; --icon-cap:square; --icon-join:miter;
 --seg-bg:transparent; --seg-border:var(--rule); --seg-on:var(--ink); --seg-on-ink:#fff; --seg-on-shadow:none;
 --top-bg:#FFFFFF; --top-ink:var(--ink); --top-ink-2:var(--ink-2); --top-rule:var(--rule); --top-hover:var(--hover);
 --top-seg-bg:transparent; --top-seg-border:var(--rule); --top-seg-on:var(--ink); --top-seg-on-ink:#fff;
 --success-on-top:var(--success); --warn-on-top:var(--warn);
 --side-bg:#FFFFFF; --side-ink:var(--ink); --side-ink-2:var(--ink-2); --side-ink-3:var(--ink-3); --side-rule:var(--rule);
 --current-bg:var(--ink); --current-ink:#fff; --current-ink-2:#C9C8C2; --addr-bg:var(--ground);
 --canvas-bg:var(--sunken); --canvas-shadow:0 0 0 1px rgba(22,22,26,.14);
 --ftb-bg:#FFFFFF; --ftb-ink:var(--ink); --ftb-ink-2:var(--ink-2); --ftb-ink-3:var(--ink-3); --ftb-rule:var(--rule); --ftb-hover:var(--ground); --ftb-border:1px solid var(--ink);
 --shadow-float:0 1px 0 rgba(22,22,26,.04),0 8px 20px -6px rgba(22,22,26,.28);
 --head-bg:var(--ground); --head-ink:var(--ink); --head-ink-2:var(--ink-2); --head-current:rgba(22,22,26,.07);
 --mark-color:var(--ink); --mark-cut:var(--ground); --avatar-bg:var(--ink); --avatar-ink:#fff;
 --ph-bg:#E3E2DC; --ph-ink:var(--ink-3);
}""",
    sel_inner="""<span class="crop tl"></span><span class="crop tr"></span><span class="crop bl"></span><span class="crop br"></span><span class="slug">Heading</span>""",
    css=r"""
.btn-primary:hover{background:#2C2C31}
.publish{padding:0 16px;font-weight:600}
.sec-h{font-size:11.5px}
/* selection: cyan rule + crop marks outside the corners + an ink slug that names the part */
.sel{outline:1.5px solid var(--accent);outline-offset:0;box-shadow:0 0 0 2.5px rgba(255,255,255,.55)}
.crop{position:absolute;width:14px;height:14px;border-color:var(--accent);border-style:solid;border-width:0}
.crop.tl{left:-8px;top:-8px;border-left-width:1.5px;border-top-width:1.5px;transform:translate(-4px,-4px)}
.crop.tr{right:-8px;top:-8px;border-right-width:1.5px;border-top-width:1.5px;transform:translate(4px,-4px)}
.crop.bl{left:-8px;bottom:-8px;border-left-width:1.5px;border-bottom-width:1.5px;transform:translate(-4px,4px)}
.crop.br{right:-8px;bottom:-8px;border-right-width:1.5px;border-bottom-width:1.5px;transform:translate(4px,4px)}
.slug{position:absolute;left:-1.5px;bottom:-26px;display:inline-flex;gap:8px;align-items:center;height:22px;padding:0 8px;background:var(--accent-strong);color:#fff;font:600 12px/1 var(--font-ui);letter-spacing:.02em}
.slug em{font-style:normal;font-weight:400;opacity:.85;font-family:var(--font-mono);font-size:11px}
.hov{outline:1px dashed rgba(255,255,255,.75);outline-offset:3px}
.ftb{top:262px}
.ftb .what{font-family:var(--font-mono);font-weight:500;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
.versions .live{color:var(--success)}
""",
    dash_css=r"""
.sites{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:40px 28px}
.site{display:flex;flex-direction:column;gap:12px}
.site .thumb{aspect-ratio:16/10;border:1px solid var(--rule);outline:1px solid transparent;transition:outline-color .12s}
.site:hover .thumb{outline:2px solid var(--ink);outline-offset:3px}
.site-body{display:grid;gap:4px;padding-top:2px;border-top:2px solid var(--ink);padding-top:12px}
.site-top{display:flex;align-items:center;justify-content:space-between;gap:10px}
.site-title{font-size:18px;font-weight:600;letter-spacing:-.01em;text-decoration:none}
.meta{margin:0}
.site-links{display:grid;gap:4px;margin-top:6px;min-height:20px}
.site-actions{display:flex;gap:6px;align-items:center;margin-top:auto}
.site-actions .icon-only{margin-left:auto}
.addr-link{font-family:var(--font-mono);font-size:12.5px}
@media (max-width:760px){
 .app-head{padding:0 16px;gap:12px}.nav,.acct-name{display:none}
 .page{padding:24px 16px 48px}.page-head{flex-direction:column;align-items:stretch;gap:16px}
 .page-head h1{font-size:26px}.sites{grid-template-columns:1fr;gap:32px}
}
""",
)

SPOT = dict(
    slug="spot-ink", title="Spot Ink",
    fonts="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@400;500;600;700&family=Literata:opsz,wght@7..72,500;7..72,600&family=Geist+Mono:wght@400&display=swap",
    publish_label=f"Publish 3 changes",
    tokens=r"""
:root{
 --font-ui:"Atkinson Hyperlegible Next",system-ui,sans-serif; --font-title:"Literata",Georgia,serif; --font-brand:var(--font-title); --font-mono:"Geist Mono",ui-monospace,monospace;
 --ground:#F2F3EE; --surface:#FBFBF8; --sunken:#E6E8E1; --ink:#1B2421; --ink-2:#4A534F; --ink-3:#5F6964;
 --rule:#D9DDD4; --control-border:#7F8984; --hover:rgba(27,36,33,.06);
 --spot:#1E5A45; --on-spot:#F4F1E6; --spot-soft:#E1EBE4; --fluoro:#C4F03A;
 --accent:var(--spot); --link:var(--spot); --select-text:rgba(196,240,58,.55);
 --primary:var(--spot); --on-primary:var(--on-spot);
 --success:#1E5A45; --success-soft:#E1EBE4; --warn:#9A5300; --warn-soft:#F8EDD6; --error:#B3261E; --error-soft:#F9E7E5; --neutral-soft:#E6E8E1;
 --fs-meta:13.5px; --fs-ctl:14.5px; --fs-body:16px; --fs-label:13px; --fs-sitename:18px; --fs-h2:24px; --fs-h1:34px;
 --lh-body:1.5; --lh-h1:1.1; --fw-ctl:600; --fw-label:700; --fw-title:600; --fw-sitename:600; --fw-brand:600;
 --ls-ctl:0; --ls-label:0; --tt-label:none; --ls-title:-.01em; --ls-brand:-.01em;
 --r-ctl:8px; --r-row:8px; --r-float:12px; --r-canvas:10px; --r-pill:999px;
 --ctl-h:36px; --top-h:56px; --side-w:272px;
 --icon-stroke:1.75; --icon-cap:round; --icon-join:round;
 --seg-bg:var(--sunken); --seg-border:transparent; --seg-on:var(--surface); --seg-on-ink:var(--ink); --seg-on-shadow:0 1px 2px rgba(27,36,33,.18);
 --top-bg:var(--spot); --top-ink:var(--on-spot); --top-ink-2:#C9DDD2; --top-rule:rgba(244,241,230,.16); --top-hover:rgba(244,241,230,.1);
 --top-seg-bg:rgba(0,0,0,.18); --top-seg-border:transparent; --top-seg-on:var(--on-spot); --top-seg-on-ink:var(--spot);
 --success-on-top:var(--fluoro); --warn-on-top:#F5C46B;
 --side-bg:var(--surface); --side-ink:var(--ink); --side-ink-2:var(--ink-2); --side-ink-3:var(--ink-3); --side-rule:var(--rule);
 --current-bg:var(--spot-soft); --current-ink:var(--spot); --current-ink-2:var(--spot); --addr-bg:var(--ground);
 --canvas-bg:var(--sunken); --canvas-shadow:0 0 0 1px rgba(27,36,33,.12),0 10px 30px -12px rgba(27,36,33,.35);
 --ftb-bg:var(--surface); --ftb-ink:var(--ink); --ftb-ink-2:var(--spot); --ftb-ink-3:var(--ink-3); --ftb-rule:var(--rule); --ftb-hover:var(--spot-soft); --ftb-border:1px solid rgba(27,36,33,.14);
 --shadow-float:0 2px 4px rgba(27,36,33,.08),0 14px 32px -10px rgba(27,36,33,.32);
 --head-bg:var(--spot); --head-ink:var(--on-spot); --head-ink-2:#C9DDD2; --head-current:rgba(244,241,230,.14);
 --mark-color:var(--fluoro); --mark-cut:var(--spot); --avatar-bg:var(--fluoro); --avatar-ink:var(--ink);
 --ph-bg:var(--spot-soft); --ph-ink:var(--spot);
}""",
    sel_inner="""<span class="tag">Heading</span>""",
    css=r"""
.small-screen .mark{color:var(--spot);--mark-cut:var(--ground)}
.publish{background:var(--fluoro);color:var(--ink);font-weight:700;padding:0 16px}
.publish:hover{background:#B4E52A}
.top .site-name{font-family:var(--font-title)}
.top .page-switch{color:var(--on-spot)}
.pages a[aria-current=page]{box-shadow:inset 0 1px 2px rgba(27,36,33,.12)}
.versions .live{background:var(--spot-soft);padding:2px 8px;border-radius:999px}
.state .dot{color:var(--warn)}
/* selection: fluorescent rule with an ink core, plus a fluoro tag */
.sel{outline:3px solid var(--fluoro);outline-offset:1px;box-shadow:0 0 0 1px var(--ink),inset 0 0 0 1px var(--ink)}
.tag{position:absolute;right:-4px;top:-30px;height:24px;padding:0 10px;display:inline-flex;align-items:center;background:var(--fluoro);color:var(--ink);font:700 12.5px/1 var(--font-ui);border-radius:6px 6px 0 6px}
.hov{outline:2px solid rgba(196,240,58,.6);outline-offset:2px}
.ftb{top:268px}
.ftb .what{font-family:var(--font-title);font-weight:600;font-size:14px}
.ftb .btn.on{box-shadow:inset 0 1px 2px rgba(27,36,33,.18)}
""",
    dash_css=r"""
.app-head{border-bottom:0}
.brand{font-size:19px}
.nav a[aria-current=page]{color:var(--on-spot)}
.btn-primary:hover{background:#174A39}
.page{max-width:1040px}
.page-head h1{font-size:34px}
.sites{list-style:none;margin:0;padding:0;border-top:1px solid var(--rule)}
.site{display:grid;grid-template-columns:240px 1fr auto;gap:28px;align-items:center;padding:20px 0;border-bottom:1px solid var(--rule)}
.site .thumb{aspect-ratio:16/10;border-radius:10px;box-shadow:0 0 0 1px rgba(27,36,33,.1),0 6px 16px -8px rgba(27,36,33,.3)}
.site-body{display:grid;gap:6px;align-content:center}
.site-top{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.site-title{font-family:var(--font-title);font-size:22px;font-weight:600;text-decoration:none}
.meta{margin:0}
.site-links{display:flex;gap:16px;flex-wrap:wrap}
.site-actions{display:flex;gap:6px;align-items:center}
.pill-live{background:var(--spot-soft);color:var(--spot)}
@media (max-width:760px){
 .app-head{padding:0 16px;gap:12px}.nav,.acct-name{display:none}
 .page{padding:24px 16px 48px}.page-head{flex-direction:column;align-items:stretch;gap:16px}
 .page-head h1{font-size:28px}
 .site{grid-template-columns:1fr;gap:14px}
}
""",
)

SHOP = dict(
    slug="shopfront", title="Shopfront",
    fonts="https://fonts.googleapis.com/css2?family=Funnel+Display:wght@500;600;700&family=Funnel+Sans:wght@400;500;600;700&family=Geist+Mono:wght@400&display=swap",
    publish_label=f"{ic('upload','icon sm')}Publish",
    tokens=r"""
:root{
 --font-ui:"Funnel Sans",system-ui,sans-serif; --font-title:"Funnel Display",var(--font-ui); --font-brand:var(--font-title); --font-mono:"Geist Mono",ui-monospace,monospace;
 --ground:#14203A; --surface:#1C2A48; --sunken:#0E1830; --ink:#F3EEE2; --ink-2:#B8C0D0; --ink-3:#9AA4B8;
 --rule:#2C3C5E; --control-border:#6E80A6; --hover:rgba(243,238,226,.07);
 --gold:#E8B84A; --on-gold:#14203A;
 --accent:var(--gold); --link:#F0CB73; --select-text:rgba(232,184,74,.35);
 --primary:var(--gold); --on-primary:var(--on-gold);
 --success:#78D6A0; --success-soft:rgba(120,214,160,.14); --warn:#F59A4C; --warn-soft:rgba(245,154,76,.14); --error:#FF8A7E; --error-soft:rgba(255,138,126,.14); --neutral-soft:rgba(243,238,226,.08);
 --fs-meta:13px; --fs-ctl:14px; --fs-body:15px; --fs-label:12.5px; --fs-sitename:17px; --fs-h2:24px; --fs-h1:34px;
 --lh-body:1.5; --lh-h1:1.05; --fw-ctl:500; --fw-label:600; --fw-title:600; --fw-sitename:600; --fw-brand:700;
 --ls-ctl:0; --ls-label:.02em; --tt-label:none; --ls-title:-.015em; --ls-brand:-.01em;
 --r-ctl:8px; --r-row:8px; --r-float:12px; --r-canvas:8px; --r-pill:999px;
 --ctl-h:34px; --top-h:52px; --side-w:264px;
 --icon-stroke:1.5; --icon-cap:round; --icon-join:round;
 --seg-bg:var(--sunken); --seg-border:var(--rule); --seg-on:var(--surface); --seg-on-ink:var(--ink); --seg-on-shadow:0 0 0 1px var(--control-border);
 --top-bg:var(--ground); --top-ink:var(--ink); --top-ink-2:var(--ink-2); --top-rule:var(--rule); --top-hover:var(--hover);
 --top-seg-bg:var(--sunken); --top-seg-border:var(--rule); --top-seg-on:#2A3B62; --top-seg-on-ink:var(--ink);
 --success-on-top:var(--success); --warn-on-top:var(--warn);
 --side-bg:var(--ground); --side-ink:var(--ink); --side-ink-2:var(--ink-2); --side-ink-3:var(--ink-3); --side-rule:var(--rule);
 --current-bg:var(--surface); --current-ink:var(--ink); --current-ink-2:var(--ink-3); --addr-bg:var(--sunken);
 --canvas-bg:var(--sunken); --canvas-shadow:0 0 0 1px rgba(0,0,0,.4),0 18px 40px -16px rgba(0,0,0,.7);
 --ftb-bg:var(--surface); --ftb-ink:var(--ink); --ftb-ink-2:var(--gold); --ftb-ink-3:var(--ink-3); --ftb-rule:var(--rule); --ftb-hover:rgba(243,238,226,.08); --ftb-border:1px solid #33456D;
 --shadow-float:0 2px 4px rgba(0,0,0,.25),0 16px 36px -12px rgba(0,0,0,.6);
 --head-bg:var(--ground); --head-ink:var(--ink); --head-ink-2:var(--ink-2); --head-current:var(--surface);
 --mark-color:var(--gold); --mark-cut:var(--ground); --avatar-bg:var(--gold); --avatar-ink:var(--on-gold);
 --ph-bg:#22335A; --ph-ink:var(--gold);
}""",
    sel_inner="""<span class="plate">Heading</span>""",
    css=r"""
.publish{font-weight:600;padding:0 16px}
.publish:hover{background:#F0C55F}
.pages a[aria-current=page]{box-shadow:inset 2px 0 0 var(--gold)}
/* selection: gold-leaf double rule (gold over a navy keyline) and a name plate */
.sel{outline:2px solid var(--gold);outline-offset:2px;box-shadow:0 0 0 2px #14203A, inset 0 0 0 1px rgba(20,32,58,.6)}
.plate{position:absolute;left:-4px;top:-32px;height:24px;padding:0 10px;display:inline-flex;align-items:center;background:var(--gold);color:var(--on-gold);font:600 12.5px/1 var(--font-ui);border-radius:6px 6px 6px 0;box-shadow:0 0 0 2px #14203A}
.hov{outline:1.5px solid rgba(232,184,74,.55);outline-offset:3px}
.ftb{top:236px}
.ftb .what{font-family:var(--font-title);font-weight:600;font-size:14px}
""",
    dash_css=r"""
.page-head h1{font-size:36px}
.btn-primary:hover{background:#F0C55F}
.sites{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1.35fr 1fr 1fr;gap:20px;align-items:stretch}
.site{display:flex;flex-direction:column;background:var(--surface);border-radius:12px;overflow:hidden;box-shadow:0 0 0 1px #2C3C5E}
.site:first-child .thumb{aspect-ratio:16/10}
.site .thumb{aspect-ratio:16/10;box-shadow:inset 0 -1px 0 #2C3C5E}
.site-body{display:grid;gap:4px;padding:16px 18px 6px}
.site-top{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.site-title{font-family:var(--font-title);font-size:20px;font-weight:600;text-decoration:none}
.meta{margin:0}
.site-links{display:grid;gap:4px;margin-top:6px}
.site-actions{display:flex;gap:6px;align-items:center;padding:10px 12px 14px 18px;margin-top:auto}
.site-actions .icon-only{margin-left:auto}
@media (max-width:760px){
 .app-head{padding:0 16px;gap:12px}.nav,.acct-name{display:none}
 .page{padding:24px 16px 48px}.page-head{flex-direction:column;align-items:stretch;gap:16px}
 .page-head h1{font-size:28px}.sites{grid-template-columns:1fr}
}
""",
)

for d in (PROOF, SPOT, SHOP):
    folder = OUT / d["slug"]
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "editor.html").write_text(editor(d))
    (folder / "dashboard.html").write_text(dashboard(d))
    print("wrote", folder)
