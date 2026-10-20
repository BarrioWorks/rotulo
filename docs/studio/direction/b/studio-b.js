"use strict";

const SITE = "http://agency-15.sites.localhost:5150/";
const IMG = (p) => SITE + "assets/img/" + p;

// Rects measured once inside the published site, keyed by the frame width they were measured at.
// [x, y, w, h] in frame pixels. "top" is the page scrolled to 0, "portfolio" is #portfolio.
const GEO = {
  1256: { heading: [155, 338, 947, 76], button: [517, 476, 223, 69], photo: [70, 315, 356, 267], banner: 745 },
  1000: { heading: [119, 338, 763, 148], button: [389, 548, 223, 69], photo: [32, 315, 296, 222], banner: 817 },
  810: { heading: [139, 338, 532, 148], button: [294, 548, 223, 69], photo: [57, 315, 336, 252], banner: 817 },
  390: { heading: [49, 215, 292, 160], button: [84, 405, 223, 69], photo: [12, 315, 366, 275], banner: 570 },
};

const PARTS = {
  banner: { kind: "section", label: "Banner", name: "Banner section", scroll: "top" },
  heading: { kind: "text", label: "Heading", name: "Heading: It's Great To Meet You", scroll: "top" },
  button: { kind: "link", label: "Button", name: "Button: Tell Me More", scroll: "top" },
  photo: { kind: "image", label: "Picture", name: "Picture: portfolio/1.jpg", scroll: "portfolio" },
};

const PAGES = [
  { name: "Home", path: "/", hash: "#page-top", scroll: "top", desc: "Agency - Start Bootstrap Theme" },
  { name: "Services", path: "/services.html", hash: "#services", scroll: "services", desc: "What we offer" },
  { name: "Portfolio", path: "/portfolio.html", hash: "#portfolio", scroll: "portfolio", desc: "Selected work" },
];

// The dock's contents depend only on the element kind (decision 3). Its position never changes.
const DOCK = {
  idle: [
    { act: "pages", label: "Pages", icon: "i-files" },
    { act: "images", label: "Images", icon: "i-image" },
    { act: "settings", label: "Settings", icon: "i-settings" },
    { act: "preview", label: "Preview", icon: "i-preview" },
  ],
  text: [
    { act: "edit", label: "Edit", icon: "i-edit-text" },
    { act: "style", label: "Style", icon: "i-text-style" },
    { act: "link", label: "Link", icon: "i-link" },
    { act: "more", label: "More", icon: "i-more", iconOnly: true },
  ],
  link: [
    { act: "edit", label: "Edit", icon: "i-edit-text" },
    { act: "link", label: "Link · Services", short: "Link", icon: "i-link" },
    { act: "style", label: "Style", icon: "i-text-style" },
    { act: "more", label: "More", icon: "i-more", iconOnly: true },
  ],
  image: [
    { act: "replace", label: "Replace", icon: "i-replace-image" },
    { act: "alt", label: "Alt text", icon: "i-alt", dot: true },
    { act: "link", label: "Link", icon: "i-link" },
    { act: "more", label: "More", icon: "i-more", iconOnly: true },
  ],
  section: [
    { act: "move", label: "Move", icon: "i-move" },
    { act: "duplicate", label: "Duplicate", icon: "i-duplicate" },
    { act: "hide", label: "Hide", icon: "i-hide" },
    { act: "more", label: "More", icon: "i-more", iconOnly: true },
  ],
  editing: [
    { act: "bold", label: "Bold", icon: "i-bold", iconOnly: true, toggle: true },
    { act: "italic", label: "Italic", icon: "i-italic", iconOnly: true, toggle: true },
    { act: "textlink", label: "Link", icon: "i-link" },
    { sep: true },
    { act: "done", label: "Done", icon: "i-check", primary: true },
  ],
  preview: [
    { seg: [{ act: "device", value: "computer", label: "Computer", icon: "i-desktop" }, { act: "device", value: "phone", label: "Phone", icon: "i-phone" }] },
    { sep: true },
    { act: "edit-mode", label: "Back to editing", short: "Edit", icon: "i-edit" },
  ],
};

