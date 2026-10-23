import { GRID_EQUAL, GRID_FIT, isSafeHref, isStyleValue, type StyleChanges, type StyleKey, type StyleSnapshot } from "../protocol.js";
import { announce, h, icon, toast } from "../ui.js";
import { api } from "./api.js";
import type { Canvas } from "./canvas.js";
import type { Edits, Fit } from "./edits.js";
import { pageLabel } from "./pages.js";
import { type Change } from "./saves.js";
import { LAYOUT_STYLE_KEYS, selection, type Panel, type Selection, type Store } from "./state.js";
import { checkEmail, checkPhone, checkWeb, classifyHref, relativeHref, type LinkCheck } from "./links.js";

export interface PanelContext {
  store: Store;
  canvas: Canvas;
  change: Change;
  edits: Edits;
  /** Closes the panel and returns focus to whatever opened it. */
  close(): void;
  /** The image panel opened right after a replacement. */
  replaced: boolean;
}

export const PANEL_TITLES: Record<Panel, string> = {
  style: "Text style",
  layout: "Size and layout",
  background: "Background",
  link: "Link",
  "text-link": "Link the selected words",
  image: "Image",
  page: "Page settings",
};

export const SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "30px", "36px", "48px", "60px", "72px", "96px"];
export const SPACES = ["0", "4px", "8px", "12px", "16px", "24px", "32px", "48px", "64px", "96px", "128px"];
const WEIGHTS: [string, string][] = [["300", "Light"], ["400", "Regular"], ["500", "Medium"], ["600", "Semibold"], ["700", "Bold"], ["800", "Heavy"]];

/** Plain names for swatches, so a screen reader says "dark navy" rather than a hex code. */
const COLOR_NAMES: [string, number, number, number][] = [
  ["black", 0, 0, 0], ["white", 255, 255, 255], ["dark grey", 34, 37, 41], ["dark grey", 64, 64, 64], ["grey", 128, 128, 128], ["light grey", 211, 211, 211],
  ["off-white", 245, 243, 238], ["dark navy", 20, 30, 70], ["navy", 0, 0, 128], ["blue", 40, 100, 220], ["light blue", 160, 200, 240],
  ["teal", 0, 128, 128], ["green", 40, 150, 70], ["dark green", 20, 80, 40], ["olive", 128, 128, 0], ["yellow", 250, 210, 40],
  ["orange", 240, 140, 30], ["brown", 120, 70, 30], ["red", 210, 40, 40], ["dark red", 120, 20, 20], ["pink", 240, 150, 180],
  ["purple", 120, 60, 170], ["beige", 230, 215, 185],
];

export function colorName(hex: string): string {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return hex;
  const [r, g, b] = [m[1], m[2], m[3]].map((x) => parseInt(x ?? "0", 16)) as [number, number, number];
  let best = COLOR_NAMES[0] as (typeof COLOR_NAMES)[number];
  let bestDistance = Infinity;
  for (const entry of COLOR_NAMES) {
    const d = (entry[1] - r) ** 2 + (entry[2] - g) ** 2 + (entry[3] - b) ** 2;
    if (d < bestDistance) {
      bestDistance = d;
      best = entry;
    }
  }
  return best[0];
}

/** Steps a value to the next larger or smaller step of a scale. */
export function step(scale: string[], current: string | undefined, direction: 1 | -1): string {
  const px = (v: string) => (v === "0" ? 0 : parseFloat(v));
  const value = current ? parseFloat(current) || 0 : 0;
  const next = direction > 0 ? scale.find((v) => px(v) > value + 0.5) : [...scale].reverse().find((v) => px(v) < value - 0.5);
  return next ?? (direction > 0 ? scale[scale.length - 1] : scale[0]) ?? "0";
}

function field(label: string, control: HTMLElement, hint?: string): HTMLElement {
  return h("div", { class: "field" }, h("span", { class: "label", text: label }), control, hint ? h("span", { class: "hint", text: hint }) : null);
}

function group(title: string, ...children: (HTMLElement | null)[]): HTMLElement {
  return h("section", { class: "rail-group", attrs: { "aria-label": title } }, h("h3", { class: "rail-group-title", text: title }), ...children);
}

function swatches(ctx: PanelContext, keyPrefix: string, current: string | undefined, onPick: (value: string | null) => void): HTMLElement {
  const site = ctx.store.get().palette;
  const colors = [...new Set([...site, "#ffffff", "#000000"])].slice(0, 12);
  const row = h("div", { class: "swatches", attrs: { role: "group", "aria-label": "Colours" } });
  if (current === "transparent") {
    // No colour of its own: the page shows through. Shown as a checkerboard, never as black.
    row.append(h("span", { class: "swatch swatch-none", attrs: { role: "img", "aria-label": "Now: none, the page shows through", "data-tip": "None. The page shows through." } }));
  }
  colors.forEach((color, i) => {
    const name = site.includes(color) ? `Site colour ${i + 1}, ${colorName(color)}` : colorName(color);
    const s = h("button", { class: "swatch", attrs: { type: "button", "data-key": `${keyPrefix}:${color}`, "aria-label": name, "data-tip": name, "aria-pressed": String(current?.toLowerCase() === color) } });
    s.style.background = color;
    s.addEventListener("click", () => onPick(color));
    row.append(s);
  });
  const custom = h("input", { class: "color-input", attrs: { type: "color", "data-key": `${keyPrefix}:custom`, "aria-label": "Pick any colour", "data-tip": "Pick any colour" } });
  custom.value = current && /^#[0-9a-f]{6}$/i.test(current) ? current : "#ffffff";
  custom.addEventListener("change", () => onPick(custom.value));
  const reset = h("button", { class: "btn btn-ghost btn-sm", text: "Original", attrs: { type: "button", "data-key": `${keyPrefix}:reset`, "data-tip": "Back to the website's own colour" } });
  reset.addEventListener("click", () => onPick(null));
  row.append(custom, reset);
  return row;
}

