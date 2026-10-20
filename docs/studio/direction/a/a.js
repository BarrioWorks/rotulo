"use strict";
// Direction A, Floating Studio. Throwaway prototype: one state value, one render().

const SITE_ORIGIN = "http://agency-15.sites.localhost:5150";

// Target rects measured once in the published Agency site, in document pixels, per frame width.
const SITE = {
  1280: { docH: 6268, heading: [167, 332, 947, 88], button: [529, 476, 223, 69], image: [82, 1644, 356, 267], services: 745, portfolio: 1401 },
  1024: { docH: 6251, heading: [131, 332, 763, 160], button: [401, 548, 223, 69], image: [44, 1744, 296, 222], services: 817, portfolio: 1500 },
  834: { docH: 7891, heading: [151, 332, 532, 160], button: [306, 548, 223, 69], image: [69, 1798, 336, 252], services: 817, portfolio: 1555 },
  390: { docH: 9635, heading: [49, 211, 292, 168], button: [84, 405, 223, 69], image: [12, 2094, 366, 275], services: 640, portfolio: 1851 },
};
const ORDER = ["heading", "button", "image"];

// What each kind of part offers. The dock depends only on the kind (decision 3).
const KINDS = {
  heading: { label: "Heading", a11y: "Heading actions", actions: [["edit", "Edit text"], ["style", "Style"], ["link", "Link"]], section: true },
  button: { label: "Button", a11y: "Button actions", actions: [["edit", "Edit text"], ["link", "Link", "Contact Us section"], ["style", "Style"]], section: false },
  image: { label: "Picture", a11y: "Picture actions", actions: [["replace", "Replace"], ["alt", "Description"], ["link", "Link", "Project 1"]], section: false },
};

const PAGES = [
  { id: "home", label: "Home", path: "/", note: "Welcome, services and contact" },
  { id: "services", label: "Services", path: "/services.html", note: "What the studio offers" },
  { id: "portfolio", label: "Portfolio", path: "/portfolio.html", note: "Six recent projects" },
];