const S = {
  mode: "edit", device: "computer", focus: false, scroll: "top", page: "Home",
  sel: null, editing: false, saves: { heading: "saved" }, surface: null, opener: null,
  bold: false, italic: false, unpublished: 2, history: ["Heading text", "Picture"], redo: [],
  live: 4, publishing: false, justPublished: false, altText: "", settingsSection: "general", hintSeen: false,
  versions: [
    { n: 4, date: "18 Oct 2026, 16:40" }, { n: 3, date: "12 Oct 2026, 09:12" },
    { n: 2, date: "3 Oct 2026, 18:05" }, { n: 1, date: "28 Sep 2026, 11:30" },
  ],
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const frame = $("[data-canvas]");
const overlay = $("[data-overlay]");
const ctx = $("[data-ctx]");
const layer = $("[data-layer]");
const icon = (id, cls = "") => `<svg class="icon ${cls}" aria-hidden="true"><use href="icons.svg#${id}"/></svg>`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? "⌘" : "Ctrl+";
const announce = (t) => { $("[data-announce]").textContent = t; };

/* Layout mode: bar on coarse pointers and narrow windows */
const coarse = matchMedia("(pointer: coarse)");
function layoutMode() {
  const force = new URLSearchParams(location.search).get("touch") === "1";
  document.body.classList.toggle("bar", force || coarse.matches || innerWidth < 600);
}

function geo() {
  const w = frame.clientWidth;
  const key = Object.keys(GEO).map(Number).reduce((a, b) => (Math.abs(b - w) < Math.abs(a - w) ? b : a));
  const g = GEO[key];
  const dx = (w - key) / 2;
  const shift = ([x, y, ww, hh]) => [x + dx, y, ww, hh];
  return { heading: shift(g.heading), button: shift(g.button), photo: g.photo, banner: [0, 0, w, Math.min(g.banner, frame.clientHeight)] };
}

/* Canvas overlay: hotspots, ring, halo and the label. Nothing else is drawn on the site. */
function drawOverlay() {
  const g = geo();
  const focused = document.activeElement && document.activeElement.closest(".hot") ? document.activeElement.dataset.part : null;
  const visible = Object.entries(PARTS).filter(([, p]) => p.scroll === S.scroll && !S.scrolling);
  let html = visible.map(([id, p]) => {
    const [x, y, w, h] = g[id];
    return `<button class="hot ${p.kind === "section" ? "section" : ""} ${S.sel === id ? "is-selected" : ""}" data-part="${id}" aria-label="${esc(p.name)}" aria-pressed="${S.sel === id}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"></button>`;
  }).join("");
  if (S.sel && PARTS[S.sel].scroll === S.scroll && !S.scrolling) {
    const p = PARTS[S.sel];
    const [x, y, w, h] = g[S.sel];
    const save = S.saves[S.sel];
    const state = S.editing ? (save === "saving" ? "Saving…" : save === "saved" ? "Saved" : "") : save === "saving" ? "Saving…" : save === "saved" ? "Saved" : "";
    const title = S.editing ? "Editing" : p.label;
    const below = y < 30 && p.kind !== "section";
    html += `<div class="ring ${p.kind === "section" ? "section" : ""} ${S.editing ? "editing" : ""} ${below ? "below" : ""}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px">
      <span class="chip" data-chip>${esc(title)}${state ? `<span class="state">${state}</span>` : ""}</span></div>`;
  }
  if (!S.hintSeen && !S.sel) html += `<div class="hint-chip">Click any text or picture to change it</div>`;
  overlay.innerHTML = html;
  if (focused) { const h = overlay.querySelector(`.hot[data-part="${focused}"]`); if (h) h.focus({ preventScroll: true }); }
}

function dockKind() {
  if (S.mode === "preview") return "preview";
  if (S.editing) return "editing";
  return S.sel ? PARTS[S.sel].kind : "idle";
}

let lastKind = null;
function drawDock() {
  const kind = dockKind();
  const item = (b) => {
    if (b.sep) return `<span class="sep" aria-hidden="true"></span>`;
    if (b.seg) return `<div class="seg" role="group" aria-label="Device">${b.seg.map((s) => `<button class="btn icon-only" data-act="${s.act}" data-value="${s.value}" aria-label="${s.label}" title="${s.label}" aria-pressed="${S.device === s.value}">${icon(s.icon)}</button>`).join("")}</div>`;
    const pressed = b.toggle ? ` aria-pressed="${!!S[b.act]}"` : "";
    const expanded = S.surface && S.surface.id === b.act && S.surface.from === "dock" ? "true" : "false";
    const dot = b.dot && !S.altText ? `<span class="dot" aria-label="missing"></span>` : "";
    const cls = `btn ${b.iconOnly ? "icon-only" : ""} ${b.primary ? "btn-primary" : ""}`;
    const body = b.iconOnly ? icon(b.icon) : `${icon(b.icon, "tab-icon")}<span class="wide-label">${b.label}</span><span class="tab-label">${b.short || b.label}</span>${dot}`;
    return `<button class="${cls}" data-act="${b.act}" aria-label="${b.label}"${pressed} aria-expanded="${expanded}" title="${b.label}">${body}</button>`;
  };
  ctx.innerHTML = DOCK[kind].map(item).join("");
  ctx.setAttribute("aria-label", kind === "idle" ? "Website commands" : `${kind} commands`);
  if (lastKind !== kind) { ctx.classList.remove("swap"); void ctx.offsetWidth; ctx.classList.add("swap"); }
  lastKind = kind;
  $('[data-act="redo"]').disabled = !S.redo.length;
  $('[data-act="undo"]').disabled = !S.history.length;
}

function drawChrome() {
  document.body.classList.toggle("preview", S.mode === "preview");
  document.body.classList.toggle("focus", S.focus);
  document.body.classList.toggle("phone-view", S.device === "phone" && S.mode === "preview");
  $("[data-page-name]").textContent = S.page;
  frame.title = `Agency website, ${S.page} page`;
  document.title = `Agency / ${S.page} - Pagehaven Studio`;
  const status = $("[data-pub-status]");
  const btn = $("[data-pub-btn]");
  status.classList.toggle("live", !S.unpublished);
  if (S.publishing) { $("[data-pub-text]").textContent = "Publishing…"; btn.textContent = "Publishing…"; btn.setAttribute("aria-busy", "true"); }
  else if (S.unpublished) { $("[data-pub-text]").textContent = `${S.unpublished} change${S.unpublished > 1 ? "s" : ""} not published`; btn.textContent = `Publish · ${S.unpublished}`; btn.className = "btn btn-primary"; btn.removeAttribute("aria-busy"); }
  else { $("[data-pub-text]").textContent = S.justPublished ? `Live · version ${S.live} · just now` : "Live"; btn.textContent = "Published"; btn.className = "btn btn-quiet"; btn.removeAttribute("aria-busy"); }
  btn.setAttribute("aria-expanded", S.surface && S.surface.id === "publish" ? "true" : "false");
  $('.crumb-page').setAttribute("aria-expanded", S.surface && S.surface.id === "pages" && S.surface.from === "nav" ? "true" : "false");
}

function render() { drawChrome(); drawOverlay(); drawDock(); }

/* Canvas scroll is simulated by fragment navigation, since the frame is cross-origin. */
function scrollSite(where) {
  if (S.scroll === where) return Promise.resolve();
  const hash = { top: "#page-top", portfolio: "#portfolio", services: "#services" }[where];
  S.scroll = where; S.scrolling = true; render();
  frame.src = SITE + hash;
  return new Promise((done) => setTimeout(() => { S.scrolling = false; render(); done(); }, 950));
}

/* Selection */
function select(id) {
  if (S.editing) finishEdit();
  S.sel = id; S.hintSeen = true; closeSurface(false);
  render();
  if (id) announce(`${PARTS[id].name} selected. Commands in the dock.`);
}
async function selectAndShow(id) { await scrollSite(PARTS[id].scroll); select(id); }
function startEdit() {
  if (!S.sel || !["text", "link"].includes(PARTS[S.sel].kind)) return;
  closeSurface(false); S.editing = true; S.bold = S.italic = false; render();
  announce("Editing. Type to change the text. Enter or Done to finish.");
}
function finishEdit() {
  if (!S.editing) return;
  S.editing = false;
  if (S.dirty) { recordChange(`${PARTS[S.sel].label} text`); S.dirty = false; }
  render();
}
let saveTimer;
function markSaving(id) {
  S.saves[id] = "saving"; drawOverlay();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { S.saves[id] = "saved"; drawOverlay(); }, 700);
}
function recordChange(label) { S.history.push(label); S.redo = []; S.unpublished += 1; S.justPublished = false; render(); }

