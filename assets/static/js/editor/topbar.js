import { h, must } from "../ui.js";
import { pageLabel } from "./pages.js";
import { changed, publishText, siteState } from "./state.js";
export function createTopBar({ store, canvas, surfaces, publishing, undo, redo }) {
    const undoBtn = must(document, '[data-action="undo"]');
    const redoBtn = must(document, '[data-action="redo"]');
    const pill = must(document, "[data-status-pill]");
    const pillText = must(pill, "[data-status-text]");
    const publishBtn = must(document, '[data-action="publish"]');
    const pageButton = must(document, "[data-page-switcher]");
    const pageName = must(pageButton, "[data-page-name]");
    const siteName = must(document, "[data-site-name]");
    const center = must(document, ".ed-top-center");
    const bottom = must(document, "[data-bottom-bar]");
    const actions = must(document, "[data-caption-actions]");
    const touch = matchMedia("(max-width: 899px), (pointer: coarse)");
    const modeButtons = [...document.querySelectorAll("[data-mode]")];
    const deviceButtons = [...document.querySelectorAll("[data-device]")];
    const toolsHome = center.parentElement;
    function layout() {
        if (touch.matches) {
            bottom.prepend(center);
            bottom.append(actions);
        }
        else {
            toolsHome?.insertBefore(center, document.querySelector(".ed-top-right"));
            must(document, "[data-toolbar]").append(actions);
        }
    }
    layout();
    touch.addEventListener("change", layout);
    undoBtn.addEventListener("click", undo);
    redoBtn.addEventListener("click", redo);
    for (const b of modeButtons)
        b.addEventListener("click", async () => {
            await canvas.finishText();
            store.dispatch({ type: "mode", mode: b.dataset["mode"] === "preview" ? "preview" : "edit" });
        });
    for (const b of deviceButtons)
        b.addEventListener("click", () => store.dispatch({ type: "device", device: b.dataset["device"] === "mobile" ? "mobile" : "desktop" }));
    pill.addEventListener("click", () => publishing.openReview(pill));
    publishBtn.addEventListener("click", () => publishing.openReview(publishBtn));
    pageButton.addEventListener("click", () => surfaces.openPages());
    const show = must(document, "[data-show-tools]");
    let focus = false;
    function setFocus(on) {
        focus = on;
        store.dispatch({ type: "close_panel" });
        document.body.classList.toggle("studio-focus", on);
        for (const el of document.querySelectorAll(".ed-top, [data-toolbar], [data-bottom-bar]"))
            el.inert = on;
        show.hidden = !on;
        if (on)
            show.focus();
        else
            must(document, "[data-focus]").focus();
        window.dispatchEvent(new Event("resize"));
    }
    must(document, "[data-focus]").addEventListener("click", () => setFocus(true));
    show.addEventListener("click", () => setFocus(false));
    const palette = must(document, "[data-command-palette]");
    const query = must(palette, "input");
    const list = must(palette, '[role="listbox"]');
    let index = 0;
    let filtered = [];
    let paletteOpener = null;
    function commands() {
        const s = store.get();
        return [
            ...s.pages.map((page) => ({ label: `Open page: ${pageLabel(page, s.project.name)}`, run: () => canvas.open(page.path) })),
            { label: "Pages", run: surfaces.openPages },
            { label: "Add a page…", run: surfaces.openAddPage },
            { label: "Images", run: () => must(document, "[data-open-images]").click() },
            { label: "Settings", run: () => publishing.openSettings(pageButton) },
            { label: "Publish", run: () => publishing.openReview(publishBtn) },
            { label: "Version history", run: () => publishing.openHistory(publishBtn) },
            { label: "Edit", run: () => store.dispatch({ type: "mode", mode: "edit" }) },
            { label: "Preview", run: () => store.dispatch({ type: "mode", mode: "preview" }) },
            { label: "Computer", run: () => store.dispatch({ type: "device", device: "desktop" }) },
            { label: "Phone", run: () => store.dispatch({ type: "device", device: "mobile" }) },
            { label: "Focus mode", run: () => setFocus(true) },
            { label: s.history.undo_label ? `Undo: ${s.history.undo_label}` : "Undo", run: undo },
            { label: s.history.redo_label ? `Redo: ${s.history.redo_label}` : "Redo", run: redo },
            { label: "Keyboard shortcuts", run: () => must(document, '[data-dialog="shortcuts"]').showModal() },
        ];
    }
    function runCommand(i) { const command = filtered[i]; if (command) {
        palette.close();
        command.run();
    } }
    function renderCommands() {
        filtered = commands().filter((c) => c.label.toLowerCase().includes(query.value.toLowerCase()));
        index = Math.max(0, Math.min(index, filtered.length - 1));
        list.replaceChildren(...filtered.map((c, i) => {
            const row = h("li", { attrs: { id: `command-${i}`, role: "option", "aria-selected": String(i === index) } });
            const button = h("button", { class: "btn btn-ghost", text: c.label, attrs: { type: "button", tabindex: "-1" } });
            button.addEventListener("click", () => runCommand(i));
            row.append(button);
            return row;
        }));
        if (filtered[index]) {
            query.setAttribute("aria-activedescendant", `command-${index}`);
            list.children[index]?.scrollIntoView({ block: "nearest" });
        }
        else {
            query.removeAttribute("aria-activedescendant");
            list.append(h("li", { text: "No matching commands" }));
        }
    }
    query.addEventListener("input", () => { index = 0; renderCommands(); });
    query.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            index += event.key === "ArrowDown" ? 1 : -1;
            renderCommands();
        }
        else if (event.key === "Enter") {
            event.preventDefault();
            runCommand(index);
        }
    });
    must(palette, "[data-command-close]").addEventListener("click", () => palette.close());
    palette.addEventListener("close", () => paletteOpener?.focus({ preventScroll: true }));
    store.subscribe((s, previous) => {
        if (changed(s, previous, "history")) {
            for (const [b, available, label, word] of [[undoBtn, s.history.can_undo, s.history.undo_label, "Undo"], [redoBtn, s.history.can_redo, s.history.redo_label, "Redo"]]) {
                b.disabled = !available;
                const name = label ? `${word}: ${label}` : word;
                b.setAttribute("aria-label", name);
                b.title = name;
                b.dataset["tip"] = name;
            }
        }
        if (previous && s.changes !== previous.changes && s.draftChanged)
            delete pillText.dataset["publicationFeedback"];
        pillText.textContent = pillText.dataset["publicationFeedback"] ?? publishText(siteState(s));
        pill.setAttribute("aria-label", `${pillText.textContent}. Publishing and versions`);
        publishBtn.textContent = s.changes.length ? `Publish · ${s.changes.length}` : "Publish";
        pageButton.setAttribute("aria-expanded", String(s.surface.kind === "pages"));
        siteName.textContent = s.project.name;
        pageName.textContent = pageLabel(s.pages.find((p) => p.path === s.path) ?? { path: s.path, title: "" }, s.project.name);
        document.title = `${s.project.name} · Pagehaven`;
        for (const b of modeButtons)
            b.setAttribute("aria-pressed", String(b.dataset["mode"] === s.mode));
        for (const b of deviceButtons)
            b.setAttribute("aria-pressed", String(b.dataset["device"] === s.device));
    });
    window.addEventListener("beforeunload", (event) => { if (store.get().saves.pending > 0 || store.get().saves.problem)
        event.preventDefault(); });
    return {
        openPages: surfaces.openPages,
        toggleFocus: () => setFocus(!focus),
        exitFocus: () => { if (!focus)
            return false; setFocus(false); return true; },
        openPalette: () => {
            if (store.get().editing.active || palette.open)
                return;
            paletteOpener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            store.dispatch({ type: "close_panel" });
            query.value = "";
            index = 0;
            palette.showModal();
            renderCommands();
            query.focus();
        },
    };
}
