// Throwaway prototype. The site is cross-origin, so its parts were measured once
// per layout width and the selection is drawn at those coordinates.
const SITE = "http://agency-15.sites.localhost:5150/";
const LAYOUTS = {
  1280: { H: 6268, heading: [167, 340, 947, 72], button: [529, 476, 223, 69], photo: [82, 1644, 356, 267], sections: { Home: 0, Services: 745, Portfolio: 1401 } },
  810: { H: 7889, heading: [139, 340, 532, 144], button: [294, 548, 223, 69], photo: [57, 1798, 336, 252], sections: { Home: 0, Services: 817, Portfolio: 1555 } },
  390: { H: 9635, heading: [49, 217, 292, 156], button: [84, 405, 223, 69], photo: [12, 2094, 366, 275], sections: { Home: 0, Services: 570, Portfolio: 1851 } },
};
const PAGES = [
  { name: "Home", path: "/", desc: "Welcome, services, portfolio, team" },
  { name: "Services", path: "/services.html", desc: "E-commerce, responsive design, security" },
  { name: "Portfolio", path: "/portfolio.html", desc: "Six recent projects" },
];
const KINDS = {
  heading: { label: "Heading", words: [["Edit", "edit"], ["Style", "style"], ["Link", "link"], ["More", "more"]] },
  button: { label: "Button", words: [["Edit", "edit"], ["Link", "link", "Contact"], ["Style", "style"], ["More", "more"]] },
  photo: { label: "Picture", words: [["Replace", "replace"], ["Description", "alt"], ["Link", "link"], ["More", "more"]] },
};
const EDIT_WORDS = [["B", "bold", null, "b", "Bold"], ["I", "italic", null, "i", "Italic"], ["Link", "tlink"], ["|"], ["Done", "done", null, "done"]];