/* Surfaces: one open at a time (decision 4). Popovers rise from the dock or drop from a capsule. */
function closeSurface(restore = true) {
  closeMenu();
  if (!S.surface) return;
  const opener = S.opener;
  S.surface = null; S.opener = null; layer.innerHTML = "";
  render();
  if (restore && opener && document.contains(opener)) opener.focus();
}

function placePop(el, anchor) {
  if (document.body.classList.contains("bar")) return;
  const a = anchor.getBoundingClientRect();
  const w = el.offsetWidth;
  const inDock = !!anchor.closest("[data-dock]");
  if (inDock) {
    const dock = $("[data-dock]").getBoundingClientRect();
    el.style.bottom = `${innerHeight - dock.top + 10}px`;
    el.style.left = `${Math.max(8, Math.min(innerWidth - w - 8, a.left + a.width / 2 - w / 2))}px`;
    el.style.setProperty("--origin", `${a.left + a.width / 2 - parseFloat(el.style.left)}px 100%`);
  } else {
    const cap = anchor.closest(".capsule").getBoundingClientRect();
    el.style.top = `${cap.bottom + 8}px`;
    if (anchor.closest(".cap-pub")) { el.style.right = `${innerWidth - cap.right}px`; el.style.setProperty("--origin", "100% 0"); }
    else { el.style.left = `${cap.left}px`; el.style.setProperty("--origin", "24px 0"); }
  }
}

function openSurface(id, anchor, opts = {}) {
  if (S.surface && S.surface.id === id && !opts.force) { closeSurface(); return; }
  closeSurface(false);
  if (S.editing && !["textlink"].includes(id)) finishEdit();
  S.surface = { id, from: anchor && anchor.closest(".capsule") ? "nav" : "dock", ...opts };
  S.opener = anchor || document.activeElement;
  layer.innerHTML = SURFACES[id](opts);
  const el = layer.firstElementChild.classList.contains("scrim") ? layer.children[1] : layer.firstElementChild;
  if (anchor && el.classList.contains("pop")) placePop(el, anchor);
  render();
  const first = el.querySelector("[autofocus]") || el.querySelector("input, select, textarea, button, [tabindex]");
  if (first) first.focus();
}

const pageRows = (withMenu = true) => PAGES.map((p) => `
  <div class="row-wrap" data-page-row="${p.name}">
    <button class="row" data-act="go-page" data-page="${p.name}" ${S.page === p.name ? 'aria-current="page"' : ""}>
      ${icon("i-check", "check s16")}
      <span class="grow"><span>${p.name}</span><span class="meta mono">${p.path}</span></span>
    </button>
    ${withMenu ? `<button class="btn icon-only more" data-act="page-menu" data-page="${p.name}" aria-label="Actions for ${p.name}" aria-haspopup="menu" aria-expanded="false">${icon("i-more", "s16")}</button>` : ""}
  </div>`).join("");

const assetsOnPage = [
  { src: "header-bg.jpg", part: "banner", label: "Banner photo" },
  { src: "portfolio/1.jpg", part: "photo", label: "portfolio/1.jpg" },
  { src: "portfolio/2.jpg", part: null, label: "portfolio/2.jpg" },
  { src: "portfolio/3.jpg", part: null, label: "portfolio/3.jpg" },
  { src: "portfolio/4.jpg", part: null, label: "portfolio/4.jpg" },
  { src: "portfolio/5.jpg", part: null, label: "portfolio/5.jpg" },
];

