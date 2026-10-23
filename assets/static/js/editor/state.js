import { STYLE_KEYS } from "../protocol.js";
/** What servers accepted before they described their support: eleven style properties and no structure edits. */
export const LEGACY_EDIT_SUPPORT = {
    styleProperties: new Set([
        "color", "background-color", "font-size", "font-weight", "text-align",
        "padding-top", "padding-bottom", "padding-left", "padding-right", "margin-top", "margin-bottom",
    ]),
    structuralEditing: false,
};
/** Every property the layout panel sets. The panel only shows when the server accepts all of them. */
export const LAYOUT_STYLE_KEYS = [
    "width", "max-width", "height", "min-height",
    "margin-top", "margin-right", "margin-bottom", "margin-left", "padding-top", "padding-right", "padding-bottom", "padding-left",
    "display", "flex-direction", "flex-wrap", "justify-content", "align-items", "gap", "grid-template-columns",
    "border-width", "border-style", "border-color", "border-radius", "opacity", "overflow",
];
/** Reads `features.editor`. A server that leaves it out is an older one. Unknown property names are ignored. */
export function editSupportOf(data) {
    const editor = data.features?.editor;
    if (!editor)
        return LEGACY_EDIT_SUPPORT;
    const known = new Set(STYLE_KEYS);
    return {
        styleProperties: new Set(editor.style_properties.filter((key) => known.has(key))),
        structuralEditing: editor.structural_editing,
    };
}
export function supportsStyles(support, keys) {
    return keys.every((key) => support.styleProperties.has(key));
}
export function unsupportedStyles(support, styles) {
    return Object.keys(styles).filter((key) => !support.styleProperties.has(key));
}
export function canEditStructure(support) {
    return support.structuralEditing;
}
export function initialState(data, now) {
    return {
        project: data.project,
        pages: data.pages,
        path: data.pages.some((p) => p.path === "index.html") ? "index.html" : (data.pages[0]?.path ?? "index.html"),
        previewOrigin: data.preview_origin,
        canvasOrigin: data.preview_origin,
        bootstrappedAt: now,
        imageBytes: data.limits.image_bytes,
        customDomains: data.features?.custom_domains ?? true,
        editSupport: editSupportOf(data),
        history: data.history,
        draftChanged: data.draft_changed_since_publish,
        changes: [],
        mode: "edit",
        device: typeof matchMedia !== "undefined" && matchMedia("(max-width: 599px)").matches ? "mobile" : "desktop",
        zoom: "fit",
        saves: { pending: 0, problem: null, savedAt: null },
        focus: { kind: "none" },
        editing: { active: false, formats: { bold: false, italic: false, link: false } },
        canvasLoading: true,
        scrollY: 0,
        obstructions: [],
        obstacles: [],
        outline: { heading: null, images: [] },
        palette: [],
        anchors: [],
        surface: { kind: "none" },
        pageMeta: { title: "", description: "" },
        releases: null,
        domains: null,
        dns: null,
    };
}
/** Turns `/menu.html`, `/`, `/blog/` into a draft page path. */
export function pagePath(pathname) {
    let path = pathname.replace(/^\/+/, "");
    try {
        path = decodeURIComponent(path);
    }
    catch {
        /* keep the raw path */
    }
    if (path === "" || path.endsWith("/"))
        path += "index.html";
    return path;
}
/**
 * Whether a surface panel makes sense for a selection. The page panel needs none.
 * With `support`, a panel also needs the server to accept what it changes.
 */
export function panelApplies(panel, selection, editing, support) {
    if (panel === "page")
        return true;
    if (!selection)
        return false;
    const can = selection.can;
    switch (panel) {
        case "style": return can.includes("s") && can.includes("t");
        case "layout": return can.includes("s") && (!support || supportsStyles(support, LAYOUT_STYLE_KEYS));
        case "background": return can.includes("s") || can.includes("b");
        case "link": return can.includes("l");
        case "text-link": return editing;
        case "image": return can.includes("i");
    }
}
function selectionOf(focus) {
    return focus.kind === "selected" ? focus.selection : null;
}
/**
 * Keeps an open panel when it still applies: on the same element even if its kind changed, or on a new
 * selection of the same kind. Otherwise closes it.
 */
