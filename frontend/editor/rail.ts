import { KIND_LABELS } from "../protocol.js";
import { announce, confirmDialog, h, icon, must, toast } from "../ui.js";
import { ApiError, api, type Page } from "./api.js";
import { pageLabel, slugify } from "./pages.js";
import type { Canvas } from "./canvas.js";
import type { Edits } from "./edits.js";
import { openMenu } from "./menu.js";
import { previewImage, renderPanel, PANEL_TITLES } from "./panels.js";
import type { Change } from "./saves.js";
import { changed, selection, type State, type Store } from "./state.js";

export interface RailDeps {
  store: Store;
  canvas: Canvas;
  change: Change;
  edits: Edits;
  /** Moves focus back to the toolbar button that opened a panel, or to the canvas. */
  returnFocus(): void;
  openSettings(trigger: HTMLElement): void;
  openHistory(trigger: HTMLElement): void;
}

export interface Rail {
  openAddPage(): void;
  /** Focuses the first field of the open panel. */
  focusPanel(): void;
}

function folderOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i < 0 ? "" : path.slice(0, i + 1);
}

/**
 * How the Images list names a picture. Many templates reuse file names across folders
 * ("portfolio/1.jpg", "team/1.jpg"), so a picture named by its file shows its folder too, and a
 * picture with a description shows the description first and the file under it.
 */
function pictureLabel(name: string, src: string): { label: string; file: string | null } {
  let parts: string[] = [];
  try {
    parts = new URL(src).pathname.split("/").filter(Boolean).map((p) => decodeURIComponent(p));
  } catch {
    parts = [];
  }
  const file = parts.slice(-2).join("/") || null;
  const base = parts[parts.length - 1] ?? "";
  if (!name || name === base) return { label: file ?? (name || "Picture without a description"), file: null };
  return { label: name, file };
}

/** Whether the owner has typed or chosen something in this field since the panel was built. */
function edited(el: HTMLElement): boolean {
  return el.matches("input, textarea, select") && el.dataset["edited"] !== undefined;
}