const SURFACES = {
  pages: () => `<div class="pop glass-2" role="dialog" aria-label="Pages">
    <label class="search">${icon("i-search", "s16")}<input type="search" placeholder="Find a page" aria-label="Find a page" data-filter="pages" autofocus></label>
    <div class="list" style="margin:0" data-page-list>${pageRows()}</div>
    <hr>
    <button class="row add" data-act="add-page">${icon("i-add-page", "s16")}<span>Add a page…</span></button>
  </div>`,

  images: () => assetPop("Images on this page", false),
  replace: () => assetPop("Replace picture", true),

  style: () => `<div class="pop glass-2" role="dialog" aria-label="Text style" style="width:300px">
    <h3>Text style</h3>
    <div class="pad">
      <div class="field"><span class="label">Size</span><div class="segbar" role="group" aria-label="Size">${["S", "M", "L", "XL"].map((s) => `<button class="btn" aria-pressed="${s === "XL"}" data-act="style-pick">${s}</button>`).join("")}</div></div>
      <div class="field"><span class="label">Colour</span><div class="swatches" role="group" aria-label="Colour">${[["#FFFFFF", "White"], ["#FFC800", "Agency yellow"], ["#212529", "Ink"], ["#6C757D", "Grey"]].map(([c, n], i) => `<button class="swatch" style="background:${c}" aria-label="${n}" aria-pressed="${i === 0}" data-act="style-pick"></button>`).join("")}</div></div>
      <div class="field" style="margin:0"><span class="label">Alignment</span><div class="segbar" role="group" aria-label="Alignment">${[["left", "Left"], ["center", "Centre"], ["right", "Right"]].map(([a, n]) => `<button class="btn icon-only" aria-label="${n}" aria-pressed="${a === "center"}" data-act="style-pick">${icon("i-align-" + a, "s16")}</button>`).join("")}</div></div>
    </div></div>`,

  link: () => {
    const btn = S.sel === "button";
    return `<div class="pop glass-2" role="dialog" aria-label="Link" style="width:320px">
    <h3>${btn ? "Button goes to" : "Link"}</h3>
    <div class="pad">
      <div class="field"><label for="goes">Goes to</label><select class="input" id="goes" autofocus><option ${btn ? "selected" : ""}>Part of this page</option><option>Another page</option><option ${btn ? "" : "selected"}>Web address</option><option>Email</option><option>Phone</option></select></div>
      ${btn ? `<div class="field"><label for="part">Part</label><select class="input" id="part" data-act-change="link-part"><option selected>Services section</option><option>Portfolio section</option><option>About section</option><option>Team section</option><option>Contact section</option></select><span class="hint">Applies at once. Undo puts it back.</span></div>`
      : `<div class="field"><label for="url">Web address</label><input class="input" id="url" placeholder="https://"></div><div class="actions"><button class="btn btn-primary" data-act="save-link">Save link</button></div>`}
    </div></div>`;
  },

  alt: () => `<div class="pop glass-2" role="dialog" aria-label="Alt text" style="width:320px">
    <h3>Describe this picture</h3>
    <div class="pad"><div class="field"><textarea class="input" aria-label="Description" placeholder="For example: Threads app on a phone, on a yellow background" autofocus data-alt>${esc(S.altText)}</textarea><span class="hint">Read aloud to people who cannot see it. Saves when you press Enter.</span></div></div></div>`,

  more: () => {
    const k = PARTS[S.sel].kind;
    const rows = {
      text: [["select-around", "Select the part around it", "i-select-parent"], ["undo-typing", "Undo typing", "i-undo"]],
      link: [["select-around", "Select the part around it", "i-select-parent"], ["replace-photo", "Replace banner photo", "i-replace-image"]],
      image: [["fit", "Fill the frame", "i-image"], ["select-around", "Select the part around it", "i-select-parent"]],
      section: [["background", "Background…", "i-background"], ["remove", "Remove section", "i-remove"]],
    }[k];
    return `<div class="pop glass-2" role="menu" aria-label="More" style="width:240px">${rows.map(([a, l, i]) => `<button class="row ${a === "remove" ? "btn-danger" : ""}" role="menuitem" data-act="${a}">${icon(i, "s16")}<span>${l}</span></button>`).join("")}</div>`;
  },

  move: () => `<div class="pop glass-2" role="menu" aria-label="Move section" style="width:240px">
    <button class="row" role="menuitem" disabled style="opacity:.42">${icon("i-move-up", "s16")}<span class="grow"><span>Move up</span><span class="meta">Already the first section</span></span></button>
    <button class="row" role="menuitem" data-act="move-down">${icon("i-move-down", "s16")}<span class="grow"><span>Move down</span><span class="meta">Swaps with Services · Alt+Shift+↓</span></span></button></div>`,

  textlink: () => `<div class="pop glass-2" role="dialog" aria-label="Link the selected words" style="width:320px"><h3>Link the selected words</h3>
    <div class="pad"><div class="field"><label for="tl">Goes to</label><select class="input" id="tl" autofocus><option>Web address</option><option>Another page</option><option>Part of this page</option></select></div><div class="field"><input class="input" placeholder="https://" aria-label="Web address"></div><div class="actions"><button class="btn btn-primary" data-act="save-link">Link</button></div></div></div>`,

  publish: () => publishPop(),
  settings: () => settingsSheet(),
  palette: () => paletteHtml(),
};

function assetPop(title, replacing) {
  const thumbs = assetsOnPage.map((a) => `<button style="background-image:url('${IMG(a.src)}')" aria-label="${replacing ? "Select" : "Select on page"}: ${a.label}" data-act="pick-asset" data-part="${a.part || ""}" ${S.sel && a.part === S.sel ? 'aria-pressed="true"' : ""}></button>`).join("");
  return `<div class="pop glass-2" role="dialog" aria-label="${title}" style="width:340px">
    <h3>${title}</h3>
    ${replacing ? `<div class="drop"><div><button class="btn btn-primary" data-act="upload" autofocus>${icon("i-upload", "s16")}Upload from your computer</button><input type="file" accept="image/*" hidden data-file></div><span class="hint">or drop a picture here</span></div>
      ${S.uploaded ? `<div class="group-label">Fit</div><div class="pad" style="padding-top:0"><div class="segbar"><button class="btn" aria-pressed="true">Fill the frame</button><button class="btn" aria-pressed="false">Show whole picture</button></div></div>` : ""}` : ""}
    <div class="group-label">On this page</div>
    <div class="thumbs">${thumbs}</div>
    ${replacing ? "" : `<hr><button class="row" data-act="settings" data-section="assets">${icon("i-folder", "s16")}<span>All images in Settings</span></button>`}
  </div>`;
}