function stepper(key: string, label: string, value: string, onStep: (direction: 1 | -1) => void, onReset: () => void, words: [string, string] = ["Less", "More"]): HTMLElement {
  const less = h("button", { class: "btn btn-secondary btn-sm", text: words[0], attrs: { type: "button", "data-key": `${key}:less`, "aria-label": `${words[0]} ${label.toLowerCase()}` } });
  const more = h("button", { class: "btn btn-secondary btn-sm", text: words[1], attrs: { type: "button", "data-key": `${key}:more`, "aria-label": `${words[1]} ${label.toLowerCase()}` } });
  const reset = h("button", { class: "link-btn rail-reset", text: "Original", attrs: { type: "button", "data-key": `${key}:reset`, "aria-label": `${label}: back to the original` } });
  less.addEventListener("click", () => onStep(-1));
  more.addEventListener("click", () => onStep(1));
  reset.addEventListener("click", onReset);
  return h("div", { class: "field" },
    h("div", { class: "label-row" }, h("span", { class: "label", text: label }), reset),
    h("div", { class: "stepper" }, less, h("output", { class: "stepper-value tnum", text: value, attrs: { "aria-live": "polite" } }), more));
}

function px(value: string | undefined): string {
  if (!value) return "Original";
  const n = parseFloat(value);
  return Number.isFinite(n) ? `${Math.round(n)} px` : value;
}

/* Text style */

function stylePanel(ctx: PanelContext, sel: Selection): HTMLElement {
  const st = sel.info.styles;
  const set = (styles: StyleChanges) => void ctx.edits.setStyle(sel, styles);
  const pick = (key: StyleKey) => (value: string | null) => {
    if (value !== null && !isStyleValue(key, value)) return;
    set({ [key]: value });
  };
  const weight = h("select", { class: "select input-sm", attrs: { id: "rail-weight", "data-key": "weight" } },
    h("option", { text: "Original", attrs: { value: "" } }),
    ...WEIGHTS.map(([value, text]) => h("option", { text, attrs: { value } })));
  weight.value = WEIGHTS.some(([v]) => v === st["font-weight"]) ? (st["font-weight"] as string) : "";
  weight.addEventListener("change", () => pick("font-weight")(weight.value || null));
  const align = h("div", { class: "seg seg-icon", attrs: { role: "group", "aria-label": "Alignment" } },
    ...(["left", "center", "right"] as const).map((a) => {
      const pressed = st["text-align"] === a || (a === "left" && (st["text-align"] === "start" || st["text-align"] === "justify"));
      const b = h("button", { attrs: { type: "button", "data-key": `align:${a}`, "aria-label": `Align ${a}`, "data-tip": `Align ${a}`, "aria-pressed": String(pressed) } }, icon(`align-${a}`, "icon-sm"));
      b.addEventListener("click", () => set({ "text-align": a }));
      return b;
    }));
  const reset = h("button", { class: "btn btn-ghost btn-sm", text: "Reset text style", attrs: { type: "button", "data-key": "reset-text" } });
  reset.addEventListener("click", () => set({ color: null, "font-size": null, "font-weight": null, "text-align": null }));
  return h("div", { class: "rail-panel-body" },
    group("Colour", swatches(ctx, "color", st.color, pick("color"))),
    group("Size and weight",
      stepper("size", "Size", px(st["font-size"]), (d) => set({ "font-size": step(SIZES, st["font-size"], d) }), () => set({ "font-size": null }), ["Smaller", "Larger"]),
      h("label", { class: "field", attrs: { for: "rail-weight" } }, h("span", { class: "label", text: "Weight" }), weight)),
    group("Alignment", align),
    h("div", { class: "rail-actions" }, reset));
}

/* Size and layout */

const SIDES = ["top", "right", "bottom", "left"] as const;
const GAPS = ["0", "4px", "8px", "12px", "16px", "24px", "32px", "48px", "64px"];
const RADII = ["0", "2px", "4px", "8px", "12px", "16px", "24px", "32px", "999px"];
const BORDERS = ["0", "1px", "2px", "3px", "4px", "6px", "8px"];

type Arrangement = "block" | "row" | "column" | "grid";
const ARRANGEMENTS: [Arrangement, string, StyleChanges][] = [
  ["block", "Stack", { display: "block", "flex-direction": null, "flex-wrap": null, "justify-content": null, "align-items": null, "grid-template-columns": null, gap: null }],
  ["row", "Row", { display: "flex", "flex-direction": "row", "grid-template-columns": null }],
  ["column", "Column", { display: "flex", "flex-direction": "column", "grid-template-columns": null }],
  ["grid", "Grid", { display: "grid", "flex-direction": null, "flex-wrap": null, "justify-content": null, "grid-template-columns": GRID_EQUAL(2) }],
];

