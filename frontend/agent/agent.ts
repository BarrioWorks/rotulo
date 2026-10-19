/**
 * The editor agent. Runs inside the draft preview (a different site from the app), draws
 * hover and selection outlines, runs inline text editing and reports what the user selected.
 * The server prepends `const PAGEHAVEN_APP_ORIGIN = "...";` to this file.
 */
import {
  STYLE_KEYS,
  envelope,
  isSafeHref,
  parseEditorMessage,
  type AgentMessage,
  type EditorMessage,
  type Formats,
  type Rect,
  type SelectionInfo,
  type StyleChanges,
  type StyleSnapshot,
} from "../protocol.js";

declare const PAGEHAVEN_APP_ORIGIN: string;

type Mode = "edit" | "preview";

interface Editing {
  el: HTMLElement;
  id: string;
  original: string;
  range: Range | null;
}

const ACCENT = "#2f5ce0";
const appOrigin = typeof PAGEHAVEN_APP_ORIGIN === "string" ? PAGEHAVEN_APP_ORIGIN : "";
const parentWindow = window.parent;

let mode: Mode = "edit";
let selected: HTMLElement | null = null;
let hovered: Element | null = null;
let blocked: Element | null = null;
let editing: Editing | null = null;
let frame = 0;

function post(message: AgentMessage): void {
  parentWindow.postMessage(envelope(message), appOrigin);
}

/* Overlay: a closed shadow root on <html>, styled through a constructed sheet and inline
   !important properties so the site's CSS cannot easily reach it. */

const host = document.createElement("pagehaven-overlay");
const shadow = host.attachShadow({ mode: "closed" });
const sheet = new CSSStyleSheet();
sheet.replaceSync(`
  :host { all: initial; }
  .box { position: fixed; box-sizing: border-box; pointer-events: none; border-radius: 3px; transition: top 60ms linear, left 60ms linear, width 60ms linear, height 60ms linear; }
  .hover { border: 1.5px solid ${ACCENT}99; }
  .hover.blocked { border-style: dashed; border-color: #8a857b; }
  .select { border: 2px solid ${ACCENT}; box-shadow: 0 0 0 4px ${ACCENT}1f; }
  .select.editing { border-color: ${ACCENT}; box-shadow: 0 0 0 4px ${ACCENT}33; background: transparent; }
  .blocked-box { border: 2px dashed #8a857b; background: rgba(138, 133, 123, 0.08); }
  .hidden-veil { background: repeating-linear-gradient(135deg, rgba(248, 247, 244, 0.72) 0 10px, rgba(240, 238, 233, 0.78) 10px 20px); border: 1px dashed #b5afa4; border-radius: 0; transition: none; }
  .badge { position: absolute; top: 8px; left: 8px; display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; background: #22201c; color: #fff; font: 600 12px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; letter-spacing: 0; }
`);
shadow.adoptedStyleSheets = [sheet];
for (const [prop, value] of [
  ["position", "fixed"], ["inset", "0"], ["z-index", "2147483647"], ["pointer-events", "none"],
  ["display", "block"], ["margin", "0"], ["padding", "0"], ["border", "0"], ["background", "transparent"],
  ["transform", "none"], ["filter", "none"], ["opacity", "1"], ["visibility", "visible"],
] as const) {
  host.style.setProperty(prop, value, "important");
}

/* In preview mode hidden sections disappear, as on the published website. */
const previewSheet = new CSSStyleSheet();
previewSheet.replaceSync('[data-ph-hidden="true"] { display: none !important; }');
previewSheet.disabled = true;
document.adoptedStyleSheets = [...document.adoptedStyleSheets, previewSheet];

function makeBox(className: string): HTMLDivElement {
  const box = document.createElement("div");
  box.className = `box ${className}`;
  box.hidden = true;
  shadow.append(box);
  return box;
}
const hoverBox = makeBox("hover");
const selectBox = makeBox("select");
const blockedBox = makeBox("blocked-box");
const veilLayer = document.createElement("div");
shadow.prepend(veilLayer);

function place(box: HTMLElement, el: Element | null): void {
  if (!el || !el.isConnected) {
    box.hidden = true;
    return;
  }
  const r = el.getBoundingClientRect();
  box.hidden = r.width === 0 && r.height === 0;
  box.style.left = `${r.left - 2}px`;
  box.style.top = `${r.top - 2}px`;
  box.style.width = `${r.width + 4}px`;
  box.style.height = `${r.height + 4}px`;
}

