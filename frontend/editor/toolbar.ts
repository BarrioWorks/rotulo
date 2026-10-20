import { KIND_LABELS, type Kind } from "../protocol.js";
import { h, icon, must, type IconName } from "../ui.js";
import type { Canvas } from "./canvas.js";
import type { Edits } from "./edits.js";
import { openMenu, type MenuItem } from "./menu.js";
import { placeToolbar, type Candidate, type Direction } from "./placement.js";
import { describeHref } from "./links.js";
import { panelApplies, selection, type Panel, type Selection, type State, type Store } from "./state.js";

export function shouldRenderToolbar({ force, keyChanged, selectionChanged, fieldFocused }: {
  force: boolean;
  keyChanged: boolean;
  selectionChanged: boolean;
  fieldFocused: boolean;
}): boolean {
  return force || selectionChanged || (keyChanged && !fieldFocused);
}

type ActionId = "edit-text" | "replace-image" | "description" | "link" | "parent-link" | "style" | "background" | "bg-photo" | "banner-photo" | "show";

interface ActionSpec {
  label: string;
  icon: IconName | null;
  applies(sel: Selection): boolean;
  panel?: Panel;
}

const ACTIONS: Record<ActionId, ActionSpec> = {
  "edit-text": { label: "Edit text", icon: "edit-text", applies: (sel) => sel.can.includes("t") },
  "replace-image": { label: "Replace image", icon: "replace-image", applies: (sel) => sel.can.includes("i") },
  description: { label: "Description", icon: null, applies: (sel) => sel.can.includes("i"), panel: "image" },
  link: { label: "Link", icon: "link", applies: (sel) => sel.can.includes("l"), panel: "link" },
  "parent-link": { label: "Link", icon: "link", applies: (sel) => !sel.can.includes("l") && sel.ancestors.slice(0, 3).some((a) => a.kind === "link" || a.kind === "button") },
  style: { label: "Style", icon: "text-style", applies: (sel) => sel.can.includes("s") && sel.can.includes("t"), panel: "style" },
  background: { label: "Background", icon: "background", applies: (sel) => sel.can.includes("s"), panel: "background" },
  "bg-photo": { label: "Change background photo", icon: "replace-image", applies: (sel) => sel.can.includes("b") && sel.info.bgImage },
  "banner-photo": { label: "Change banner photo", icon: "replace-image", applies: (sel) => !(sel.can.includes("b") && sel.info.bgImage) && bannerOf(sel) !== null },
  show: { label: "Show section", icon: "preview", applies: (sel) => sel.can.includes("x") && sel.info.hidden },
};

/** The nearest part around the selection that shows a photo the owner can change: the banner behind a heading. */
export function bannerOf(sel: Selection): Selection["ancestors"][number] | null {
  return sel.ancestors.find((a) => a.photo) ?? null;
}

const TEXT: ActionId[] = ["edit-text", "style", "link", "parent-link", "banner-photo", "bg-photo", "background"];
const SECTION: ActionId[] = ["show", "bg-photo", "background", "edit-text"];

/** The order actions appear in per kind. The first five that apply are shown, the rest go under More. */
export const ACTION_ORDER: Record<Kind, ActionId[]> = {
  heading: TEXT,
  text: TEXT,
  "list-item": TEXT,
  link: ["edit-text", "link", "style", "banner-photo", "bg-photo", "background"],
  button: ["edit-text", "link", "style", "banner-photo", "bg-photo", "background"],
  image: ["replace-image", "description", "parent-link"],
  banner: SECTION,
  section: SECTION,
  header: SECTION,
  footer: SECTION,
  menu: SECTION,
  card: ["bg-photo", "edit-text", "link", "parent-link", "banner-photo", "background"],
  box: ["bg-photo", "edit-text", "link", "parent-link", "banner-photo", "background"],
};

const MAX_PRIMARY = 5;
/** Actions that would crowd a section row; they move under More there. */
const SECONDARY_ON_SECTIONS: ActionId[] = ["background", "edit-text"];

export function actionsFor(sel: Selection): { primary: ActionId[]; overflow: ActionId[] } {
  const all = ACTION_ORDER[sel.kind].filter((id) => ACTIONS[id].applies(sel));
  const sectionRow = /[xudc]/.test(sel.can);
  const primary: ActionId[] = [];
  const overflow: ActionId[] = [];
  for (const id of all) {
    const secondary = sectionRow && SECONDARY_ON_SECTIONS.includes(id) && primary.length > 0;
    if (!secondary && primary.length < MAX_PRIMARY - (sectionRow ? 2 : 0)) primary.push(id);
    else overflow.push(id);
  }
  if (primary.length === 0 && overflow.length > 0) primary.push(overflow.shift() as ActionId);
  return { primary, overflow };
}