export function arrangementOf(st: StyleSnapshot): Arrangement {
  const display = st.display ?? "";
  if (display.endsWith("grid")) return "grid";
  if (display.endsWith("flex")) return (st["flex-direction"] ?? "row").startsWith("column") ? "column" : "row";
  return "block";
}

const GRID_CHOICES: [string, string][] = [
  ...[1, 2, 3, 4, 5, 6].map((n): [string, string] => [GRID_EQUAL(n), `${n} equal column${n === 1 ? "" : "s"}`]),
  ...[160, 240, 320].map((px): [string, string] => [GRID_FIT(px), `As many as fit, at least ${px} px wide`]),
];
const JUSTIFY: [string, string][] = [["flex-start", "Start"], ["center", "Centre"], ["flex-end", "End"], ["space-between", "Spread out"], ["space-evenly", "Even spacing"]];
const ALIGN_ITEMS: [string, string][] = [["stretch", "Stretch to fill"], ["flex-start", "Start"], ["center", "Centre"], ["flex-end", "End"], ["baseline", "Text baseline"]];

/** Reads what the owner typed: a bare number is pixels, `auto` and the other keywords pass through. */
export function parseDimension(key: StyleKey, typed: string): string | null | undefined {
  const text = typed.trim().toLowerCase().replace(/\s+/g, "");
  if (text === "") return null;
  const value = /^\d+(?:\.\d+)?$/.test(text) ? (text === "0" ? "0" : `${text}px`) : text;
  return isStyleValue(key, value) ? value : undefined;
}

function choice(id: string, label: string, options: [string, string][], current: string | undefined, onPick: (value: string | null) => void): HTMLElement {
  const select = h("select", { class: "select input-sm", attrs: { id, "data-key": id } },
    h("option", { text: "Original", attrs: { value: "" } }),
    ...options.map(([value, text]) => h("option", { text, attrs: { value } })));
  select.value = options.some(([v]) => v === current) ? (current as string) : "";
  select.addEventListener("change", () => onPick(select.value || null));
  return h("label", { class: "field", attrs: { for: id } }, h("span", { class: "label", text: label }), select);
}

const PRESET_NAMES: Record<string, string> = {
  auto: "Automatic", "fit-content": "Fit the content", "100%": "Full width of its space", none: "No limit",
  "50vh": "Half the screen height", "100vh": "The full screen height",
};

/** A typed size with quick presets. Shows the value set on this part, or what the page computes now. */
function dimension(ctx: PanelContext, sel: Selection, key: StyleKey, label: string, presets: [string, string][], hint: string): HTMLElement {
  const own = sel.info.own?.[key];
  const now = sel.info.styles[key];
  const id = `rail-${key}`;
  const input = h("input", { class: "input input-sm tnum", attrs: { id, type: "text", inputmode: "decimal", autocomplete: "off", spellcheck: "false", "data-key": key, placeholder: now ? `Now ${now === "none" ? "no limit" : px(now)}` : "Original" } });
  input.value = own ?? "";
  const error = h("span", { class: "hint field-error", attrs: { id: `${id}-error`, "aria-live": "polite" } });
  // Enter and the change on leaving the field both commit; only the first may save.
  let committed = own ?? null;
  const commit = () => {
    const value = parseDimension(key, input.value);
    if (value === undefined) {
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", error.id);
      error.textContent = hint;
      return;
    }
    input.removeAttribute("aria-invalid");
    error.textContent = "";
    input.value = value ?? "";
    if (value === committed) return;
    committed = value;
    void ctx.edits.setStyle(sel, { [key]: value });
  };
  input.addEventListener("change", commit);
  input.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); commit(); } });
  const quick = h("div", { class: "seg seg-fill", attrs: { role: "group", "aria-label": `${label} presets` } },
    ...presets.map(([value, text]) => {
      const b = h("button", { text, attrs: { type: "button", "data-key": `${key}:${value}`, "aria-pressed": String(own === value), "aria-label": `${label}: ${PRESET_NAMES[value] ?? text}`, "data-tip": PRESET_NAMES[value] ?? value } });
      b.addEventListener("click", () => void ctx.edits.setStyle(sel, { [key]: value }));
      return b;
    }));
  const reset = h("button", { class: "link-btn rail-reset", text: "Original", attrs: { type: "button", "data-key": `${key}:reset`, "aria-label": `${label}: back to the original` } });
  reset.hidden = own === undefined;
  reset.addEventListener("click", () => void ctx.edits.setStyle(sel, { [key]: null }));
  return h("div", { class: "field" },
    h("div", { class: "label-row" }, h("label", { class: "label", text: label, attrs: { for: id } }), reset),
    h("div", { class: "dimension" }, input, quick), error);
}

/** Remembers which advanced sections are open, since the panel is rebuilt after every change. */
const openSections = new Set<string>();

function more(key: string, title: string, ...children: (HTMLElement | null)[]): HTMLElement {
  const details = h("details", { class: "disclosure rail-more", attrs: { "data-section": key } },
    h("summary", { attrs: { "data-key": `more:${key}` } }, icon("chevron-right", "icon-sm"), h("span", { text: title })),
    h("div", { class: "rail-more-body" }, ...children));
  (details as HTMLDetailsElement).open = openSections.has(key);
  details.addEventListener("toggle", () => {
    if ((details as HTMLDetailsElement).open) openSections.add(key);
    else openSections.delete(key);
  });
  return details;
}