const state = {
  mode: "edit", device: "computer", zoom: 1,
  sel: null, hover: null, editing: false, typed: false, bold: false, italic: false,
  saves: {},                // target -> "saving" | "saved" | "error"
  surface: null, opener: null, // one open surface at a time
  focus: false, page: "home", seenHint: false, protoNote: false,
  dockSide: "below",
  pub: {
    live: 3, phase: "idle", older: false, justNow: false,
    changes: [{ page: "Home", what: "Portfolio picture 1", how: "Replaced" }, { page: "Services", what: "Intro paragraph", how: "Edited" }],
    redo: [],
  },
  versions: [
    { n: 3, date: "14 Oct 2026, 16:20" },
    { n: 2, date: "2 Oct 2026, 09:12" },
    { n: 1, date: "28 Sep 2026, 11:47" },
  ],
  settingsSection: "general",
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const body = document.body;
const scroller = $("#scroller"), stage = $("#stage"), frame = $("#site"), hit = $("#hit");
const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? "⌘" : "Ctrl+";

// ---------- geometry ----------
function layoutFor(w) { return w <= 600 ? "phone" : w <= 900 ? "touch" : w < 1180 ? "mid" : "wide"; }
function frameWidth() { return state.device === "phone" ? 390 : innerWidth; }
function siteKey(w) { return [1280, 1024, 834, 390].reduce((a, b) => (Math.abs(b - w) < Math.abs(a - w) ? b : a)); }
function geo() { const w = frameWidth(), k = siteKey(w); return { w, k, dx: (w - k) / 2, site: SITE[k] }; }
function docRect(t) { const g = geo(); const [x, y, w, h] = g.site[t]; return { x: x + g.dx, y, w, h }; }
function viewRect(t) {
  const r = docRect(t), s = stage.getBoundingClientRect(), z = state.zoom, p = 6;
  const left = s.left + (r.x - p) * z, top = s.top + (r.y - p) * z;
  return { left, top, width: (r.w + 2 * p) * z, height: (r.h + 2 * p) * z, right: left + (r.w + 2 * p) * z, bottom: top + (r.h + 2 * p) * z };
}
function canvasBox() { const r = scroller.getBoundingClientRect(); const bottomBar = isBarLayout() ? $("#tools").offsetHeight + 16 : 0; return { top: r.top, bottom: r.bottom - bottomBar, left: r.left, right: r.right }; }
function isBarLayout() { return body.dataset.l === "touch" || body.dataset.l === "phone"; }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- render ----------
function render() {
  const l = layoutFor(innerWidth);
  body.dataset.l = l;
  body.classList.toggle("mode-preview", state.mode === "preview");
  body.classList.toggle("device-phone", state.device === "phone");
  body.classList.toggle("focus", state.focus);
  body.classList.toggle("l-dockbar", isBarLayout());

  const g = geo();
  stage.style.width = g.w + "px";
  stage.style.zoom = state.zoom;
  frame.style.height = g.site.docH + "px";

  $$("#seg-mode button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === state.mode)));
  $$("#seg-device button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.device === state.device)));
  $("#seg-mode [data-mode=edit] .lbl").textContent = l === "phone" ? "Edit" : "Edit";
  $("#b-zoom").textContent = Math.round(state.zoom * 100) + "%";
  $("#page-name").textContent = PAGES.find((p) => p.id === state.page).label;
  $("#b-page").setAttribute("aria-label", `Page: ${$("#page-name").textContent}. Switch page`);
  $("#b-page").setAttribute("aria-expanded", String(state.surface === "pages"));
  $("#b-undo").disabled = state.pub.changes.length === 0;
  $("#b-redo").disabled = state.pub.redo.length === 0;
  renderPublishCapsule(l);
  renderSelection();
  $("#hint").hidden = state.seenHint || state.sel !== null || state.mode !== "edit" || state.focus || state.surface !== null;
  $("#focus-pill").hidden = !state.focus;
}

function renderPublishCapsule(l) {
  const p = state.pub, n = p.changes.length;
  const st = $("#b-status"), label = $("#publish-label"), count = $("#publish-count"), btn = $("#b-publish");
  let text;
  if (p.phase === "publishing") text = "Publishing…";
  else if (p.older) text = `Visitors see version ${p.live}`;
  else if (n > 0) text = l === "wide" ? `${n} change${n > 1 ? "s" : ""} not published` : `${n} change${n > 1 ? "s" : ""}`;
  else if (p.justNow) text = `Live · version ${p.live} · just now`;
  else text = "Live";
  $("#status-text").textContent = text;
  st.classList.toggle("live", n === 0 && !p.older);
  st.setAttribute("aria-label", `${text}. Open publishing`);
  const quiet = n === 0 && !p.older && p.phase !== "publishing";
  btn.classList.toggle("quiet", quiet);
  btn.setAttribute("aria-busy", String(p.phase === "publishing"));
  label.textContent = p.phase === "publishing" ? "Publishing…" : quiet ? "Published" : "Publish";
  count.textContent = n;
  count.hidden = n === 0;
  btn.setAttribute("aria-label", quiet ? "Published. Open publishing and versions" : `Publish ${n} change${n === 1 ? "" : "s"}`);
}

function renderSelection() {
  const ringS = $("#ring-sel"), ringH = $("#ring-hover"), wash = $("#wash"), chip = $("#chip"), dock = $("#dock"), off = $("#offscreen");
  const show = state.mode === "edit" && !state.focus;
  // hover ring
  if (show && state.hover && state.hover !== state.sel) place(ringH, docRect(state.hover), 4); else ringH.hidden = true;
  if (!show || !state.sel) { ringS.hidden = wash.hidden = chip.hidden = dock.hidden = off.hidden = true; return; }

  const t = state.sel, r = docRect(t);
  place(ringS, r, 6);
  ringS.classList.toggle("editing", state.editing);
  ringS.classList.toggle("error", state.saves[t] === "error");
  wash.hidden = !(state.editing && !state.typed);
  if (!wash.hidden) { wash.style.cssText = `left:${r.x}px;top:${r.y + r.h * 0.12}px;width:${r.w}px;height:${r.h * 0.76}px`; }

  // chip: label plus save state
  const k = KINDS[t], s = state.saves[t];
  let html = `<span>${k.label}</span>`;
  if (state.editing) html += `<span class="sep">·</span><span>Editing</span>`;
  else if (s === "saving") html += `<span class="sep">·</span><span class="state">Saving…</span>`;
  else if (s === "saved") html += `<span class="sep">·</span><span class="state"><svg class="icon"><use href="#i-check"/></svg>Saved</span>`;
  else if (s === "error") html += `<span class="sep">·</span><span class="state">Not saved</span><button type="button" data-act="retry">Try again</button>`;
  chip.innerHTML = html;
  chip.className = "sel-chip" + (s === "error" && !state.editing ? " error" : "");
  chip.hidden = false;

  const v = viewRect(t), box = canvasBox();
  const visible = v.bottom > box.top + 8 && v.top < box.bottom - 8;
  const chipH = chip.offsetHeight || 20;
  let chipTop = v.top - chipH - 6, chipBelow = false;
  if (chipTop < box.top + 4) { chipTop = v.bottom + 6; chipBelow = true; }
  chip.style.left = clamp(v.left, 8, innerWidth - chip.offsetWidth - 8) + "px";
  chip.style.top = chipTop + "px";
  chip.hidden = !visible;

  renderDock(t);
  dock.hidden = state.surface === "settings";
  const dw = dock.offsetWidth, dh = dock.offsetHeight;
  off.hidden = true;
  if (isBarLayout()) {
    dock.style.top = (innerHeight - $("#tools").offsetHeight - 2 * parseFloat(getComputedStyle(body).getPropertyValue("--edge")) - dh - 6) + "px";
    dock.style.left = "50%";
    return;
  }
  dock.style.transform = "";
  const gap = 10;
  const belowTop = (chipBelow ? chipTop + chipH : v.bottom) + gap;
  const aboveTop = (chipBelow ? v.top : chipTop) - gap - dh;
  let top, side = state.dockSide;
  if (!visible) {
    top = box.bottom - dh - 12; side = "docked";
    off.hidden = false;
    off.innerHTML = `<svg class="icon icon-16"><use href="#${v.top < box.top ? "i-up" : "i-down"}"/></svg>${k.label} is ${v.top < box.top ? "above" : "below"}`;
    off.style.left = (innerWidth - 160) / 2 + "px";
    off.style.top = (top - 40) + "px";
  } else if (!state.editing) {
    side = belowTop + dh <= box.bottom - 12 ? "below" : aboveTop >= box.top + 8 ? "above" : "docked";
    state.dockSide = side;
  }
  if (visible) top = side === "below" ? belowTop : side === "above" ? aboveTop : box.bottom - dh - 12;
  if (visible && state.editing && side === "below" && top + dh > box.bottom - 12) top = box.bottom - dh - 12;
  const left = clamp(v.left + v.width / 2 - dw / 2, 12, innerWidth - dw - 12);
  dock.style.left = left + "px";
  dock.style.top = top + "px";
}

function place(el, r, pad) {
  el.hidden = false;
  el.style.left = r.x - pad + "px"; el.style.top = r.y - pad + "px";
  el.style.width = r.w + 2 * pad + "px"; el.style.height = r.h + 2 * pad + "px";
}

let lastDockKey = "";
function renderDock(t) {
  const k = KINDS[t];
  const key = `${t}|${state.editing}|${state.bold}|${state.italic}|${body.dataset.l}`;
  if (key === lastDockKey) return;
  lastDockKey = key;
  const dock = $("#dock");
  dock.setAttribute("aria-label", state.editing ? "Text formatting" : k.a11y);
  if (state.editing) {
    dock.innerHTML = `
      <button class="tb-btn fmt b" data-act="bold" aria-pressed="${state.bold}" aria-label="Bold" data-tip="Bold  ${MOD}B">B</button>
      <button class="tb-btn fmt i" data-act="italic" aria-pressed="${state.italic}" aria-label="Italic" data-tip="Italic  ${MOD}I">I</button>
      <button class="tb-btn" data-act="link">Link</button>
      <span class="tb-sep"></span>
      <button class="tb-btn done" data-act="done" data-tip="Done  Enter">Done</button>
      <button class="tb-btn icon-only" data-act="more" aria-label="More" aria-haspopup="menu"><svg class="icon"><use href="#i-more"/></svg></button>`;
    return;
  }
  const short = body.dataset.l === "phone";
  dock.innerHTML = k.actions.map(([act, label, dest]) => {
    const cls = act === "alt" ? " dotted" : "";
    const d = dest && !short ? ` <span class="dest">· ${dest}</span>` : "";
    const aria = dest ? ` aria-label="${label}, goes to ${dest}"` : act === "alt" ? ` aria-label="Description, missing"` : "";
    return `<button class="tb-btn${cls}" data-act="${act}"${aria}>${label}${d}</button>`;
  }).join("") + `<button class="tb-btn icon-only" data-act="more" aria-label="More ${k.label.toLowerCase()} actions" aria-haspopup="menu"><svg class="icon"><use href="#i-more"/></svg></button>`;
}

// ---------- selection and editing ----------
function select(t, how) {
  if (state.editing && t !== state.sel) finishEditing(true);
  closeSurface();
  state.sel = t; state.hover = null; state.seenHint = true;
  lastDockKey = "";
  render();
  if (how === "keyboard") ensureVisible(t);
}
function deselect() { if (state.editing) finishEditing(true); state.sel = null; render(); }
function ensureVisible(t) {
  const v = viewRect(t), box = canvasBox();
  if (v.top < box.top + 40 || v.bottom > box.bottom - 80) scroller.scrollBy({ top: v.top - box.top - 120, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}
function startEditing() {
  if (!state.sel || state.sel === "image") return;
  closeSurface();
  state.editing = true; state.typed = false; state.bold = false; state.italic = false;
  render();
  announce(`Editing ${KINDS[state.sel].label.toLowerCase()}. Enter or Done finishes. Escape keeps your text.`);
}
function finishEditing(commit) {
  if (!state.editing) return;
  const t = state.sel;
  state.editing = false;
  closeSurface();
  if (commit) {
    queueSave(t, `${KINDS[t].label} text`, "Edited");
  }
  render();
}
let failNext = false;
function queueSave(t, what, how) {
  state.saves[t] = "pending";
  setTimeout(() => { if (state.saves[t] === "pending") { state.saves[t] = "saving"; render(); } }, 400);
  setTimeout(() => {
    if (failNext) { failNext = false; state.saves[t] = "error"; announce(`${KINDS[t].label} not saved. Try again.`); render(); return; }
    state.saves[t] = "saved";
    if (!state.pub.changes.some((c) => c.what === what)) state.pub.changes.unshift({ page: PAGES.find((p) => p.id === state.page).label, what, how });
    state.pub.redo = []; state.pub.justNow = false; state.pub.older = false;
    announce(`${KINDS[t].label} saved.`);
    render();
  }, 1100);
}

// ---------- surfaces ----------
const SURFACES = { pages: "#p-pages", publish: "#p-publish", replace: "#p-replace", link: "#p-link", style: "#p-style", more: "#p-more", tmore: "#p-tmore", pagemenu: "#p-pagemenu", palette: "#p-palette" };

function openSurface(name, opener, build) {
  if (state.surface === name) { closeSurface(); return; }
  closeSurface(true);
  state.surface = name; state.opener = opener || document.activeElement;
  if (name === "settings") { openSettings(); render(); return; }
  const el = $(SURFACES[name]);
  if (build) build(el);
  el.hidden = false;
  positionSurface(name, el, opener);
  render();
  const first = el.querySelector("input, select, [role=menuitem], button:not([data-close])");
  if (first) first.focus({ preventScroll: true });
}
function closeSurface(quiet) {
  if (!state.surface) return;
  const name = state.surface;
  if (name === "settings") { const d = $("#settings"); if (d.open) d.close(); }
  else $(SURFACES[name]).hidden = true;
  if (name === "pagemenu") { $$(".rowmore[aria-expanded=true]").forEach((b) => b.setAttribute("aria-expanded", "false")); state.surface = "pages"; render(); return; }
  state.surface = null;
  const op = state.opener; state.opener = null;
  if (!quiet && op && document.contains(op)) op.focus({ preventScroll: true });
  if (!quiet) render();
}

function positionSurface(name, el, opener) {
  if (name === "palette") { el.style.left = (innerWidth - el.offsetWidth) / 2 + "px"; el.style.top = Math.round(innerHeight * 0.16) + "px"; return; }
  if (isBarLayout() && el.classList.contains("sheetable")) return; // CSS bottom sheet
  const island = opener.closest(".island");
  const r0 = opener.getBoundingClientRect(), ri = island ? island.getBoundingClientRect() : r0;
  const r = { left: r0.left, right: r0.right, width: r0.width, top: r0.top, bottom: Math.max(r0.bottom, ri.bottom + 4) };
  const w = el.offsetWidth, h = el.offsetHeight;
  let left, top;
  if (name === "publish") left = r.right - w + 4;
  else if (name === "pages" || name === "tmore") left = name === "pages" ? $("#nav-cap").getBoundingClientRect().left : r.right - w;
  else if (name === "pagemenu") { left = r.right + 8; top = r.top - 6; }
  else left = r.left + r.width / 2 - w / 2;
  const fromDock = opener.closest("#dock");
  if (fromDock && state.sel && top === undefined) {
    const v = viewRect(state.sel), below = r.bottom + 10, above = r.top - h - 10;
    if (state.dockSide !== "above" && below + h <= innerHeight - 8) top = below;
    else if (state.dockSide === "above" && above >= 8) top = above;
    else if (innerWidth - v.right - 16 >= w + 8) { left = v.right + 16; top = clamp(v.top, 60, innerHeight - h - 8); }
    else if (v.left - 16 - w >= 8) { left = v.left - 16 - w; top = clamp(v.top, 60, innerHeight - h - 8); }
  }
  if (top === undefined) {
    const awayAbove = fromDock && state.dockSide === "above";
    top = awayAbove ? r.top - h - 12 : r.bottom + 10;
    if (top + h > innerHeight - 8) top = r.top - h - 10;
    if (top < 8) top = 8;
  }
  if (name === "pagemenu" && left + w > innerWidth - 8) left = r.left - w - 8;
  el.style.left = clamp(left, 8, innerWidth - w - 8) + "px";
  el.style.top = clamp(top, 8, innerHeight - h - 8) + "px";
  el.style.setProperty("--ox", `${clamp(r.left + r.width / 2 - parseFloat(el.style.left), 0, w)}px`);
  el.style.setProperty("--oy", top < r.top ? "100%" : "0");
}

// Page switcher
function buildPages(el, q = "") {
  const rows = $("#page-rows");
  const list = PAGES.filter((p) => (p.label + p.path + p.note).toLowerCase().includes(q.toLowerCase()));
  rows.innerHTML = list.map((p, i) => `
    <div class="row${p.id === state.page ? " current" : ""}${i === 0 ? " active" : ""}" role="option" aria-selected="${p.id === state.page}" data-page="${p.id}" tabindex="-1">
      <svg class="icon icon-16 check"><use href="#i-check"/></svg>
      <span class="grow"><span class="name">${p.label}</span><span class="meta">${p.path} · ${p.note}</span></span>
      <button class="tb-btn icon-only sm rowmore" data-pagemenu="${p.id}" aria-label="${p.label} page actions" aria-haspopup="menu" aria-expanded="false"><svg class="icon icon-16"><use href="#i-more"/></svg></button>
    </div>`).join("") || `<p class="note">No page matches “${q}”.</p>`;
}
function switchPage(id) {
  closeSurface(true);
  state.page = id; state.sel = null; state.editing = false;
  const top = id === "home" ? 0 : geo().site[id] * state.zoom;
  scroller.scrollTo({ top, behavior: "auto" });
  render();
  toast(id === "home" ? "Opened Home" : `Opened ${PAGES.find((p) => p.id === id).label}. The prototype scrolls to that part of the one-page site.`);
  $("#b-page").focus({ preventScroll: true });
}
function buildPageMenu(el, id) {
  const home = id === "home";
  el.innerHTML = `
    ${home ? "" : `<button role="menuitem" data-pm="rename" data-id="${id}">Rename</button>`}
    <button role="menuitem" data-pm="duplicate" data-id="${id}">Duplicate</button>
    <button role="menuitem" data-pm="settings" data-id="${id}">Page settings…</button>
    ${home ? "" : `<hr><button role="menuitem" class="danger" data-pm="delete" data-id="${id}">Delete page…</button>`}`;
}

// Publish surface, with version history inside it (decision 15)
function buildPublish(el) {
  const p = state.pub, n = p.changes.length;
  let head;
  if (p.phase === "done") {
    head = `<div class="pub-state"><span class="done-check"><svg class="icon"><use href="#i-check"/></svg></span><h3 id="pub-title">Published. Visitors now see version ${p.live}.</h3><p>Your website is up to date.</p></div>
      <a class="addr" href="${SITE_ORIGIN}/" target="_blank" rel="noopener">agency.pagehaven.site<svg class="icon"><use href="#i-ext"/></svg></a>
      <button class="btn-quiet btn-block" data-pub="view">View website</button>`;
  } else if (n === 0 && !p.older) {
    head = `<div class="pub-state"><h3 id="pub-title">Everything is published.</h3><p>Visitors see version ${p.live}.</p></div>
      <a class="addr" href="${SITE_ORIGIN}/" target="_blank" rel="noopener">agency.pagehaven.site<svg class="icon"><use href="#i-ext"/></svg></a>`;
  } else {
    const lead = p.older ? `Visitors see version ${p.live} · your editor is newer` : `${n} change${n > 1 ? "s" : ""} since version ${p.live}`;
    head = `<div class="pub-state"><h3 id="pub-title">${lead}</h3><p>Publishing puts these on agency.pagehaven.site for everyone.</p></div>
      <ul class="changes">${p.changes.map((c) => `<li><span>${c.what}</span><span>${c.how} · ${c.page}</span></li>`).join("")}</ul>
      <a class="addr" href="${SITE_ORIGIN}/" target="_blank" rel="noopener">agency.pagehaven.site<svg class="icon"><use href="#i-ext"/></svg></a>
      <button class="btn-publish btn-block" data-pub="go" ${p.phase === "publishing" ? 'aria-busy="true"' : ""}>${p.phase === "publishing" ? "Publishing…" : p.older ? "Publish my latest changes" : `Publish ${n} change${n > 1 ? "s" : ""}`}</button>`;
  }
  const rows = state.versions.slice(0, 5).map((v) => `
    <div class="vrow"><span class="grow"><span>Version ${v.n}</span><span class="meta">${v.date}</span></span>
    ${v.n === p.live ? `<span class="live-tag">Live</span>` : `<button class="tb-btn" data-restore="${v.n}">Make live</button>`}</div>`).join("");
  el.innerHTML = `${head}
    <div class="versions-head"><h4>Versions</h4><button class="link-btn" data-pub="all">All versions</button></div>
    ${rows}`;
}
function publish() {
  const p = state.pub;
  if (p.phase === "publishing") return;
  p.phase = "publishing"; render(); if (state.surface === "publish") buildPublish($("#p-publish"));
  setTimeout(() => {
    const n = state.versions[0].n + 1;
    state.versions.unshift({ n, date: "20 Oct 2026, just now" });
    p.live = n; p.changes = []; p.redo = []; p.older = false; p.phase = "done"; p.justNow = true;
    announce(`Published. Visitors now see version ${n}.`);
    if (state.surface === "publish") buildPublish($("#p-publish")); else toast(`Published. Visitors now see version ${n}.`);
    render();
    setTimeout(() => { p.justNow = false; if (p.phase === "done") p.phase = "idle"; render(); }, 4000);
  }, 1200);
}
function askRestore(n) {
  const d = $("#confirm");
  const v = state.versions.find((x) => x.n === n);
  $("#cf-title").textContent = `Make version ${n} live?`;
  $("#cf-body").textContent = `Visitors will see version ${n} from ${v.date.split(",")[0]}. Your editor keeps your latest changes, so you can publish them again at any time.`;
  $("#cf-ok").textContent = `Make version ${n} live`;
  $("#cf-ok").dataset.n = n;
  d.showModal();
}

// Replace popover
function buildReplace() {
  const t = $("#rep-thumbs");
  if (!t.childElementCount) t.innerHTML = [1, 2, 3, 4, 5, 6].map((i) => `<button aria-label="portfolio/${i}.jpg${i === 1 ? ", the selected picture" : ""}" ${i === 1 ? 'aria-current="true"' : ""} style="background-image:url(${SITE_ORIGIN}/assets/img/portfolio/${i}.jpg)"></button>`).join("");
}

// More menus
function buildMore(el) {
  const t = state.sel;
  if (state.editing) { el.innerHTML = `<button role="menuitem" data-mm="undotyping">Undo typing</button>`; return; }
  const sec = `<button role="menuitem" data-mm="selectsection">Select section</button>
    <button role="menuitem" data-mm="sim">Move section down <kbd>⌥⇧↓</kbd></button>
    <button role="menuitem" data-mm="sim">Duplicate section</button>
    <button role="menuitem" data-mm="sim">Hide section on website</button>
    <hr><button role="menuitem" class="danger" data-mm="sim">Remove section</button>`;
  const head = t === "image" ? `<button role="menuitem" data-mm="sim">Show whole picture</button><hr>` : t === "button" ? `<button role="menuitem" data-mm="replacephoto">Replace banner photo</button><hr>` : `<button role="menuitem" data-mm="replacephoto">Replace banner photo</button><hr>`;
  el.innerHTML = head + sec;
}
function buildToolsMore(el) {
  const l = body.dataset.l;
  el.innerHTML = `
    ${l === "phone" ? "" : ""}
    <button role="menuitem" data-tm="zoom">Zoom: ${Math.round(state.zoom * 100)}% <kbd>Fit</kbd></button>
    <button role="menuitem" data-tm="focus">Focus mode <kbd>${MOD}.</kbd></button>
    ${l === "phone" ? `<hr><button role="menuitem" data-tm="settings">Website settings</button><button role="menuitem" data-tm="sites">All websites</button>` : ""}
    <hr><button role="menuitem" data-tm="palette">All commands <kbd>${MOD}K</kbd></button>`;
}

// Settings sheet (Level 3, modal)
const SETTINGS = {
  general: ["General", () => `
    <h3>General</h3><p class="lead">Your website’s name and address.</p>
    <div class="field"><label for="s-name">Website name</label><div class="input"><input id="s-name" value="Agency"></div></div>
    <div class="field"><label for="s-slug">Web address</label><div class="input"><input id="s-slug" value="agency" pattern="[a-z0-9\\-]{3,32}"><span class="suffix">.pagehaven.site</span></div>
      <span class="hint">Takes effect at once. Not part of Undo.</span>
      <div class="field-row"><button class="btn-sm">Save</button><a class="addr" style="margin:0 0 0 8px" href="${SITE_ORIGIN}/" target="_blank" rel="noopener">View website<svg class="icon"><use href="#i-ext"/></svg></a></div></div>
    <div class="field"><span class="label">Keyboard shortcuts</span><div class="kbd-list">
      <kbd>${MOD}K</kbd><span>All commands</span><kbd>Enter</kbd><span>Edit the selected part</span><kbd>Esc</kbd><span>Close, stop editing, then deselect</span>
      <kbd>${MOD}Z</kbd><span>Undo</span><kbd>${MOD}.</kbd><span>Focus mode</span><kbd>⇧${MOD}P</kbd><span>Publish</span><kbd>F6</kbd><span>Move between the islands, the canvas and the dock</span></div></div>`],
  pages: ["Pages", () => `
    <h3>Pages</h3><p class="lead">The same list as the page switcher, top left.</p>
    <div class="set-rows">${PAGES.map((p) => `<div class="set-row"><span class="grow"><span>${p.label}</span><span class="meta">${p.path} · ${p.note}</span></span>${p.id === "home" ? "" : `<button class="btn-sm ghost">Rename</button>`}<button class="btn-sm ghost" data-open-page="${p.id}">Open</button></div>`).join("")}</div>
    <div class="field" style="border:0"><div class="field-row"><button class="btn-sm">Add a page…</button></div></div>`],
  assets: ["Assets", () => `
    <h3>Assets</h3><p class="lead">Pictures your website uses. Choose one on this page to select it in the editor.</p>
    <div class="set-rows">${[1, 2, 3, 4].map((i) => `<div class="set-row"><img alt="" src="${SITE_ORIGIN}/assets/img/portfolio/${i}.jpg"><span class="grow"><span>portfolio/${i}.jpg</span><span class="meta">${[48, 61, 39, 55][i - 1]} KB · used on Home</span></span><button class="btn-sm ghost" data-select-image>Select on page</button></div>`).join("")}</div>
    <p class="hint" style="margin-top:12px">Also used: 3 fonts, 2 style sheets, 1 script.</p>`],
  domains: ["Domains", () => `
    <h3>Domains</h3><p class="lead">Use an address you own, such as agency.com, as well as agency.pagehaven.site.</p>
    <div class="field"><label for="s-dom">Your domain</label><div class="field-row"><div class="input" style="flex:1"><input id="s-dom" placeholder="example.com"></div><button class="btn-sm">Add domain</button></div>
    <span class="hint">We’ll show the two DNS records to add at your registrar, then check them for you.</span></div>`],
  publishing: ["Publishing", () => `
    <h3>Publishing</h3><p class="lead">What visitors see right now.</p>
    <div class="set-rows"><div class="set-row"><span class="grow"><span>agency.pagehaven.site</span><span class="meta">Version ${state.pub.live} is live</span></span><span class="live-tag">Live</span></div>
    <div class="set-row"><span class="grow"><span>${state.pub.changes.length} unpublished change${state.pub.changes.length === 1 ? "" : "s"}</span><span class="meta">Publish from the button at the top right</span></span>${state.pub.changes.length ? `<button class="btn-sm" data-settings-publish>Publish…</button>` : ""}</div></div>`],
  versions: ["Versions", () => `
    <h3>Versions</h3><p class="lead">Every time you publish, Pagehaven keeps a version you can bring back.</p>
    <div class="set-rows">${state.versions.map((v) => `<div class="set-row"><span class="grow"><span>Version ${v.n}</span><span class="meta">${v.date}</span></span>${v.n === state.pub.live ? `<span class="live-tag">Live</span>` : `<button class="btn-sm ghost" data-restore="${v.n}">Make this version live</button><button class="btn-sm ghost">Open in editor</button>`}</div>`).join("")}</div>`],
};
function openSettings(section) {
  if (section) state.settingsSection = section;
  const d = $("#settings");
  renderSettings();
  if (!d.open) d.showModal();
  $(`.sections [data-sec=${state.settingsSection}]`).focus();
}
function renderSettings() {
  $(".sections").innerHTML = Object.entries(SETTINGS).map(([id, [label]]) => `<button role="tab" id="tab-${id}" data-sec="${id}" aria-selected="${id === state.settingsSection}" aria-controls="set-panel" tabindex="${id === state.settingsSection ? 0 : -1}">${label}</button>`).join("");
  $("#set-panel").innerHTML = SETTINGS[state.settingsSection][1]();
  $("#set-panel").setAttribute("aria-labelledby", "tab-" + state.settingsSection);
}

// Palette
function commands() {
  const c = [];
  const sel = state.sel;
  PAGES.forEach((p) => c.push({ g: "Pages", label: `Go to ${p.label}`, where: "Top left", run: () => switchPage(p.id) }));
  c.push({ g: "Pages", label: "Add a page…", where: "Top left", run: () => toast("Add a page opens the page dialog. Not built in this prototype.") });
  if (sel) KINDS[sel].actions.forEach(([act, label]) => c.push({ g: "Selection", label: `${label} (${KINDS[sel].label.toLowerCase()})`, where: "Dock", run: () => dockAct(act, $(`#dock [data-act=${act}]`)) }));
  c.push({ g: "Selection", label: "Select main heading", where: "Canvas", run: () => select("heading", "keyboard") });
  c.push({ g: "Selection", label: "Select button: Tell Me More", where: "Canvas", run: () => select("button", "keyboard") });
  c.push({ g: "Selection", label: "Select picture: portfolio/1.jpg", where: "Canvas", run: () => select("image", "keyboard") });
  Object.entries(SETTINGS).forEach(([id, [label]]) => c.push({ g: "Website", label: `Settings: ${label}`, where: "Top left, gear", run: () => { state.settingsSection = id; openSurface("settings", $("#b-settings")); } }));
  c.push({ g: "Publishing", label: "Publish…", where: "Top right", keys: `⇧${MOD}P`, run: () => openSurface("publish", $("#b-publish"), buildPublish) });
  c.push({ g: "Publishing", label: "Version history", where: "Top right, Publish", run: () => openSurface("publish", $("#b-publish"), buildPublish) });
  c.push({ g: "Publishing", label: "View website", where: "Publish", run: () => open(SITE_ORIGIN + "/", "_blank") });
  c.push({ g: "View", label: state.mode === "edit" ? "Preview" : "Edit", where: "Top centre", run: () => setMode(state.mode === "edit" ? "preview" : "edit") });
  c.push({ g: "View", label: state.device === "computer" ? "Phone view" : "Computer view", where: "Top centre", run: () => setDevice(state.device === "computer" ? "phone" : "computer") });
  c.push({ g: "View", label: "Focus mode", where: "Top centre", keys: `${MOD}.`, run: () => setFocus(true) });
  c.push({ g: "Prototype", label: body.classList.contains("top-over") ? "Start the canvas under the band" : "Float the islands over the site (no band)", where: "Variant switch", run: () => { body.classList.toggle("top-over"); requestAnimationFrame(render); } });
  c.push({ g: "Prototype", label: "Make the next save fail", where: "Error state", run: () => { failNext = true; toast("The next save will fail."); } });
  return c;
}
let palIndex = 0, palItems = [];
function buildPalette(el, q = "") {
  palItems = commands().filter((c) => (c.g + " " + c.label).toLowerCase().includes(q.toLowerCase()));
  palIndex = clamp(palIndex, 0, Math.max(0, palItems.length - 1));
  let g = "";
  $("#pal-list").innerHTML = palItems.map((c, i) => {
    const h = c.g !== g ? `<div class="gl" role="presentation">${(g = c.g)}</div>` : "";
    return `${h}<div class="row${i === palIndex ? " active" : ""}" role="option" id="pal-${i}" aria-selected="${i === palIndex}" data-i="${i}"><span class="grow">${c.label}</span>${c.keys ? `<kbd>${c.keys}</kbd>` : ""}<span class="where">${c.where}</span></div>`;
  }).join("") || `<p class="note">No command matches.</p>`;
  $("#pal-q").setAttribute("aria-activedescendant", palItems.length ? `pal-${palIndex}` : "");
  const a = $("#pal-list .row.active"); if (a) a.scrollIntoView({ block: "nearest" });
}
function runPalette(i) { const c = palItems[i]; if (!c) return; closeSurface(true); render(); c.run(); }

// ---------- modes ----------
function setMode(m) {
  if (state.editing) finishEditing(true);
  closeSurface(true);
  state.mode = m; state.hover = null; render();
  if (m === "preview") toast("Previewing. Links and buttons work as visitors see them.");
}
function setDevice(d) {
  const t = state.sel;
  state.device = d; render();
  if (t) { state.sel = t; requestAnimationFrame(() => { ensureVisible(t); render(); }); } // keeps the selection (baseline fix)
}
let pillTimer;
function setFocus(on) {
  if (on) { closeSurface(true); if (state.editing) finishEditing(true); state.prevMode = state.mode; state.mode = "preview"; state.focus = true; }
  else { state.focus = false; state.mode = state.prevMode || "edit"; }
  render();
  requestAnimationFrame(render);
  if (on) { $("#focus-pill").focus({ preventScroll: true }); idlePill(); announce("Focus mode. Escape returns to editing."); }
  else $("#b-focus").focus({ preventScroll: true });
}
function idlePill() { const p = $("#focus-pill"); p.classList.remove("idle"); clearTimeout(pillTimer); pillTimer = setTimeout(() => p.classList.add("idle"), 3000); }
function cycleZoom() { state.zoom = state.zoom === 1 ? 0.75 : state.zoom === 0.75 ? 0.5 : 1; render(); requestAnimationFrame(render); }
function undo() {
  const c = state.pub.changes.shift(); if (!c) return;
  state.pub.redo.unshift(c); render(); toast(`Undid: ${c.what}`, "Redo", redo);
}
function redo() { const c = state.pub.redo.shift(); if (!c) return; state.pub.changes.unshift(c); render(); toast(`Redid: ${c.what}`); }

// ---------- dock actions ----------
function dockAct(act, btn) {
  switch (act) {
    case "edit": return startEditing();
    case "done": return finishEditing(true);
    case "bold": state.bold = !state.bold; lastDockKey = ""; return render();
    case "italic": state.italic = !state.italic; lastDockKey = ""; return render();
    case "style": return openSurface("style", btn);
    case "link": return openSurface("link", btn);
    case "replace": return openSurface("replace", btn, buildReplace);
    case "alt": openSurface("replace", btn, buildReplace); return $("#rep-alt").focus();
    case "more": return openSurface("more", btn, buildMore);
    case "retry": state.saves[state.sel] = "pending"; return queueSave(state.sel, `${KINDS[state.sel].label} text`, "Edited");
  }
}

// ---------- feedback ----------
let toastTimer;
function toast(msg, action, fn) {
  const t = $("#toast");
  t.innerHTML = ""; t.append(msg);
  if (action) { const b = document.createElement("button"); b.textContent = action; b.onclick = () => { t.hidden = true; fn(); }; t.append(b); }
  t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 3200);
}
const live = Object.assign(document.createElement("div"), { className: "sr" });
live.setAttribute("aria-live", "polite"); live.style.cssText = "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)";
document.body.append(live);
function announce(s) { live.textContent = ""; setTimeout(() => (live.textContent = s), 30); }

// ---------- events ----------
function hitTest(e) {
  const s = stage.getBoundingClientRect(), z = state.zoom;
  const x = (e.clientX - s.left) / z, y = (e.clientY - s.top) / z;
  return ORDER.find((t) => { const r = docRect(t); return x >= r.x - 4 && x <= r.x + r.w + 4 && y >= r.y - 4 && y <= r.y + r.h + 4; }) || null;
}
hit.addEventListener("pointermove", (e) => {
  if (e.pointerType !== "mouse") return;
  const t = hitTest(e);
  if (t !== state.hover) { state.hover = t; renderSelection(); }
});
hit.addEventListener("pointerleave", () => { state.hover = null; renderSelection(); });
let lastClick = { t: null, at: 0 };
hit.addEventListener("click", (e) => {
  const t = hitTest(e);
  if (!t) {
    if (state.surface) return closeSurface();
    deselect();
    if (!state.protoNote) { state.protoNote = true; toast("In this prototype, the heading, the Tell Me More button and the first portfolio picture can be selected."); }
    return;
  }
  const now = performance.now();
  if (t === state.sel && t !== "image" && !state.editing && (now - lastClick.at < 500 || !$("#dock").hidden)) { startEditing(); }
  else if (t !== state.sel) select(t, "pointer");
  lastClick = { t, at: now };
});
hit.addEventListener("keydown", (e) => {
  if (state.editing) return;
  const i = ORDER.indexOf(state.sel);
  if (["ArrowDown", "ArrowRight"].includes(e.key)) { e.preventDefault(); select(ORDER[(i + 1) % ORDER.length], "keyboard"); }
  else if (["ArrowUp", "ArrowLeft"].includes(e.key)) { e.preventDefault(); select(ORDER[(i - 1 + ORDER.length) % ORDER.length], "keyboard"); }
  else if (e.key === "Enter" && state.sel) { e.preventDefault(); e.stopPropagation(); dockAct(KINDS[state.sel].actions[0][0], $("#dock .tb-btn")); }
});

$("#chip").addEventListener("click", (e) => { if (e.target.closest("[data-act=retry]")) dockAct("retry"); });
$("#dock").addEventListener("click", (e) => { const b = e.target.closest("[data-act]"); if (b) dockAct(b.dataset.act, b); });
$("#offscreen").addEventListener("click", () => ensureVisible(state.sel));

$("#b-page").addEventListener("click", (e) => openSurface("pages", e.currentTarget, (el) => { $("#page-q").value = ""; buildPages(el); }));
$("#b-site").addEventListener("click", (e) => openSurface("settings", e.currentTarget));
$("#b-settings").addEventListener("click", (e) => openSurface("settings", e.currentTarget));
$("#b-back").addEventListener("click", () => toast("Goes back to your websites."));
$("#b-publish").addEventListener("click", (e) => openSurface("publish", e.currentTarget, buildPublish));
$("#b-status").addEventListener("click", () => openSurface("publish", $("#b-publish"), buildPublish));
$("#b-undo").addEventListener("click", undo);
$("#b-redo").addEventListener("click", redo);
$("#b-zoom").addEventListener("click", cycleZoom);
$("#b-focus").addEventListener("click", () => setFocus(true));
$("#b-tmore").addEventListener("click", (e) => openSurface("tmore", e.currentTarget, buildToolsMore));
$("#focus-pill").addEventListener("click", () => setFocus(false));
$("#seg-mode").addEventListener("click", (e) => { const b = e.target.closest("[data-mode]"); if (b) setMode(b.dataset.mode); });
$("#seg-device").addEventListener("click", (e) => { const b = e.target.closest("[data-device]"); if (b) setDevice(b.dataset.device); });

$("#page-q").addEventListener("input", (e) => buildPages($("#p-pages"), e.target.value));
$("#p-pages").addEventListener("keydown", (e) => {
  const rows = $$("#page-rows .row"); let i = rows.findIndex((r) => r.classList.contains("active"));
  if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); i = clamp(i + (e.key === "ArrowDown" ? 1 : -1), 0, rows.length - 1); rows.forEach((r, j) => r.classList.toggle("active", j === i)); rows[i].focus(); }
  else if (e.key === "Enter" && !e.target.closest(".rowmore, #b-addpage") && rows[i]) { e.preventDefault(); switchPage(rows[i].dataset.page); }
});
$("#page-rows").addEventListener("click", (e) => {
  const m = e.target.closest("[data-pagemenu]");
  if (m) { e.stopPropagation(); const el = $("#p-pagemenu"); buildPageMenu(el, m.dataset.pagemenu); el.hidden = false; m.setAttribute("aria-expanded", "true"); state.surface = "pagemenu"; positionSurface("pagemenu", el, m); el.querySelector("button").focus(); return; }
  const r = e.target.closest("[data-page]"); if (r) switchPage(r.dataset.page);
});
$("#p-pagemenu").addEventListener("click", (e) => {
  const b = e.target.closest("[data-pm]"); if (!b) return;
  const p = PAGES.find((x) => x.id === b.dataset.id);
  closeSurface(true); // back to the switcher
  if (b.dataset.pm === "rename") {
    const name = $(`#page-rows [data-page=${p.id}] .name`);
    const input = Object.assign(document.createElement("input"), { value: p.label, className: "rename" });
    input.setAttribute("aria-label", "Page name"); name.replaceWith(input); input.select();
    const done = () => { p.label = input.value.trim() || p.label; buildPages($("#p-pages")); render(); toast(`Renamed to ${p.label}`, "Undo", () => {}); };
    input.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); ev.stopPropagation(); done(); } });
    input.addEventListener("blur", done, { once: true });
  } else if (b.dataset.pm === "settings") toast(`Page settings for ${p.label}: title and description, in a popover from the capsule.`);
  else toast(`${b.textContent.trim()} ${p.label}: not simulated in this prototype.`);
});
$("#b-addpage").addEventListener("click", () => { closeSurface(); toast("Add a page opens the page dialog, starting from a copy of this page."); });