function retarget(surface, focus, editing, support) {
    if (surface.kind !== "panel" || surface.panel === "page")
        return surface;
    const selection = selectionOf(focus);
    if (!selection || !panelApplies(surface.panel, selection, editing, support))
        return { kind: "none" };
    if (selection.element === surface.element)
        return selection.kind === surface.subject ? surface : { ...surface, subject: selection.kind };
    return selection.kind === surface.subject ? { ...surface, element: selection.element, replaced: false } : { kind: "none" };
}
function logChange(changes, log, previous, next, page, element = null) {
    switch (log) {
        case "edit":
            return next.undo_label ? [...changes, { label: next.undo_label, page, ...(element ? { element } : {}) }] : changes;
        case "undo":
            return changes.slice(0, -1);
        case "redo":
            return previous.redo_label ? [...changes, { label: previous.redo_label, page }] : changes;
        case "none":
            return changes;
    }
}
export function reduce(state, action) {
    switch (action.type) {
        case "bootstrapped": {
            const editSupport = editSupportOf(action.data);
            return {
                ...state,
                editSupport,
                surface: retarget(state.surface, state.focus, state.editing.active, editSupport),
                project: action.data.project,
                pages: action.data.pages,
                previewOrigin: action.data.preview_origin,
                bootstrappedAt: Date.now(),
                history: action.data.history,
                draftChanged: action.data.draft_changed_since_publish,
                changes: action.data.draft_changed_since_publish ? state.changes : [],
                path: action.data.pages.some((p) => p.path === state.path) ? state.path : "index.html",
            };
        }
        case "mode":
            return { ...state, mode: action.mode, focus: { kind: "none" }, editing: { ...state.editing, active: false }, surface: retarget(state.surface, { kind: "none" }, false, state.editSupport) };
        case "device":
            return { ...state, device: action.device };
        case "zoom":
            return { ...state, zoom: action.zoom };
        case "open_page":
            return { ...state, path: action.path, focus: { kind: "none" }, canvasLoading: true, scrollY: 0, outline: { heading: null, images: [] }, surface: retarget(state.surface, { kind: "none" }, false, state.editSupport) };
        case "canvas_loading":
            return { ...state, canvasLoading: true, focus: { kind: "none" }, editing: { ...state.editing, active: false }, surface: retarget(state.surface, { kind: "none" }, false, state.editSupport) };
        case "page_ready":
            if (action.path !== state.path)
                return state;
            return { ...state, canvasLoading: false, canvasOrigin: action.origin, pageMeta: { title: action.title, description: action.description } };
        case "selected": {
            const focus = { kind: "selected", selection: action.selection };
            return { ...state, focus, obstacles: action.obstacles ?? [], surface: retarget(state.surface, focus, state.editing.active, state.editSupport) };
        }
        case "blocked":
            return { ...state, focus: { kind: "blocked", rect: action.rect, around: action.around }, editing: { ...state.editing, active: false }, surface: retarget(state.surface, { kind: "none" }, false, state.editSupport) };
        case "deselected":
            return { ...state, focus: { kind: "none" }, editing: { ...state.editing, active: false }, surface: retarget(state.surface, { kind: "none" }, false, state.editSupport) };
        case "viewport": {
            const { focus } = state;
            const next = action.rect === null || focus.kind === "none"
                ? focus
                : focus.kind === "blocked"
                    ? { ...focus, rect: action.rect }
                    : { kind: "selected", selection: { ...focus.selection, rect: action.rect } };
            return { ...state, scrollY: action.scrollY, focus: next, obstructions: action.obstructions, obstacles: action.obstacles ?? state.obstacles };
        }
        case "outline":
            return { ...state, outline: action.outline };
        case "open_surface":
            return { ...state, surface: { kind: action.surface } };
        case "open_images":
            return { ...state, surface: { kind: "images" } };
        case "palette":
            return { ...state, palette: action.colors };
        case "anchors":
            return { ...state, anchors: action.items };
        case "editing": {
            const surface = !action.active && state.surface.kind === "panel" && state.surface.panel === "text-link" ? { kind: "none" } : state.surface;
            return { ...state, editing: { active: action.active, formats: action.formats }, surface };
        }
        case "open_panel": {
            const selection = selectionOf(state.focus);
            if (!panelApplies(action.panel, selection, state.editing.active, state.editSupport))
                return state;
            const page = action.panel === "page";
            return { ...state, surface: { kind: "panel", panel: action.panel, element: page ? null : (selection?.element ?? null), subject: page ? null : (selection?.kind ?? null), replaced: action.replaced ?? false } };
        }
        case "close_panel":
            return state.surface.kind === "none" ? state : { ...state, surface: { kind: "none" } };
        case "save_queued":
            return { ...state, saves: { ...state.saves, pending: state.saves.pending + 1 } };
        case "save_ok": {
            const draftChanged = action.draftChanged;
            const changes = draftChanged ? logChange(state.changes, action.log, state.history, action.history, action.page, action.element) : [];
            // Undo and redo make "Picture replaced" and its choices out of date.
            const stepped = action.log === "undo" || action.log === "redo";
            const surface = stepped && state.surface.kind === "panel" && state.surface.replaced ? { ...state.surface, replaced: false } : state.surface;
            return {
                ...state,
                surface,
                saves: { pending: Math.max(0, state.saves.pending - 1), problem: null, savedAt: action.at },
                project: { ...state.project, revision: action.revision },
                history: action.history,
                draftChanged,
                changes,
            };
        }
        case "save_settled":
            return { ...state, saves: { ...state.saves, pending: Math.max(0, state.saves.pending - 1), problem: state.saves.problem?.kind === "offline" ? null : state.saves.problem } };
        case "save_offline":
            return { ...state, saves: { ...state.saves, problem: { kind: "offline" } } };
        case "save_failed":
            return { ...state, saves: { ...state.saves, pending: Math.max(0, state.saves.pending - 1), problem: { kind: "error", message: action.message } } };
        case "save_conflict":
            return { ...state, saves: { ...state.saves, pending: Math.max(0, state.saves.pending - 1), problem: { kind: "conflict" } } };
        case "pages":
            return { ...state, pages: action.pages };
        case "project":
            return { ...state, project: action.project };
        case "page_meta":
            return {
                ...state,
                pageMeta: { title: action.title, description: action.description },
                pages: state.pages.map((p) => (p.path === state.path ? { ...p, title: action.title } : p)),
            };
        case "releases":
            return { ...state, releases: action.releases };
        case "published": {
            const releases = [action.release, ...(state.releases ?? []).map((r) => ({ ...r, live: false }))];
            return {
                ...state,
                releases,
                draftChanged: false,
                changes: [],
                project: { ...state.project, live_release: { number: action.release.number, created_at: action.release.created_at } },
            };
        }
        case "nothing_to_publish":
            return { ...state, draftChanged: false, changes: [] };
        case "domains":
            return { ...state, domains: action.domains, dns: action.dns ?? state.dns };
    }
}
export function siteState(s) {
    const live = s.project.live_release;
    if (!live)
        return { kind: "never" };
    const latest = Math.max(live.number, ...(s.releases ?? []).map((r) => r.number));
    if (latest > live.number)
        return { kind: "older", live: live.number, latest, draftChanged: s.draftChanged };
    if (!s.draftChanged)
        return { kind: "current", live: live.number };
    return { kind: "changes", live: live.number, count: s.changes.length };
}
/** How many changes, in words: "1 change", "3 changes". */
function changesText(n) {
    return n === 1 ? "1 change" : `${n} changes`;
}
/** The publication state in the editor's one vocabulary: published, not published. */
export function publishText(site) {
    switch (site.kind) {
        case "never": return "Not published yet";
        case "current": return "Published";
        case "changes": return site.count > 0 ? `${changesText(site.count)} not published` : "Changes not published";
        case "older": return `Visitors see version ${site.live}`;
    }
}
/**
 * The status in the top bar, as plain words in two parts that both stay on screen: whether the
 * changes are saved, and whether the website is published. A save problem replaces both, in
 * its warning or error colour. `savingVisible` is a timer the top bar owns (saves that land
 * quickly never flash "Saving…"), so this stays pure.
 */