function sideInputs(ctx: PanelContext, sel: Selection, prefix: "margin" | "padding", label: string): HTMLElement {
  return h("fieldset", { class: "sides" }, h("legend", { class: "label", text: label }),
    ...SIDES.map((side) => {
      const key = `${prefix}-${side}` as StyleKey;
      const id = `rail-${key}`;
      const input = h("input", { class: "input input-sm tnum", attrs: { id, type: "text", inputmode: "decimal", autocomplete: "off", "data-key": key, placeholder: px(sel.info.styles[key]) } });
      input.value = sel.info.own?.[key] ?? "";
      input.addEventListener("change", () => {
        const value = parseDimension(key, input.value);
        if (value === undefined) { input.setAttribute("aria-invalid", "true"); return; }
        input.removeAttribute("aria-invalid");
        void ctx.edits.setStyle(sel, { [key]: value });
      });
      return h("label", { class: "side", attrs: { for: id } }, h("span", { class: "side-name", text: side[0]?.toUpperCase() + side.slice(1) }), input);
    }));
}

function layoutPanel(ctx: PanelContext, sel: Selection): HTMLElement {
  const st = sel.info.styles;
  const set = (styles: StyleChanges) => void ctx.edits.setStyle(sel, styles);
  const norm = (v: string | undefined) => (v === "0px" ? "0" : v);
  const lengthHint = "Use a number with px, %, rem or em, or one of the buttons.";
  const centred = sel.info.own?.["margin-left"] === "auto" && sel.info.own["margin-right"] === "auto";
  const centre = h("button", { class: "btn btn-secondary btn-sm", text: centred ? "Stop centring" : "Centre in its space", attrs: { type: "button", "data-key": "centre", "aria-pressed": String(centred) } });
  centre.addEventListener("click", () => set(centred ? { "margin-left": null, "margin-right": null } : { "margin-left": "auto", "margin-right": "auto" }));
  const padding = st["padding-top"] === st["padding-bottom"] ? st["padding-top"] : undefined;
  const body = h("div", { class: "rail-panel-body" },
    h("p", { class: "hint", text: "Changes here apply on every screen size." }),
    group("Size",
      dimension(ctx, sel, "width", "Width", [["auto", "Auto"], ["fit-content", "Fit"], ["100%", "Full"]], lengthHint),
      dimension(ctx, sel, "max-width", "Maximum width", [["none", "None"], ["640px", "640"], ["960px", "960"], ["1200px", "1200"]], lengthHint),
      dimension(ctx, sel, "height", "Height", [["auto", "Auto"], ["50vh", "Half"], ["100vh", "Screen"]], "Use a number with px, %, vh, rem or em, or one of the buttons."),
      h("div", { class: "rail-actions" }, centre),
      more("size", "Minimum height", dimension(ctx, sel, "min-height", "Minimum height", [["240px", "240"], ["480px", "480"], ["100vh", "Screen"]], "Use a number with px, %, vh, rem or em."))),
    group("Spacing",
      stepper("space-above", "Space above", px(norm(st["margin-top"])), (d) => set({ "margin-top": step(SPACES, st["margin-top"], d) }), () => set({ "margin-top": null })),
      stepper("space-below", "Space below", px(norm(st["margin-bottom"])), (d) => set({ "margin-bottom": step(SPACES, st["margin-bottom"], d) }), () => set({ "margin-bottom": null })),
      stepper("space-inside", "Space inside", px(norm(padding)), (d) => {
        const v = step(SPACES, padding, d);
        set({ "padding-top": v, "padding-bottom": v, "padding-left": v, "padding-right": v });
      }, () => set({ "padding-top": null, "padding-bottom": null, "padding-left": null, "padding-right": null })),
      more("sides", "Each side", sideInputs(ctx, sel, "margin", "Space outside"), sideInputs(ctx, sel, "padding", "Space inside"))));
  if (sel.can.includes("n")) body.append(arrangementGroup(ctx, sel));
  body.append(group("Border and corners",
    stepper("corners", "Rounded corners", px(norm(st["border-radius"])), (d) => set({ "border-radius": step(RADII, st["border-radius"], d) }), () => set({ "border-radius": null })),
    more("border", "Border, see-through and clipping",
      stepper("border", "Border width", px(norm(st["border-width"])), (d) => {
        const width = step(BORDERS, st["border-width"], d);
        set({ "border-width": width, "border-style": width === "0" ? null : st["border-style"] && st["border-style"] !== "none" ? st["border-style"] : "solid" });
      }, () => set({ "border-width": null, "border-style": null, "border-color": null })),
      choice("rail-border-style", "Border line", [["solid", "Solid"], ["dashed", "Dashed"], ["dotted", "Dotted"], ["double", "Double"], ["none", "None"]], st["border-style"], (v) => set({ "border-style": v })),
      field("Border colour", swatches(ctx, "border", st["border-color"], (v) => set({ "border-color": v }))),
      opacity(ctx, sel),
      choice("rail-overflow", "Content that doesn't fit", [["visible", "Show it"], ["hidden", "Clip it"], ["auto", "Scroll when needed"]], st.overflow, (v) => set({ overflow: v })))));
  const reset = h("button", { class: "btn btn-ghost btn-sm", text: "Reset size and layout", attrs: { type: "button", "data-key": "reset-layout" } });
  reset.addEventListener("click", () => set(Object.fromEntries(LAYOUT_STYLE_KEYS.map((k) => [k, null]))));
  body.append(h("div", { class: "rail-actions" }, reset));
  return body;
}