function drawHiddenSections(): void {
  const sections = mode === "edit" ? [...document.querySelectorAll('[data-ph-hidden="true"]')] : [];
  while (veilLayer.childElementCount > sections.length) veilLayer.lastElementChild?.remove();
  sections.forEach((section, i) => {
    let veil = veilLayer.children[i] as HTMLElement | undefined;
    if (!veil) {
      veil = document.createElement("div");
      veil.className = "box hidden-veil";
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "Hidden on your website";
      veil.append(badge);
      veilLayer.append(veil);
    }
    const r = section.getBoundingClientRect();
    veil.hidden = r.height === 0;
    veil.style.left = `${r.left}px`;
    veil.style.top = `${r.top}px`;
    veil.style.width = `${r.width}px`;
    veil.style.height = `${r.height}px`;
  });
}

function rectOf(el: Element): Rect {
  const r = el.getBoundingClientRect();
  const clamp = (n: number) => Math.max(-1e6, Math.min(1e6, n));
  return { x: clamp(r.left), y: clamp(r.top), width: clamp(Math.max(0, r.width)), height: clamp(Math.max(0, r.height)) };
}

function redraw(): void {
  frame = 0;
  const active = mode === "edit";
  place(hoverBox, active && hovered !== selected ? hovered : null);
  hoverBox.classList.toggle("blocked", hovered !== null && !canOf(hovered));
  place(selectBox, active ? selected : null);
  selectBox.classList.toggle("editing", editing !== null);
  place(blockedBox, active ? blocked : null);
  drawHiddenSections();
  post({ type: "viewport", scrollY: Math.max(0, window.scrollY), rect: selected ? rectOf(selected) : blocked ? rectOf(blocked) : null });
}

function schedule(): void {
  if (!frame) frame = requestAnimationFrame(redraw);
}

/* Selection rules */

function idOf(el: Element): string | null {
  const id = el.getAttribute("data-ph-id");
  return id && /^[0-9a-z]{1,10}$/.test(id) ? id : null;
}

function canOf(el: Element): string {
  const can = el.getAttribute("data-ph-can") ?? "";
  return /^[tilsbxudc]{0,9}$/.test(can) ? can : "";
}

function asElement(target: EventTarget | null): Element | null {
  if (target instanceof Element) return target;
  if (target instanceof Node) return target.parentElement;
  return null;
}

/** Editable ancestors from the target up to <body>, nearest first. */
function chain(start: Element): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (let el: Element | null = start; el && el !== document.documentElement; el = el.parentElement) {
    if (el instanceof HTMLElement && idOf(el) && canOf(el)) out.push(el);
  }
  return out;
}

type Pick = { kind: "element"; el: HTMLElement } | { kind: "blocked"; el: Element } | { kind: "none" };

/**
 * Elements without `data-ph-id` were created by the site's JavaScript and are not editable.
 * Otherwise links and images win over text, and text wins over boxes.
 */
function pick(target: Element): Pick {
  if (target === document.body || target === document.documentElement) return { kind: "none" };
  if (!idOf(target)) {
    let outer: Element = target;
    while (outer.parentElement && !idOf(outer.parentElement) && outer.parentElement !== document.body) outer = outer.parentElement;
    return { kind: "blocked", el: outer };
  }
  const candidates = chain(target);
  const chosen = candidates.find((el) => /[il]/.test(canOf(el))) ?? candidates.find((el) => canOf(el).includes("t")) ?? candidates[0];
  return chosen ? { kind: "element", el: chosen } : { kind: "blocked", el: target };
}

function rgbToHex(value: string): string {
  const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/.exec(value);
  if (!m) return value;
  if (m[4] !== undefined && Number(m[4]) === 0) return "transparent";
  return `#${[m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("")}`;
}

function styleSnapshot(el: HTMLElement): StyleSnapshot {
  const computed = getComputedStyle(el);
  const out: StyleSnapshot = {};
  for (const key of STYLE_KEYS) {
    const raw = computed.getPropertyValue(key).trim();
    out[key] = (key === "color" || key === "background-color" ? rgbToHex(raw) : raw).slice(0, 64);
  }
  return out;
}