function publishPop() {
  const v = S.versions;
  const head = S.publishing ? `<h3>Publishing…</h3><p class="lead">Sending ${S.unpublished} change${S.unpublished > 1 ? "s" : ""} to your website.</p>`
    : S.justPublished ? `<h3>${icon("i-success", "s16")} Published. Visitors now see version ${S.live}.</h3><p class="lead">Your website is up to date.</p>`
    : S.unpublished ? `<h3>${S.unpublished} change${S.unpublished > 1 ? "s" : ""} not published</h3><p class="lead">Visitors still see version ${S.live}.</p>`
    : `<h3>Everything is published.</h3><p class="lead">Visitors see version ${S.live}.</p>`;
  const changes = S.unpublished && !S.justPublished ? `<ul class="changes">${S.history.slice(-S.unpublished).map((c) => `<li><span class="pg">Home</span><span>${esc(c)} changed</span></li>`).join("")}</ul>` : "";
  const cta = S.unpublished && !S.justPublished ? `<button class="btn btn-primary" data-act="do-publish" ${S.publishing ? 'aria-busy="true" disabled' : ""} autofocus>${S.publishing ? "Publishing…" : `Publish ${S.unpublished} change${S.unpublished > 1 ? "s" : ""}`}</button>` : "";
  return `<div class="pop pub-pop glass-3" role="dialog" aria-label="Publish">
    ${head}${changes}${cta}
    <div class="addr"><span class="mono">agency-15.pagehaven.site</span><a href="${SITE}" target="_blank" rel="noopener">View website ${icon("i-view-live", "s16")}</a></div>
    <div class="group-label" style="padding-left:4px">${icon("i-history", "s16")} Version history</div>
    <div class="versions">${v.slice(0, 5).map((r) => `<div class="row"><span class="grow"><span>Version ${r.n} ${r.n === S.live ? '<span class="badge">live</span>' : ""}</span><span class="meta">${r.date}</span></span>${r.n === S.live ? "" : `<button class="btn btn-quiet" data-act="rollback" data-v="${r.n}">Make this version live</button>`}</div>`).join("")}</div>
    <hr><button class="row" data-act="settings" data-section="versions">${icon("i-settings", "s16")}<span>All versions and publishing settings</span></button>
  </div>`;
}

const SECTIONS = [["general", "General"], ["pages", "Pages"], ["assets", "Assets"], ["domains", "Domains"], ["publishing", "Publishing"], ["versions", "Versions"]];

function settingsBody(sec) {
  switch (sec) {
    case "general": return `<div class="sheet-head"><h3>General</h3></div>
      <div class="field"><label for="sn">Website name</label><input class="input" id="sn" value="Agency"></div>
      <div class="field"><label for="slug">Web address</label><div class="affix"><input class="input" id="slug" value="agency-15" pattern="[a-z0-9\\-]{3,32}"><span>.pagehaven.site</span></div><span class="hint">Takes effect at once. Not part of Undo.</span></div>
      <div class="actions" style="justify-content:space-between"><a class="btn btn-quiet" href="${SITE}" target="_blank" rel="noopener">View website ${icon("i-view-live", "s16")}</a><button class="btn btn-primary" data-act="save-settings">Save</button></div>
      <hr style="margin:20px 0">
      <div class="sheet-head"><h3>Keyboard shortcuts</h3></div>
      <div class="shortcuts">${[["Command palette", MOD + "K"], ["Undo / Redo", MOD + "Z / " + MOD + "Shift+Z"], ["Edit the selected text", "Enter"], ["Close, stop editing, deselect", "Esc"], ["Publish", MOD + "Shift+P"], ["Focus mode", MOD + "."], ["Move section", "Alt+Shift+↑ ↓"]].map(([a, k]) => `<span>${a}</span><kbd>${k}</kbd>`).join("")}</div>`;
    case "pages": return `<div class="sheet-head"><h3>Pages</h3><button class="btn btn-quiet" data-act="add-page">${icon("i-add-page", "s16")}Add a page</button></div><p>Pages visitors can open. Home cannot be renamed or deleted.</p><div class="list">${pageRows()}</div>`;
    case "assets": return `<div class="sheet-head"><h3>Assets</h3><button class="btn btn-quiet" data-act="upload-asset">${icon("i-upload", "s16")}Upload</button></div><p>Images used on this website. 6 images, 4 style sheets, 3 scripts.</p>
      <div class="asset-grid">${assetsOnPage.map((a) => `<figure><img src="${IMG(a.src)}" alt=""><figcaption class="mono">${a.src}</figcaption></figure>`).join("")}</div>`;
    case "domains": return `<div class="sheet-head"><h3>Domains</h3></div><p>Your website is at <span class="mono">agency-15.pagehaven.site</span>. You can also use a domain you own.</p>
      <div class="field"><label for="dom">Your own domain</label><input class="input mono" id="dom" placeholder="www.example.com"></div><div class="actions"><button class="btn btn-primary">Add domain</button></div>`;
    case "publishing": return `<div class="sheet-head"><h3>Publishing</h3></div>
      <dl class="kv"><dt>Address</dt><dd class="mono">agency-15.pagehaven.site</dd><dt>Visitors see</dt><dd>Version ${S.live} · ${S.versions.find((v) => v.n === S.live).date}</dd><dt>Changes</dt><dd>${S.unpublished ? `<span class="badge warn">${S.unpublished} not published</span>` : '<span class="badge">Up to date</span>'}</dd></dl>
      ${S.unpublished ? `<button class="btn btn-primary" data-act="publish">Review and publish</button>` : ""}`;
    case "versions": return `<div class="sheet-head"><h3>Versions</h3></div><p>Every time you publish, Pagehaven keeps a version. Making an older version live does not delete your current changes.</p>
      <div class="list versions">${S.versions.map((r) => `<div class="row"><span class="grow"><span>Version ${r.n} ${r.n === S.live ? '<span class="badge">live</span>' : ""}</span><span class="meta">${r.date}</span></span><button class="btn" data-act="open-version">Open in editor</button>${r.n === S.live ? "" : `<button class="btn btn-quiet" data-act="rollback" data-v="${r.n}">Make this version live</button>`}</div>`).join("")}</div>`;
  }
}

function settingsSheet() {
  const sec = S.settingsSection;
  return `<div class="scrim" data-act="close"></div>
  <div class="sheet glass-3" role="dialog" aria-modal="true" aria-labelledby="st">
    <nav class="sheet-nav" aria-label="Settings sections"><h2 id="st">Website settings</h2>
      ${SECTIONS.map(([id, l]) => `<button class="row" data-act="settings-section" data-section="${id}" aria-current="${id === sec}">${l}</button>`).join("")}
    </nav>
    <div class="sheet-body"><button class="btn icon-only" data-act="close" aria-label="Close settings" style="position:absolute;top:12px;right:12px">${icon("i-close")}</button><section data-sec>${settingsBody(sec)}</section></div>
  </div>`;
}