const state = {
  sel: null, editing: false, save: "saved", surface: null, opener: null,
  mode: "edit", device: "desktop", focus: false, fit: true, page: "Home",
  history: ["Heading text changed", "“Tell Me More” now goes to Contact"], redo: [],
  version: 3, published: false, typed: false, layout: null,
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const frame = $("[data-canvas]"), paper = $("[data-paper]"), ring = $("[data-ring]"), caption = $("[data-caption]"), caret = $("[data-caret]");

function layout() {
  const vw = document.documentElement.clientWidth;
  let L, s;
  if (vw <= 600) { L = 390; s = vw / 390; }
  else if (state.device === "phone") { L = 390; s = 1; }
  else if (vw <= 900) { L = 810; s = (vw - 24) / 810; }
  else { L = 1280; s = state.fit ? (vw - 32) / 1280 : 1; }
  const d = LAYOUTS[L];
  state.layout = { L, s, d };
  frame.style.width = L + "px";
  frame.style.height = d.H + "px";
  frame.style.transform = `scale(${s})`;
  paper.style.width = L * s + "px";
  paper.style.height = d.H * s + "px";
  $("[data-zoom]").textContent = state.fit ? `Fit ${Math.round(s * 100)}%` : "100%";
  for (const k of Object.keys(KINDS)) {
    const [x, y, w, h] = d[k].map((v) => v * s);
    Object.assign($(`[data-spot="${k}"]`).style, { left: x - 4 + "px", top: y - 4 + "px", width: w + 8 + "px", height: h + 8 + "px" });
  }
  render();
}

function rectOf(kind) {
  const { s, d } = state.layout;
  const [x, y, w, h] = d[kind];
  return { x: x * s - 6, y: y * s - 6, w: w * s + 12, h: h * s + 12 };
}

function render() {
  document.body.dataset.mode = state.focus ? "preview" : state.mode;
  document.body.dataset.device = state.device;
  document.body.classList.toggle("focus", state.focus);
  $("[data-back]").hidden = !state.focus;
  $$("[data-mode-set]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.modeSet === state.mode)));
  $$("[data-device-set]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.deviceSet === state.device)));
  $("[data-act=undo]").disabled = state.history.length === 0;
  $("[data-act=redo]").disabled = state.redo.length === 0;
  $("[data-page-name]").textContent = state.page;
  $(".page").setAttribute("aria-label", `Page: ${state.page}. Switch page`);
  renderPub();
  renderSelection();
  $$("[data-open]").forEach((b) => b.hasAttribute("aria-expanded") && b.setAttribute("aria-expanded", String(state.surface === b.dataset.open)));
}

function renderPub() {
  const n = state.history.length;
  const el = $("[data-pubstate]");
  const btn = $(".line .publish");
  if (state.published && n === 0) {
    el.textContent = state.justPublished ? `Live · version ${state.version} · just now` : "Live";
    el.classList.add("live");
    btn.classList.add("quiet");
    $("[data-publish-label]").textContent = "Published";
  } else {
    el.classList.remove("live");
    el.innerHTML = n === 0 ? "Everything is published" : `<span class="long">${n} change${n > 1 ? "s" : ""} not published</span><span class="short">${n} unpublished</span>`;
    btn.classList.toggle("quiet", n === 0);
    $("[data-publish-label]").textContent = n === 0 ? "Published" : "Publish";
  }
}

function renderSelection() {
  const k = state.sel;
  $$("[data-spot]").forEach((b) => b.classList.toggle("is-sel", b.dataset.spot === k));
  if (!k || state.mode !== "edit" || state.focus) { ring.hidden = caption.hidden = caret.hidden = true; return; }
  const r = rectOf(k);
  Object.assign(ring.style, { left: r.x + "px", top: r.y + "px", width: r.w + "px", height: r.h + "px" });
  ring.hidden = false;
  ring.classList.toggle("editing", state.editing);
  caret.hidden = !state.editing;
  if (state.editing) {
    const { s, d } = state.layout;
    const [x, y, w, h] = d[k];
    const lineH = Math.min(h, 80) * s * 0.8;
    Object.assign(caret.style, { left: (x + w) * s + 3 + "px", top: (y + h) * s - lineH - 4 + "px", height: lineH + "px" });
  }
  $("[data-cap-kind]").textContent = state.editing ? "Editing" : KINDS[k].label;
  const sv = $("[data-cap-save]");
  sv.textContent = state.save === "saving" ? "Saving…" : "Saved";
  sv.className = "cap-save" + (state.save === "saving" ? " saving" : "");
  const words = state.editing ? EDIT_WORDS : KINDS[k].words;
  const host = $("[data-cap-words]");
  const sig = words.map((w) => w[1]).join() + state.surface;
  if (host.dataset.sig !== sig) {
    host.innerHTML = words.map(([t, act, detail, cls, name]) => t === "|" ? '<span class="cw-sep" aria-hidden="true"></span>'
      : `<button class="cw ${cls || ""}" data-cw="${act}" ${name ? `aria-label="${name}"` : ""} ${["more", "replace"].includes(act) ? `aria-haspopup="true" aria-expanded="${state.surface === act}"` : ""}>${t}${detail ? ` <span class="detail">· ${detail}</span>` : ""}</button>`).join("");
    host.dataset.sig = sig;
  }
  caption.hidden = false;
  const docked = document.documentElement.clientWidth <= 600;
  caption.classList.toggle("docked", docked);
  if (!docked) {
    const pw = paper.clientWidth;
    const cw = caption.offsetWidth;
    const left = Math.max(8, Math.min(r.x, pw - cw - 8));
    caption.style.left = left + "px";
    caption.style.top = r.y + r.h + 10 + "px";
  }
}

function select(kind) {
  if (state.editing && kind !== state.sel) finishEdit();
  state.sel = kind;
  $("[data-hint]").hidden = true;
  closeSurface(false);
  render();
}
function startEdit() {
  if (!["heading", "button"].includes(state.sel)) return;
  state.editing = true; state.typed = false;
  closeSurface(false);
  render();
  announce("Editing. Type to change the words. Enter or Done to finish, Escape keeps your text.");
}
function finishEdit() {
  if (state.typed) { state.history.push(`${KINDS[state.sel].label} text changed`); state.redo = []; state.published = false; }
  state.editing = false; state.typed = false;
  render();
}
let saveTimer;
function flashSave() {
  state.typed = true; state.save = "saving"; renderSelection();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { state.save = "saved"; renderSelection(); }, 900);
}

// Surfaces: one open at a time, Escape closes it, focus returns to its opener.
function openSurface(name, opener, extra) {
  if (name === "replace-any") { select("photo"); scrollToKind("photo"); name = "replace"; opener = null; }
  if (state.surface === name) { closeSurface(); return; }
  closeSurface(false);
  if (state.editing && name !== "more") finishEdit();
  state.surface = name; state.opener = opener || document.activeElement;
  const el = $(`[data-surface="${name}"]`);
  el.hidden = false;
  $("[data-scrim]").hidden = name !== "settings";
  if (name === "pages") { $("[data-find]").value = ""; renderToc(); }
  if (name === "palette") { $("[data-pal-in]").value = ""; renderPalette(); }
  if (name === "publish") renderPublishBody();
  if (name === "settings") {
    renderToc($("[data-toc-static]"), true);
    const target = extra && extra.section;
    requestAnimationFrame(() => { $("[data-setdoc]").scrollTop = target ? $("#s-" + target).offsetTop - 24 : 0; });
  }
  place(name);
  render();
  const first = { pages: "[data-find]", palette: "[data-pal-in]", replace: ".upload", publish: "[data-act=do-publish], [data-pub-body] a", settings: "[data-act=close]", more: "[role=menuitem]" }[name];
  requestAnimationFrame(() => { const f = $(first, el); f && f.focus(); });
}
function closeSurface(restore = true) {
  if (!state.surface) return;
  $(`[data-surface="${state.surface}"]`).hidden = true;
  $("[data-pagemenu]").hidden = true;
  $("[data-scrim]").hidden = true;
  const op = state.opener;
  state.surface = null;
  render();
  if (restore && op && document.contains(op)) op.focus();
}
function place(name) {
  const el = $(`[data-surface="${name}"]`);
  if (!el || ["settings", "palette"].includes(name)) return;
  const phone = document.documentElement.clientWidth <= 600;
  if (phone) return;
  let a;
  if (name === "pages") a = $(".page").getBoundingClientRect();
  if (name === "publish") a = $(".line .publish").getBoundingClientRect();
  if (name === "replace" || name === "more") a = ($(`[data-cw="${name}"]`) || caption).getBoundingClientRect();
  if (!a) return;
  const w = el.offsetWidth;
  if (name === "replace") {
    const r = ring.getBoundingClientRect();
    if (innerWidth - r.right > w + 24) {
      el.style.left = r.right + 14 + "px";
      el.style.top = Math.max(56, Math.min(r.top, innerHeight - el.offsetHeight - 8)) + "px";
      return;
    }
  }
  let left = name === "publish" ? a.right - w : a.left - (name === "pages" ? 10 : 0);
  left = Math.max(8, Math.min(left, innerWidth - w - 8));
  let top = a.bottom + 8;
  if (top + el.offsetHeight > innerHeight - 8 && name !== "publish") top = Math.max(56, a.top - el.offsetHeight - 8);
  el.style.left = left + "px";
  el.style.top = top + "px";
}

function renderToc(host = $("[data-toc]"), stat = false) {
  const q = stat ? "" : $("[data-find]").value.trim().toLowerCase();
  const rows = PAGES.filter((p) => !q || (p.name + p.path + p.desc).toLowerCase().includes(q));
  host.innerHTML = rows.map((p, i) => `<li class="toc-row ${p.name === state.page ? "is-current" : ""} ${!stat && i === 0 ? "is-active" : ""}" role="option" aria-selected="${p.name === state.page}" data-go="${p.name}" title="${p.desc}">
      <svg class="ic chk"><use href="#i-check"/></svg><span class="t">${p.name}</span><span class="lead" aria-hidden="true"></span><span class="p">${p.path}</span>
      <button class="dots" data-pagemenu-for="${p.name}" aria-label="${p.name} page actions" aria-haspopup="menu" aria-expanded="false"><svg class="ic ic-sm"><use href="#i-more"/></svg></button></li>`).join("")
    || `<li class="toc-row" style="cursor:default"><span class="t soft">No page called “${q}”</span></li>`;
}
function goPage(name) {
  state.page = name;
  closeSurface(false);
  const { s, d } = state.layout;
  scrollTo({ top: d.sections[name] * s, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  render();
  $(".page").focus();
}
function openPageMenu(btn) {
  const m = $("[data-pagemenu]");
  const open = m.hidden || m.dataset.for !== btn.dataset.pagemenuFor;
  $$("[data-pagemenu-for]").forEach((b) => b.setAttribute("aria-expanded", "false"));
  if (!open) { m.hidden = true; return; }
  m.dataset.for = btn.dataset.pagemenuFor;
  const home = btn.dataset.pagemenuFor === "Home";
  $$("button", m).forEach((b) => { b.hidden = home && ["Rename", "Delete page"].includes(b.textContent); });
  const pop = $("[data-surface=pages]").getBoundingClientRect(), r = btn.getBoundingClientRect();
  m.style.left = r.right - pop.left - 200 + "px";
  m.style.top = r.bottom - pop.top + 4 + "px";
  m.hidden = false;
  btn.setAttribute("aria-expanded", "true");
  $("button:not([hidden])", m).focus();
}

function renderPublishBody() {
  const n = state.history.length;
  const body = $("[data-pub-body]");
  if (state.published && n === 0) {
    body.innerHTML = `<div class="pub-done"><h3 id="pub-t" class="doc-h">Published</h3><p class="doc-lede">Visitors now see version ${state.version}.</p><p class="addr">agency-15.pagehaven.site</p><div class="pub-actions"><a class="w link" href="${SITE}" target="_blank" rel="noopener">View website <svg class="ic ic-sm"><use href="#i-ext"/></svg></a></div></div>`;
  } else if (n === 0) {
    body.innerHTML = `<h3 id="pub-t" class="doc-h">Publish</h3><p class="doc-lede">Everything is published. Visitors see version ${state.version}.</p>`;
  } else {
    body.innerHTML = `<h3 id="pub-t" class="doc-h">Publish</h3>
      <p class="doc-lede">Visitors see version ${state.version}, from 12 October. You have <b>${n} change${n > 1 ? "s" : ""}</b> they haven't seen.</p>
      <ul class="changes">${state.history.map((c) => `<li><span class="ch-page">Home</span>${c}</li>`).join("")}</ul>
      <p class="addr">agency-15.pagehaven.site</p>
      <div class="pub-actions"><button class="publish lg" data-act="do-publish">Publish ${n} change${n > 1 ? "s" : ""}</button>
      <a class="w link" href="${SITE}" target="_blank" rel="noopener">View website <svg class="ic ic-sm"><use href="#i-ext"/></svg></a></div>`;
  }
}
function doPublish(btn) {
  btn.textContent = "Publishing…"; btn.setAttribute("aria-busy", "true");
  $("[data-pubstate]").textContent = "Publishing…";
  setTimeout(() => {
    state.version += 1; state.history = []; state.redo = []; state.published = true; state.justPublished = true;
    $("[data-ledger]").insertAdjacentHTML("afterbegin", `<li><span class="v">${state.version}</span><span class="d">20 Oct 2026</span><span class="tag">live</span></li>`);
    $$("[data-ledger] li").slice(1).forEach((li) => { const t = $(".tag", li); t && t.replaceWith(Object.assign(document.createElement("button"), { className: "w link sm", textContent: "Make this version live" })); });
    renderPublishBody(); render();
    announce(`Published. Visitors now see version ${state.version}.`);
    setTimeout(() => { state.justPublished = false; renderPub(); }, 4000);
  }, 900);
}

// Command palette: every entry repeats a visible control and names where it lives.
function commands() {
  return [
    ["Pages", PAGES.map((p) => [`Go to ${p.name}`, "Top line, page name", () => goPage(p.name)]).concat([["Add a page…", "Top line, page name", () => toast("Opens the page form (not built in this sketch).")]])],
    ["Selection", [["Select main heading", "Click it on the page", () => select("heading")], ["Select button “Tell Me More”", "Click it on the page", () => select("button")], ["Replace picture: portfolio/1.jpg", "Caption, Replace", () => openSurface("replace-any")]]],
    ["Website", ["General", "Pages", "Assets", "Domains", "Publishing", "Versions"].map((s) => [`Settings: ${s}`, "Top line, Settings", () => openSurface("settings", $(".quiet-l[data-open=settings]"), { section: s.toLowerCase() })])],
    ["Publishing", [["Publish", "Top line, Publish", () => openSurface("publish", $(".line .publish"))], ["Version history", "Publish, Versions", () => openSurface("publish", $(".line .publish"))], ["View website", "Publish", () => open(SITE, "_blank")]]],
    ["View", [["Edit", "Top line", () => setMode("edit")], ["Preview", "Top line", () => setMode("preview")], ["Computer", "Top line", () => setDevice("desktop")], ["Phone", "Top line", () => setDevice("phone")], ["Fit to width", "Top line, zoom", () => { state.fit = true; layout(); }], ["Focus", "Top line, Focus  Ctrl+.", () => setFocus(true)]]],
  ];
}
let palItems = [], palIdx = 0;
function renderPalette() {
  const q = $("[data-pal-in]").value.trim().toLowerCase();
  palItems = []; let html = "";
  for (const [g, items] of commands()) {
    const hits = items.filter(([t]) => !q || t.toLowerCase().includes(q));
    if (!hits.length) continue;
    html += `<li class="pal-g" role="presentation">${g}</li>`;
    for (const it of hits) { html += `<li class="pal-i" role="option" data-pi="${palItems.length}"><span>${it[0]}</span><span class="where">${it[1]}</span></li>`; palItems.push(it); }
  }
  $("[data-pal]").innerHTML = html || `<li class="pal-g">Nothing matches “${q}”</li>`;
  palIdx = 0; markPal();
}
function markPal() { $$(".pal-i").forEach((li) => { const on = +li.dataset.pi === palIdx; li.classList.toggle("is-active", on); li.setAttribute("aria-selected", on); if (on) li.scrollIntoView({ block: "nearest" }); }); }
function runPal(i) { const it = palItems[i]; if (!it) return; closeSurface(false); it[2](); }

function setMode(m) { if (state.editing) finishEdit(); state.mode = m; closeSurface(false); render(); }
function setDevice(dv) { state.device = dv; layout(); if (state.sel) scrollToKind(state.sel); }
function setFocus(on) {
  if (state.editing) finishEdit();
  closeSurface(false);
  state.focus = on; render(); layout();
  if (on) { $("[data-back]").focus(); idleDim(); announce("Focus. Press Escape or Back to editing to return."); }
}
let dimTimer;
function idleDim() { const b = $("[data-back]"); b.classList.remove("dim"); clearTimeout(dimTimer); dimTimer = setTimeout(() => b.classList.add("dim"), 3000); }
function scrollToKind(k) { const r = rectOf(k); const top = paper.getBoundingClientRect().top + scrollY + r.y; if (top < scrollY + 60 || top > scrollY + innerHeight - 120) scrollTo({ top: top - 140 }); }
function undo() { if (state.editing) finishEdit(); const c = state.history.pop(); if (!c) return; state.redo.push(c); toast(`Undone: ${c}`); render(); }
function redo() { const c = state.redo.pop(); if (!c) return; state.history.push(c); toast(`Redone: ${c}`); render(); }

let toastTimer;
function toast(t) { const el = $("[data-toast]"); el.textContent = t; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => (el.hidden = true), 2600); }
const live = Object.assign(document.createElement("div"), { className: "sr" });
live.setAttribute("aria-live", "polite"); live.style.cssText = "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)";
document.body.append(live);
function announce(t) { live.textContent = t; }

// Events
document.addEventListener("click", (e) => {
  const t = e.target;
  const spot = t.closest("[data-spot]");
  if (spot) {
    const k = spot.dataset.spot;
    if (state.sel === k && !state.editing && e.detail <= 1) startEdit(); else if (state.sel !== k) select(k);
    return;
  }
  if (t.closest("[data-catcher]")) { if (state.editing) finishEdit(); state.sel = null; closeSurface(false); render(); return; }
  const cw = t.closest("[data-cw]");
  if (cw) {
    const a = cw.dataset.cw;
    if (a === "edit") startEdit();
    else if (a === "done") finishEdit();
    else if (a === "replace" || a === "more") openSurface(a, cw);
    else if (a === "bold" || a === "italic") { cw.setAttribute("aria-pressed", cw.getAttribute("aria-pressed") !== "true"); flashSave(); }
    else toast(`${cw.textContent.trim()} opens a popover anchored to the caption (not built in this sketch).`);
    return;
  }
  const op = t.closest("[data-open]");
  if (op) { openSurface(op.dataset.open, op, { section: op.dataset.section }); return; }
  const dots = t.closest("[data-pagemenu-for]");
  if (dots) { e.stopPropagation(); openPageMenu(dots); return; }
  const go = t.closest("[data-go]");
  if (go && go.closest("[data-surface=pages]")) { goPage(go.dataset.go); return; }
  if (t.closest("[data-pagemenu] button")) { $("[data-pagemenu]").hidden = true; toast(`${t.textContent}: same call as the page list today (not built in this sketch).`); return; }
  const pi = t.closest("[data-pi]");
  if (pi) { runPal(+pi.dataset.pi); return; }
  const act = t.closest("[data-act]");
  if (act) {
    const a = act.dataset.act;
    if (a === "undo") undo();
    if (a === "redo") redo();
    if (a === "fit") { state.fit = !state.fit; layout(); }
    if (a === "focus") setFocus(true);
    if (a === "close") closeSurface();
    if (a === "do-publish") doPublish(act);
    if (a === "upload") { toast("Picture replaced. Fill the frame or show the whole picture."); state.history.push("Portfolio picture replaced"); state.published = false; flashSave(); render(); }
    if (a === "add-page") toast("Opens the page form, starting from a copy of this page (not built in this sketch).");
    if (a === "rollback") toast("Opens the confirm: “Visitors will see version 2. Your editor keeps your latest work.”");
    return;
  }
  const md = t.closest("[data-mode-set]"); if (md) { setMode(md.dataset.modeSet); return; }
  const dv = t.closest("[data-device-set]"); if (dv) { setDevice(dv.dataset.deviceSet); return; }
  if (t.closest("[data-back]")) { setFocus(false); return; }
  if (t.closest("[data-scrim]")) { closeSurface(); return; }
  if (state.surface && !t.closest(`[data-surface="${state.surface}"]`) && !t.closest("[data-caption]")) closeSurface(false);
});
document.addEventListener("dblclick", (e) => { const s = e.target.closest("[data-spot]"); if (s) { state.sel = s.dataset.spot; startEdit(); } });

document.addEventListener("keydown", (e) => {
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.key.toLowerCase() === "k") { if (!state.editing) { e.preventDefault(); openSurface("palette"); } return; }
  if (mod && e.key === ".") { e.preventDefault(); setFocus(!state.focus); return; }
  if (e.key === "Escape") {
    e.preventDefault();
    if (!$("[data-pagemenu]").hidden) { $("[data-pagemenu]").hidden = true; const b = $('[data-pagemenu-for][aria-expanded="true"]'); b && (b.setAttribute("aria-expanded", "false"), b.focus()); }
    else if (state.surface) closeSurface();
    else if (state.focus) setFocus(false);
    else if (state.editing) { finishEdit(); $(`[data-spot="${state.sel}"]`).focus(); }
    else if (state.sel) { const k = state.sel; state.sel = null; render(); $(`[data-spot="${k}"]`).focus(); }
    return;
  }
  if (state.focus) { idleDim(); return; }
  if (state.surface === "palette") {
    if (e.key === "ArrowDown") { e.preventDefault(); palIdx = Math.min(palIdx + 1, palItems.length - 1); markPal(); }
    if (e.key === "ArrowUp") { e.preventDefault(); palIdx = Math.max(palIdx - 1, 0); markPal(); }
    if (e.key === "Enter") { e.preventDefault(); runPal(palIdx); }
    return;
  }
  if (state.surface === "pages" && ["ArrowDown", "ArrowUp", "Enter"].includes(e.key) && !e.target.closest("[data-pagemenu]") && !e.target.closest(".dots")) {
    const rows = $$("[data-toc] [data-go]");
    let i = rows.findIndex((r) => r.classList.contains("is-active"));
    if (e.key === "Enter") { if (rows[i]) { e.preventDefault(); goPage(rows[i].dataset.go); } return; }
    e.preventDefault();
    i = Math.max(0, Math.min(rows.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)));
    rows.forEach((r, j) => r.classList.toggle("is-active", j === i));
    return;
  }
  if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (state.editing) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); finishEdit(); $(`[data-spot="${state.sel}"]`).focus(); return; }
    if (e.key.length === 1 || e.key === "Backspace") { e.preventDefault(); flashSave(); }
    return;
  }
  const spot = e.target.closest && e.target.closest("[data-spot]");
  if (spot && e.key === "Enter" && state.sel === spot.dataset.spot) { e.preventDefault(); startEdit(); }
});
$("[data-find]").addEventListener("input", () => renderToc());
$("[data-pal-in]").addEventListener("input", renderPalette);
$("[data-setdoc]").addEventListener("scroll", (e) => {
  const doc = e.currentTarget; let on = "general";
  for (const s of $$("section", doc)) if (s.offsetTop - doc.scrollTop < 120) on = s.id.slice(2);
  $$(".set-toc a").forEach((a) => a.classList.toggle("is-on", a.hash === "#s-" + on));
});
$$(".set-toc a").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); const doc = $("[data-setdoc]"); doc.scrollTop = $(a.hash).offsetTop - 24; }));
addEventListener("scroll", () => { $("[data-line]").classList.toggle("scrolled", scrollY > 2); if (state.surface === "replace" || state.surface === "more") place(state.surface); }, { passive: true });
addEventListener("pointermove", () => state.focus && idleDim(), { passive: true });
addEventListener("resize", () => { layout(); if (state.surface) place(state.surface); });

const q = new URLSearchParams(location.search);
layout();
if (q.has("select")) select(q.get("select"));
if (q.has("edit")) startEdit();
if (q.has("open")) openSurface(q.get("open"));