$("#p-publish").addEventListener("click", (e) => {
  const r = e.target.closest("[data-restore]"); if (r) return askRestore(+r.dataset.restore);
  const b = e.target.closest("[data-pub]"); if (!b) return;
  if (b.dataset.pub === "go") publish();
  if (b.dataset.pub === "all") { closeSurface(true); state.surface = "settings"; state.opener = $("#b-publish"); openSettings("versions"); render(); }
  if (b.dataset.pub === "view") open(SITE_ORIGIN + "/", "_blank");
});
$("#confirm").addEventListener("click", (e) => {
  if (e.target.closest("[data-close]")) $("#confirm").close();
  if (e.target.closest("#cf-ok")) {
    const n = +e.target.closest("#cf-ok").dataset.n;
    state.pub.live = n; state.pub.older = n < state.versions[0].n || state.pub.changes.length > 0; state.pub.older = true;
    $("#confirm").close(); announce(`Version ${n} is live.`);
    if (state.surface === "publish") buildPublish($("#p-publish"));
    if (state.surface === "settings") renderSettings();
    render(); toast(`Visitors now see version ${n}.`);
  }
});
$("#p-replace").addEventListener("click", (e) => {
  if (e.target.closest("#b-upload")) { closeSurface(); queueSave("image", "Portfolio picture 1", "Replaced"); toast("Uploading portfolio-new.jpg… then the picture updates in place."); }
  const th = e.target.closest(".thumbs button"); if (th) toast("Choosing a picture on this page selects it. Upload replaces this one.");
});
$("#p-more").addEventListener("click", (e) => {
  const b = e.target.closest("[data-mm]"); if (!b) return;
  closeSurface();
  if (b.dataset.mm === "undotyping") { state.editing = false; render(); toast("Typing undone."); }
  else if (b.dataset.mm === "replacephoto") toast("Replace banner photo opens the same picture browser.");
  else toast("Section actions are listed here; not simulated in this prototype.");
});
$("#p-tmore").addEventListener("click", (e) => {
  const b = e.target.closest("[data-tm]"); if (!b) return;
  closeSurface(true);
  ({ zoom: cycleZoom, focus: () => setFocus(true), settings: () => openSurface("settings", $("#b-settings")), sites: () => toast("Goes back to your websites."), palette: () => openSurface("palette", $("#b-tmore"), (el) => { palIndex = 0; $("#pal-q").value = ""; buildPalette(el); }) })[b.dataset.tm]();
  render();
});
$$(".pop [data-close]").forEach((b) => b.addEventListener("click", () => closeSurface()));