function info(el: HTMLElement): SelectionInfo {
  const link = el instanceof HTMLAnchorElement ? el : null;
  const img = el instanceof HTMLImageElement ? el : null;
  return {
    href: link ? (link.getAttribute("href") ?? "").slice(0, 2048) : null,
    newTab: link ? link.target === "_blank" : false,
    src: img ? (img.currentSrc || img.src).slice(0, 2048) : null,
    alt: img ? (img.getAttribute("alt") ?? "").slice(0, 1000) : null,
    hidden: el.getAttribute("data-ph-hidden") === "true",
    text: (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 200),
    styles: styleSnapshot(el),
  };
}

function hasEditableParent(el: HTMLElement): boolean {
  return el.parentElement !== null && chain(el.parentElement).length > 0;
}

function select(el: HTMLElement | null): void {
  if (editing && editing.el !== el) commitText();
  blocked = null;
  if (selected && selected !== el) resizes.unobserve(selected);
  selected = el;
  if (el) resizes.observe(el);
  const id = el ? idOf(el) : null;
  if (el && id) {
    post({ type: "select", element: id, can: canOf(el), tag: el.localName.slice(0, 32), hasParent: hasEditableParent(el), rect: rectOf(el), info: info(el) });
  } else {
    post({ type: "deselect" });
  }
  schedule();
}

function showBlocked(el: Element): void {
  if (editing) commitText();
  selected = null;
  blocked = el;
  post({ type: "blocked", rect: rectOf(el) });
  schedule();
}

function selectParent(): void {
  if (!selected?.parentElement) return;
  const parent = chain(selected.parentElement)[0];
  if (parent) select(parent);
}

/* Inline text editing */

function formats(): Formats {
  const sel = document.getSelection();
  const anchor = asElement(sel?.anchorNode ?? null);
  return {
    bold: document.queryCommandState("bold"),
    italic: document.queryCommandState("italic"),
    link: Boolean(anchor && editing && anchor.closest("a") && editing.el.contains(anchor.closest("a"))),
  };
}

function reportEditing(active: boolean): void {
  const target = editing?.el ?? selected;
  const id = target ? idOf(target) : null;
  if (!id) return;
  post({ type: "editing", element: id, active, formats: active ? formats() : { bold: false, italic: false, link: false } });
}

function startText(): void {
  if (!selected || !canOf(selected).includes("t") || editing?.el === selected) return;
  const id = idOf(selected);
  if (!id) return;
  const el = selected;
  editing = { el, id, original: el.innerHTML, range: null };
  el.setAttribute("contenteditable", "true");
  el.setAttribute("spellcheck", "true");
  el.focus({ preventScroll: true });
  document.execCommand("styleWithCSS", false, "false");
  const sel = document.getSelection();
  if (sel) {
    sel.selectAllChildren(el);
    sel.collapseToEnd();
  }

  reportEditing(true);
  schedule();
}

function stopText(): Editing | null {
  const current = editing;
  if (!current) return null;
  editing = null;
  current.el.removeAttribute("contenteditable");
  current.el.removeAttribute("spellcheck");
  if (current.el.getAttribute("class") === "") current.el.removeAttribute("class");
  reportEditing(false);
  schedule();
  return current;
}

function commitText(): void {
  const current = editing;
  if (!current) return;
  const html = current.el.innerHTML;
  if (html !== current.original) post({ type: "text", element: current.id, html: html.slice(0, 65536) });
  stopText();
  if (selected === current.el) select(current.el);
}

function cancelText(): void {
  const current = stopText();
  if (current) current.el.innerHTML = current.original;
}

function restoreRange(): void {
  if (!editing) return;
  editing.el.focus({ preventScroll: true });
  const sel = document.getSelection();
  if (editing.range && sel && !editing.el.contains(sel.anchorNode)) {
    sel.removeAllRanges();
    sel.addRange(editing.range);
  }
}

function format(command: "bold" | "italic" | "link" | "unlink", href: string | null): void {
  if (!editing) return;
  restoreRange();
  if (command === "bold" || command === "italic") {
    document.execCommand(command);
  } else if (command === "link") {
    if (!href || !isSafeHref(href)) return;
    const sel = document.getSelection();
    if (sel?.isCollapsed) document.execCommand("insertText", false, href);
    if (sel && sel.isCollapsed && sel.anchorNode) {
      sel.extend(sel.anchorNode, Math.max(0, sel.anchorOffset - href.length));
    }
    document.execCommand("createLink", false, href);
  } else {
    const sel = document.getSelection();
    const anchor = asElement(sel?.anchorNode ?? null)?.closest("a");
    if (sel && anchor && editing.el.contains(anchor) && sel.isCollapsed) sel.selectAllChildren(anchor);
    document.execCommand("unlink");
  }
  reportEditing(true);
}