/* Command palette: every entry repeats a visible control, named on the right. */
function commands() {
  const list = [
    ...PAGES.map((p) => ({ g: "Pages", l: `Switch to ${p.name}`, where: "Top left", run: () => goPage(p.name) })),
    { g: "Pages", l: "Add a page…", where: "Top left", run: () => toast("Add a page opens the page dialog") },
    { g: "Selection", l: "Select main heading", where: "Canvas", run: () => selectAndShow("heading") },
    { g: "Selection", l: "Select button: Tell Me More", where: "Canvas", run: () => selectAndShow("button") },
    { g: "Selection", l: "Select picture: portfolio/1.jpg", where: "Canvas", run: () => selectAndShow("photo") },
    { g: "Selection", l: "Replace picture: portfolio/1.jpg", where: "Dock", run: async () => { await selectAndShow("photo"); openSurface("replace", $('[data-act="replace"]')); } },
    ...SECTIONS.map(([id, l]) => ({ g: "Website", l: `Settings: ${l}`, where: "Dock · Settings", run: () => openSettings(id) })),
    { g: "Publishing", l: "Publish", where: "Top right", run: () => openSurface("publish", $("[data-pub-btn]")) },
    { g: "Publishing", l: "Version history", where: "Top right", run: () => openSurface("publish", $("[data-pub-btn]")) },
    { g: "View", l: "Preview", where: "Dock", run: () => setMode("preview") },
    { g: "View", l: "Preview on a phone", where: "Dock · Preview", run: () => { setMode("preview"); S.device = "phone"; render(); } },
    { g: "View", l: "Focus mode", where: `Dock · ${MOD}.`, run: () => setFocus(true) },
    { g: "Help", l: "Keyboard shortcuts", where: "Settings · General", run: () => openSettings("general") },
  ];
  return list;
}
function paletteHtml() {
  return `<div class="scrim light" data-act="close"></div><div class="palette glass-2" role="dialog" aria-modal="true" aria-label="Command palette">
    <label class="search">${icon("i-search")}<input type="text" placeholder="Search commands, pages and parts" aria-label="Search commands" autofocus data-filter="palette" role="combobox" aria-controls="pal-list" aria-expanded="true"><kbd>Esc</kbd></label>
    <div class="results" id="pal-list" role="listbox" data-results>${paletteRows("")}</div></div>`;
}
let palIndex = 0;
function paletteRows(q) {
  const items = commands().filter((c) => (c.g + " " + c.l).toLowerCase().includes(q.toLowerCase()));
  palIndex = Math.min(palIndex, Math.max(0, items.length - 1));
  let g = null;
  return items.map((c, i) => {
    const head = c.g !== g ? `<div class="group-label">${(g = c.g)}</div>` : "";
    return `${head}<button class="row ${i === palIndex ? "active" : ""}" role="option" aria-selected="${i === palIndex}" data-cmd="${i}" data-q="${esc(q)}"><span>${c.l}</span><span class="where">${c.where}</span></button>`;
  }).join("") || `<div class="pad hint">No command matches “${esc(q)}”.</div>`;
}

/* Small helpers for actions */
function toast(text, undo) {
  $$(".toast").forEach((t) => t.remove());
  const t = document.createElement("div");
  t.className = "toast"; t.setAttribute("role", "status");
  t.innerHTML = `<span>${esc(text)}</span>${undo ? `<button class="btn" data-act="undo">Undo</button>` : ""}`;
  document.body.append(t);
  setTimeout(() => t.remove(), 4000);
}
async function goPage(name) {
  const p = PAGES.find((x) => x.name === name);
  closeSurface(false); S.page = name; S.sel = null; S.editing = false;
  await scrollSite(p.scroll);
  render(); announce(`Opened ${name}`);
}
function openSettings(sec) { S.settingsSection = sec; openSurface("settings", document.activeElement, { force: true }); }
function setMode(m) { closeSurface(false); if (S.editing) finishEdit(); S.mode = m; if (m === "preview") S.sel = null; else S.device = "computer"; render(); }
let pillTimer;
function setFocus(on) {
  closeSurface(false); if (S.editing) finishEdit();
  S.focus = on; S.prevMode = on ? S.mode : S.prevMode;
  $$(".focus-pill").forEach((p) => p.remove());
  if (on) {
    const pill = document.createElement("button");
    pill.className = "btn focus-pill glass-2"; pill.dataset.act = "unfocus";
    pill.innerHTML = `Back to editing <kbd>Esc</kbd>`;
    document.body.append(pill);
    const wake = () => { pill.classList.remove("dim"); clearTimeout(pillTimer); pillTimer = setTimeout(() => pill.classList.add("dim"), 3000); };
    wake(); document.addEventListener("pointermove", wake); pill._wake = wake;
    pill.focus();
  } else {
    clearTimeout(pillTimer);
  }
  render();
  if (!on) $('[data-act="focus"]').focus();
}

function closeMenu() { $$(".menu").forEach((m) => m.remove()); $$('[data-act="page-menu"][aria-expanded="true"]').forEach((b) => b.setAttribute("aria-expanded", "false")); }
function pageMenu(btn) {
  const open = btn.getAttribute("aria-expanded") === "true";
  closeMenu(); if (open) return;
  const name = btn.dataset.page;
  const home = name === "Home";
  const m = document.createElement("div");
  m.className = "menu solid"; m.setAttribute("role", "menu"); m.setAttribute("aria-label", `${name} actions`);
  m.innerHTML = [["Rename…", "i-edit", home], ["Duplicate", "i-duplicate", false], ["Page settings…", "i-settings", false], ["Delete page", "i-remove", home]]
    .map(([l, i, dis]) => `<button class="row ${l.startsWith("Delete") ? "btn-danger" : ""}" role="menuitem" ${dis ? 'disabled style="opacity:.42"' : ""} data-act="menu-item" data-label="${l}" data-page="${name}">${icon(i, "s16")}<span>${l}</span></button>`).join("");
  document.body.append(m);
  btn.setAttribute("aria-expanded", "true");
  const r = btn.getBoundingClientRect();
  if (document.body.classList.contains("bar")) { m.style.right = "16px"; m.style.bottom = `${innerHeight - r.top + 4}px`; }
  else { m.style.left = `${Math.min(innerWidth - 208, r.right + 6)}px`; m.style.top = `${r.top - 6}px`; }
  m.querySelector("button:not([disabled])").focus();
}