function arrangementGroup(ctx: PanelContext, sel: Selection): HTMLElement {
  const st = sel.info.styles;
  const set = (styles: StyleChanges) => void ctx.edits.setStyle(sel, styles);
  const current = arrangementOf(st);
  const seg = h("div", { class: "seg seg-fill", attrs: { role: "group", "aria-label": "Arrange the parts inside" } },
    ...ARRANGEMENTS.map(([id, text, styles]) => {
      const b = h("button", { text, attrs: { type: "button", "data-key": `arrange:${id}`, "aria-pressed": String(current === id) } });
      b.addEventListener("click", () => set(styles));
      return b;
    }));
  const gap = stepper("gap", "Space between", px(st.gap === "normal" ? "0" : st.gap), (d) => set({ gap: step(GAPS, st.gap === "normal" ? "0" : st.gap, d) }), () => set({ gap: null }));
  const children: HTMLElement[] = [seg];
  if (current === "grid") {
    const own = sel.info.own?.["grid-template-columns"];
    const tracks = (st["grid-template-columns"] ?? "").split(/\s+/).filter((t) => t && t !== "none").length;
    children.push(choice("rail-grid", "Columns", GRID_CHOICES, own, (v) => set({ "grid-template-columns": v })));
    if (!own && tracks > 0) children.push(h("p", { class: "hint", text: `Now ${tracks} column${tracks === 1 ? "" : "s"}, set by the website.` }));
    children.push(gap);
  } else if (current !== "block") {
    const wrap = h("input", { attrs: { type: "checkbox", "data-key": "wrap" } });
    wrap.checked = st["flex-wrap"] === "wrap";
    wrap.addEventListener("change", () => set({ "flex-wrap": wrap.checked ? "wrap" : "nowrap" }));
    children.push(
      choice("rail-justify", current === "row" ? "Across" : "Down", JUSTIFY, st["justify-content"], (v) => set({ "justify-content": v })),
      choice("rail-align", current === "row" ? "Up and down" : "Side to side", ALIGN_ITEMS, st["align-items"], (v) => set({ "align-items": v })),
      gap,
      h("label", { class: "switch" }, wrap, h("span", { class: "switch-track", attrs: { "aria-hidden": "true" } }), h("span", { text: "Wrap onto new lines when there's no room" })));
  }
  return group("Arrangement", ...children);
}

function opacity(ctx: PanelContext, sel: Selection): HTMLElement {
  const now = Math.round(parseFloat(sel.info.styles.opacity ?? "1") * 100);
  const range = h("input", { class: "range", attrs: { id: "rail-opacity", type: "range", min: "0", max: "100", step: "5", "data-key": "opacity", "aria-valuetext": `${now}% visible` } });
  range.value = String(Number.isFinite(now) ? now : 100);
  const out = h("output", { class: "tnum", text: `${range.value}%`, attrs: { for: "rail-opacity" } });
  const value = () => { const n = Number(range.value); return n >= 100 ? "1" : n === 0 ? "0" : String(n / 100); };
  range.addEventListener("input", () => {
    out.textContent = `${range.value}%`;
    range.setAttribute("aria-valuetext", `${range.value}% visible`);
    ctx.canvas.send({ type: "preview_style", element: sel.element, styles: { opacity: value() } });
  });
  range.addEventListener("change", () => void ctx.edits.setStyle(sel, { opacity: value() }));
  return h("div", { class: "field" },
    h("div", { class: "label-row" }, h("label", { class: "label", text: "Visible", attrs: { for: "rail-opacity" } }), out), range);
}

/* Background */

function backgroundPanel(ctx: PanelContext, sel: Selection): HTMLElement {
  const st = sel.info.styles;
  const set = (styles: StyleChanges) => void ctx.edits.setStyle(sel, styles);
  const body = h("div", { class: "rail-panel-body" });
  if (sel.can.includes("s")) {
    body.append(group("Background colour", swatches(ctx, "bg", st["background-color"], (v) => set({ "background-color": v }))));
  }
  if (sel.can.includes("b")) {
    const replace = h("button", { class: "btn btn-secondary btn-sm", attrs: { type: "button", "data-key": "bg-photo" } }, icon("replace-image", "icon-sm"), h("span", { text: sel.info.bgImage ? "Replace photo" : "Add a photo" }));
    replace.addEventListener("click", async () => {
      const file = await ctx.edits.chooseImage();
      if (!file) return;
      replace.setAttribute("aria-busy", "true");
      await ctx.edits.replaceBackground(sel.element, file, () => {});
      replace.removeAttribute("aria-busy");
    });
    body.append(group("Background photo",
      h("p", { class: "hint", text: sel.info.bgImage ? "This part shows a photo behind its content." : "Show a photo behind this part." }),
      h("div", { class: "rail-actions" }, replace)));
  }
  return body;
}

/* Links */

type Destination = "page" | "anchor" | "web" | "email" | "phone";

const DESTINATIONS: [Destination, string][] = [
  ["page", "A page on this website"],
  ["anchor", "A part of this page"],
  ["web", "A web address"],
  ["email", "An email address"],
  ["phone", "A phone number"],
];

