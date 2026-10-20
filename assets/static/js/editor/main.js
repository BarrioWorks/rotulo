import { announce, h, icon, installTooltips, must, toast } from "../ui.js";
import { ApiError, api } from "./api.js";
import { createCanvas } from "./canvas.js";
import { createEdits } from "./edits.js";
import { closeMenus, menuOpen } from "./menu.js";
import { createPublishing } from "./publish.js";
import { createSurfaces } from "./surfaces.js";
import { createSaver, editRecovery } from "./saves.js";
import { createStore, initialState, selection } from "./state.js";
import { createToolbar, describeSelection } from "./toolbar.js";
import { createTopBar } from "./topbar.js";
const root = must(document, "#editor");
const pid = root.dataset["pid"] ?? "";
function showFatal(message) {
    const retry = h("button", { class: "btn btn-secondary btn-sm", text: "Try again", attrs: { type: "button" } });
    retry.addEventListener("click", () => window.location.reload());
    must(document, "[data-canvas-loading]").replaceChildren(icon("alert", "icon-lg"), h("span", { text: message }), retry);
    must(document, "[data-canvas-frame]").classList.add("is-loading");
}
function isTyping(target) {
    return target instanceof Element && target.closest("input, textarea, select, [contenteditable]") !== null;
}
/** Keyboard model: global shortcuts, the canvas region's arrow keys, F6 between regions and the shortcut sheet. */
function wireKeys({ store, canvas, toolbar, topBar, publishing, history }) {
    const sheet = must(document, 'dialog[data-dialog="shortcuts"]');
    must(sheet, "[data-close]").addEventListener("click", () => sheet.close());
    document.addEventListener("keydown", (event) => {
        const key = event.key.toLowerCase();
        const mod = event.metaKey || event.ctrlKey;
        if (event.key === "F6") {
            event.preventDefault();
            cycleRegions(event.shiftKey ? -1 : 1);
            return;
        }
        if (mod && key === "s") {
            event.preventDefault();
            toast("Everything saves automatically.");
            return;
        }
        if (mod && key === ".") {
            event.preventDefault();
            topBar.toggleFocus();
            return;
        }
        if (mod && key === "k" && !store.get().editing.active) {
            event.preventDefault();
            topBar.openPalette();
            return;
        }
        if (isTyping(event.target))
            return;
        if (mod && (key === "z" || key === "y")) {
            event.preventDefault();
            void history(key === "y" || event.shiftKey ? "redo" : "undo");
        }
        else if (event.key === "?" && !mod) {
            event.preventDefault();
            if (!sheet.open)
                sheet.showModal();
        }
        else if (event.key === "Escape" && !event.defaultPrevented) {
            if (document.querySelector("dialog[open]"))
                return;
            if (menuOpen())
                return closeMenus(true);
            if (topBar.exitFocus())
                return;
            if (publishing.closeReview())
                return;
            const s = store.get();
            if (s.editing.active && canvas) {
                void canvas.finishText();
                canvas.surface.focus({ preventScroll: true });
            }
            else if (s.surface.kind !== "none") {
                store.dispatch({ type: "close_panel" });
                canvas?.surface.focus({ preventScroll: true });
            }
            else if (s.focus.kind !== "none" && canvas) {
                canvas.send({ type: "deselect" });
                store.dispatch({ type: "deselected" });
                canvas.surface.focus({ preventScroll: true });
            }
        }
    });
    if (!canvas || !toolbar)
        return;
    canvas.surface.addEventListener("keydown", (event) => {
        if (event.target !== canvas.surface || store.get().mode !== "edit")
            return;
        const sel = selection(store.get());
        const move = (direction) => canvas.send({ type: "select_relative", direction });
        if (event.altKey && event.shiftKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
            toolbar.moveSection(event.key === "ArrowUp" ? "up" : "down");
        }
        else if (event.key === "ArrowDown" || (event.altKey && event.key === "ArrowRight" && !sel))
            move("next");
        else if (event.key === "ArrowUp")
            move("prev");
        else if (event.key === "ArrowLeft")
            move("parent");
        else if (event.key === "ArrowRight")
            move(sel ? "child" : "next");
        else if (event.key === "Enter" && sel)
            toolbar.activatePrimary();
        else if (event.key === "Enter" && !sel)
            move("next");
        else
            return;
        event.preventDefault();
        event.stopPropagation();
    });
    function cycleRegions(direction) {
        const regions = [
            [".ed-top-left", ".ed-top-left a, .ed-top-left button"],
            [".ed-top-center", ".ed-top-center button:not([disabled])"],
            [".ed-top-right", ".ed-top-right button"],
            ["[data-settings-sheet]", "[data-settings-sheet]:not([hidden]) button"],
            ["[data-surface-host]", "[data-surface-host] section:not([hidden]) input, [data-surface-host] section:not([hidden]) button"],
            ["[data-canvas-frame]", "[data-canvas-frame]"],
            ["[data-caption-actions]", "[data-caption-actions]:not([hidden]) button[tabindex='0']:not([hidden])"],
        ];
        const available = regions
            .map(([container, target]) => ({ container: document.querySelector(container), target: document.querySelector(target) }))
            .filter((r) => r.container !== null && r.target !== null && r.target.offsetParent !== null && getComputedStyle(r.target).visibility !== "hidden" && !r.target.closest("[inert]"));
        const current = available.findIndex((r) => r.container.contains(document.activeElement));
        available[(current + direction + available.length) % available.length]?.target.focus();
    }
}
async function main() {
    installTooltips();
    let data;
    try {
        data = await api.bootstrap(pid);
    }
    catch (e) {
        showFatal(e instanceof ApiError ? e.message : "We couldn't open this website.");
        return;
    }
    const store = createStore(initialState(data, Date.now()));
    const saver = createSaver(store, () => api.bootstrap(pid));
    const change = saver.change;
    document.addEventListener("studio-retry", () => {
        if (store.get().saves.problem?.kind === "conflict")
            window.location.reload();
        else
            void saver.retryNow().then((recovered) => { if (recovered)
                canvas?.reload(selection(store.get())?.element ?? null); });
    });
    const conflict = must(document, 'dialog[data-dialog="conflict"]');
    must(conflict, "[data-conflict-reload]").addEventListener("click", () => window.location.reload());
    conflict.addEventListener("cancel", (event) => event.preventDefault());
    store.subscribe((s, prev) => {
        if (s.saves.problem?.kind === "conflict" && prev?.saves.problem?.kind !== "conflict" && !conflict.open)
            conflict.showModal();
    });
    /** Refreshes pages, history and the preview address, in order with the other changes. */
    const refresh = () => change(async () => {
        const fresh = await api.bootstrap(pid);
        store.dispatch({ type: "bootstrapped", data: fresh });
        return fresh;
    }, { log: "none" });
    let canvas = null;
    async function history(action) {
        const s = store.get();
        if (action === "undo" ? !s.history.can_undo : !s.history.can_redo)
            return;
        await canvas?.finishText();
        const label = action === "undo" ? s.history.undo_label : s.history.redo_label;
        const result = await change((base) => (action === "undo" ? api.undo(pid, base) : api.redo(pid, base)), {
            log: action,
            recover: (fresh) => ({ ...editRecovery(fresh), pages: fresh.pages.map((p) => p.path) }),
        });
        if (!result)
            return;
        announce(`${action === "undo" ? "Undone" : "Redone"}${label ? `: ${label}` : ""}`);
        await afterDraftReplaced(result.pages);
    }
    async function afterDraftReplaced(changedPages) {
        const before = store.get().path;
        await refresh();
        const s = store.get();
        if (!canvas)
            return;
        if (!s.pages.some((p) => p.path === before))
            canvas.open(s.path);
        else if (changedPages.includes(before)) {
            const sel = selection(s)?.element ?? null;
            canvas.reload(sel, sel !== null);
        }
    }
    const publishing = createPublishing({ store, saver, afterRestore: afterDraftReplaced });
    const undo = () => void history("undo");
    const redo = () => void history("redo");
    canvas = createCanvas(store, {
        onText(element, html, page) {
            void change((base) => api.edit(pid, base, page, { op: "set_text", element, html }), {
                page,
                recover: editRecovery,
                onRejected: () => canvas?.reload(element),
            });
        },
        async refreshPreview() {
            await refresh();
        },
        onPageClick() {
            publishing.closeReview(false);
            closeMenus();
        },
    });
    const edits = createEdits({ store, canvas, change, undo });
    const toolbar = createToolbar({ store, canvas, edits });
    const surfaces = createSurfaces({
        store,
        canvas,
        change,
        edits,
        returnFocus: () => {
            if (!toolbar.focus())
                canvas?.surface.focus({ preventScroll: true });
        },
        openSettings: (trigger) => publishing.openSettings(trigger),
        openHistory: (trigger) => publishing.openHistory(trigger),
    });
    const topBar = createTopBar({ store, canvas, surfaces, publishing, undo, redo });
    wireKeys({ store, canvas, toolbar, topBar, publishing, history });
    let lastAnnounced = null;
    store.subscribe((s) => {
        const sel = selection(s);
        const key = sel ? sel.element : s.focus.kind === "blocked" ? "blocked" : null;
        if (key === lastAnnounced)
            return;
        lastAnnounced = key;
        if (sel) {
            const hint = sel.can.includes("t") ? "Press Enter to edit the text." : "Press Tab for its tools.";
            announce(`${describeSelection(sel, s)}. ${hint}`);
        }
        else if (s.focus.kind === "blocked") {
            announce("This part is made by the website's own code and can't be changed here.");
        }
    });
    canvas.open(store.get().path);
}
void main();
