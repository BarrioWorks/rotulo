import { h, icon, must } from "../ui.js";
import { ApiError, api, onConflict } from "./api.js";
import { createCanvas } from "./canvas.js";
import { createPublishing } from "./publish.js";
import { createSaver } from "./saves.js";
import { createSidebar } from "./sidebar.js";
import { changed, createStore, initialState } from "./state.js";
import { createToolbar } from "./toolbar.js";
const root = must(document, "#editor");
const pid = root.dataset["pid"] ?? "";
function showFatal(message) {
    must(document, "[data-canvas-loading]").replaceChildren(icon("alert", "icon-lg"), h("span", { text: message }), Object.assign(h("button", { class: "btn btn-secondary btn-sm", text: "Try again", attrs: { type: "button" } }), {
        onclick: () => window.location.reload(),
    }));
}
function wireTopBar(store, undo, redo) {
    const undoBtn = must(document, '[data-action="undo"]');
    const redoBtn = must(document, '[data-action="redo"]');
    const status = must(document, "[data-save-status]");
    const statusText = must(document, "[data-save-text]");
    const siteName = must(document, "[data-site-name]");
    const modeButtons = [...document.querySelectorAll("[data-mode]")];
    const deviceButtons = [...document.querySelectorAll("[data-device]")];
    undoBtn.addEventListener("click", undo);
    redoBtn.addEventListener("click", redo);
    for (const b of modeButtons)
        b.addEventListener("click", () => store.dispatch({ type: "mode", mode: b.dataset["mode"] }));
    for (const b of deviceButtons)
        b.addEventListener("click", () => store.dispatch({ type: "device", device: b.dataset["device"] }));
    store.subscribe((s, prev) => {
        if (changed(s, prev, "history")) {
            undoBtn.disabled = !s.history.can_undo;
            redoBtn.disabled = !s.history.can_redo;
            undoBtn.title = s.history.undo_label ? `Undo: ${s.history.undo_label}` : "Undo";
            redoBtn.title = s.history.redo_label ? `Redo: ${s.history.redo_label}` : "Redo";
        }
        if (changed(s, prev, "pending", "saveError")) {
            const state = s.pending > 0 ? "saving" : s.saveError ? "error" : "saved";
            status.dataset["state"] = state;
            statusText.textContent = state === "saving" ? "Saving…" : state === "error" ? (s.saveError ?? "Not saved") : "Saved";
        }
        if (changed(s, prev, "mode"))
            for (const b of modeButtons)
                b.setAttribute("aria-pressed", String(b.dataset["mode"] === s.mode));
        if (changed(s, prev, "device"))
            for (const b of deviceButtons)
                b.setAttribute("aria-pressed", String(b.dataset["device"] === s.device));
        if (changed(s, prev, "project")) {
            siteName.textContent = s.project.name;
            document.title = `${s.project.name} · Pagehaven`;
        }
    });
}
async function main() {
    let data;
    try {
        data = await api.bootstrap(pid);
    }
    catch (e) {
        showFatal(e instanceof ApiError ? e.message : "We couldn't open this website.");
        return;
    }
    const store = createStore(initialState(data, Date.now()));
    const change = createSaver(store);
    const conflict = must(document, 'dialog[data-dialog="conflict"]');
    must(conflict, "[data-conflict-reload]").addEventListener("click", () => window.location.reload());
    conflict.addEventListener("cancel", (event) => event.preventDefault());
    onConflict(() => {
        if (!conflict.open)
            conflict.showModal();
    });
    /** Refreshes pages, history and the preview address, in order with the other changes. */
    const refresh = () => change(async () => {
        const fresh = await api.bootstrap(pid);
        store.dispatch({ type: "bootstrapped", data: fresh });
        return fresh;
    });
    const canvas = createCanvas(store, {
        onText(element, html, page) {
            void change((base) => api.edit(pid, base, page, { op: "set_text", element, html }), {
                onRejected: () => canvas.reload(element),
            });
        },
        onShortcut(action) {
            void history(action);
        },
        async refreshPreview() {
            await refresh();
        },
    });
    async function history(action) {
        const s = store.get();
        if (action === "undo" ? !s.history.can_undo : !s.history.can_redo)
            return;
        canvas.send({ type: "finish_text", commit: true });
        const result = await change((base) => (action === "undo" ? api.undo(pid, base) : api.redo(pid, base)));
        if (!result)
            return;
        await afterDraftReplaced(result.pages);
    }
    async function afterDraftReplaced(changedPages) {
        const before = store.get().path;
        await refresh();
        const s = store.get();
        if (!s.pages.some((p) => p.path === before))
            canvas.open(s.path);
        else if (changedPages.includes(before)) {
            const sel = s.focus.kind === "selected" ? s.focus.selection.element : null;
            canvas.reload(sel);
        }
    }
    wireTopBar(store, () => void history("undo"), () => void history("redo"));
    createToolbar({ store, canvas, change });
    createSidebar({ store, canvas, change });
    createPublishing({ store, change, afterRestore: afterDraftReplaced });
    document.addEventListener("keydown", (event) => {
        const target = event.target instanceof Element ? event.target : null;
        if (target?.closest("input, textarea, select, [contenteditable]"))
            return;
        const key = event.key.toLowerCase();
        if ((event.metaKey || event.ctrlKey) && (key === "z" || key === "y")) {
            event.preventDefault();
            void history(key === "y" || event.shiftKey ? "redo" : "undo");
        }
        else if (event.key === "Escape" && store.get().focus.kind !== "none") {
            canvas.send({ type: "deselect" });
            store.dispatch({ type: "deselected" });
        }
    });
    window.addEventListener("beforeunload", (event) => {
        if (store.get().pending > 0)
            event.preventDefault();
    });
    canvas.open(store.get().path);
}
void main();