function linkForm(ctx: PanelContext, initialHref: string, opts: { newTab: boolean | null; submitLabel: string; onSubmit(href: string, newTab: boolean, showError: (message: string) => void): void }): HTMLElement {
  const s = ctx.store.get();
  const pages = s.pages.map((p) => p.path);
  const initial = classifyHref(initialHref, s.path, pages);
  const anchors = s.anchors;
  let kind: Destination = initial.kind === "empty" ? (pages.length > 1 ? "page" : "web") : initial.kind;
  if (kind === "anchor" && anchors.length === 0 && initial.kind !== "anchor") kind = "web";

  const typeSelect = h("select", { class: "select input-sm", attrs: { id: "rail-link-type", "data-key": "link-type", "data-autofocus": "" } },
    ...DESTINATIONS.filter(([d]) => d !== "anchor" || anchors.length > 0 || initial.kind === "anchor").map(([value, text]) => h("option", { text, attrs: { value } })));
  typeSelect.value = kind;

  const pageSelect = h("select", { class: "select input-sm", attrs: { id: "rail-link-page", "data-key": "link-page" } },
    ...s.pages.map((p) => h("option", { text: pageLabel(p, s.project.name, s.pages), attrs: { value: p.path } })));
  if (initial.kind === "page") pageSelect.value = initial.path;
  const anchorSelect = h("select", { class: "select input-sm", attrs: { id: "rail-link-anchor", "data-key": "link-anchor" } },
    h("option", { text: "Top of the page", attrs: { value: "" } }),
    ...anchors.map((a) => h("option", { text: a.name, attrs: { value: a.id } })));
  if (initial.kind === "anchor") {
    if (initial.id && !anchors.some((a) => a.id === initial.id)) anchorSelect.append(h("option", { text: `#${initial.id}`, attrs: { value: initial.id } }));
    anchorSelect.value = initial.id;
  }
  const input = (id: string, type: string, placeholder: string, value: string) => {
    const el = h("input", { class: "input input-sm", attrs: { id, type, placeholder, spellcheck: "false", autocomplete: "off", "data-key": id, "aria-describedby": "rail-link-error" } });
    el.value = value;
    return el;
  };
  const web = input("rail-link-web", "text", "https://example.com", initial.kind === "web" ? initialHref : "");
  web.setAttribute("inputmode", "url");
  const email = input("rail-link-email", "email", "name@example.com", initial.kind === "email" ? initialHref.replace(/^mailto:/i, "") : "");
  const phone = input("rail-link-phone", "tel", "+44 20 1234 5678", initial.kind === "phone" ? initialHref.replace(/^tel:/i, "") : "");
  const newTab = h("input", { attrs: { type: "checkbox", "data-key": "link-new-tab" } });
  newTab.checked = opts.newTab ?? false;
  const newTabRow = opts.newTab === null ? null : h("label", { class: "switch" }, newTab, h("span", { class: "switch-track", attrs: { "aria-hidden": "true" } }), h("span", { text: "Open in a new tab" }));
  const error = h("p", { class: "field-error", attrs: { id: "rail-link-error", role: "alert" }, hidden: true });
  const goTo = h("button", { class: "link-btn", text: "Open this page in the editor", attrs: { type: "button", "data-key": "link-go" } });
  goTo.addEventListener("click", () => ctx.canvas.open(pageSelect.value));

  const rows: Record<Destination, HTMLElement> = {
    page: h("div", { class: "stack" }, h("label", { class: "field", attrs: { for: "rail-link-page" } }, h("span", { class: "label", text: "Page" }), pageSelect), goTo),
    anchor: h("label", { class: "field", attrs: { for: "rail-link-anchor" } }, h("span", { class: "label", text: "Part of this page" }), anchorSelect),
    web: h("div", { class: "stack" }, h("label", { class: "field", attrs: { for: "rail-link-web" } }, h("span", { class: "label", text: "Web address" }), web), newTabRow),
    email: h("label", { class: "field", attrs: { for: "rail-link-email" } }, h("span", { class: "label", text: "Email address" }), email),
    phone: h("label", { class: "field", attrs: { for: "rail-link-phone" } }, h("span", { class: "label", text: "Phone number" }), phone),
  };

  function clearError(): void {
    error.hidden = true;
    for (const el of [web, email, phone]) el.removeAttribute("aria-invalid");
  }

  function sync(): void {
    kind = typeSelect.value as Destination;
    for (const [d, row] of Object.entries(rows)) row.hidden = d !== kind;
    goTo.hidden = pageSelect.value === s.path;
    clearError();
  }
  typeSelect.addEventListener("change", sync);
  pageSelect.addEventListener("change", sync);
  sync();

  /** The link to save, or what to fix. The server's own check stays the authority. */
  function check(): LinkCheck {
    switch (kind) {
      case "page": {
        const hash = initial.kind === "page" && initial.path === pageSelect.value ? initial.hash : "";
        return { ok: true, href: relativeHref(s.path, pageSelect.value) + hash };
      }
      case "anchor":
        return { ok: true, href: `#${anchorSelect.value}` };
      case "email":
        return checkEmail(email.value);
      case "phone":
        return checkPhone(phone.value);
      case "web":
        return checkWeb(web.value);
    }
  }

  function fieldFor(): HTMLInputElement | null {
    return kind === "web" ? web : kind === "email" ? email : kind === "phone" ? phone : null;
  }

  function showError(message: string, focus = true): void {
    error.textContent = message;
    error.hidden = false;
    const fieldEl = fieldFor();
    fieldEl?.setAttribute("aria-invalid", "true");
    if (focus) fieldEl?.focus();
  }

  // Once an error shows, it follows the typing and clears as soon as the value works.
  for (const el of [web, email, phone]) {
    el.addEventListener("input", () => {
      if (error.hidden) return;
      const result = check();
      if (result.ok) clearError();
      else showError(result.message, false);
    });
  }

  const submit = h("button", { class: "btn btn-secondary btn-sm", text: opts.submitLabel, attrs: { type: "submit", "data-key": "link-save" } });
  const form = h("form", { class: "rail-panel-body", attrs: { novalidate: "" } },
    h("label", { class: "field", attrs: { for: "rail-link-type" } }, h("span", { class: "label", text: "Goes to" }), typeSelect),
    ...Object.values(rows), error,
    h("div", { class: "rail-actions" }, submit));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const result = check();
    if (!result.ok) {
      showError(result.message);
      return;
    }
    if (!isSafeHref(result.href)) {
      showError("That link can't be used. Use a web address, an email address, a phone number or a page of this website.");
      return;
    }
    opts.onSubmit(result.href, newTab.checked, showError);
  });
  return form;
}