function confirmRollback(v) {
  const c = document.createElement("div");
  c.innerHTML = `<div class="scrim" data-confirm-close></div><div class="confirm glass-3" role="alertdialog" aria-modal="true" aria-labelledby="ct"><h3 id="ct">Make version ${v} live?</h3>
    <p>Visitors will see version ${v} straight away. Your editor keeps your latest changes, so you can publish them again later.</p>
    <div class="actions"><button class="btn btn-quiet" data-confirm-close>Cancel</button><button class="btn btn-primary" data-confirm-ok="${v}">Make version ${v} live</button></div></div>`;
  c.dataset.confirm = "";
  document.body.append(c);
  c.querySelector("[data-confirm-ok]").focus();
}

async function doPublish() {
  S.publishing = true; render(); layer.innerHTML = publishPop(); placePop(layer.firstElementChild, $("[data-pub-btn]"));
  await new Promise((d) => setTimeout(d, 900));
  S.publishing = false; S.live = S.versions[0].n + 1; S.versions.unshift({ n: S.live, date: "20 Oct 2026, just now" });
  S.unpublished = 0; S.justPublished = true;
  render();
  if (S.surface && S.surface.id === "publish") { layer.innerHTML = publishPop(); placePop(layer.firstElementChild, $("[data-pub-btn]")); }
  else toast(`Published. Visitors now see version ${S.live}.`);
  announce(`Published. Visitors now see version ${S.live}.`);
  setTimeout(() => { S.justPublished = false; drawChrome(); }, 4000);
}

/* One click handler over a table of actions */
const ACTIONS = {
  back: () => toast("Back to My websites"),
  pages: (b) => openSurface("pages", b),
  images: (b) => openSurface("images", b),
  settings: (b) => openSettings(b.dataset.section || "general"),
  "settings-section": (b) => { S.settingsSection = b.dataset.section; $$(".sheet-nav .row").forEach((r) => r.setAttribute("aria-current", r === b)); $("[data-sec]").innerHTML = settingsBody(S.settingsSection); },
  preview: () => setMode("preview"),
  "edit-mode": () => setMode("edit"),
  device: (b) => { S.device = b.dataset.value; render(); },
  focus: () => setFocus(true),
  unfocus: () => setFocus(false),
  publish: (b) => openSurface("publish", $("[data-pub-btn]"), { force: !b.closest(".cap-pub") }),
  "do-publish": () => doPublish(),
  rollback: (b) => confirmRollback(+b.dataset.v),
  "open-version": () => toast("Opened in the editor. Your current changes stay in Undo."),
  close: () => closeSurface(),
  edit: () => startEdit(),
  done: () => { finishEdit(); announce("Done editing. Saved."); },
  bold: () => { S.bold = !S.bold; drawDock(); markSaving(S.sel); S.dirty = true; },
  italic: () => { S.italic = !S.italic; drawDock(); markSaving(S.sel); S.dirty = true; },
  textlink: (b) => openSurface("textlink", b),
  style: (b) => openSurface("style", b),
  "style-pick": (b) => { $$("button", b.parentElement).forEach((x) => x.setAttribute("aria-pressed", x === b)); markSaving(S.sel); recordChange(`${PARTS[S.sel].label} style`); },
  link: (b) => openSurface("link", b),
  "save-link": () => { closeSurface(); markSaving(S.sel); recordChange("Link"); toast("Link saved", true); },
  alt: (b) => openSurface("alt", b),
  more: (b) => openSurface("more", b),
  move: (b) => openSurface("move", b),
  "move-down": () => { closeSurface(); recordChange("Section order"); toast("Banner moved below Services", true); },
  duplicate: () => { recordChange("Banner copy"); toast("Banner duplicated below", true); },
  hide: () => { recordChange("Banner hidden"); toast("Banner hidden on the website", true); },
  remove: () => { closeSurface(); recordChange("Banner removed"); S.sel = null; render(); toast("Banner removed", true); },
  background: () => toast("Background opens the background popover"),
  "select-around": () => { select("banner"); },
  "replace-photo": () => { select("banner"); },
  "undo-typing": () => { closeSurface(); toast("Typing undone"); },
  fit: () => closeSurface(),
  replace: (b) => openSurface("replace", b),
  upload: () => $("[data-file]").click(),
  "upload-asset": () => toast("Upload opens the file chooser"),
  "pick-asset": async (b) => { if (b.dataset.part) { await selectAndShow(b.dataset.part); } else toast("Select it on the canvas from the Portfolio section"); },
  "go-page": (b) => goPage(b.dataset.page),
  "page-menu": (b) => pageMenu(b),
  "menu-item": (b) => { closeMenu(); toast(`${b.dataset.label.replace("…", "")}: ${b.dataset.page}`); },
  "add-page": () => { closeSurface(false); toast("Add a page: starts from a copy of " + S.page); },
  "save-settings": () => toast("Settings saved"),
  undo: () => { if (!S.history.length) return; const c = S.history.pop(); S.redo.push(c); S.unpublished = Math.max(0, S.unpublished - 1); render(); toast(`Undid: ${c}`); },
  redo: () => { const c = S.redo.pop(); if (!c) return; S.history.push(c); S.unpublished += 1; render(); toast(`Redid: ${c}`); },
};

