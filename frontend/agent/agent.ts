/**
 * The editor agent. Runs inside the draft preview (a different site from the app), draws
 * hover and selection marks, runs inline text editing and reports what the user selected.
 * The server prepends `const PAGEHAVEN_APP_ORIGIN = "...";` to this file.
 */
import { OVERLAY } from "../overlay-theme.js";
import {
  ANCHOR_ID,
  KIND_LABELS,
  STYLE_KEYS,
  envelope,
  isSafeHref,
  parseEditorMessage,
  type AgentMessage,
  type Ancestor,
  type EditorMessage,
  type Formats,
  type Kind,
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

const appOrigin = typeof PAGEHAVEN_APP_ORIGIN === "string" ? PAGEHAVEN_APP_ORIGIN : "";
const parentWindow = window.parent;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let mode: Mode = "edit";
let selected: HTMLElement | null = null;
let hovered: Element | null = null;
let blocked: Element | null = null;
let editing: Editing | null = null;
let frame = 0;

function post(message: AgentMessage): void {
  parentWindow.postMessage(envelope(message), appOrigin);
}

/* Overlay. A closed shadow root on <html>. The host resets every property inline with
   !important, so no site rule reaches it, and sits in the top layer when the browser has one. */

const host = document.createElement("pagehaven-overlay");
const shadow = host.attachShadow({ mode: "closed" });
const sheet = new CSSStyleSheet();
const O = OVERLAY;
sheet.replaceSync(`
  :host { all: initial; }
  * { box-sizing: border-box; }
  .ring { position: fixed; pointer-events: none; border-radius: 2px; }
  .ring[hidden] { display: none; }
  .glide { transition: left 140ms cubic-bezier(0.16, 1, 0.3, 1), top 140ms cubic-bezier(0.16, 1, 0.3, 1), width 140ms cubic-bezier(0.16, 1, 0.3, 1), height 140ms cubic-bezier(0.16, 1, 0.3, 1); }
  .hover { border: 1px dashed ${O.hover}; box-shadow: 0 0 0 1px ${O.halo}, inset 0 0 0 1px ${O.halo}; animation: fade 80ms ease-out; }
  .hover.blocked { border-color: ${O.muted}; }
  .select { border: ${O.stroke} solid ${O.accent}; box-shadow: 0 0 0 1px ${O.halo}, inset 0 0 0 1px ${O.halo}; }
  .select.editing { box-shadow: 0 0 0 1px ${O.halo}, 0 0 0 5px ${O.accentSoft}, inset 0 0 0 1px ${O.halo}; }
  .select.pulse { animation: pulse 400ms ease-out; }
  .blocked-box { border: ${O.stroke} dashed ${O.muted}; box-shadow: 0 0 0 1px ${O.halo}, inset 0 0 0 1px ${O.halo}; }
  .crop { position: absolute; width: ${O.cropMark}; height: ${O.cropMark}; border: 0 solid ${O.accent}; filter: drop-shadow(0 0 0.5px ${O.halo}) drop-shadow(0 0 0.5px ${O.halo}); }
  .crop.tl { left: calc(-${O.cropGap} - ${O.cropMark}); top: calc(-${O.cropGap} - ${O.cropMark}); border-right-width: ${O.stroke}; border-bottom-width: ${O.stroke}; }
  .crop.tr { right: calc(-${O.cropGap} - ${O.cropMark}); top: calc(-${O.cropGap} - ${O.cropMark}); border-left-width: ${O.stroke}; border-bottom-width: ${O.stroke}; }
  .crop.bl { left: calc(-${O.cropGap} - ${O.cropMark}); bottom: calc(-${O.cropGap} - ${O.cropMark}); border-right-width: ${O.stroke}; border-top-width: ${O.stroke}; }
  .crop.br { right: calc(-${O.cropGap} - ${O.cropMark}); bottom: calc(-${O.cropGap} - ${O.cropMark}); border-left-width: ${O.stroke}; border-top-width: ${O.stroke}; }
  .slug { position: absolute; left: -${O.stroke}; display: inline-flex; align-items: center; height: 20px; padding: 0 6px; border-radius: 0 0 2px 2px; background: ${O.chipBg}; color: ${O.chipInk}; font: 600 12px/20px system-ui, sans-serif; letter-spacing: 0.01em; white-space: nowrap; box-shadow: 0 0 0 1px ${O.halo}; }
  .slug.below { top: calc(100% + 1px); }
  .slug.above { bottom: calc(100% + 1px); border-radius: 2px 2px 0 0; }
  .slug.inside { top: 1px; left: 1px; border-radius: 0 0 2px 0; }
  .veil { position: fixed; pointer-events: none; background: repeating-linear-gradient(135deg, rgba(22, 22, 26, 0.18) 0 6px, rgba(255, 255, 255, 0.18) 6px 12px); border: 1px dashed ${O.muted}; }
  .veil[hidden] { display: none; }
  .badge { position: absolute; left: 8px; display: inline-flex; align-items: center; height: 24px; padding: 0 8px; border-radius: 3px; background: ${O.badgeBg}; color: ${O.badgeInk}; font: 600 12px/24px system-ui, sans-serif; white-space: nowrap; }
  @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pulse { 0% { box-shadow: 0 0 0 1px ${O.halo}, 0 0 0 0 ${O.accentSoft}, inset 0 0 0 1px ${O.halo}; } 40% { box-shadow: 0 0 0 1px ${O.halo}, 0 0 0 10px ${O.accentSoft}, inset 0 0 0 1px ${O.halo}; } 100% { box-shadow: 0 0 0 1px ${O.halo}, 0 0 0 0 transparent, inset 0 0 0 1px ${O.halo}; } }
  @media (prefers-reduced-motion: reduce) { .glide, .hover, .select.pulse { transition: none; animation: none; } }
`);
shadow.adoptedStyleSheets = [sheet];
host.style.setProperty("all", "initial", "important");
for (const [prop, value] of [
  ["display", "block"], ["position", "fixed"], ["inset", "0"], ["width", "100vw"], ["height", "100vh"],
  ["max-width", "none"], ["max-height", "none"], ["margin", "0"], ["padding", "0"], ["border", "0"],
  ["background", "transparent"], ["overflow", "visible"], ["z-index", "2147483647"], ["pointer-events", "none"],
  ["visibility", "visible"], ["opacity", "1"], ["contain", "layout style"], ["isolation", "isolate"],
  ["transform", "none"], ["filter", "none"], ["clip-path", "none"], ["mask", "none"], ["mix-blend-mode", "normal"],
  ["zoom", "1"], ["scale", "none"], ["rotate", "none"], ["translate", "none"], ["content-visibility", "visible"],
] as const) {
  host.style.setProperty(prop, value, "important");
}
const topLayer = typeof HTMLElement.prototype.showPopover === "function";
if (topLayer) host.setAttribute("popover", "manual");

/** Moves the overlay above anything the site put in the top layer since. */
function raise(): void {
  if (!topLayer || !host.isConnected) return;
  try {
    if (host.matches(":popover-open")) host.hidePopover();
    host.showPopover();
  } catch {
    /* Not in a state that allows the popover; the z-index still applies. */
  }
}

/* In preview mode hidden sections disappear, as on the published website. */
const previewSheet = new CSSStyleSheet();
previewSheet.replaceSync('[data-ph-hidden="true"] { display: none !important; }');
previewSheet.disabled = true;
document.adoptedStyleSheets = [...document.adoptedStyleSheets, previewSheet];

function div(className: string, parent: Node = shadow): HTMLDivElement {
  const el = document.createElement("div");
  el.className = className;
  parent.appendChild(el);
  return el;
}
const veilLayer = div("veils");
const hoverBox = div("ring hover");
const blockedBox = div("ring blocked-box");
const selectBox = div("ring select");
for (const corner of ["tl", "tr", "bl", "br"]) div(`crop ${corner}`, selectBox);
const slug = document.createElement("span");
slug.className = "slug below";
selectBox.append(slug);
for (const box of [hoverBox, blockedBox, selectBox]) box.hidden = true;

let origin = { x: 0, y: 0 };

/**
 * Positions a ring `offset` px outside the element. A side within 3 px of the viewport edge is
 * drawn just inside it instead, so a full-width header still shows four sides.
 */
function place(box: HTMLElement, el: Element | null, offset: number): DOMRect | null {
  if (!el || !el.isConnected) {
    box.hidden = true;
    return null;
  }
  const r = el.getBoundingClientRect();
  if ((r.width === 0 && r.height === 0) || r.bottom < -offset || r.top > innerHeight + offset) {
    box.hidden = true;
    return r;
  }
  const w = document.documentElement.clientWidth || innerWidth;
  const snap = (value: number, edge: number, near: number) => (Math.abs(near - edge) <= 3 ? edge : value);
  const left = snap(r.left - offset, 1, r.left);
  const top = snap(r.top - offset, 1, r.top);
  const right = snap(r.right + offset, w - 1, r.right);
  const bottom = snap(r.bottom + offset, innerHeight - 1, r.bottom);
  box.hidden = false;
  box.style.left = `${left - origin.x}px`;
  box.style.top = `${top - origin.y}px`;
  box.style.width = `${Math.max(2, right - left)}px`;
  box.style.height = `${Math.max(2, bottom - top)}px`;
  return r;
}

function placeSlug(r: DOMRect | null): void {
  if (!r) return;
  slug.textContent = editing ? "Editing" : KIND_LABELS[kindOf(selected as HTMLElement)];
  const placement = r.bottom + 26 < innerHeight ? "below" : r.top > 26 ? "above" : "inside";
  slug.className = `slug ${placement}`;
}

/* The site's own fixed and sticky bars, so the toolbar and the hidden-section veil avoid them. */

let barCandidates: Element[] | null = null;

function findBars(): Element[] {
  const out: Element[] = [];
  for (const el of document.querySelectorAll("body > *, body > * > *, header, nav")) {
    if (el === host) continue;
    const position = getComputedStyle(el).position;
    if (position === "fixed" || position === "sticky") out.push(el);
    if (out.length >= 24) break;
  }
  return out;
}

function obstructions(): Rect[] {
  barCandidates ??= findBars();
  const out: Rect[] = [];
  const vw = document.documentElement.clientWidth || innerWidth;
  for (const el of barCandidates) {
    if (!el.isConnected) continue;
    const r = el.getBoundingClientRect();
    if (r.width < vw / 2 || r.height === 0 || r.height > innerHeight / 2) continue;
    const nearTop = r.top <= innerHeight * 0.25 && r.bottom > 0;
    const nearBottom = r.bottom >= innerHeight * 0.75 && r.top < innerHeight;
    if (!nearTop && !nearBottom) continue;
    out.push(rectFrom(r));
    if (out.length === 4) break;
  }
  return out;
}

function drawHiddenSections(bars: Rect[]): void {
  const sections = mode === "edit" ? [...document.querySelectorAll('[data-ph-hidden="true"]')] : [];
  while (veilLayer.childElementCount > sections.length) veilLayer.lastElementChild?.remove();
  const topLimit = Math.max(0, ...bars.filter((b) => b.y < innerHeight / 2).map((b) => b.y + b.height));
  sections.forEach((section, i) => {
    let veil = veilLayer.children[i] as HTMLElement | undefined;
    if (!veil) {
      veil = div("veil", veilLayer);
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "Hidden on your website";
      veil.append(badge);
    }
    const r = section.getBoundingClientRect();
    const top = Math.max(r.top, topLimit);
    veil.hidden = r.height === 0 || r.bottom <= top;
    veil.style.left = `${r.left - origin.x}px`;
    veil.style.top = `${top - origin.y}px`;
    veil.style.width = `${r.width}px`;
    veil.style.height = `${Math.max(0, r.bottom - top)}px`;
    const badge = veil.firstElementChild as HTMLElement;
    badge.style.top = `${Math.min(8, Math.max(0, r.bottom - top - 32))}px`;
  });
}

function rectFrom(r: DOMRect): Rect {
  const clamp = (n: number) => Math.max(-1e6, Math.min(1e6, n));
  return { x: clamp(r.left), y: clamp(r.top), width: clamp(Math.max(0, r.width)), height: clamp(Math.max(0, r.height)) };
}

function rectOf(el: Element): Rect {
  return rectFrom(el.getBoundingClientRect());
}

function redraw(): void {
  frame = 0;
  if (!host.isConnected) start();
  const hostRect = host.getBoundingClientRect();
  origin = { x: hostRect.left, y: hostRect.top };
  const active = mode === "edit";
  const bars = active ? obstructions() : [];
  place(hoverBox, active && hovered !== selected && !editing ? hovered : null, 2);
  hoverBox.classList.toggle("blocked", hovered !== null && !canOf(hovered));
  const r = place(selectBox, active ? selected : null, 3);
  selectBox.classList.toggle("editing", editing !== null);
  if (active && selected) placeSlug(r);
  place(blockedBox, active ? blocked : null, 2);
  drawHiddenSections(bars);
  post({
    type: "viewport",
    scrollY: Math.max(0, window.scrollY),
    rect: selected ? rectOf(selected) : blocked ? rectOf(blocked) : null,
    obstructions: bars,
  });
}

function schedule(): void {
  if (!frame) frame = requestAnimationFrame(redraw);
}

/* What can be selected */

function idOf(el: Element): string | null {
  const id = el.getAttribute("data-ph-id");
  return id && /^[0-9a-z]{1,10}$/.test(id) ? id : null;
}

function canOf(el: Element): string {
  const can = el.getAttribute("data-ph-can") ?? "";
  return /^[tilsbxudc]{0,9}$/.test(can) ? can : "";
}

function editable(el: Element | null): el is HTMLElement {
  return el instanceof HTMLElement && idOf(el) !== null && canOf(el) !== "";
}

function asElement(target: EventTarget | null): Element | null {
  if (target instanceof Element) return target;
  if (target instanceof Node) return target.parentElement;
  return null;
}

/** Editable ancestors from the target up to <body>, nearest first. */
function chain(start: Element | null): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (let el: Element | null = start; el && el !== document.documentElement; el = el.parentElement) {
    if (editable(el)) out.push(el);
  }
  return out;
}