function linkPanel(ctx: PanelContext, sel: Selection): HTMLElement {
  return linkForm(ctx, sel.info.href ?? "", {
    newTab: sel.info.newTab,
    submitLabel: "Save link",
    onSubmit(href, newTab, showError) {
      const { store, canvas, change } = ctx;
      const page = store.get().path;
      canvas.send({ type: "preview_link", element: sel.element, href, newTab: kindIsWeb(href) && newTab });
      void change((base) => api.edit(store.get().project.pid, base, page, { op: "set_link", element: sel.element, href, new_tab: kindIsWeb(href) && newTab }), {
        page,
        toastRejection: false,
        onRejected: (error) => {
          showError(error.message);
          canvas.reload(sel.element);
        },
      }).then((ok) => {
        if (!ok) return;
        announce("Link saved");
        toast("Link saved");
        ctx.close();
      });
    },
  });
}

function kindIsWeb(href: string): boolean {
  return /^https?:/i.test(href);
}

function textLinkPanel(ctx: PanelContext): HTMLElement {
  return linkForm(ctx, "", {
    newTab: null,
    submitLabel: "Add link",
    onSubmit(href) {
      ctx.canvas.frame().focus();
      ctx.canvas.send({ type: "format", command: "link", href });
      ctx.store.dispatch({ type: "close_panel" });
    },
  });
}

/* Images */

/** Shows a thumbnail only for pictures served by the preview itself. */
export function previewImage(src: string | null, origin: string): string | null {
  if (!src) return null;
  try {
    const url = new URL(src);
    return url.origin === origin ? url.href : null;
  } catch {
    return null;
  }
}

/** Fill the old picture's frame (cropped), or show all of the new picture inside it. */
function fitControl(ctx: PanelContext, sel: Selection, current: Fit): HTMLElement {
  const choices: [Fit, string][] = [["fill", "Fill the frame"], ["whole", "Show whole picture"]];
  const seg = h("div", { class: "seg seg-block", attrs: { role: "group", "aria-label": "How the picture fits its space" } },
    ...choices.map(([fit, label]) => {
      const b = h("button", { text: label, attrs: { type: "button", "data-key": `fit:${fit}`, "aria-pressed": String(fit === current) } });
      b.addEventListener("click", async () => {
        if (fit === current) return;
        seg.setAttribute("aria-busy", "true");
        const ok = await ctx.edits.refit(sel, fit);
        seg.removeAttribute("aria-busy");
        if (ok) ctx.store.dispatch({ type: "open_panel", panel: "image", replaced: true });
      });
      return b;
    }));
  return h("div", { class: "field" }, seg,
    h("span", { class: "hint", text: current === "fill" ? "The new picture is trimmed to the shape of the old one, so the layout stays the same." : "All of the picture shows, with empty bands where the shapes differ." }));
}