$("#pal-q").addEventListener("input", (e) => { palIndex = 0; buildPalette($("#p-palette"), e.target.value); });
$("#pal-q").addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); palIndex = clamp(palIndex + (e.key === "ArrowDown" ? 1 : -1), 0, palItems.length - 1); buildPalette($("#p-palette"), e.target.value); }
  if (e.key === "Enter") { e.preventDefault(); runPalette(palIndex); }
});
$("#pal-list").addEventListener("click", (e) => { const r = e.target.closest("[data-i]"); if (r) runPalette(+r.dataset.i); });

const settings = $("#settings");
settings.addEventListener("close", () => { if (state.surface === "settings") { state.surface = null; const op = state.opener; state.opener = null; render(); if (op) op.focus({ preventScroll: true }); } });
settings.addEventListener("click", (e) => {
  if (e.target === settings) return settings.close();
  if (e.target.closest("[data-close]")) return settings.close();
  const s = e.target.closest("[data-sec]"); if (s) { state.settingsSection = s.dataset.sec; renderSettings(); $(`.sections [data-sec=${s.dataset.sec}]`).focus(); return; }
  const r = e.target.closest("[data-restore]"); if (r) return askRestore(+r.dataset.restore);
  if (e.target.closest("[data-open-page]")) { settings.close(); switchPage(e.target.closest("[data-open-page]").dataset.openPage); }
  if (e.target.closest("[data-select-image]")) { settings.close(); select("image", "keyboard"); }
  if (e.target.closest("[data-settings-publish]")) { settings.close(); openSurface("publish", $("#b-publish"), buildPublish); }
});
$(".sections").addEventListener("keydown", (e) => {
  const ids = Object.keys(SETTINGS); let i = ids.indexOf(state.settingsSection);
  const vert = body.dataset.l !== "phone";
  const next = vert ? "ArrowDown" : "ArrowRight", prev = vert ? "ArrowUp" : "ArrowLeft";
  if (e.key !== next && e.key !== prev) return;
  e.preventDefault(); i = (i + (e.key === next ? 1 : -1) + ids.length) % ids.length;
  state.settingsSection = ids[i]; renderSettings(); $(`.sections [data-sec=${ids[i]}]`).focus();
});

