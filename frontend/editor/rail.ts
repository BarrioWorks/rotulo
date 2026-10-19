import { KIND_LABELS } from "../protocol.js";
import { announce, confirmDialog, h, icon, must, toast } from "../ui.js";
import { ApiError, api, type Page } from "./api.js";
import { pageLabel, slugify } from "./pages.js";
import type { Canvas } from "./canvas.js";
import type { Edits } from "./edits.js";
import { openMenu } from "./menu.js";
import { renderPanel, PANEL_TITLES } from "./panels.js";
import type { Change } from "./saves.js";
import { changed, selection, type State, type Store } from "./state.js";

export interface RailDeps {
  store: Store;
  canvas: Canvas;
  change: Change;
  edits: Edits;
  /** Moves focus back to the toolbar button that opened a panel, or to the canvas. */
  returnFocus(): void;
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

export function createRail({ store, canvas, change, edits, returnFocus }: RailDeps): Rail {
  const pid = () => store.get().project.pid;
  const pagesView = must<HTMLElement>(document, "[data-rail-pages]");
  const panelView = must<HTMLElement>(document, "[data-rail-panel]");
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

  /* The panel view */

  function panelKey(s: State): string {
    if (s.rail.kind === "pages") return "pages";
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
    if (inPanel && active.matches("input, textarea, select") && kind === renderedPanel && element === renderedElement) return;
    const kindChanged = kind !== renderedPanel;
    renderedPanelKey = key;
    renderedPanel = kind;
    renderedElement = element;
    if (s.rail.kind === "pages") {
      pagesView.hidden = false;
      panelView.hidden = true;
      panelView.replaceChildren();
      if (inPanel) returnFocus();
      return;
    }
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
    renderRail();
    if (s.rail.kind === "panel" && prev?.rail.kind === "pages") announce(`${PANEL_TITLES[s.rail.panel]} panel open`);
  });

  return {
    openAddPage: () => pageDialog("add"),
    focusPanel: focusFirst,
  };
}