document.addEventListener("click", (e) => {
  const ok = e.target.closest("[data-confirm-ok]");
  if (ok) { const v = +ok.dataset.confirmOk; e.target.closest("[data-confirm]").remove(); S.live = v; S.unpublished = Math.max(S.unpublished, 1); render(); if (S.surface && S.surface.id === "publish") { layer.innerHTML = publishPop(); placePop(layer.firstElementChild, $("[data-pub-btn]")); } toast(`Visitors now see version ${v}. Your editor is newer.`); return; }
  if (e.target.closest("[data-confirm-close]")) { e.target.closest("[data-confirm]").remove(); return; }
  const cmd = e.target.closest("[data-cmd]");
  if (cmd) { const list = commands().filter((c) => (c.g + " " + c.l).toLowerCase().includes(cmd.dataset.q.toLowerCase())); closeSurface(false); list[+cmd.dataset.cmd].run(); return; }
  const part = e.target.closest("[data-part]");
  if (part && part.classList.contains("hot")) {
    const id = part.dataset.part;
    const again = S.sel === id && ["text", "link"].includes(PARTS[id].kind);
    if (again && !S.editing) startEdit(); else if (!S.editing || S.sel !== id) select(id);
    return;
  }
  if (e.target === overlay) { select(null); return; }
  const btn = e.target.closest("[data-act]");
  if (btn && ACTIONS[btn.dataset.act]) { ACTIONS[btn.dataset.act](btn); return; }
  if (!e.target.closest(".menu")) closeMenu();
  if (S.surface && !e.target.closest("[data-layer]") && !e.target.closest(".capsule, [data-dock]")) closeSurface(false);
});

overlay.addEventListener("dblclick", (e) => { const p = e.target.closest("[data-part]"); if (p && S.sel === p.dataset.part) startEdit(); });

document.addEventListener("input", (e) => {
  const f = e.target.dataset.filter;
  if (f === "palette") { palIndex = 0; $("[data-results]").innerHTML = paletteRows(e.target.value); }
  if (f === "pages") { const q = e.target.value.toLowerCase(); $$("[data-page-row]").forEach((r) => { r.hidden = !r.dataset.pageRow.toLowerCase().includes(q); }); }
});
document.addEventListener("change", (e) => {
  if (e.target.matches("[data-file]") && e.target.files.length) { S.uploaded = true; closeSurface(false); markSaving("photo"); recordChange("Picture"); toast("Picture replaced", true); openSurface("replace", $('[data-act="replace"]')); }
  if (e.target.id === "part") { markSaving(S.sel); recordChange("Button destination"); toast(`Button now goes to ${e.target.value}`, true); }
});

document.addEventListener("keydown", (e) => {
  const mod = e.metaKey || e.ctrlKey;
  const k = e.key;
  const inField = e.target.matches("input, textarea, select");
  if (k === "Escape") {
    e.preventDefault();
    const conf = $("[data-confirm]");
    if (conf) { conf.remove(); return; }
    if ($(".menu")) { closeMenu(); return; }
    if (S.focus) { setFocus(false); return; }
    if (S.surface) { closeSurface(); return; }
    if (S.editing) { finishEdit(); announce("Stopped editing. Your text is kept."); return; }
    if (S.sel) { select(null); return; }
    if (S.mode === "preview") { setMode("edit"); }
    return;
  }
  if (mod && k.toLowerCase() === "k" && !S.editing) { e.preventDefault(); palIndex = 0; openSurface("palette", document.activeElement); return; }
  if (mod && k === ".") { e.preventDefault(); setFocus(!S.focus); return; }
  if (mod && e.shiftKey && k.toLowerCase() === "p") { e.preventDefault(); openSurface("publish", $("[data-pub-btn]")); return; }
  if (mod && k.toLowerCase() === "z" && !inField) { e.preventDefault(); (e.shiftKey ? ACTIONS.redo : ACTIONS.undo)(); return; }
  if (S.surface && S.surface.id === "palette" && ["ArrowDown", "ArrowUp", "Enter"].includes(k)) {
    const rows = $$("[data-cmd]");
    if (k === "Enter") { e.preventDefault(); const r = rows[palIndex]; if (r) r.click(); return; }
    e.preventDefault(); palIndex = (palIndex + (k === "ArrowDown" ? 1 : -1) + rows.length) % rows.length;
    rows.forEach((r, i) => { r.classList.toggle("active", i === palIndex); r.setAttribute("aria-selected", i === palIndex); });
    rows[palIndex].scrollIntoView({ block: "nearest" });
    return;
  }
  if (e.target.matches("[data-alt]") && k === "Enter") { e.preventDefault(); S.altText = e.target.value; closeSurface(); markSaving("photo"); recordChange("Picture description"); return; }
  if (S.editing && !inField && !S.surface) {
    if (mod && k.toLowerCase() === "b") { e.preventDefault(); ACTIONS.bold(); return; }
    if (mod && k.toLowerCase() === "i") { e.preventDefault(); ACTIONS.italic(); return; }
    if (k === "Enter" && !e.shiftKey) { e.preventDefault(); finishEdit(); return; }
    if (k.length === 1 || k === "Backspace") { e.preventDefault(); S.dirty = true; markSaving(S.sel); return; }
  }
  if (S.surface || inField || S.mode !== "edit" || S.focus) return;
  if (k === "Enter" && S.sel && document.activeElement.closest("[data-overlay], body") && !e.target.closest("[data-dock], .capsule")) { e.preventDefault(); startEdit(); return; }
  if (["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"].includes(k) && !e.target.closest("[data-dock], .capsule")) {
    const ids = Object.keys(PARTS).filter((id) => PARTS[id].scroll === S.scroll);
    if (!ids.length) return;
    e.preventDefault();
    const i = ids.indexOf(S.sel);
    const next = ids[(i + (k === "ArrowDown" || k === "ArrowRight" ? 1 : -1) + ids.length) % ids.length] || ids[0];
    select(next);
    const hot = $(`.hot[data-part="${next}"]`); if (hot) hot.focus();
  }
});

addEventListener("resize", () => { layoutMode(); render(); });
coarse.addEventListener("change", () => { layoutMode(); render(); });
frame.addEventListener("load", () => drawOverlay());
layoutMode();
render();
window.__studio = { S, select: selectAndShow, openSurface, setMode, setFocus, goPage, startEdit };