/* Live previews of toolbar changes (the server applies the real change) */

function byId(id: string): HTMLElement | null {
  const el = document.querySelector(`[data-ph-id="${id}"]`);
  return el instanceof HTMLElement ? el : null;
}

function previewStyle(el: HTMLElement, styles: StyleChanges): void {
  for (const [key, value] of Object.entries(styles)) {
    if (value === null || value === undefined) el.style.removeProperty(key);
    else el.style.setProperty(key, value);
  }
}

/** Re-sends the selection so the toolbar shows the element's new state. */
function refresh(el: Element | null): void {
  if (el && el === selected && !editing) select(selected);
  schedule();
}

function handle(message: EditorMessage): void {
  switch (message.type) {
    case "init":
      setMode(message.mode);
      if (message.scrollY !== null) window.scrollTo({ top: message.scrollY, behavior: "instant" });
      if (message.select !== null) {
        const el = byId(message.select);
        if (el && canOf(el)) {
          const r = el.getBoundingClientRect();
          if (r.bottom < 0 || r.top > window.innerHeight) el.scrollIntoView({ block: "center", behavior: "smooth" });
          select(el);
        }
      }
      break;
    case "mode":
      setMode(message.mode);
      break;
    case "select_parent":
      selectParent();
      break;
    case "deselect":
      if (editing) commitText();
      selected = null;
      blocked = null;
      schedule();
      break;
    case "start_text":
      select(byId(message.element));
      startText();
      break;
    case "finish_text":
      if (message.commit) commitText();
      else cancelText();
      break;
    case "format":
      format(message.command, message.href);
      break;
    case "preview_style": {
      const el = byId(message.element);
      if (el) previewStyle(el, message.styles);
      refresh(el);
      break;
    }
    case "preview_image": {
      const el = byId(message.element);
      let url: URL | null = null;
      try {
        url = new URL(message.src, location.href);
      } catch {
        url = null;
      }
      if (el instanceof HTMLImageElement && url && url.origin === location.origin) {
        el.removeAttribute("srcset");
        el.removeAttribute("sizes");
        el.src = url.href;
        el.alt = message.alt;
        el.addEventListener("load", () => refresh(el), { once: true });
      }
      break;
    }
    case "preview_alt": {
      const el = byId(message.element);
      if (el instanceof HTMLImageElement) el.alt = message.alt;
      refresh(el);
      break;
    }
    case "preview_link": {
      const el = byId(message.element);
      if (el instanceof HTMLAnchorElement && isSafeHref(message.href)) {
        el.setAttribute("href", message.href.trim());
        if (message.newTab) {
          el.target = "_blank";
          el.rel = "noopener";
        } else {
          el.removeAttribute("target");
        }
      }
      refresh(el);
      break;
    }
    case "preview_hidden": {
      const el = byId(message.element);
      if (el) {
        if (message.hidden) el.setAttribute("data-ph-hidden", "true");
        else el.removeAttribute("data-ph-hidden");
      }
      refresh(el);
      break;
    }
  }
}

function setMode(next: Mode): void {
  if (next === mode) return;
  if (editing) commitText();
  mode = next;
  previewSheet.disabled = mode !== "preview";
  hovered = null;
  blocked = null;
  if (mode === "preview") selected = null;
  document.documentElement.style.removeProperty("cursor");
  schedule();
}

/* Events */

function isOurs(event: Event): boolean {
  return event.composedPath().includes(host);
}

function editingContains(target: EventTarget | null): boolean {
  return editing !== null && target instanceof Node && editing.el.contains(target);
}

window.addEventListener("message", (event) => {
  if (event.origin !== appOrigin || event.source !== parentWindow) return;
  const message = parseEditorMessage(event.data);
  if (message) handle(message);
});

document.addEventListener("pointerover", (event) => {
  if (mode !== "edit" || isOurs(event)) return;
  const target = asElement(event.target);
  if (!target) return;
  const result = pick(target);
  hovered = result.kind === "element" ? result.el : result.kind === "blocked" ? result.el : null;
  schedule();
}, true);

document.addEventListener("mouseout", (event) => {
  if (event.relatedTarget !== null) return;
  hovered = null;
  schedule();
});