function imagePanel(ctx: PanelContext, sel: Selection): HTMLElement {
  const body = h("div", { class: "rail-panel-body" });
  if (ctx.replaced) {
    const undo = h("button", { class: "link-btn", text: "Undo", attrs: { type: "button", "data-key": "undo-replace" } });
    undo.addEventListener("click", () => ctx.edits.undo());
    body.append(h("div", { class: "alert alert-success", attrs: { tabindex: "-1", "data-replaced": "", "data-key": "replaced", role: "status" } },
      icon("success", "icon-sm"), h("span", { class: "grow", text: "Picture replaced." }), undo));
    const last = ctx.edits.replacementOf(sel.element);
    if (last?.framed) body.append(fitControl(ctx, sel, last.fit));
  }
  const image = sel.info.image;
  const src = previewImage(sel.info.src, ctx.store.get().canvasOrigin);
  if (src) {
    const thumb = h("img", { class: "rail-thumb", attrs: { src, alt: "", referrerpolicy: "no-referrer" } });
    body.append(h("figure", { class: "rail-figure" }, thumb,
      image ? h("figcaption", { class: "hint", text: `Shown at ${image.width} × ${image.height}. The file is ${image.naturalWidth} × ${image.naturalHeight}.` }) : null));
    if (image && image.width > 0 && image.height > 0 && image.naturalWidth > 0 && image.naturalHeight > 0) {
      const shown = image.width / image.height;
      const file = image.naturalWidth / image.naturalHeight;
      if (Math.abs(shown - file) / file > 0.2) body.append(h("p", { class: "hint", text: "This picture is a different shape from its space, so the website may crop or stretch it." }));
    }
  }
  const replace = h("button", { class: "btn btn-secondary btn-sm", attrs: { type: "button", "data-key": "replace" } }, icon("replace-image", "icon-sm"), h("span", { text: "Choose a picture" }));
  const status = h("span", { class: "hint", attrs: { "aria-live": "polite" } });
  async function useFile(file: File): Promise<void> {
    replace.setAttribute("aria-busy", "true");
    const ok = await ctx.edits.replaceImage(sel, file, (f) => {
      status.textContent = `Uploading ${Math.round(f * 100)}%`;
    });
    replace.removeAttribute("aria-busy");
    status.textContent = "";
    if (ok) ctx.store.dispatch({ type: "open_panel", panel: "image", replaced: true });
  }
  replace.addEventListener("click", async () => {
    const file = await ctx.edits.chooseImage();
    if (file) await useFile(file);
  });
  const drop = h("div", { class: "rail-drop" }, replace, h("span", { class: "hint", text: "or drop a picture here. PNG, JPEG, GIF, WebP or AVIF." }), status);
  drop.addEventListener("dragover", (event) => {
    event.preventDefault();
    drop.classList.add("is-over");
  });
  drop.addEventListener("dragleave", () => drop.classList.remove("is-over"));
  drop.addEventListener("drop", (event) => {
    event.preventDefault();
    drop.classList.remove("is-over");
    const file = event.dataTransfer?.files[0];
    if (file && ctx.edits.checkImage(file)) void useFile(file);
  });
  body.append(group("Replace", drop));

  const area = h("textarea", { class: "textarea", attrs: { id: "rail-alt", rows: "3", maxlength: "1000", "data-key": "alt", placeholder: "For example: Fresh sourdough loaves on a wooden table", "data-autofocus": "" } });
  const original = sel.info.alt ?? "";
  area.value = original;
  const save = h("button", { class: "btn btn-secondary btn-sm", text: "Save description", attrs: { type: "submit", "data-key": "alt-save" } });
  const form = h("form", { class: "stack" },
    h("div", { class: "label-row" },
      h("label", { class: "label", text: ctx.replaced ? "Describe the new picture" : "Describe this picture", attrs: { for: "rail-alt" } }),
      original.trim() ? null : h("span", { class: "pill pill-changes pill-plain", text: "Recommended" })),
    area,
    ctx.replaced ? h("span", { class: "hint", text: "Check the description still matches the new photo." }) : null,
    h("span", { class: "hint", text: "Helps people who can't see the picture, and search engines." }),
    h("div", { class: "rail-actions" }, save));
  let saved = original;
  const submit = () => {
    const alt = area.value.trim();
    if (alt === saved.trim()) return;
    saved = alt;
    ctx.canvas.send({ type: "preview_alt", element: sel.element, alt });
    void ctx.edits.save({ op: "set_alt", element: sel.element, alt }).then((ok) => {
      if (ok) {
        announce("Description saved");
        toast("Description saved");
      }
    });
  };
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submit();
  });
  area.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  });
  area.addEventListener("blur", submit);
  const description = group("Description", form);
  if (ctx.replaced) body.prepend(description);
  else body.append(description);
  return body;
}

/* Page settings */

function pagePanel(ctx: PanelContext): HTMLElement {
  const s = ctx.store.get();
  const title = h("input", { class: "input input-sm", attrs: { id: "rail-meta-title", type: "text", maxlength: "200", "data-key": "meta-title", "data-autofocus": "" } });
  title.value = s.pageMeta.title;
  const description = h("textarea", { class: "textarea", attrs: { id: "rail-meta-description", rows: "4", maxlength: "500", "data-key": "meta-description" } });
  description.value = s.pageMeta.description;
  const form = h("form", { class: "rail-panel-body" },
    h("p", { class: "hint", text: "Shown in search results and in the browser tab." }),
    h("label", { class: "field", attrs: { for: "rail-meta-title" } }, h("span", { class: "label", text: "Page title" }), title),
    h("label", { class: "field", attrs: { for: "rail-meta-description" } }, h("span", { class: "label", text: "Description" }), description),
    h("div", { class: "rail-actions" }, h("button", { class: "btn btn-secondary btn-sm", text: "Save page settings", attrs: { type: "submit", "data-key": "meta-save" } })));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const titleValue = title.value.trim();
    const descriptionValue = description.value.trim();
    const page = ctx.store.get().path;
    const result = await ctx.change((base) => api.edit(ctx.store.get().project.pid, base, page, { op: "set_page_meta", title: titleValue, description: descriptionValue }), { page });
    if (result) {
      ctx.store.dispatch({ type: "page_meta", title: titleValue, description: descriptionValue });
      announce("Page settings saved");
      toast("Page settings saved");
    }
  });
  return form;
}

export function renderPanel(panel: Panel, ctx: PanelContext): HTMLElement {
  const sel = selection(ctx.store.get());
  if (panel === "page") return pagePanel(ctx);
  if (panel === "text-link") return textLinkPanel(ctx);
  if (!sel) return h("div", { class: "rail-panel-body" }, field("Nothing selected", h("p", { class: "hint", text: "Click a part of the page." })));
  switch (panel) {
    case "style": return stylePanel(ctx, sel);
    case "layout": return layoutPanel(ctx, sel);
    case "background": return backgroundPanel(ctx, sel);
    case "link": return linkPanel(ctx, sel);
    case "image": return imagePanel(ctx, sel);
  }
}