// Outside click closes the open popover; switching popovers is one click (Apple: one at a time).
document.addEventListener("pointerdown", (e) => {
  const s = state.surface;
  if (!s || s === "settings" || s === "palette" && e.target.closest("#p-palette")) return;
  if (e.target.closest("dialog")) return;
  const el = $(SURFACES[s]);
  if (el.contains(e.target) || (s === "pagemenu" && $("#p-pages").contains(e.target))) return;
  if (state.opener && state.opener.contains(e.target)) return;
  if (e.target.closest("#dock") && !["more", "style", "link", "replace"].includes(s)) return;
  if (s === "pagemenu") { closeSurface(true); state.surface = null; $("#p-pages").hidden = true; render(); return; }
  closeSurface(true); render();
}, true);

// Global keys
const F6_ORDER = () => [$("#b-back"), $("#b-undo"), $("#b-publish"), hit, $("#dock .tb-btn")].filter((el) => el && el.offsetParent !== null);
document.addEventListener("keydown", (e) => {
  const mod = e.metaKey || e.ctrlKey;
  const inField = e.target.matches("input, select, textarea");
  if (mod && e.key.toLowerCase() === "k") {
    e.preventDefault();
    if (state.editing) return; // inside a text session the frame owns the keys
    return openSurface("palette", document.activeElement, (el) => { palIndex = 0; $("#pal-q").value = ""; buildPalette(el); });
  }
  if (mod && e.key === ".") { e.preventDefault(); return setFocus(!state.focus); }
  if (mod && e.shiftKey && e.key.toLowerCase() === "p") { e.preventDefault(); return openSurface("publish", $("#b-publish"), buildPublish); }
  if (e.key === "Escape") {
    if ($("#confirm").open || settings.open) return; // dialogs close themselves
    e.preventDefault();
    if (state.surface) return closeSurface();
    if (state.focus) return setFocus(false);
    if (state.editing) return finishEditing(true); // Escape keeps the text (decision 5)
    if (state.sel) { deselect(); hit.focus({ preventScroll: true }); return; }
    return;
  }
  if (e.key === "F6") {
    e.preventDefault();
    const order = F6_ORDER(); const i = order.findIndex((el) => el.contains(document.activeElement) || el.parentElement?.contains(document.activeElement));
    const n = order[(i + (e.shiftKey ? -1 : 1) + order.length) % order.length]; if (n) n.focus();
    return;
  }
  if (state.editing && !inField) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); return finishEditing(true); }
    if (mod && e.key.toLowerCase() === "b") { e.preventDefault(); return dockAct("bold"); }
    if (mod && e.key.toLowerCase() === "i") { e.preventDefault(); return dockAct("italic"); }
    if (e.key.length === 1 && !mod) { state.typed = true; renderSelection(); }
    return;
  }
  if (mod && e.key.toLowerCase() === "z" && !inField) { e.preventDefault(); return e.shiftKey ? redo() : undo(); }
  if (mod && e.key.toLowerCase() === "s") { e.preventDefault(); return toast("Everything saves automatically."); }
});
document.addEventListener("pointermove", () => { if (state.focus) idlePill(); });