const OFFSCREEN: Record<Direction, { words: string; icon: IconName }> = {
  above: { words: "above", icon: "move-up" },
  below: { words: "below", icon: "move-down" },
  left: { words: "to the left", icon: "chevron-left" },
  right: { words: "to the right", icon: "chevron-right" },
};

function fileName(src: string | null): string {
  if (!src) return "";
  try {
    return decodeURIComponent(new URL(src).pathname.split("/").pop() ?? "");
  } catch {
    return "";
  }
}

/** What a screen reader hears when a part is selected. Never an empty name. */
export function describeSelection(sel: Selection, s: Pick<State, "path" | "pages" | "anchors" | "project">): string {
  const kind = KIND_LABELS[sel.kind];
  if (sel.kind === "image") {
    const alt = (sel.info.alt ?? "").trim();
    if (/[\p{L}\p{N}]/u.test(alt)) return `${kind} selected: ${alt}`;
    const file = fileName(sel.info.src);
    return file ? `${kind} selected: ${file}, a picture without a description` : `${kind} selected: a picture without a description`;
  }
  const name = sel.name.replace(/[.!?…]+$/, "");
  if (name) return `${kind} selected: ${name}`;
  if (sel.info.href !== null) return `${kind} selected: goes to ${describeHref(sel.info.href, s)}`;
  return `${kind} selected`;
}

export interface ToolbarDeps {
  store: Store;
  canvas: Canvas;
  edits: Edits;
}

export interface Toolbar {
  /** Runs the selection's first action (Enter on the canvas). */
  activatePrimary(): void;
  moveSection(direction: "up" | "down"): void;
  /** Moves focus into the toolbar, to the button that opened the last panel if it is still there. Returns false when it is hidden. */
  focus(): boolean;
}

