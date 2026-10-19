import { isSafeHref, isStyleValue, type Rect, type StyleChanges, type StyleKey } from "../protocol.js";
import { confirmDialog, h, icon, must, toast, type IconName } from "../ui.js";
import { api, type Edit } from "./api.js";
import type { Canvas } from "./canvas.js";
import type { Change } from "./saves.js";
import { pageLabel } from "./sidebar.js";
import type { Selection, State, Store } from "./state.js";

type Panel = "text-style" | "box-style" | "link" | "alt" | "text-link" | null;

export function shouldRenderToolbar({ force, keyChanged, selectionChanged, panelChanged, fieldFocused }: {
  force: boolean;
  keyChanged: boolean;
  selectionChanged: boolean;
  panelChanged: boolean;
  fieldFocused: boolean;
}): boolean {
  return force || selectionChanged || panelChanged || (keyChanged && !fieldFocused);
}

export interface ToolbarDeps {
  store: Store;
  canvas: Canvas;
  change: Change;
}

const TEXT_COLORS = ["#1c1b18", "#57534b", "#8a857b", "#ffffff", "#2f5ce0", "#1d7f55", "#c63d32", "#a5660d", "#7c3aed"];
const BACKGROUNDS = ["#ffffff", "#f8f7f4", "#f1efea", "#1c1b18", "#edf1fd", "#e6f4ec", "#fcebe8", "#fbf1df", "#2f5ce0"];
const SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "30px", "36px", "48px", "60px", "72px", "96px"];
const WEIGHTS: [string, string][] = [["300", "Light"], ["400", "Regular"], ["500", "Medium"], ["600", "Semibold"], ["700", "Bold"], ["800", "Heavy"]];
const SPACES = ["0", "4px", "8px", "12px", "16px", "24px", "32px", "48px", "64px", "96px", "128px"];

const TAG_NAMES: Record<string, string> = {
  h1: "Heading", h2: "Heading", h3: "Heading", h4: "Heading", h5: "Heading", h6: "Heading",
  p: "Paragraph", a: "Link", button: "Button", img: "Image", li: "List item", span: "Text",
  blockquote: "Quote", figcaption: "Caption", label: "Label", strong: "Text", em: "Text", small: "Small text",
  td: "Table cell", th: "Table heading", nav: "Menu", header: "Header", footer: "Footer", ul: "List", ol: "List",
  form: "Form", figure: "Figure", picture: "Image", video: "Video",
};

function labelFor(sel: Selection): string {
  if (sel.can.includes("x") && !["a", "img"].includes(sel.tag)) {
    return sel.tag === "header" ? "Header" : sel.tag === "footer" ? "Footer" : sel.tag === "nav" ? "Menu" : "Section";
  }
  return TAG_NAMES[sel.tag] ?? (sel.can.includes("t") ? "Text" : "Box");
}

/** A link from `fromPage` to `toPage`, both draft paths like `blog/post.html`. */
export function relativeHref(fromPage: string, toPage: string): string {
  const from = fromPage.split("/").slice(0, -1);
  const to = toPage.split("/");
  let common = 0;
  while (common < from.length && common < to.length - 1 && from[common] === to[common]) common++;
  return [...Array<string>(from.length - common).fill(".."), ...to.slice(common)].join("/");
}

type LinkKind = { kind: "page"; path: string; hash: string } | { kind: "web" } | { kind: "email" } | { kind: "phone" } | { kind: "anchor" } | { kind: "empty" };

