import { KIND_LABELS } from "../protocol.js";
import { announce, confirmDialog, h, icon, must, toast } from "../ui.js";
import { ApiError, api } from "./api.js";
import { pageLabel, slugify } from "./pages.js";
import { openMenu } from "./menu.js";
import { placePanel as panelPlacement } from "./placement.js";
import { previewImage, renderPanel, PANEL_TITLES } from "./panels.js";
import { changed, selection } from "./state.js";
function folderOf(path) {
    const i = path.lastIndexOf("/");
    return i < 0 ? "" : path.slice(0, i + 1);
}
/**
 * How the Images list names a picture. Many templates reuse file names across folders
 * ("portfolio/1.jpg", "team/1.jpg"), so a picture named by its file shows its folder too, and a
 * picture with a description shows the description first and the file under it.
 */
function pictureLabel(name, src) {
    let parts = [];
    try {
        parts = new URL(src).pathname.split("/").filter(Boolean).map((p) => decodeURIComponent(p));
    }
    catch {
        parts = [];
    }
    const file = parts.slice(-2).join("/") || null;
    const base = parts[parts.length - 1] ?? "";
    if (!name || name === base)
        return { label: file ?? (name || "Picture without a description"), file: null };
    return { label: name, file };
}
/** Whether the owner has typed or chosen something in this field since the panel was built. */
function edited(el) {
    return el.matches("input, textarea, select") && el.dataset["edited"] !== undefined;
}
export function createSurfaces({ store, canvas, change, edits, returnFocus, openSettings }) {
    const pid = () => store.get().project.pid;
    const pagesView = must(document, "[data-rail-pages]");
    const panelView = must(document, "[data-rail-panel]");
    const imagesView = must(document, "[data-rail-images]");
    const imageList = must(imagesView, "[data-image-list]");
    const imagesSubject = must(imagesView, "[data-images-subject]");
    const start = must(document, "[data-rail-start]");
    const startHeading = must(start, '[data-start="heading"]');
    const startPicture = must(start, '[data-start="picture"]');
    const list = must(document, "[data-page-list]");
    const note = must(document, "[data-page-note]");
    let renderedPanelKey = "";
    function renderPages() {
        const s = store.get();
        list.replaceChildren(...s.pages.filter((p) => `${pageLabel(p, s.project.name, s.pages)} ${p.path}`.toLowerCase().includes(search.value.toLowerCase())).map((page, index) => {
            const isHome = page.path === "index.html";
            const label = pageLabel(page, s.project.name, s.pages);
            const open = h("button", { class: "page-open", attrs: { type: "button", "data-tip": `/${page.path}` } }, icon(isHome ? "home-page" : "page", "icon-sm"), h("span", { class: "truncate", text: label }));
            if (page.path === s.path)
                open.setAttribute("aria-current", "page");
            open.addEventListener("click", () => {
                if (store.get().path !== page.path)
                    canvas.open(page.path);
                close();
            });
            const item = h("li", { class: "page-item", attrs: { id: `page-option-${index}`, role: "option", "aria-selected": String(index === active) } }, open);
            if (page.path === s.path)
                item.classList.add("is-current");
            const more = h("button", { class: "btn btn-ghost btn-icon btn-sm page-more", attrs: { type: "button", "aria-label": `More for ${label}`, "data-tip": "Rename, duplicate, settings", "aria-haspopup": "menu", "aria-expanded": "false" } }, icon("more", "icon-sm"));
            more.addEventListener("click", () => openMenu(more, [
                ...(isHome ? [] : [{ label: "Rename", icon: "edit", run: () => pageDialog("rename", page) }]),
                { label: "Duplicate", icon: "duplicate", run: () => pageDialog("add", page) },
                { label: "Page settings", run: () => {
                        if (store.get().path !== page.path)
                            canvas.open(page.path);
                        store.dispatch({ type: "open_panel", panel: "page" });
                    } },
                ...(isHome ? [] : ["separator", { label: "Delete page", icon: "remove", danger: true, run: () => void deletePage(page) }]),
            ], { label: `More for ${label}`, align: "end" }));
            item.append(more);
            return item;
        }));
        activate(active);
    }
    /* Add and rename share one dialog */
    const dialog = must(document, 'dialog[data-dialog="page"]');
    const form = must(dialog, "[data-page-form]");
    const title = must(dialog, "[data-page-dialog-title]");
    const text = must(dialog, "[data-page-dialog-text]");
    const fromField = must(dialog, "[data-page-from-field]");
    const fromSelect = must(dialog, "[data-page-from]");
    const nameInput = must(dialog, "[data-page-name]");
    const address = must(dialog, "[data-page-address]");
    const error = must(dialog, "[data-page-error]");
    const submit = must(dialog, "[data-page-submit]");
    must(dialog, "[data-page-cancel]").addEventListener("click", () => dialog.close());
    let dialogMode = { kind: "add" };
    function targetPath() {
        const slug = slugify(nameInput.value);
        if (!slug)
            return null;
        const folder = dialogMode.kind === "rename" ? folderOf(dialogMode.page.path) : "";
        return `${folder}${slug}.html`;
    }
    function updateAddress() {
        const path = targetPath();
        address.textContent = path ? `Its address will end in /${path}` : "Use letters or numbers.";
    }
    nameInput.addEventListener("input", updateAddress);
    function pageDialog(kind, page) {
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
        }
        else {
            dialogMode = { kind: "add" };
            title.textContent = "Add a page";
            text.textContent = "The new page starts as a copy, so it keeps your header, footer and style.";
            fromField.hidden = false;
            fromSelect.replaceChildren(...s.pages.map((p) => h("option", { text: pageLabel(p, s.project.name, s.pages), attrs: { value: p.path } })));
            fromSelect.value = page?.path ?? s.path;
            nameInput.value = "";
            submit.textContent = "Add page";
        }
        updateAddress();
        store.dispatch({ type: "close_panel" });
        dialog.show();
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
        const rejected = { error: null };
        const result = await change((base) => mode.kind === "rename"
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
        }
        else {
            toast("Page renamed");
            if (store.get().path === mode.page.path)
                canvas.open(path);
            else
                canvas.reload();
        }
    });
    function showNewPageNote(name) {
        const dismiss = h("button", { class: "btn btn-ghost btn-icon btn-sm", attrs: { type: "button", "aria-label": "Dismiss" } }, icon("close", "icon-sm"));
        dismiss.addEventListener("click", () => {
            note.hidden = true;
            list.querySelector('[aria-current="page"]')?.focus();
        });
        note.replaceChildren(h("div", { class: "alert alert-info" }, icon("info", "icon-sm"), h("span", { class: "grow", text: `Visitors can't reach ${name} yet. Select a button or a menu link and point it at this page.` }), dismiss));
        note.hidden = false;
    }
    async function deletePage(page) {
        const ok = await confirmDialog({
            title: `Delete "${pageLabel(page, store.get().project.name, store.get().pages)}"?`,
            text: "The page is removed from your website. You can bring it back with Undo.",
            ok: "Delete page",
            danger: true,
        });
        if (!ok)
            return;
        const result = await change((base) => api.deletePage(pid(), base, page.path));
        if (!result)
            return;
        store.dispatch({ type: "pages", pages: result.pages });
        toast("Page deleted");
        if (store.get().path === page.path)
            canvas.open("index.html");
    }
    must(document, '[data-action="add-page"]').addEventListener("click", () => pageDialog("add"));
    /* First-time guidance, the website rows and the page's pictures */
    function selectInCanvas(element) {
        if (!element)
            return;
        store.dispatch({ type: "close_panel" });
        canvas.send({ type: "select_element", element });
        canvas.surface.focus({ preventScroll: true });
    }
    startHeading.addEventListener("click", () => selectInCanvas(store.get().outline.heading));
    startPicture.addEventListener("click", () => selectInCanvas(store.get().outline.images[0]?.element ?? null));
    must(document, '[data-open-images]').addEventListener("click", () => open("images"));
    must(document, '[data-open-settings]').addEventListener("click", (event) => openSettings(event.currentTarget instanceof HTMLElement ? event.currentTarget : pagesView));
    must(document, '[data-start="settings"]').addEventListener("click", () => openSettings(pagesView));
    must(document, '[data-images-back]').addEventListener("click", close);
    let opener = null;
    document.addEventListener("pointerdown", (event) => {
        const surface = store.get().surface.kind;
        if (!["pages", "images", "panel"].includes(surface) || !(event.target instanceof Element))
            return;
        if (event.target.closest("[data-surface-host], [data-toolbar], [data-bottom-bar], .ed-menu, dialog, .ed-top"))
            return;
        store.dispatch({ type: "close_panel" });
    }, true);
    function open(kind) {
        opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        if (store.get().surface.kind === kind)
            return close();
        store.dispatch({ type: "open_surface", surface: kind });
        if (kind === "pages") {
            search.value = "";
            renderPages();
            search.focus();
        }
        else
            imageList.querySelector("button")?.focus();
    }
    function close() { store.dispatch({ type: "close_panel" }); opener?.focus({ preventScroll: true }); }
    for (const view of [pagesView, imagesView])
        view.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && !event.defaultPrevented) {
                event.preventDefault();
                event.stopPropagation();
                close();
            }
        });
    const search = must(document, "[data-page-search]");
    let active = 0;
    function activate(index) {
        const rows = [...list.querySelectorAll('[role="option"]')];
        active = Math.max(0, Math.min(index, rows.length - 1));
        rows.forEach((row, i) => { row.setAttribute("aria-selected", String(i === active)); row.classList.toggle("is-active", i === active); });
        const row = rows[active];
        if (row)
            search.setAttribute("aria-activedescendant", row.id);
        else
            search.removeAttribute("aria-activedescendant");
    }
    search.addEventListener("input", () => { active = 0; renderPages(); });
    search.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            activate(active + (event.key === "ArrowDown" ? 1 : -1));
        }
        else if (event.key === "Enter") {
            event.preventDefault();
            list.querySelectorAll('.page-open')[active]?.click();
        }
    });
    must(document, '[data-add-page]').addEventListener("click", () => pageDialog("add"));
    let pendingImage = null;
    function renderStart(s) {
        const away = s.mode !== "edit" || s.focus.kind !== "none";
        start.classList.toggle("is-collapsed", away);
        start.inert = away;
        startHeading.hidden = s.outline.heading === null;
        startPicture.hidden = s.outline.images.length === 0;
    }
    function imageName(name, src) {
        const { label, file } = pictureLabel(name, src);
        return h("span", { class: "image-name" }, h("span", { class: "truncate", text: label }), file ? h("span", { class: "image-file truncate", text: file }) : null);
    }
    function renderImages(s) {
        const images = s.outline.images;
        const page = s.pages.find((p) => p.path === s.path);
        imagesSubject.textContent = images.length === 0 ? "No pictures you can change on this page." : `${images.length === 1 ? "1 picture" : `${images.length} pictures`} on ${page ? pageLabel(page, s.project.name, s.pages) : s.path}. Choose one to select it.`;
        const current = selection(s)?.element ?? null;
        const focusedKey = document.activeElement instanceof HTMLElement && imageList.contains(document.activeElement) ? document.activeElement.dataset["key"] : undefined;
        imageList.replaceChildren(...images.map((img) => {
            const thumb = previewImage(img.src, s.canvasOrigin);
            const b = h("button", { class: "image-row", attrs: { type: "button", "data-key": img.element } }, thumb ? h("img", { class: "image-thumb", attrs: { src: thumb, alt: "", loading: "lazy", referrerpolicy: "no-referrer" } }) : h("span", { class: "image-thumb" }), imageName(img.name, img.src));
            if (img.element === current)
                b.setAttribute("aria-current", "true");
            b.addEventListener("click", () => {
                pendingImage = img.element;
                canvas.send({ type: "select_element", element: img.element });
            });
            return h("li", {}, b);
        }));
        if (focusedKey)
            imageList.querySelector(`[data-key="${CSS.escape(focusedKey)}"]`)?.focus({ preventScroll: true });
    }
    must(document, "[data-images-upload]").addEventListener("click", () => {
        const image = store.get().outline.images[0];
        if (!image)
            return;
        pendingImage = image.element;
        canvas.send({ type: "select_element", element: image.element });
    });
    /* The panel view */
    function panelKey(s) {
        if (s.surface.kind !== "panel")
            return s.surface.kind;
        const sel = selection(s);
        return JSON.stringify([s.surface, s.surface.panel === "page" ? [s.path, s.pageMeta] : sel ? [sel.element, sel.info, sel.name] : null, s.palette, s.anchors, s.pages, s.editing.active]);
    }
    function closePanel() {
        const surface = store.get().surface;
        const page = surface.kind === "panel" && surface.panel === "page";
        store.dispatch({ type: "close_panel" });
        if (page)
            must(document, "[data-page-switcher]").focus();
        else
            returnFocus();
    }
    let renderedPanel = null;
    let renderedElement = null;
    function renderSurfaces() {
        const s = store.get();
        const key = panelKey(s);
        if (key === renderedPanelKey)
            return;
        const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const inPanel = active !== null && panelView.contains(active);
        const kind = s.surface.kind === "panel" ? `${s.surface.panel}:${String(s.surface.replaced)}` : null;
        const element = s.surface.kind === "panel" ? s.surface.element : null;
        // Never rebuild a form under the owner's typing; it re-renders once focus leaves the panel.
        // A field that only holds focus (the description box is focused when the panel opens) is
        // rebuilt, so undo and redo show the restored part's facts at once.
        if (inPanel && edited(active) && kind === renderedPanel && element === renderedElement)
            return;
        const kindChanged = kind !== renderedPanel;
        renderedPanelKey = key;
        renderedPanel = kind;
        renderedElement = element;
        if (s.surface.kind !== "panel") {
            pagesView.hidden = s.surface.kind !== "pages";
            imagesView.hidden = s.surface.kind !== "images";
            panelView.hidden = true;
            panelView.replaceChildren();
            if (inPanel)
                returnFocus();
            return;
        }
        imagesView.hidden = true;
        const focusedKey = inPanel ? active.dataset["key"] ?? null : null;
        const sel = selection(s);
        const back = h("button", { class: "btn btn-ghost btn-sm rail-back", attrs: { type: "button", "data-key": "back", "data-kbd": "Esc", "data-tip": "Back to the pages" } }, icon("chevron-left", "icon-sm"), h("span", { text: "Close" }));
        back.addEventListener("click", closePanel);
        const page = s.pages.find((p) => p.path === s.path);
        const subject = s.surface.panel === "page"
            ? (page ? pageLabel(page, s.project.name, s.pages) : s.path)
            : sel ? `${KIND_LABELS[sel.kind]}${sel.name ? ` · ${sel.name}` : ""}` : "";
        const body = renderPanel(s.surface.panel, { store, canvas, change, edits, close: closePanel, replaced: s.surface.replaced });
        panelView.replaceChildren(h("div", { class: "rail-panel-head" }, back, h("h2", { class: "rail-title", text: PANEL_TITLES[s.surface.panel], attrs: { id: "ed-rail-title" } }), subject ? h("p", { class: "rail-subject truncate", text: subject, attrs: { "data-tip": subject } }) : null), body);
        pagesView.hidden = true;
        panelView.hidden = false;
        if (kindChanged) {
            if (s.surface.replaced)
                panelView.querySelector("[data-replaced]")?.focus({ preventScroll: true });
            else
                focusFirst();
        }
        else if (focusedKey) {
            panelView.querySelector(`[data-key="${CSS.escape(focusedKey)}"]`)?.focus({ preventScroll: true });
        }
    }
    for (const type of ["input", "change"]) {
        panelView.addEventListener(type, (event) => {
            if (event.target instanceof HTMLElement)
                event.target.dataset["edited"] = "";
        });
    }
    panelView.addEventListener("focusout", (event) => {
        if (event.relatedTarget instanceof Node && panelView.contains(event.relatedTarget))
            return;
        window.setTimeout(renderSurfaces, 0);
    });
    function focusFirst() {
        const field = panelView.querySelector("[data-autofocus]") ?? panelView.querySelector(".rail-panel-body input, .rail-panel-body select, .rail-panel-body textarea, .rail-panel-body button");
        field?.focus({ preventScroll: true });
    }
    panelView.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            closePanel();
        }
    });
    function placePanel() {
        if (store.get().surface.kind !== "panel")
            return;
        const caption = document.querySelector("[data-toolbar]");
        if (!caption)
            return;
        const surface = store.get().surface;
        if (surface.kind === "panel" && surface.panel === "page") {
            const anchor = must(document, "[data-page-switcher]").getBoundingClientRect();
            panelView.style.left = `${anchor.left}px`;
            panelView.style.top = `${anchor.bottom + 8}px`;
            panelView.style.maxHeight = `${innerHeight - anchor.bottom - 24}px`;
            return;
        }
        const r = caption.getBoundingClientRect();
        panelView.style.maxHeight = "none";
        const selected = selection(store.get());
        const target = selected ? canvas.toApp(selected.rect) : { x: r.x, y: r.y - 20, width: r.width, height: 12 };
        const position = panelPlacement({ caption: { x: r.x, y: r.y, width: r.width, height: r.height }, selection: target, canvas: { x: 0, y: 0, width: innerWidth, height: innerHeight }, size: { width: panelView.offsetWidth, height: panelView.scrollHeight } });
        panelView.style.left = `${position.x}px`;
        panelView.style.top = `${position.y}px`;
        panelView.style.maxHeight = `${position.height}px`;
    }
    window.addEventListener("resize", placePanel);
    store.subscribe((s, prev) => {
        if (changed(s, prev, "pages", "path", "project"))
            renderPages();
        if (changed(s, prev, "mode", "focus", "outline"))
            renderStart(s);
        if (changed(s, prev, "outline", "pages", "path", "focus", "canvasOrigin"))
            renderImages(s);
        renderSurfaces();
        if (s.surface.kind === "panel" && prev?.surface.kind !== "panel")
            announce(`${PANEL_TITLES[s.surface.panel]} panel open`);
        if (pendingImage && selection(s)?.element === pendingImage) {
            pendingImage = null;
            store.dispatch({ type: "open_panel", panel: selection(s)?.can.includes("i") ? "image" : "background" });
        }
        placePanel();
    });
    return {
        openAddPage: () => pageDialog("add"),
        focusPanel: focusFirst,
        openPages: () => open("pages"),
        close,
    };
}