const MEDIA = new Set(["img", "picture", "video", "svg", "canvas", "iframe", "input", "textarea", "select", "button"]);

function hasPhoto(el: Element): boolean {
  return getComputedStyle(el).backgroundImage.includes("url(");
}

/** A layer with no words, no picture and no photo: a hover tint, an icon or its holder. */
function decorative(el: Element): boolean {
  if (el instanceof SVGElement) return true;
  return !MEDIA.has(el.localName) && (el.textContent ?? "").trim() === "" && !el.querySelector("img, picture, video") && !hasPhoto(el);
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

/** Looks through decorative layers (a portfolio hover tint, say) for the picture underneath. */
function pickAt(x: number, y: number, target: Element): Pick {
  for (const el of document.elementsFromPoint(x, y)) {
    if (el === host || el === document.body || el === document.documentElement) break;
    if ((el.localName === "img" || el.localName === "picture") && editable(el) && canOf(el).includes("i")) return { kind: "element", el };
    if (!decorative(el)) break;
  }
  return pick(target);
}

/* Describing the selection */

function bodyFontSize(): number {
  return parseFloat(getComputedStyle(document.body).fontSize) || 16;
}

function looksLikeButton(el: HTMLElement): boolean {
  const s = getComputedStyle(el);
  const filled = s.backgroundColor !== "rgba(0, 0, 0, 0)" && s.backgroundColor !== "transparent";
  const bordered = parseFloat(s.borderTopWidth) > 0 && s.borderTopStyle !== "none";
  return s.display !== "inline" && (filled || bordered) && parseFloat(s.paddingTop) >= 6 && parseFloat(s.paddingLeft) >= 6;
}

function kindOf(el: HTMLElement): Kind {
  const can = canOf(el);
  const tag = el.localName;
  const role = el.getAttribute("role");
  if (tag === "img" || tag === "picture" || can.includes("i")) return "image";
  if (tag === "button" || role === "button" || (tag === "a" && looksLikeButton(el))) return "button";
  if (tag === "a") return "link";
  if (/^h[1-6]$/.test(tag) || role === "heading") return "heading";
  if (can.includes("t")) {
    const s = getComputedStyle(el);
    if (parseFloat(s.fontSize) >= bodyFontSize() * 1.5 && Number(s.fontWeight) >= 600) return "heading";
  }
  if (tag === "nav" || (can.includes("x") && el.querySelector("nav"))) return "menu";
  if (tag === "header" && can.includes("x")) return "header";
  if (tag === "footer" && can.includes("x")) return "footer";
  if (can.includes("x")) return "section";
  if (tag === "li") return "list-item";
  if (can.includes("t")) return "text";
  return "box";
}

function words(text: string | null | undefined, max = 60): string {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function nameOf(el: HTMLElement, kind: Kind): string {
  if (kind === "image") return words(el.getAttribute("alt"));
  if (kind === "section" || kind === "header" || kind === "footer" || kind === "menu" || kind === "box") {
    const heading = el.querySelector("h1, h2, h3, h4, [role=heading]");
    const byId = el.id && (kind === "section" || kind === "header" || kind === "footer") ? el.id.replace(/[-_]+/g, " ") : "";
    return words(heading?.textContent ?? el.getAttribute("aria-label") ?? byId);
  }
  return words(el.textContent);
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
  const r = el.getBoundingClientRect();
  const cap = (n: number) => Math.max(0, Math.min(1e5, Math.round(n)));
  return {
    href: link ? (link.getAttribute("href") ?? "").slice(0, 2048) : null,
    newTab: link ? link.target === "_blank" : false,
    src: img ? (img.currentSrc || img.src).slice(0, 2048) : null,
    alt: img ? (img.getAttribute("alt") ?? "").slice(0, 1000) : null,
    hidden: el.getAttribute("data-ph-hidden") === "true",
    text: (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 200),
    styles: styleSnapshot(el),
    bgImage: hasPhoto(el),
    image: img ? { naturalWidth: cap(img.naturalWidth), naturalHeight: cap(img.naturalHeight), width: cap(r.width), height: cap(r.height) } : null,
  };
}

function ancestorsOf(el: HTMLElement): Ancestor[] {
  return chain(el.parentElement).slice(0, 8).map((a) => {
    const kind = kindOf(a);
    return { element: idOf(a) as string, kind, name: nameOf(a, kind) };
  });
}

function select(el: HTMLElement | null, glide = true): void {
  if (editing && editing.el !== el) commitText();
  blocked = null;
  hovered = null;
  if (selected && selected !== el) resizes.unobserve(selected);
  const moved = selected !== null && el !== null && selected !== el;
  selected = el;
  if (el) resizes.observe(el);
  const id = el ? idOf(el) : null;
  if (el && id) {
    if (moved && glide && !reducedMotion.matches) {
      selectBox.classList.add("glide");
      window.setTimeout(() => selectBox.classList.remove("glide"), 180);
    }
    const kind = kindOf(el);
    post({
      type: "select",
      element: id,
      can: canOf(el),
      tag: el.localName.slice(0, 32),
      kind,
      name: nameOf(el, kind),
      ancestors: ancestorsOf(el),
      rect: rectOf(el),
      info: info(el),
    });
  } else {
    post({ type: "deselect" });
  }
  schedule();
}

function showBlocked(el: Element): void {
  if (editing) commitText();
  selected = null;
  blocked = el;
  const around = chain(el.parentElement)[0];
  post({ type: "blocked", rect: rectOf(el), around: around ? idOf(around) : null });
  schedule();
}

function byId(id: string): HTMLElement | null {
  const el = document.querySelector(`[data-ph-id="${id}"]`);
  return el instanceof HTMLElement ? el : null;
}

function visible(el: Element): boolean {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

/** Elements the keyboard steps through: everything a click would pick, plus sections. */
function stops(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>("[data-ph-id][data-ph-can]")].filter((el) => editable(el) && /[tilx]/.test(canOf(el)) && visible(el));
}

function reveal(el: HTMLElement, pulse: boolean): void {
  const r = el.getBoundingClientRect();
  const bars = obstructions();
  const topLimit = Math.max(0, ...bars.filter((b) => b.y < innerHeight / 2).map((b) => b.y + b.height));
  if (r.top < topLimit || r.bottom > innerHeight) {
    const behavior = reducedMotion.matches ? "instant" : "smooth";
    const target = window.scrollY + r.top - topLimit - Math.max(16, (innerHeight - topLimit - r.height) / 3);
    window.scrollTo({ top: Math.max(0, target), behavior });
  }
  if (pulse && !reducedMotion.matches) {
    selectBox.classList.remove("pulse");
    void selectBox.offsetWidth;
    selectBox.classList.add("pulse");
    window.setTimeout(() => selectBox.classList.remove("pulse"), 420);
  }
}

function selectRelative(direction: "parent" | "child" | "next" | "prev"): void {
  let next: HTMLElement | null | undefined = null;
  if (direction === "parent") {
    next = selected ? chain(selected.parentElement)[0] : null;
  } else if (direction === "child") {
    next = selected ? stops().find((el) => el !== selected && selected?.contains(el)) ?? [...selected.querySelectorAll("[data-ph-id]")].find((el): el is HTMLElement => editable(el) && visible(el)) : null;
  } else {
    const list = stops();
    const current = selected;
    const index = current ? list.indexOf(current) : -1;
    if (!current) next = direction === "next" ? list[0] : list[list.length - 1];
    else if (index >= 0) next = list[direction === "next" ? index + 1 : index - 1];
    else if (direction === "next") next = list.find((el) => current.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
    else next = [...list].reverse().find((el) => current.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING);
  }
  if (!next) return;
  select(next);
  reveal(next, false);
}

/* Inline text editing */

function formats(): Formats {
  const sel = document.getSelection();
  const anchor = asElement(sel?.anchorNode ?? null);
  const root = editing?.el;
  if (!anchor || !root || !root.contains(anchor)) return { bold: false, italic: false, link: false };
  const rootStyle = getComputedStyle(root);
  const own = getComputedStyle(anchor);
  let bold = Number(own.fontWeight) > Number(rootStyle.fontWeight);
  let italic = own.fontStyle === "italic" && rootStyle.fontStyle !== "italic";
  for (let el: Element | null = anchor; el && el !== root; el = el.parentElement) {
    if (el.localName === "b" || el.localName === "strong") bold = true;
    if (el.localName === "i" || el.localName === "em") italic = true;
  }
  const link = anchor.closest("a");
  return { bold, italic, link: Boolean(link && root.contains(link)) };
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

/** Saves the typing. `reselect` re-reports the element so the toolbar shows its new state. */
function commitText(reselect = true): void {
  const current = editing;
  if (!current) return;
  const html = current.el.innerHTML;
  if (html !== current.original) post({ type: "text", element: current.id, html: html.slice(0, 65536) });
  stopText();
  if (reselect && selected === current.el) select(current.el, false);
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

/* Live previews of changes (the server applies the real change) */

function previewStyle(el: HTMLElement, styles: StyleChanges): void {
  for (const [key, value] of Object.entries(styles)) {
    if (value === null || value === undefined) el.style.removeProperty(key);
    else el.style.setProperty(key, value);
  }
}

function sameOrigin(src: string): URL | null {
  try {
    const url = new URL(src, location.href);
    return url.origin === location.origin ? url : null;
  } catch {
    return null;
  }
}

/** Re-sends the selection so the toolbar shows the element's new state. */
function refresh(el: Element | null): void {
  if (el && el === selected && !editing) select(selected, false);
  schedule();
}

function handle(message: EditorMessage): void {
  switch (message.type) {
    case "init":
      setMode(message.mode);
      if (message.scrollY !== null) window.scrollTo({ top: message.scrollY, behavior: "instant" });
      if (message.select !== null) {
        const el = byId(message.select);
        if (editable(el)) {
          select(el, false);
          reveal(el, false);
        }
      }
      break;
    case "mode":
      setMode(message.mode);
      break;
    case "select_relative":
      if (mode === "edit" && !editing) selectRelative(message.direction);
      break;
    case "select_element": {
      const el = byId(message.element);
      if (mode === "edit" && editable(el)) {
        select(el);
        reveal(el, false);
      }
      break;
    }
    case "reveal": {
      const el = byId(message.element);
      if (el) reveal(el, message.pulse);
      break;
    }
    case "deselect":
      if (editing) commitText(false);
      selected = null;
      blocked = null;
      schedule();
      break;
    case "start_text":
      select(byId(message.element), false);
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
      const url = sameOrigin(message.src);
      if (el instanceof HTMLImageElement && url) {
        el.removeAttribute("srcset");
        el.removeAttribute("sizes");
        el.src = url.href;
        el.alt = message.alt;
        el.addEventListener("load", () => refresh(el), { once: true });
      }
      break;
    }
    case "preview_background": {
      const el = byId(message.element);
      const url = sameOrigin(message.src);
      if (el && url) {
        el.style.setProperty("background-image", `url("${url.href.replace(/["\\]/g, "\\$&")}")`);
        if (!el.style.backgroundSize) el.style.setProperty("background-size", "cover");
        if (!el.style.backgroundPosition) el.style.setProperty("background-position", "center");
      }
      refresh(el);
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
  if (editing) commitText(false);
  mode = next;
  previewSheet.disabled = mode !== "preview";
  hovered = null;
  blocked = null;
  if (mode === "preview") selected = null;
  schedule();
}

/* Events. In edit mode every pointer, click and key event is caught on the window in the
   capture phase, before any site handler, so the site's own scripts (modals, carousels,
   links) stay still while the owner points at things. */

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
  if (mode !== "edit" || isOurs(event) || editing) return;
  const target = asElement(event.target);
  if (!target) return;
  const result = pickAt(event.clientX, event.clientY, target);
  hovered = result.kind === "none" ? null : result.el;
  schedule();
}, true);

document.addEventListener("mouseout", (event) => {
  if (event.relatedTarget !== null) return;
  hovered = null;
  schedule();
});
window.addEventListener("blur", () => {
  hovered = null;
  schedule();
});

for (const type of ["mousedown", "pointerdown", "mouseup", "pointerup", "touchstart", "touchend", "dblclick"] as const) {
  window.addEventListener(type, (event) => {
    if (mode !== "edit" || isOurs(event)) return;
    event.stopImmediatePropagation();
    if (editingContains(event.target)) return;
    if (event instanceof MouseEvent && event.button !== 0) return;
    if (event.cancelable) event.preventDefault();
  }, { capture: true, passive: false });
}

function previewNavigation(event: MouseEvent): void {
  if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const link = asElement(event.target)?.closest("a");
  const href = link?.getAttribute("href");
  if (!href || link?.hasAttribute("download") || link?.getAttribute("target") === "_blank") return;
  try {
    const destination = new URL(href, location.href);
    if (destination.origin === location.origin && (destination.pathname !== location.pathname || destination.search !== location.search)) {
      event.preventDefault();
      event.stopPropagation();
      post({ type: "navigate", href: destination.href.slice(0, 2048) });
    }
  } catch {
    // Invalid links keep the browser's usual behavior.
  }
}

window.addEventListener("click", (event) => {
  if (isOurs(event)) return;
  if (mode === "preview") {
    previewNavigation(event);
    return;
  }
  event.stopImmediatePropagation();
  if (editingContains(event.target)) {
    if (event.target instanceof Element && event.target.closest("a")) event.preventDefault();
    return;
  }
  event.preventDefault();
  const target = asElement(event.target);
  if (!target) return;
  const result = pickAt(event.clientX, event.clientY, target);
  if (result.kind === "element") select(result.el);
  else if (result.kind === "blocked") showBlocked(result.el);
  else select(null);
}, true);

for (const type of ["auxclick", "contextmenu"] as const) {
  window.addEventListener(type, (event) => {
    if (mode !== "edit" || isOurs(event) || editingContains(event.target)) return;
    event.stopImmediatePropagation();
    event.preventDefault();
  }, true);
}

window.addEventListener("submit", (event) => {
  if (mode !== "edit") return;
  event.stopImmediatePropagation();
  event.preventDefault();
}, true);

window.addEventListener("keydown", (event) => {
  if (editing) {
    event.stopImmediatePropagation();
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
  if (mode !== "edit") return;
  event.stopImmediatePropagation();
  if (event.key === "Escape" && (selected || blocked)) {
    event.preventDefault();
    select(null);
  } else if (event.key === "Enter" || event.key === " ") {
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
  window.addEventListener(type, (event) => {
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

/* Page facts for the editor: the site's own colours and the parts a link can jump to */

function palette(): string[] {
  const weight = new Map<string, number>();
  const add = (value: string, w: number) => {
    const hex = rgbToHex(value);
    if (!/^#[0-9a-f]{6}$/.test(hex) || w <= 0) return;
    weight.set(hex, (weight.get(hex) ?? 0) + w);
  };
  const vw = document.documentElement.clientWidth || innerWidth;
  for (const el of document.querySelectorAll<HTMLElement>("body, h1, h2, h3, h4, p, a, button, li, [data-ph-can*='x'], .btn")) {
    if (el.closest("pagehaven-overlay")) continue;
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    add(s.backgroundColor, Math.min(r.width, vw) * Math.min(r.height, 2000) / 1000);
    add(s.color, Math.min(200, (el.textContent ?? "").trim().length) + 20);
  }
  return [...weight.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([hex]) => hex);
}

function anchors(): { id: string; name: string }[] {
  const out: { id: string; name: string }[] = [];
  for (const el of document.querySelectorAll<HTMLElement>("body [id]")) {
    if (!ANCHOR_ID.test(el.id) || MEDIA.has(el.localName) || el.localName === "form" || el.localName === "nav" || !visible(el)) continue;
    const heading = /^h[1-6]$/.test(el.localName) ? el : el.querySelector("h1, h2, h3, h4");
    const region = /^(section|article|main|header|footer|aside)$/.test(el.localName);
    const name = words(heading?.textContent ?? el.getAttribute("aria-label") ?? (region ? el.id.replace(/[-_]+/g, " ") : ""));
    if (!name) continue;
    out.push({ id: el.id, name });
    if (out.length === 50) break;
  }
  return out;
}

let factsTimer = 0;
function sendFacts(): void {
  window.clearTimeout(factsTimer);
  factsTimer = window.setTimeout(() => {
    post({ type: "palette", colors: palette() });
    post({ type: "anchors", items: anchors() });
  }, 300);
}

window.addEventListener("scroll", schedule, { capture: true, passive: true });
window.addEventListener("resize", () => {
  barCandidates = null;
  schedule();
});
new MutationObserver((records) => {
  if (!host.isConnected) start();
  if (selected && !selected.isConnected) select(null);
  if (records.some((r) => r.type === "childList" || r.attributeName === "class" || r.attributeName === "style")) barCandidates = null;
  if (records.some((r) => r.attributeName === "open" && r.target !== host)) raise();
  schedule();
}).observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
document.addEventListener("toggle", (event) => {
  if (event.target !== host) raise();
}, true);
window.addEventListener("load", () => {
  schedule();
  sendFacts();
});
document.addEventListener("load", schedule, true);
document.fonts.addEventListener("loadingdone", schedule);
const resizes = new ResizeObserver(schedule);
resizes.observe(document.documentElement);

let announced = false;

function start(): void {
  if (parentWindow === window || !appOrigin) return;
  document.documentElement.append(host);
  raise();
  if (!announced) {
    announced = true;
    post({
      type: "ready",
      path: location.pathname.slice(0, 1024),
      title: document.title.slice(0, 300),
      description: (document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "").slice(0, 1000),
      scrollY: Math.max(0, window.scrollY),
    });
    sendFacts();
  }
  schedule();
}

start();