function classifyHref(href: string, currentPage: string, pages: string[]): LinkKind {
  const value = href.trim();
  if (!value) return { kind: "empty" };
  if (/^mailto:/i.test(value)) return { kind: "email" };
  if (/^tel:/i.test(value)) return { kind: "phone" };
  if (value.startsWith("#")) return { kind: "anchor" };
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith("//")) return { kind: "web" };
  try {
    const resolved = new URL(value, `https://site.invalid/${currentPage}`);
    let path = decodeURIComponent(resolved.pathname.replace(/^\//, ""));
    if (path === "" || path.endsWith("/")) path += "index.html";
    if (pages.includes(path)) return { kind: "page", path, hash: resolved.hash };
  } catch {
    return { kind: "web" };
  }
  return { kind: "web" };
}

function toHex(value: string | undefined): string {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
}

export function createToolbar({ store, canvas, change }: ToolbarDeps): void {
  const root = must<HTMLElement>(document, "[data-toolbar]");
  const imageInput = must<HTMLInputElement>(document, "[data-image-input]");
  let panel: Panel = null;
  let renderedKey = "";
  let renderedSelection = "";
  let renderedPanel: Panel = null;
  let busy: string | null = null;
  let panelError: string | null = null;

  root.addEventListener("mousedown", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (target && !target.closest("input, textarea, select")) event.preventDefault();
  });

  function save(edit: Edit, after: "none" | "reload" | "reload-select" = "none", onRejected?: () => void): Promise<boolean> {
    const page = store.get().path;
    return change((base) => api.edit(store.get().project.pid, base, page, edit), {
      onRejected: () => {
        onRejected?.();
        canvas.reload("element" in edit ? edit.element : null);
      },
    }).then((result) => {
      if (result && after !== "none") canvas.reload(after === "reload-select" && "element" in edit ? edit.element : null);
      return result !== null;
    });
  }

  function setStyle(sel: Selection, styles: StyleChanges): void {
    canvas.send({ type: "preview_style", element: sel.element, styles });
    void save({ op: "set_style", element: sel.element, styles });
  }

  /* Buttons */

  function button(label: string, iconName: IconName | null, onClick: () => void, opts: { pressed?: boolean; expanded?: boolean; danger?: boolean; title?: string; disabled?: boolean; iconOnly?: boolean } = {}): HTMLButtonElement {
    const b = h("button", { class: `tb-btn${opts.danger ? " danger" : ""}`, attrs: { type: "button", title: opts.title ?? label } },
      iconName ? icon(iconName, "icon-sm") : null,
      opts.iconOnly ? null : h("span", { text: label }));
    if (opts.iconOnly) b.setAttribute("aria-label", label);
    if (opts.pressed !== undefined) b.setAttribute("aria-pressed", String(opts.pressed));
    if (opts.expanded !== undefined) b.setAttribute("aria-expanded", String(opts.expanded));
    if (opts.disabled) b.disabled = true;
    b.addEventListener("click", onClick);
    return b;
  }

  function toggle(next: Panel): () => void {
    return () => {
      panel = panel === next ? null : next;
      panelError = null;
      render(true);
    };
  }

  const sep = () => h("span", { class: "ftb-sep", attrs: { "aria-hidden": "true" } });

  /* Panels */

  function swatches(colors: string[], current: string | undefined, onPick: (value: string | null) => void): HTMLElement {
    const row = h("div", { class: "swatches" });
    for (const color of colors) {
      const s = h("button", { class: "swatch", attrs: { type: "button", title: color, "aria-label": `Colour ${color}`, "aria-pressed": String(current?.toLowerCase() === color) } });
      s.style.background = color;
      s.addEventListener("click", () => onPick(color));
      row.append(s);
    }
    const custom = h("input", { class: "color-input", attrs: { type: "color", title: "Pick any colour", "aria-label": "Pick any colour" } });
    custom.value = toHex(current);
    custom.addEventListener("change", () => onPick(custom.value));
    const reset = h("button", { class: "swatch swatch-clear", attrs: { type: "button", title: "Back to the original", "aria-label": "Back to the original" } });
    reset.addEventListener("click", () => onPick(null));
    row.append(custom, reset);
    return row;
  }

  function select(label: string, options: [string, string][], current: string | null, onPick: (value: string | null) => void): HTMLElement {
    const id = `ftb-${label.toLowerCase().replace(/\W+/g, "-")}`;
    const el = h("select", { class: "select input-sm", attrs: { id } },
      h("option", { text: "Original", attrs: { value: "" } }),
      ...options.map(([value, text]) => h("option", { text, attrs: { value } })));
    el.value = current && options.some(([v]) => v === current) ? current : "";
    el.addEventListener("change", () => onPick(el.value === "" ? null : el.value));
    return h("label", { class: "field" }, h("span", { class: "label", text: label }), el);
  }

  function textStylePanel(sel: Selection): HTMLElement {
    const st = sel.info.styles;
    const pick = (key: StyleKey) => (value: string | null) => {
      if (value !== null && !isStyleValue(key, value)) return;
      setStyle(sel, { [key]: value });
    };
    const align = h("div", { class: "seg seg-icon", attrs: { role: "group", "aria-label": "Alignment" } },
      ...(["left", "center", "right", "justify"] as const).map((a) => {
        const b = h("button", { attrs: { type: "button", "aria-label": `Align ${a}`, title: `Align ${a}`, "aria-pressed": String(st["text-align"] === a || (a === "left" && st["text-align"] === "start")) } }, icon(`align-${a}`, "icon-sm"));
        b.addEventListener("click", () => setStyle(sel, { "text-align": a }));
        return b;
      }));
    return h("div", { class: "ftb-panel" },
      h("div", { class: "field" }, h("span", { class: "label", text: "Text colour" }), swatches(TEXT_COLORS, st.color, pick("color"))),
      h("div", { class: "spacing-grid" },
        select("Size", SIZES.map((s) => [s, s.replace("px", "")]), st["font-size"] ?? null, pick("font-size")),
        select("Weight", WEIGHTS, st["font-weight"] ?? null, pick("font-weight"))),
      h("div", { class: "field" }, h("span", { class: "label", text: "Alignment" }), align));
  }

  function boxStylePanel(sel: Selection): HTMLElement {
    const st = sel.info.styles;
    const spaceOptions: [string, string][] = SPACES.map((s) => [s, s === "0" ? "None" : s.replace("px", "")]);
    const padding = st["padding-top"] === st["padding-bottom"] ? (st["padding-top"] ?? null) : null;
    const norm = (v: string | undefined | null) => (v === "0px" ? "0" : (v ?? null));
    return h("div", { class: "ftb-panel" },
      h("div", { class: "field" }, h("span", { class: "label", text: "Background" }),
        swatches(BACKGROUNDS, st["background-color"], (v) => setStyle(sel, { "background-color": v }))),
      h("div", { class: "spacing-grid" },
        select("Space above", spaceOptions, norm(st["margin-top"]), (v) => setStyle(sel, { "margin-top": v })),
        select("Space below", spaceOptions, norm(st["margin-bottom"]), (v) => setStyle(sel, { "margin-bottom": v })),
        select("Space inside", spaceOptions, norm(padding), (v) =>
          setStyle(sel, { "padding-top": v, "padding-bottom": v, "padding-left": v, "padding-right": v }))));
  }

  function linkFields(initialHref: string, onSubmit: (href: string) => Promise<void>, extra?: HTMLElement, submitLabel = "Save link"): HTMLElement {
    const s = store.get();
    const pages = s.pages.map((p) => p.path);
    const initial = classifyHref(initialHref, s.path, pages);
    let kind: "page" | "web" = initial.kind === "page" || (initial.kind === "empty" && pages.length > 0) ? "page" : "web";

    const pageSelect = h("select", { class: "select input-sm", attrs: { "aria-label": "Page" } },
      ...s.pages.map((p) => h("option", { text: pageLabel(p, s.project.name), attrs: { value: p.path } })));
    if (initial.kind === "page") pageSelect.value = initial.path;
    const urlInput = h("input", { class: "input input-sm", attrs: { type: "text", inputmode: "url", placeholder: "https://example.com", "aria-label": "Web address", spellcheck: "false", autocomplete: "off" } });
    urlInput.value = initial.kind === "page" ? "" : initialHref;
    const badge = h("span", { class: "link-kind" });
    const error = h("div", { class: "alert alert-error", attrs: { role: "alert" }, hidden: panelError === null }, h("span", { text: panelError ?? "" }));

    const seg = h("div", { class: "seg", attrs: { role: "group", "aria-label": "Link to" } });
    const pageBtn = h("button", { text: "Page on this site", attrs: { type: "button" } });
    const webBtn = h("button", { text: "Web address", attrs: { type: "button" } });
    seg.append(pageBtn, webBtn);
    const pageField = h("div", { class: "field" }, pageSelect);
    const urlField = h("div", { class: "field" }, urlInput);

    function currentHref(): string {
      if (kind === "page") {
        const hash = initial.kind === "page" && initial.path === pageSelect.value ? initial.hash : "";
        return relativeHref(s.path, pageSelect.value) + hash;
      }
      let value = urlInput.value.trim();
      if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(value) && !value.includes("@")) value = `https://${value}`;
      else if (/^[^\s@/]+@[^\s@/]+\.[a-z]{2,}$/i.test(value)) value = `mailto:${value}`;
      return value;
    }

    function refresh(): void {
      pageBtn.setAttribute("aria-pressed", String(kind === "page"));
      webBtn.setAttribute("aria-pressed", String(kind === "web"));
      pageField.hidden = kind !== "page";
      urlField.hidden = kind !== "web";
      const k = classifyHref(currentHref(), s.path, pages);
      badge.className = `link-kind${k.kind === "page" || k.kind === "anchor" ? " internal" : ""}`;
      badge.replaceChildren(icon(k.kind === "page" || k.kind === "anchor" ? "page" : "globe", "icon-sm"), h("span", {
        text: { page: "Goes to a page on this website", anchor: "Goes to a part of this page", web: "Goes to another website", email: "Writes an email", phone: "Calls a phone number", empty: "Choose where this goes" }[k.kind],
      }));
    }
    pageBtn.addEventListener("click", () => { kind = "page"; refresh(); pageSelect.focus(); });
    webBtn.addEventListener("click", () => { kind = "web"; refresh(); urlInput.focus(); });
    pageSelect.addEventListener("change", refresh);
    urlInput.addEventListener("input", refresh);
    refresh();

    const submit = h("button", { class: "btn btn-primary btn-sm", text: submitLabel, attrs: { type: "submit" } });
    const form = h("form", { class: "ftb-panel" }, seg, pageField, urlField, badge, extra ?? null, error,
      h("div", { class: "ftb-panel-actions" }, submit));
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const href = currentHref();
      if (!isSafeHref(href)) {
        error.hidden = false;
        error.replaceChildren(h("span", { text: "That link can't be used. Use a web address starting with https://, an email address, a phone number or a page of this website." }));
        return;
      }
      void onSubmit(href);
    });
    return form;
  }

  function linkPanel(sel: Selection): HTMLElement {
    const newTab = h("input", { attrs: { type: "checkbox" } });
    newTab.checked = sel.info.newTab;
    const toggleRow = h("label", { class: "switch" }, newTab, h("span", { class: "switch-track", attrs: { "aria-hidden": "true" } }), h("span", { text: "Open in a new tab" }));
    return linkFields(sel.info.href ?? "", async (href) => {
      canvas.send({ type: "preview_link", element: sel.element, href, newTab: newTab.checked });
      const ok = await change((base) => api.edit(store.get().project.pid, base, store.get().path, { op: "set_link", element: sel.element, href, new_tab: newTab.checked }), {
        toastRejection: false,
        onRejected: (error) => {
          panelError = error.message;
          canvas.reload(sel.element);
          panel = "link";
          render(true);
        },
      });
      if (ok) {
        panel = null;
        panelError = null;
        toast("Link saved");
        render(true);
      }
    }, toggleRow);
  }

  function textLinkPanel(): HTMLElement {
    return linkFields("", async (href) => {
      canvas.send({ type: "format", command: "link", href });
      panel = null;
      render(true);
    }, undefined, "Add link");
  }

  function altPanel(sel: Selection): HTMLElement {
    const area = h("textarea", { class: "textarea", attrs: { rows: "3", maxlength: "1000", id: "ftb-alt", placeholder: "For example: Fresh sourdough loaves on a wooden table" } });
    area.value = sel.info.alt ?? "";
    const form = h("form", { class: "ftb-panel" },
      h("label", { class: "field" }, h("span", { class: "label", text: "Describe this image" }), area,
        h("span", { class: "hint", text: "Helps people who can't see the image, and search engines." })),
      h("div", { class: "ftb-panel-actions" }, h("button", { class: "btn btn-primary btn-sm", text: "Save", attrs: { type: "submit" } })));
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const alt = area.value.trim();
      canvas.send({ type: "preview_alt", element: sel.element, alt });
      void save({ op: "set_alt", element: sel.element, alt }).then((ok) => {
        if (ok) toast("Description saved");
      });
      panel = null;
      render(true);
    });
    window.setTimeout(() => area.focus(), 0);
    return form;
  }

  /* Actions */

  function replaceImage(sel: Selection): void {
    imageInput.value = "";
    imageInput.onchange = null;
    imageInput.addEventListener("change", () => {
      const file = imageInput.files?.[0];
      if (!file) return;
      const limit = store.get().imageBytes;
      if (!/^image\/(png|jpeg|gif|webp|avif)$/.test(file.type)) {
        toast("Choose a PNG, JPEG, GIF, WebP or AVIF picture.", "error");
        return;
      }
      if (file.size > limit) {
        toast(`This picture is too big. The limit is ${Math.round(limit / (1024 * 1024))} MB.`, "error");
        return;
      }
      busy = "image";
      render(true);
      store.dispatch({ type: "save_queued" });
      api.uploadImage(store.get().project.pid, file).then((uploaded) => {
        store.dispatch({ type: "save_settled" });
        const alt = sel.info.alt ?? "";
        return save({ op: "set_image", element: sel.element, upload: uploaded.upload, alt }).then((ok) => {
          if (ok) canvas.send({ type: "preview_image", element: sel.element, src: uploaded.url, alt });
          return ok;
        });
      }, (error: Error) => {
        store.dispatch({ type: "save_settled" });
        toast(error.message, "error", 6000);
      }).finally(() => {
        busy = null;
        render(true);
      });
    }, { once: true });
    imageInput.click();
  }

  async function removeSection(sel: Selection): Promise<void> {
    const ok = await confirmDialog({
      title: "Remove this section?",
      text: "It will be removed from this page. You can bring it back with Undo.",
      ok: "Remove",
      danger: true,
    });
    if (ok) void save({ op: "remove_section", element: sel.element }, "reload");
  }

  /* Rendering */

  function rowFor(s: State, sel: Selection): HTMLElement[] {
    const can = sel.can;
    if (s.editing.active) {
      const f = s.editing.formats;
      return [
        h("span", { class: "ftb-label", text: "Editing text" }),
        button("Bold", "bold", () => canvas.send({ type: "format", command: "bold", href: null }), { pressed: f.bold, iconOnly: true, title: "Bold (Cmd+B)" }),
        button("Italic", "italic", () => canvas.send({ type: "format", command: "italic", href: null }), { pressed: f.italic, iconOnly: true, title: "Italic (Cmd+I)" }),
        f.link
          ? button("Remove link", "unlink", () => canvas.send({ type: "format", command: "unlink", href: null }), { iconOnly: true })
          : button("Link", "link", toggle("text-link"), { expanded: panel === "text-link", iconOnly: true, title: "Add a link to the selected words" }),
        sep(),
        button("Cancel", null, () => canvas.send({ type: "finish_text", commit: false }), { title: "Undo your typing (Esc)" }),
        button("Done", "check", () => canvas.send({ type: "finish_text", commit: true }), { title: "Save the text (Enter)" }),
      ];
    }
    const out: HTMLElement[] = [h("span", { class: "ftb-label", text: labelFor(sel) })];
    if (can.includes("t")) {
      out.push(button("Edit text", "pencil", () => {
        canvas.iframe.focus();
        canvas.send({ type: "start_text" });
      }, { title: "Edit text (or click the text again)" }));
    }
    if (can.includes("i")) {
      out.push(button(busy === "image" ? "Uploading…" : "Replace image", "image", () => replaceImage(sel), { disabled: busy === "image" }));
      out.push(button("Description", "type", toggle("alt"), { expanded: panel === "alt", title: "Describe this image" }));
    }
    if (can.includes("l")) out.push(button("Link", "link", toggle("link"), { expanded: panel === "link", title: "Where this link goes" }));
    if (can.includes("s") && can.includes("t")) out.push(button("Text style", "text-color", toggle("text-style"), { expanded: panel === "text-style", iconOnly: true }));
    if (can.includes("s")) out.push(button("Box style", "fill", toggle("box-style"), { expanded: panel === "box-style", iconOnly: true, title: "Background and spacing" }));
    const sectionTools = /[xudc]/.test(can);
    if (sectionTools) out.push(sep());
    if (can.includes("u")) out.push(button("Move up", "arrow-up", () => void save({ op: "move_section", element: sel.element, direction: "up" }, "reload-select"), { iconOnly: true }));
    if (can.includes("d")) out.push(button("Move down", "arrow-down", () => void save({ op: "move_section", element: sel.element, direction: "down" }, "reload-select"), { iconOnly: true }));
    if (can.includes("c")) out.push(button("Duplicate", "duplicate", () => void save({ op: "duplicate_section", element: sel.element }, "reload-select").then((ok) => ok && toast("Section duplicated")), { iconOnly: true }));
    if (can.includes("x")) {
      const hidden = sel.info.hidden;
      out.push(button(hidden ? "Show" : "Hide", hidden ? "eye" : "eye-off", () => {
        canvas.send({ type: "preview_hidden", element: sel.element, hidden: !hidden });
        void save({ op: "hide_section", element: sel.element, hidden: !hidden }, "reload-select");
      }, { iconOnly: true, title: hidden ? "Show this section on your website" : "Hide this section on your website" }));
      out.push(button("Remove", "trash", () => void removeSection(sel), { iconOnly: true, danger: true, title: "Remove this section" }));
    }
    if (sel.hasParent) {
      out.push(sep());
      out.push(button("Select parent", "parent", () => canvas.send({ type: "select_parent" }), { iconOnly: true, title: "Select the part around this one" }));
    }
    return out;
  }

  function panelFor(sel: Selection, s: State): HTMLElement | null {
    if (s.editing.active) return panel === "text-link" ? textLinkPanel() : null;
    switch (panel) {
      case "text-style": return textStylePanel(sel);
      case "box-style": return boxStylePanel(sel);
      case "link": return linkPanel(sel);
      case "alt": return altPanel(sel);
      default: return null;
    }
  }

  function keyOf(s: State): string {
    const f = s.focus;
    if (s.mode !== "edit" || s.canvasLoading || f.kind === "none") return "none";
    if (f.kind === "blocked") return "blocked";
    const sel = f.selection;
    return JSON.stringify([sel.element, sel.can, sel.hasParent, sel.info, s.editing, panel, busy, s.pages.length, s.path]);
  }

  function render(force = false): void {
    const s = store.get();
    const key = keyOf(s);
    const f = s.focus;
    const selection = JSON.stringify([s.path, f.kind, f.kind === "selected" ? f.selection.element : null]);
    const focused = document.activeElement;
    const fieldFocused = focused instanceof HTMLElement && root.contains(focused) && focused.matches("input, textarea, select");
    if (!shouldRenderToolbar({ force, keyChanged: key !== renderedKey, selectionChanged: selection !== renderedSelection, panelChanged: panel !== renderedPanel, fieldFocused })) {
      position(s);
      return;
    }
    if (fieldFocused && focused instanceof HTMLElement) focused.blur();
    if (key === "none") {
      root.classList.remove("is-visible");
      root.replaceChildren();
      renderedKey = key;
      renderedSelection = selection;
      renderedPanel = panel;
      return;
    }
    if (f.kind === "blocked") {
      root.replaceChildren(h("div", { class: "ftb-note" }, icon("info", "icon-sm"),
        h("span", { text: "This part is created by the website's own code, so it can't be edited here." })));
    } else if (f.kind === "selected") {
      root.replaceChildren(h("div", { class: "ftb-row" }, ...rowFor(s, f.selection)), panelFor(f.selection, s) ?? "");
    }
    position(s);
    root.classList.add("is-visible");
    renderedKey = key;
    renderedSelection = selection;
    renderedPanel = panel;
  }

  function position(s: State): void {
    const f = s.focus;
    const rect: Rect | null = f.kind === "selected" ? f.selection.rect : f.kind === "blocked" ? f.rect : null;
    if (!rect) return;
    const frame = canvas.iframe.getBoundingClientRect();
    const target = { left: frame.left + rect.x, top: frame.top + rect.y, bottom: frame.top + rect.y + rect.height };
    const offscreen = target.bottom < frame.top + 4 || target.top > frame.bottom - 4;
    root.style.visibility = offscreen ? "hidden" : "visible";
    const width = root.offsetWidth;
    const height = root.offsetHeight;
    const gap = 10;
    let top = target.top - height - gap;
    let placement = "above";
    if (top < frame.top + 6) {
      top = target.bottom + gap;
      placement = "below";
      if (top + height > Math.min(frame.bottom, window.innerHeight) - 6) {
        top = Math.max(frame.top + 6, Math.min(target.top + gap, window.innerHeight - height - 6));
        placement = "inside";
      }
    }
    const left = Math.min(Math.max(target.left, 8), window.innerWidth - width - 8);
    root.style.transform = "";
    root.style.left = `${Math.round(left)}px`;
    root.style.top = `${Math.round(top)}px`;
    root.dataset["placement"] = placement;
  }

  store.subscribe((s, prev) => {
    if (prev && prev.focus.kind === "selected" && (s.focus.kind !== "selected" || s.focus.selection.element !== prev.focus.selection.element)) {
      panel = null;
      panelError = null;
    }
    if (prev && prev.editing.active !== s.editing.active) panel = null;
    render();
  });
  window.addEventListener("resize", () => render(true));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && panel !== null) {
      panel = null;
      render(true);
    }
  });
}