for (const type of ["mousedown", "pointerdown"] as const) {
  document.addEventListener(type, (event) => {
    if (mode !== "edit" || isOurs(event) || editingContains(event.target)) return;
    if (event.button !== 0) return;
    event.preventDefault();
  }, true);
}

document.addEventListener("click", (event) => {
  if (mode === "preview" && !isOurs(event) && !event.defaultPrevented && event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
    const link = asElement(event.target)?.closest("a");
    const href = link?.getAttribute("href");
    if (href && !link?.hasAttribute("download") && link?.getAttribute("target") !== "_blank") {
      try {
        const destination = new URL(href, location.href);
        if (destination.origin === location.origin && (destination.pathname !== location.pathname || destination.search !== location.search)) {
          event.preventDefault();
          event.stopPropagation();
          post({ type: "navigate", href: destination.href.slice(0, 2048) });
          return;
        }
      } catch {
        // Invalid links keep the browser's usual behavior.
      }
    }
  }
  if (mode !== "edit" || isOurs(event)) return;
  if (editingContains(event.target)) {
    event.stopPropagation();
    if (event.target instanceof Element && event.target.closest("a")) event.preventDefault();
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  const target = asElement(event.target);
  if (!target) return;
  const result = pick(target);
  if (result.kind === "element") {
    select(result.el);
  } else if (result.kind === "blocked") {
    showBlocked(result.el);
  } else {
    select(null);
  }
}, true);


for (const type of ["auxclick", "contextmenu"] as const) {
  document.addEventListener(type, (event) => {
    if (mode === "edit" && !editingContains(event.target)) event.preventDefault();
  }, true);
}

document.addEventListener("submit", (event) => {
  if (mode === "edit") {
    event.preventDefault();
    event.stopPropagation();
  }
}, true);

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  const mod = event.metaKey || event.ctrlKey;
  if (editing) {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      commitText();
    } else if (event.key === "Enter" && event.shiftKey) {
      event.preventDefault();
      if (!document.execCommand("insertLineBreak")) document.execCommand("insertHTML", false, "<br>");
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelText();
    }
    return;
  }
  if (mod && (key === "z" || key === "y")) {
    event.preventDefault();
    post({ type: "shortcut", action: key === "y" || event.shiftKey ? "redo" : "undo" });
    return;
  }
  if (mode !== "edit") return;
  if (event.key === "Escape" && (selected || blocked)) {
    event.preventDefault();
    select(null);

  } else if ((event.key === "Enter" || event.key === " ") && asElement(event.target)?.closest("a, button, summary")) {
    event.preventDefault();
  }
}, true);

document.addEventListener("paste", (event) => {
  if (!editing || !editingContains(event.target)) return;
  event.preventDefault();
  const text = event.clipboardData?.getData("text/plain") ?? "";
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  lines.forEach((line, i) => {
    if (i > 0) document.execCommand("insertLineBreak");
    if (line) document.execCommand("insertText", false, line);
  });
}, true);

for (const type of ["drop", "dragstart"] as const) {
  document.addEventListener(type, (event) => {
    if (mode === "edit") event.preventDefault();
  }, true);
}

document.addEventListener("focusout", (event) => {
  if (!editing || event.target !== editing.el) return;
  window.setTimeout(() => {
    if (editing && document.hasFocus() && !editing.el.contains(document.activeElement)) commitText();
  }, 0);
});

document.addEventListener("selectionchange", () => {
  if (!editing) return;
  const sel = document.getSelection();
  if (sel && sel.rangeCount > 0 && editing.el.contains(sel.anchorNode)) {
    editing.range = sel.getRangeAt(0).cloneRange();
    reportEditing(true);
  }
});

window.addEventListener("scroll", schedule, { capture: true, passive: true });
window.addEventListener("resize", schedule);
new MutationObserver(() => {
  if (selected && !selected.isConnected) select(null);
  schedule();
}).observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
window.addEventListener("load", schedule);
document.addEventListener("load", schedule, true);
document.fonts.addEventListener("loadingdone", schedule);
const resizes = new ResizeObserver(schedule);
resizes.observe(document.documentElement);

function start(): void {
  if (parentWindow === window || !appOrigin) return;
  document.documentElement.append(host);
  post({
    type: "ready",
    path: location.pathname.slice(0, 1024),
    title: document.title.slice(0, 300),
    description: (document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "").slice(0, 1000),
    scrollY: Math.max(0, window.scrollY),
  });
  schedule();
}

start();