export function statusLine(s, savingVisible) {
    const problem = s.saves.problem;
    const alone = (tone, save) => ({ tone, text: save, save, publish: null, mark: "problem" });
    if (problem?.kind === "conflict")
        return alone("error", "Reload to check changes");
    if (problem?.kind === "error")
        return alone("error", "Couldn't save");
    if (problem?.kind === "offline")
        return alone("warning", "Offline: changes will be saved when you're back");
    const saving = s.saves.pending > 0 && savingVisible;
    const save = saving ? "Saving…" : "Saved";
    const publish = publishText(siteState(s));
    return { tone: "neutral", text: `${save} · ${publish}`, save, publish, mark: saving ? "saving" : "saved" };
}
/** Publishing makes sense only when the draft differs from what is live. */
export function canPublish(s) {
    return s.draftChanged;
}
export function changed(state, previous, ...keys) {
    return previous === null || keys.some((k) => state[k] !== previous[k]);
}
export function selection(state) {
    return selectionOf(state.focus);
}
export function createStore(initial) {
    let state = initial;
    const listeners = [];
    return {
        get: () => state,
        dispatch(action) {
            const previous = state;
            state = reduce(state, action);
            if (state !== previous)
                for (const listener of listeners)
                    listener(state, previous);
        },
        subscribe(listener) {
            listeners.push(listener);
            listener(state, null);
        },
    };
}
