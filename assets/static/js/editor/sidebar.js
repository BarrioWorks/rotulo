import { confirmDialog, formatBytes, h, icon, must, plural, toast } from "../ui.js";
import { ApiError, api } from "./api.js";
import { changed } from "./state.js";
/** "Our story | Harbor Bakery" shows as "Our story"; the home page is always "Home". */
export function pageLabel(page, siteName) {
    if (page.path === "index.html")
        return "Home";
    const name = siteName.trim().toLowerCase();
    const parts = page.title.split(/\s+[|·•–—-]\s+/).map((p) => p.trim()).filter(Boolean);
    const kept = parts.length > 1 ? parts.filter((p) => p.toLowerCase() !== name) : parts;
    return kept.join(" · ") || page.path.replace(/\.html$/, "");
}
/** "Our Offers!" becomes "our-offers". */
export function slugify(name) {
    return name
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60);
}
function folderOf(path) {
    const i = path.lastIndexOf("/");
    return i < 0 ? "" : path.slice(0, i + 1);
}
export function createSidebar({ store, canvas, change }) {
    const pid = () => store.get().project.pid;
    const list = must(document, "[data-page-list]");
    let openMenu = null;
    function closeMenu() {
        openMenu?.remove();
        openMenu = null;
        for (const b of list.querySelectorAll('[aria-expanded="true"]'))
            b.setAttribute("aria-expanded", "false");
    }
    document.addEventListener("click", (event) => {
        if (openMenu && event.target instanceof Node && !openMenu.contains(event.target))
            closeMenu();
    });
    function renderPages() {
        const s = store.get();
        list.replaceChildren(...s.pages.map((page) => {
            const isHome = page.path === "index.html";
            const open = h("button", { class: "page-open", attrs: { type: "button", title: `/${page.path}` } }, icon(isHome ? "home-page" : "page", "icon-sm"), h("span", { class: "truncate", text: pageLabel(page, store.get().project.name) }));
            open.addEventListener("click", () => {
                if (store.get().path !== page.path)
                    canvas.open(page.path);
            });
            const item = h("li", { class: "page-item" }, open);
            if (page.path === s.path)
                item.setAttribute("aria-current", "page");
            if (!isHome) {
                const more = h("button", { class: "btn btn-ghost btn-icon btn-sm page-more", attrs: { type: "button", "aria-label": `More for ${pageLabel(page, store.get().project.name)}`, "aria-haspopup": "menu", "aria-expanded": "false" } }, icon("more", "icon-sm"));
                more.addEventListener("click", (event) => {
                    event.stopPropagation();
                    const wasOpen = more.getAttribute("aria-expanded") === "true";
                    closeMenu();
                    if (wasOpen)
                        return;
                    more.setAttribute("aria-expanded", "true");
                    openMenu = pageMenu(page);
                    item.append(openMenu);
                    openMenu.querySelector("button")?.focus();
                });
                item.append(more);
            }
            return item;
        }));
    }
    function pageMenu(page) {
        const item = (label, iconName, run, danger = false) => {
            const b = h("button", { class: `menu-item${danger ? " danger" : ""}`, attrs: { type: "button", role: "menuitem" } }, icon(iconName, "icon-sm"), h("span", { text: label }));
            b.addEventListener("click", () => {
                closeMenu();
                run();
            });
            return b;
        };
        return h("div", { class: "menu page-menu", attrs: { role: "menu" } }, item("Rename", "edit", () => void pageDialog("rename", page)), item("Duplicate", "duplicate", () => void pageDialog("add", page)), item("Delete", "remove", () => void deletePage(page), true));
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
            fromSelect.replaceChildren(...s.pages.map((p) => h("option", { text: pageLabel(p, store.get().project.name), attrs: { value: p.path } })));
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
            return;
        }
        submit.disabled = true;
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
        submit.disabled = false;
        if (!result) {
            if (rejected.error) {
                error.hidden = false;
                error.textContent = rejected.error.message;
            }
            return;
        }
        dialog.close();
        store.dispatch({ type: "pages", pages: result.pages });
        if (mode.kind === "add") {
            toast(`Page "${name}" added`);
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
    async function deletePage(page) {
        const ok = await confirmDialog({
            title: `Delete "${pageLabel(page, store.get().project.name)}"?`,
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
    /* Page settings */
    const metaForm = must(document, "[data-meta-form]");
    const metaTitle = must(metaForm, "[data-meta-title]");
    const metaDescription = must(metaForm, "[data-meta-description]");
    const metaPage = must(metaForm, "[data-meta-page]");
    metaForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const titleValue = metaTitle.value.trim();
        const description = metaDescription.value.trim();
        const page = store.get().path;
        const result = await change((base) => api.edit(pid(), base, page, { op: "set_page_meta", title: titleValue, description }));
        if (result) {
            store.dispatch({ type: "page_meta", title: titleValue, description });
            toast("Page settings saved");
        }
    });
    /* Website settings */
    const settingsForm = must(document, "[data-settings-form]");
    const siteName = must(settingsForm, "[data-settings-name]");
    const siteSlug = must(settingsForm, "[data-settings-slug]");
    const suffix = must(settingsForm, "[data-settings-suffix]");
    const settingsError = must(settingsForm, "[data-settings-error]");
    siteSlug.addEventListener("input", () => {
        const cleaned = siteSlug.value.toLowerCase().replace(/[^a-z0-9-]/g, "-");
        if (cleaned !== siteSlug.value)
            siteSlug.value = cleaned;
    });
    settingsForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        settingsError.hidden = true;
        try {
            const { project } = await api.settings(pid(), siteName.value.trim(), siteSlug.value.trim());
            store.dispatch({ type: "project", project: { ...project, revision: store.get().project.revision } });
            toast("Website settings saved");
        }
        catch (e) {
            settingsError.hidden = false;
            settingsError.textContent = e instanceof Error ? e.message : "Something went wrong.";
        }
    });
    /* Images */
    const assetsSection = must(document, "[data-assets-section]");
    const grid = must(document, "[data-asset-grid]");
    const summary = must(document, "[data-asset-summary]");
    async function loadAssets() {
        try {
            const { assets } = await api.assets(pid());
            const images = assets.filter((a) => a.kind === "image");
            grid.replaceChildren(...images.map((a) => {
                const img = h("img", { attrs: { src: a.url, alt: "", loading: "lazy", referrerpolicy: "no-referrer" } });
                return h("div", { class: "asset-tile", attrs: { title: `${a.path} · ${formatBytes(a.bytes)}` } }, img, h("span", { text: a.path.replace(/^.*\//, "") }));
            }));
            const others = assets.length - images.length;
            summary.textContent = images.length === 0
                ? "Your website has no images yet."
                : `${plural(images.length, "image", "images")}${others > 0 ? ` and ${plural(others, "other file", "other files")}` : ""}.`;
        }
        catch (e) {
            summary.textContent = e instanceof Error ? e.message : "Couldn't load your images.";
        }
    }
    assetsSection.addEventListener("toggle", () => {
        if (assetsSection.open)
            void loadAssets();
    });
    store.subscribe((s, prev) => {
        if (changed(s, prev, "pages", "path", "project"))
            renderPages();
        if (changed(s, prev, "pageMeta", "path")) {
            if (document.activeElement !== metaTitle)
                metaTitle.value = s.pageMeta.title;
            if (document.activeElement !== metaDescription)
                metaDescription.value = s.pageMeta.description;
            const page = s.pages.find((p) => p.path === s.path);
            metaPage.textContent = page ? pageLabel(page, store.get().project.name) : s.path;
        }
        if (changed(s, prev, "project")) {
            if (document.activeElement !== siteName)
                siteName.value = s.project.name;
            if (document.activeElement !== siteSlug)
                siteSlug.value = s.project.slug;
            try {
                const host = new URL(s.project.site_url).host;
                suffix.textContent = host.startsWith(`${s.project.slug}.`) ? host.slice(s.project.slug.length) : `.${host.split(".").slice(1).join(".")}`;
            }
            catch {
                suffix.textContent = "";
            }
        }
    });
}