export function createToolbar({ store, canvas, edits }: ToolbarDeps): Toolbar {
  const root = must<HTMLElement>(document, "[data-toolbar]");
  const labelHost = h("div", { class: "caption-label" });
  const actionHost = h("div", { class: "ftb-row", attrs: { "data-caption-actions": "" } });
  root.append(labelHost, actionHost);
  const persistent = new Map<string, HTMLButtonElement>();
  const offscreen = must<HTMLButtonElement>(document, "[data-offscreen]");
  let renderedKey = "";

  let candidate: Candidate | null = null;
  let busy: { action: ActionId; percent: number; element: string } | null = null;
  /** After choosing a link around an image, its Link panel opens once the selection arrives. */
  let pendingPanel: { element: string; panel: Panel } | null = null;
  let lastSelection: string | null = null;

  function keepTextSelection(event: MouseEvent): void {
    const target = event.target instanceof Element ? event.target : null;
    if (target && !target.closest("input, textarea, select")) event.preventDefault();
  }
  root.addEventListener("mousedown", keepTextSelection);
  actionHost.addEventListener("mousedown", keepTextSelection);

  /** The toolbar button that opened the rail panel, so focus can return to it. */
  let panelTrigger: string | null = null;

  function openPanel(panel: Panel, replaced = false, trigger: string | null = null): void {
    panelTrigger = trigger;
    const rail = store.get().surface;
    if (rail.kind === "panel" && rail.panel === panel && !replaced) {
      store.dispatch({ type: "close_panel" });
      return;
    }
    store.dispatch({ type: "open_panel", panel, replaced });
  }

  /** Uploads for one element at a time; the progress shows only while that element is selected. */
  async function withFile(action: ActionId, element: string, run: (file: File, progress: (f: number) => void) => Promise<boolean>): Promise<boolean> {
    if (busy?.element === element) return false;
    const file = await edits.chooseImage();
    if (!file) return false;
    busy = { action, percent: 0, element };
    render(true);
    const ok = await run(file, (fraction) => {
      if (busy?.element !== element) return;
      busy = { action, percent: Math.round(fraction * 100), element };
      render(true);
    });
    if (busy?.element === element) busy = null;
    render(true);
    return ok;
  }

  function run(id: ActionId, sel: Selection): void {
    const spec = ACTIONS[id];
    if (spec.panel) {
      openPanel(spec.panel, false, id);
      return;
    }
    switch (id) {
      case "edit-text":
        canvas.frame().focus();
        canvas.send({ type: "start_text", element: sel.element });
        break;
      case "replace-image":
        void withFile(id, sel.element, (file, progress) => edits.replaceImage(sel, file, progress)).then((ok) => {
          const s = store.get();
          if (ok && selection(s)?.element === sel.element) openPanel("image", true, id);
        });
        break;
      case "bg-photo":
        void withFile(id, sel.element, (file, progress) => edits.replaceBackground(sel.element, file, progress));
        break;
      case "banner-photo": {
        const banner = bannerOf(sel);
        if (banner) void withFile(id, sel.element, (file, progress) => edits.replaceBackground(banner.element, file, progress, "Banner photo changed"));
        break;
      }
      case "parent-link": {
        const link = sel.ancestors.slice(0, 3).find((a) => a.kind === "link" || a.kind === "button");
        if (link) {
          pendingPanel = { element: link.element, panel: "link" };
          canvas.send({ type: "select_element", element: link.element });
        }
        break;
      }
      case "show":
        void edits.setHidden(sel, false);
        break;
      default:
        break;
    }
  }

  /* Rendering */

  type ButtonOptions = { pressed?: boolean; expanded?: boolean; danger?: boolean; tip?: string; kbd?: string; disabled?: boolean; iconOnly?: boolean; detail?: string; dot?: boolean; menu?: boolean; controls?: string };

  function button(key: string, label: string, iconName: IconName | null, onClick: (b: HTMLButtonElement) => void, opts: ButtonOptions = {}): HTMLButtonElement {
    const b = h("button", { class: `tb-btn${opts.danger ? " danger" : ""}${opts.iconOnly ? " tb-icon" : ""}`, attrs: { type: "button", "data-key": key, tabindex: "-1" } },
      iconName ? icon(iconName, "icon-sm") : null,
      opts.iconOnly ? null : h("span", { text: label }),
      opts.detail ? h("span", { class: "tb-detail", text: opts.detail }) : null,
      opts.dot ? h("span", { class: "tb-dot", attrs: { "aria-hidden": "true" } }) : null,
      opts.menu ? icon("chevron-down", "icon-sm tb-caret") : null);
    if (opts.iconOnly || opts.detail || opts.dot) b.setAttribute("aria-label", opts.detail ? `${label}: ${opts.detail}` : opts.dot ? `${label} (missing)` : label);
    if (opts.tip ?? opts.iconOnly) b.dataset["tip"] = opts.tip ?? label;
    if (opts.kbd) b.dataset["kbd"] = opts.kbd;
    if (opts.pressed !== undefined) b.setAttribute("aria-pressed", String(opts.pressed));
    if (opts.expanded !== undefined) b.setAttribute("aria-expanded", String(opts.expanded));
    if (opts.controls) b.setAttribute("aria-controls", opts.controls);
    if (opts.menu) b.setAttribute("aria-haspopup", "menu");
    if (opts.disabled) b.disabled = true;
    b.onclick = (event) => onClick(event.currentTarget instanceof HTMLButtonElement ? event.currentTarget : b);
    return b;
  }


  function actionButton(id: ActionId, sel: Selection, s: State, withDetail: boolean): HTMLButtonElement {
    const spec = ACTIONS[id];
    const open = s.surface.kind === "panel" && spec.panel !== undefined && s.surface.panel === spec.panel;
    const uploading = busy?.action === id && busy.element === sel.element;
    const label = uploading ? `Uploading ${busy?.percent ?? 0}%` : spec.label;
    const opts: ButtonOptions = { disabled: uploading };
    if (spec.panel) {
      opts.expanded = open;
      opts.controls = "ed-rail-panel";
    }
    if (id === "link" && sel.info.href !== null) {
      if (withDetail) opts.detail = describeHref(sel.info.href, s);
      else opts.tip = `Link: ${describeHref(sel.info.href, s)}`;
    }
    if (id === "description" && !(sel.info.alt ?? "").trim()) {
      opts.dot = true;
      opts.tip = "This image has no description yet";
    }
    if (id === "edit-text") opts.kbd = "Enter";
    if (id === "bg-photo") opts.tip = "Choose a new photo for the background";
    if (id === "banner-photo") opts.tip = `Choose a new photo for the banner behind this ${KIND_LABELS[sel.kind].toLowerCase()}`;
    return button(id, label, spec.icon, () => run(id, sel), opts);
  }

  function sectionItems(sel: Selection): MenuItem[] {
    const can = sel.can;
    const items: MenuItem[] = [];
    if (can.includes("c")) items.push({ label: "Duplicate", icon: "duplicate", run: () => void edits.duplicateSection(sel) });
    if (can.includes("x")) {
      items.push(sel.info.hidden
        ? { label: "Show on your website", icon: "preview", run: () => void edits.setHidden(sel, false) }
        : { label: "Hide on your website", icon: "hide", run: () => void edits.setHidden(sel, true) });
      items.push("separator", { label: "Remove section", icon: "remove", danger: true, run: () => void edits.removeSection(sel) });
    }
    return items;
  }

  /**
   * For a part that is itself a plain section, the kind label and the Section menu would both say
   * "Section", so one menu leads the row: the section's actions, then the parts around it.
   */
  /**
   * The row for a selection. `collapsed` names what the canvas is too narrow for (see `fitRow`);
   * `measuring` always adds More so its width can be read.
   */
  function rowFor(s: State, sel: Selection): HTMLElement[] {
    if (s.editing.active) {
      const f = s.editing.formats;
      return [
        button("bold", "Bold", "bold", () => canvas.send({ type: "format", command: "bold", href: null }), { pressed: f.bold }),
        button("italic", "Italic", "italic", () => canvas.send({ type: "format", command: "italic", href: null }), { pressed: f.italic }),
        button("text-link", "Link", "link", () => openPanel("text-link", false, "text-link"), { expanded: s.surface.kind === "panel" && s.surface.panel === "text-link" }),
        ...(f.link ? [button("unlink", "Remove link", "unlink", () => canvas.send({ type: "format", command: "unlink", href: null }))] : []),
        button("done", "Done", "check", () => void canvas.finishText(), { tip: "Keep the text. Escape also keeps it." }),
      ];
    }
    const actions = actionsFor(sel);
    return [
      ...actions.primary.map((id) => actionButton(id, sel, s, false)),
      button("more", "More", "more", (b) => openMenu(b, [
        ...actions.overflow.map((id): MenuItem => ({ label: ACTIONS[id].label, run: () => run(id, sel) })),
        ...sectionItems(sel),
        ...(sel.can.includes("u") ? [{ label: "Move section up", run: () => void edits.moveSection(sel, "up") }] : []),
        ...(sel.can.includes("d") ? [{ label: "Move section down", run: () => void edits.moveSection(sel, "down") }] : []),
        ...sel.ancestors.map((a) => ({ label: `Select ${KIND_LABELS[a.kind].toLowerCase()}`, run: () => canvas.send({ type: "select_element", element: a.element }) })),
      ], { label: "More actions" }), { menu: true }),
    ];
  }

  function keyOf(s: State): string {
    const f = s.focus;
    if (s.mode !== "edit" || s.canvasLoading || f.kind === "none") return "none";
    if (f.kind === "blocked") return `blocked:${f.around ?? ""}`;
    const sel = f.selection;
    const panel = s.surface.kind === "panel" ? s.surface.panel : "";
    return JSON.stringify([sel.element, sel.can, sel.kind, sel.name, sel.ancestors, sel.info.href, sel.info.alt, sel.info.hidden, sel.info.bgImage, s.editing, panel, busy?.element === sel.element ? busy : null, s.anchors.length, s.pages.length, s.path]);
  }

  function buttons(): HTMLButtonElement[] {
    return [...actionHost.querySelectorAll<HTMLButtonElement>("button.tb-btn:not([disabled]):not([hidden])")];
  }

  function rove(target: HTMLButtonElement | undefined): void {
    for (const b of buttons()) b.tabIndex = b === target ? 0 : -1;
    target?.focus();
  }

  function render(force = false): void {
    const s = store.get();
    const key = keyOf(s);
    const f = s.focus;
    const focused = document.activeElement;
    const focusedKey = focused instanceof HTMLElement ? focused.dataset["key"] : undefined;
    if (key === "none") {
      root.classList.remove("is-visible"); actionHost.hidden = true; offscreen.hidden = true;
      candidate = null; return;
    }
    root.classList.add("is-visible"); actionHost.hidden = false;
    const problem = s.saves.problem;
    const save = problem ? "Not saved" : s.saves.pending > 0 ? "Saving…" : "Saved";
    labelHost.textContent = f.kind === "blocked" ? "Can't edit this part" : `${f.kind === "selected" ? KIND_LABELS[f.selection.kind] : "Part"} · ${save}`;
    if (problem) {
      const retry = h("button", { class: "btn btn-ghost btn-sm", text: problem.kind === "conflict" ? "Reload" : "Retry", attrs: { type: "button" } });
      retry.onclick = () => document.dispatchEvent(new Event("studio-retry")); labelHost.append(retry);
    }
    if (force || key !== renderedKey) {
      renderedKey = key;
      const fresh = f.kind === "selected" ? rowFor(s, f.selection) : f.kind === "blocked" && f.around ? [button("around", "Select the part around it", "select-parent", () => canvas.send({ type: "select_element", element: f.around ?? "" }))] : [];
      for (const b of persistent.values()) b.hidden = true;
      for (const [order, node] of fresh.entries()) {
        if (!(node instanceof HTMLButtonElement)) continue;
        const id = node.dataset["key"] ?? "";
        let kept = persistent.get(id);
        if (!kept) { kept = node; persistent.set(id, kept); actionHost.append(kept); }
        else {
          for (const attr of [...kept.attributes]) if (!node.hasAttribute(attr.name)) kept.removeAttribute(attr.name);
          for (const attr of [...node.attributes]) kept.setAttribute(attr.name, attr.value);
          kept.replaceChildren(...node.childNodes); kept.onclick = node.onclick;
        }
        kept.hidden = false; kept.style.order = String(order);
      }
      const visible = buttons();
      const first = visible.find((b) => b.dataset["key"] === focusedKey) ?? visible[0];
      for (const b of visible) b.tabIndex = b === first ? 0 : -1;
    }
    position(s, false);
  }

  function position(s: State, _glide: boolean): void {
    if (s.editing.active && candidate !== null) return;
    const f = s.focus;
    const rect = f.kind === "selected" ? f.selection.rect : f.kind === "blocked" ? f.rect : null;
    if (!rect) return;
    const box = canvas.visibleBox();
    const target = canvas.toApp(rect);
    root.style.maxWidth = `${Math.max(100, box.width - 8)}px`;
    const placement = placeToolbar({ target, canvas: box, obstructions: s.obstructions.map((r) => canvas.toApp(r)), size: { width: root.offsetWidth, height: root.offsetHeight } });
    if (placement.kind === "offscreen") {
      root.classList.add("is-offscreen"); offscreen.hidden = false;
      must<HTMLElement>(offscreen, "[data-offscreen-text]").textContent = `Selection is ${OFFSCREEN[placement.direction].words}`;
      offscreen.style.left = `${box.x + box.width / 2}px`; offscreen.style.top = `${box.y + 12}px`; return;
    }
    offscreen.hidden = true; root.classList.remove("is-offscreen");
    candidate = placement.candidate; root.dataset["placement"] = candidate;
    root.style.transform = `translate(${Math.round(placement.x)}px, ${Math.round(placement.y)}px)`;
  }

  offscreen.addEventListener("click", () => {
    const sel = selection(store.get());
    if (sel) canvas.send({ type: "reveal", element: sel.element, pulse: false });
  });

  actionHost.addEventListener("keydown", (event) => {
    const list = buttons();
    const index = list.findIndex((b) => b === document.activeElement);
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      if (index < 0) return;
      rove(list[(index + (event.key === "ArrowRight" ? 1 : -1) + list.length) % list.length]);
    } else if (event.key === "Home") rove(list[0]);
    else if (event.key === "End") rove(list[list.length - 1]);
    else if (event.key === "Escape" && !store.get().editing.active) canvas.surface.focus({ preventScroll: true });
    else return;
    event.preventDefault();
    event.stopPropagation();
  });

  store.subscribe((s, prev) => {
    const sel = selection(s);
    if ((sel?.element ?? null) !== lastSelection) {
      lastSelection = sel?.element ?? null;
      const wanted = pendingPanel;
      pendingPanel = null;
      if (sel && wanted?.element === sel.element && panelApplies(wanted.panel, sel, false)) {
        store.dispatch({ type: "open_panel", panel: wanted.panel });
        return;
      }
    }
    render(prev === null);
  });
  window.addEventListener("resize", () => render(true));
  // The phone view and zoom change the canvas width without a window resize.
  new ResizeObserver(() => render(true)).observe(canvas.surface);

  return {
    moveSection(direction) {
      const sel = selection(store.get());
      if (sel?.can.includes(direction === "up" ? "u" : "d")) void edits.moveSection(sel, direction);
    },
    activatePrimary() {
      const s = store.get();
      const sel = selection(s);
      if (!sel || s.editing.active) return;
      const first = actionsFor(sel).primary[0];
      if (first) run(first, sel);
      else this.focus();
    },
    focus() {
      if (!root.classList.contains("is-visible")) return false;
      const list = buttons();
      const target = (panelTrigger ? list.find((b) => b.dataset["key"] === panelTrigger) : undefined) ?? list.find((b) => b.tabIndex === 0) ?? list[0];
      if (!target) return false;
      rove(target);
      return true;
    },
  };
}