export function createRail({ store, canvas, change, edits, returnFocus, openSettings, openHistory }: RailDeps): Rail {
  const pid = () => store.get().project.pid;
  const pagesView = must<HTMLElement>(document, "[data-rail-pages]");
  const panelView = must<HTMLElement>(document, "[data-rail-panel]");
  const imagesView = must<HTMLElement>(document, "[data-rail-images]");
  const imageList = must<HTMLUListElement>(imagesView, "[data-image-list]");
  const imagesSubject = must<HTMLElement>(imagesView, "[data-images-subject]");
  const imagesCount = must<HTMLElement>(document, "[data-images-count]");
  const start = must<HTMLElement>(document, "[data-rail-start]");
  const startHeading = must<HTMLButtonElement>(start, '[data-start="heading"]');
  const startPicture = must<HTMLButtonElement>(start, '[data-start="picture"]');
  const list = must<HTMLUListElement>(document, "[data-page-list]");
  const note = must<HTMLElement>(document, "[data-page-note]");
  let renderedPanelKey = "";

  function renderPages(): void {
    const s = store.get();
    list.replaceChildren(...s.pages.map((page) => {
      const isHome = page.path === "index.html";
      const label = pageLabel(page, s.project.name);
      const open = h("button", { class: "page-open", attrs: { type: "button", "data-tip": `/${page.path}` } },
        icon(isHome ? "home-page" : "page", "icon-sm"),
        h("span", { class: "truncate", text: label }));
      if (page.path === s.path) open.setAttribute("aria-current", "page");
      open.addEventListener("click", () => {
        if (store.get().path !== page.path) canvas.open(page.path);
      });
      const item = h("li", { class: "page-item" }, open);
      if (page.path === s.path) item.classList.add("is-current");
      const more = h("button", { class: "btn btn-ghost btn-icon btn-sm page-more", attrs: { type: "button", "aria-label": `More for ${label}`, "data-tip": "Rename, duplicate, settings", "aria-haspopup": "menu", "aria-expanded": "false" } }, icon("more", "icon-sm"));
      more.addEventListener("click", () => openMenu(more, [
        ...(isHome ? [] : [{ label: "Rename", icon: "edit" as const, run: () => pageDialog("rename", page) }]),
        { label: "Duplicate", icon: "duplicate", run: () => pageDialog("add", page) },
        { label: "Page settings", run: () => {
          if (store.get().path !== page.path) canvas.open(page.path);
          store.dispatch({ type: "open_panel", panel: "page" });
        } },
        ...(isHome ? [] : ["separator" as const, { label: "Delete page", icon: "remove" as const, danger: true, run: () => void deletePage(page) }]),
      ], { label: `More for ${label}`, align: "end" }));
      item.append(more);
      return item;
    }));
  }

  /* Add and rename share one dialog */

  const dialog = must<HTMLDialogElement>(document, 'dialog[data-dialog="page"]');
  const form = must<HTMLFormElement>(dialog, "[data-page-form]");
  const title = must<HTMLElement>(dialog, "[data-page-dialog-title]");
  const text = must<HTMLElement>(dialog, "[data-page-dialog-text]");
  const fromField = must<HTMLElement>(dialog, "[data-page-from-field]");
  const fromSelect = must<HTMLSelectElement>(dialog, "[data-page-from]");
  const nameInput = must<HTMLInputElement>(dialog, "[data-page-name]");
  const address = must<HTMLElement>(dialog, "[data-page-address]");
  const error = must<HTMLElement>(dialog, "[data-page-error]");
  const submit = must<HTMLButtonElement>(dialog, "[data-page-submit]");
  must<HTMLButtonElement>(dialog, "[data-page-cancel]").addEventListener("click", () => dialog.close());

  let dialogMode: { kind: "add" } | { kind: "rename"; page: Page } = { kind: "add" };

  function targetPath(): string | null {
    const slug = slugify(nameInput.value);
    if (!slug) return null;
    const folder = dialogMode.kind === "rename" ? folderOf(dialogMode.page.path) : "";
    return `${folder}${slug}.html`;
  }

  function updateAddress(): void {
    const path = targetPath();
    address.textContent = path ? `Its address will end in /${path}` : "Use letters or numbers.";
  }
  nameInput.addEventListener("input", updateAddress);

  function pageDialog(kind: "add" | "rename", page?: Page): void {
    const s = store.get();
    error.hidden = true;
    nameInput.removeAttribute("aria-invalid");
    if (kind === "rename" && page) {
      dialogMode = { kind: "rename", page };
      title.textContent = "Rename page";
      text.textContent = "Links to this page from your other pages are updated for you.";
      fromField.hidden = true;
      nameInput.value = page.path.replace(/^.*\//, "").replace(/\.html$/, "");
      submit.textContent = "Rename";
    } else {
      dialogMode = { kind: "add" };
      title.textContent = "Add a page";
      text.textContent = "The new page starts as a copy, so it keeps your header, footer and style.";
      fromField.hidden = false;
      fromSelect.replaceChildren(...s.pages.map((p) => h("option", { text: pageLabel(p, s.project.name), attrs: { value: p.path } })));
      fromSelect.value = page?.path ?? s.path;
      nameInput.value = "";
      submit.textContent = "Add page";
    }
    updateAddress();
    dialog.showModal();
    nameInput.focus();
    nameInput.select();
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const path = targetPath();
    if (!path) {
      error.hidden = false;
      error.textContent = "Give the page a name with letters or numbers.";
      nameInput.setAttribute("aria-invalid", "true");
      return;
    }
    submit.setAttribute("aria-busy", "true");
    const mode = dialogMode;
    const name = nameInput.value.trim();
    const rejected: { error: ApiError | null } = { error: null };
    const result = await change((base) =>
      mode.kind === "rename"
        ? api.renamePage(pid(), base, mode.page.path, path)
        : api.addPage(pid(), base, fromSelect.value, path, name), {
      toastRejection: false,
      onRejected: (e) => {
        rejected.error = e;
      },
    });
    submit.removeAttribute("aria-busy");
    if (!result) {
      if (rejected.error) {
        error.hidden = false;
        error.textContent = rejected.error.message;
        nameInput.setAttribute("aria-invalid", "true");
      }
      return;
    }
    dialog.close();
    store.dispatch({ type: "pages", pages: result.pages });
    if (mode.kind === "add") {
      toast(`Page "${name}" added`);
      showNewPageNote(name);
      canvas.open(path);
    } else {
      toast("Page renamed");
      if (store.get().path === mode.page.path) canvas.open(path);
      else canvas.reload();
    }
  });

  function showNewPageNote(name: string): void {
    const dismiss = h("button", { class: "btn btn-ghost btn-icon btn-sm", attrs: { type: "button", "aria-label": "Dismiss" } }, icon("close", "icon-sm"));
    dismiss.addEventListener("click", () => {
      note.hidden = true;
      list.querySelector<HTMLElement>('[aria-current="page"]')?.focus();
    });
    note.replaceChildren(h("div", { class: "alert alert-info" }, icon("info", "icon-sm"),
      h("span", { class: "grow", text: `Visitors can't reach ${name} yet. Select a button or a menu link and point it at this page.` }), dismiss));
    note.hidden = false;
  }

  async function deletePage(page: Page): Promise<void> {
    const ok = await confirmDialog({
      title: `Delete "${pageLabel(page, store.get().project.name)}"?`,
      text: "The page is removed from your website. You can bring it back with Undo.",
      ok: "Delete page",
      danger: true,
    });
    if (!ok) return;
    const result = await change((base) => api.deletePage(pid(), base, page.path));
    if (!result) return;
    store.dispatch({ type: "pages", pages: result.pages });
    toast("Page deleted");
    if (store.get().path === page.path) canvas.open("index.html");
  }

  must<HTMLButtonElement>(document, '[data-action="add-page"]').addEventListener("click", () => pageDialog("add"));

  /* First-time guidance, the website rows and the page's pictures */

  function selectInCanvas(element: string | null): void {
    if (!element) return;
    canvas.send({ type: "select_element", element });
    canvas.surface.focus({ preventScroll: true });
  }

  startHeading.addEventListener("click", () => selectInCanvas(store.get().outline.heading));
  startPicture.addEventListener("click", () => selectInCanvas(store.get().outline.images[0]?.element ?? null));
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-start="settings"], [data-row="settings"]')) b.addEventListener("click", () => openSettings(b));
  const historyRow = must<HTMLButtonElement>(document, '[data-row="history"]');
  historyRow.addEventListener("click", () => openHistory(historyRow));
  must<HTMLButtonElement>(document, '[data-row="images"]').addEventListener("click", () => {
    store.dispatch({ type: "open_images" });
    imageList.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
  });
  const imagesBack = must<HTMLButtonElement>(imagesView, "[data-images-back]");
  imagesBack.addEventListener("click", () => {
    store.dispatch({ type: "close_panel" });
    must<HTMLButtonElement>(document, '[data-row="images"]').focus({ preventScroll: true });
  });
  imagesView.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    imagesBack.click();
  });

  /* On narrow windows the rail is a drawer: the toggle opens it, a panel opens it, a click in the page closes it. */
  const editorRoot = must<HTMLElement>(document, "#editor");
  const toggle = must<HTMLButtonElement>(document, "[data-rail-toggle]");
  const drawer = window.matchMedia("(max-width: 899px)");
  function setDrawer(open: boolean): void {
    editorRoot.toggleAttribute("data-rail-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  }
  toggle.addEventListener("click", () => {
    const open = !editorRoot.hasAttribute("data-rail-open");
    setDrawer(open);
    if (open) document.querySelector<HTMLElement>(".ed-rail button:not([hidden])")?.focus({ preventScroll: true });
  });
  drawer.addEventListener("change", () => setDrawer(false));

  function renderStart(s: State): void {
    const away = s.mode !== "edit" || s.focus.kind !== "none";
    start.classList.toggle("is-collapsed", away);
    start.inert = away;
    startHeading.hidden = s.outline.heading === null;
    startPicture.hidden = s.outline.images.length === 0;
  }

  function imageName(name: string, src: string): HTMLElement {
    const { label, file } = pictureLabel(name, src);
    return h("span", { class: "image-name" },
      h("span", { class: "truncate", text: label }),
      file ? h("span", { class: "image-file truncate", text: file }) : null);
  }

  function renderImages(s: State): void {
    const images = s.outline.images;
    imagesCount.textContent = images.length > 0 ? String(images.length) : "";
    const page = s.pages.find((p) => p.path === s.path);
    imagesSubject.textContent = images.length === 0 ? "No pictures you can change on this page." : `${images.length === 1 ? "1 picture" : `${images.length} pictures`} on ${page ? pageLabel(page, s.project.name) : s.path}. Choose one to select it.`;
    const current = selection(s)?.element ?? null;
    const focusedKey = document.activeElement instanceof HTMLElement && imageList.contains(document.activeElement) ? document.activeElement.dataset["key"] : undefined;
    imageList.replaceChildren(...images.map((img) => {
      const thumb = previewImage(img.src, s.canvasOrigin);
      const b = h("button", { class: "image-row", attrs: { type: "button", "data-key": img.element } },
        thumb ? h("img", { class: "image-thumb", attrs: { src: thumb, alt: "", loading: "lazy", referrerpolicy: "no-referrer" } }) : h("span", { class: "image-thumb" }),
        imageName(img.name, img.src));
      if (img.element === current) b.setAttribute("aria-current", "true");
      b.addEventListener("click", () => {
        canvas.send({ type: "select_element", element: img.element });
      });
      return h("li", {}, b);
    }));
    if (focusedKey) imageList.querySelector<HTMLElement>(`[data-key="${CSS.escape(focusedKey)}"]`)?.focus({ preventScroll: true });
  }

  /* The panel view */

  function panelKey(s: State): string {
    if (s.rail.kind !== "panel") return s.rail.kind;
    const sel = selection(s);
    return JSON.stringify([s.rail, s.rail.panel === "page" ? [s.path, s.pageMeta] : sel ? [sel.element, sel.info, sel.name] : null, s.palette, s.anchors, s.pages, s.editing.active]);
  }

  function closePanel(): void {
    store.dispatch({ type: "close_panel" });
    returnFocus();
  }

  let renderedPanel: string | null = null;
  let renderedElement: string | null = null;

  function renderRail(): void {
    const s = store.get();
    const key = panelKey(s);
    if (key === renderedPanelKey) return;
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const inPanel = active !== null && panelView.contains(active);
    const kind = s.rail.kind === "panel" ? `${s.rail.panel}:${String(s.rail.replaced)}` : null;
    const element = s.rail.kind === "panel" ? s.rail.element : null;
    // Never rebuild a form under the owner's typing; it re-renders once focus leaves the panel.
    // A field that only holds focus (the description box is focused when the panel opens) is
    // rebuilt, so undo and redo show the restored part's facts at once.
    if (inPanel && edited(active) && kind === renderedPanel && element === renderedElement) return;
    const kindChanged = kind !== renderedPanel;
    renderedPanelKey = key;
    renderedPanel = kind;
    renderedElement = element;
    if (s.rail.kind !== "panel") {
      pagesView.hidden = s.rail.kind !== "pages";
      imagesView.hidden = s.rail.kind !== "images";
      panelView.hidden = true;
      panelView.replaceChildren();
      if (inPanel) returnFocus();
      return;
    }
    imagesView.hidden = true;
    const focusedKey = inPanel ? active.dataset["key"] ?? null : null;
    const sel = selection(s);
    const back = h("button", { class: "btn btn-ghost btn-sm rail-back", attrs: { type: "button", "data-key": "back", "data-kbd": "Esc", "data-tip": "Back to the pages" } }, icon("chevron-left", "icon-sm"), h("span", { text: "Pages" }));
    back.addEventListener("click", closePanel);
    const page = s.pages.find((p) => p.path === s.path);
    const subject = s.rail.panel === "page"
      ? (page ? pageLabel(page, s.project.name) : s.path)
      : sel ? `${KIND_LABELS[sel.kind]}${sel.name ? ` · ${sel.name}` : ""}` : "";
    const body = renderPanel(s.rail.panel, { store, canvas, change, edits, close: closePanel, replaced: s.rail.replaced });
    panelView.replaceChildren(
      h("div", { class: "rail-panel-head" }, back,
        h("h2", { class: "rail-title", text: PANEL_TITLES[s.rail.panel], attrs: { id: "ed-rail-title" } }),
        subject ? h("p", { class: "rail-subject truncate", text: subject, attrs: { "data-tip": subject } }) : null),
      body);
    pagesView.hidden = true;
    panelView.hidden = false;
    if (kindChanged) {
      if (s.rail.replaced) panelView.querySelector<HTMLElement>("[data-replaced]")?.focus({ preventScroll: true });
      else focusFirst();
    } else if (focusedKey) {
      panelView.querySelector<HTMLElement>(`[data-key="${CSS.escape(focusedKey)}"]`)?.focus({ preventScroll: true });
    }
  }

  for (const type of ["input", "change"]) {
    panelView.addEventListener(type, (event) => {
      if (event.target instanceof HTMLElement) event.target.dataset["edited"] = "";
    });
  }

  panelView.addEventListener("focusout", (event) => {
    if (event.relatedTarget instanceof Node && panelView.contains(event.relatedTarget)) return;
    window.setTimeout(renderRail, 0);
  });

  function focusFirst(): void {
    const field = panelView.querySelector<HTMLElement>("[data-autofocus]") ?? panelView.querySelector<HTMLElement>(".rail-panel-body input, .rail-panel-body select, .rail-panel-body textarea, .rail-panel-body button");
    field?.focus({ preventScroll: true });
  }

  panelView.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closePanel();
    }
  });

  store.subscribe((s, prev) => {
    if (changed(s, prev, "pages", "path", "project")) renderPages();
    if (changed(s, prev, "mode", "focus", "outline")) renderStart(s);
    if (changed(s, prev, "outline", "pages", "path", "focus", "canvasOrigin")) renderImages(s);
    renderRail();
    if (s.rail.kind === "panel" && prev?.rail.kind === "pages") announce(`${PANEL_TITLES[s.rail.panel]} panel open`);
    if (drawer.matches && prev && s.rail !== prev.rail) setDrawer(s.rail.kind !== "pages");
    if (drawer.matches && prev && s.rail.kind === "pages" && s.focus.kind !== "none" && selection(s)?.element !== selection(prev)?.element) setDrawer(false);
  });

  return {
    openAddPage: () => pageDialog("add"),
    focusPanel: focusFirst,
  };
}