// Tooltips on hover and keyboard focus
let tipTimer;
function showTip(el) {
  const t = $("#tooltip"), r = el.getBoundingClientRect();
  t.textContent = el.dataset.tip; t.hidden = false;
  const below = r.bottom + 8 + t.offsetHeight < innerHeight - 70 || r.top < 80;
  t.style.left = clamp(r.left + r.width / 2 - t.offsetWidth / 2, 8, innerWidth - t.offsetWidth - 8) + "px";
  t.style.top = (below ? r.bottom + 8 : r.top - t.offsetHeight - 8) + "px";
}
document.addEventListener("pointerover", (e) => { const el = e.target.closest("[data-tip]"); clearTimeout(tipTimer); $("#tooltip").hidden = true; if (el && e.pointerType === "mouse") tipTimer = setTimeout(() => showTip(el), 450); });
document.addEventListener("focusin", (e) => { const el = e.target.closest("[data-tip]"); $("#tooltip").hidden = true; if (el && el.matches(":focus-visible")) showTip(el); });
document.addEventListener("pointerdown", () => { clearTimeout(tipTimer); $("#tooltip").hidden = true; });

scroller.addEventListener("scroll", () => { $("#dock").classList.add("no-glide"); renderSelection(); if (["replace", "link", "style", "more"].includes(state.surface) && state.opener) positionSurface(state.surface, $(SURFACES[state.surface]), state.opener); clearTimeout(scroller._t); scroller._t = setTimeout(() => $("#dock").classList.remove("no-glide"), 120); }, { passive: true });
addEventListener("resize", () => { lastDockKey = ""; render(); if (state.surface && SURFACES[state.surface]) positionSurface(state.surface, $(SURFACES[state.surface]), state.opener); });

// URL switches for screenshots: ?top=over, ?sel=heading, ?edit=1, ?open=pages|settings|publish|replace|palette, ?device=phone, ?focus=1
const qs = new URLSearchParams(location.search);
if (qs.get("top") === "over") body.classList.add("top-over");
render();
frame.addEventListener("load", () => {
  if (qs.get("device")) setDevice(qs.get("device"));
  if (qs.get("sel")) { select(qs.get("sel"), "keyboard"); state.saves[qs.get("sel")] = qs.get("saved") ? "saved" : state.saves[qs.get("sel")]; }
  if (qs.get("edit")) startEditing();
  const o = qs.get("open");
  if (o === "pages") $("#b-page").click();
  if (o === "settings") openSurface("settings", $("#b-settings"));
  if (o === "publish") $("#b-publish").click();
  if (o === "replace") dockAct("replace", $("#dock [data-act=replace]"));
  if (o === "palette") document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
  if (qs.get("focus")) setFocus(true);
  setTimeout(render, 50);
}, { once: true });
