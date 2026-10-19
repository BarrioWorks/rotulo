export function initialState(data, now) {
    return {
        project: data.project,
        pages: data.pages,
        path: data.pages.some((p) => p.path === "index.html") ? "index.html" : (data.pages[0]?.path ?? "index.html"),
        previewOrigin: data.preview_origin,
        bootstrappedAt: now,
        imageBytes: data.limits.image_bytes,
        history: data.history,
        draftChanged: data.draft_changed_since_publish,
        mode: "edit",
        device: "desktop",
        pending: 0,
        saveError: null,
        focus: { kind: "none" },
        editing: { active: false, formats: { bold: false, italic: false, link: false } },
        canvasLoading: true,
        scrollY: 0,
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
export function reduce(state, action) {
    switch (action.type) {
        case "bootstrapped":
            return {
                ...state,
                project: action.data.project,
                pages: action.data.pages,
                previewOrigin: action.data.preview_origin,
                bootstrappedAt: Date.now(),
                history: action.data.history,
                draftChanged: action.data.draft_changed_since_publish,
                path: action.data.pages.some((p) => p.path === state.path) ? state.path : "index.html",
            };
        case "mode":
            return { ...state, mode: action.mode, focus: { kind: "none" }, editing: { ...state.editing, active: false } };
        case "device":
            return { ...state, device: action.device };
        case "open_page":
            return { ...state, path: action.path, focus: { kind: "none" }, canvasLoading: true, scrollY: 0 };
        case "canvas_loading":
            return { ...state, canvasLoading: true, focus: { kind: "none" }, editing: { ...state.editing, active: false } };
        case "page_ready":
            return {
                ...state,
                path: action.path,
                canvasLoading: false,
                pageMeta: { title: action.title, description: action.description },
            };
        case "selected":
            return { ...state, focus: { kind: "selected", selection: action.selection } };
        case "blocked":
            return { ...state, focus: { kind: "blocked", rect: action.rect }, editing: { ...state.editing, active: false } };
        case "deselected":
            return { ...state, focus: { kind: "none" }, editing: { ...state.editing, active: false } };
        case "viewport": {
            const { focus } = state;
            const next = action.rect === null || focus.kind === "none"
                ? focus
                : focus.kind === "blocked"
                    ? { kind: "blocked", rect: action.rect }
                    : { kind: "selected", selection: { ...focus.selection, rect: action.rect } };
            return { ...state, scrollY: action.scrollY, focus: next };
        }
        case "editing":
            return { ...state, editing: { active: action.active, formats: action.formats } };
        case "save_queued":
            return { ...state, pending: state.pending + 1 };
        case "save_ok":
            return {
                ...state,
                pending: Math.max(0, state.pending - 1),
                saveError: null,
                project: { ...state.project, revision: action.revision },
                history: action.history,
                draftChanged: action.draftChanged,
            };
        case "save_failed":
            return { ...state, pending: Math.max(0, state.pending - 1), saveError: action.message };
        case "save_settled":
            return { ...state, pending: Math.max(0, state.pending - 1) };
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
                project: { ...state.project, live_release: { number: action.release.number, created_at: action.release.created_at } },
            };
        }
        case "domains":
            return { ...state, domains: action.domains, dns: action.dns ?? state.dns };
    }
}
export function changed(state, previous, ...keys) {
    return previous === null || keys.some((k) => state[k] !== previous[k]);
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
