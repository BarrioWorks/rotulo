import { pageLabel } from "./pages.js";
import { envelope, parseAgentMessage } from "../protocol.js";
import { announce, h, icon, must, toast } from "../ui.js";
import { changed, selection } from "./state.js";
import { acceptsCanvasMessage, canvasNavigation } from "./canvas-policy.js";
const PREVIEW_MAX_AGE_MS = 11 * 60 * 60 * 1000;
/** The site always lays out at least this wide on "Computer", then scales to fit. */
export const DESKTOP_WIDTH = 1280;
export const PHONE = { width: 390, height: 844 };
export const TABLET = { width: 834, height: 1112 };
const BEZEL = 11;
const VEIL_DELAY_MS = 300;
/** Fits a 1280 px desktop, an 834 by 1112 tablet or a 390 by 844 phone into the space the window leaves. */
export function frameLayout(device, zoom, available) {
    const width = Math.max(1, available.width);
    const height = Math.max(1, available.height);
    if (device !== "desktop") {
        const screen = device === "mobile" ? PHONE : TABLET;
        // On a phone this is the real viewport, not a miniature device mockup.
        if (device === "mobile" && width < 600) {
            const viewport = { width: Math.min(PHONE.width, width), height };
            return { scale: 1, viewport, frame: { ...viewport } };
        }
        const fit = Math.min(1, (width - 2 * BEZEL) / screen.width, (height - 2 * BEZEL) / screen.height);
        const scale = zoom === "actual" ? 1 : Math.max(0.2, fit);
        return { scale, viewport: { ...screen }, frame: { width: screen.width * scale, height: screen.height * scale } };
    }
    const layoutWidth = Math.max(width, DESKTOP_WIDTH);
    const scale = zoom === "actual" ? 1 : width / layoutWidth;
    return { scale, viewport: { width: layoutWidth, height: height / scale }, frame: { width: layoutWidth * scale, height } };
}
/** Reserve the canvas before bootstrap. Read the container, including its responsive padding. */
export function reserveFrame(area, surface, iframe, device = "desktop", zoom = "fit") {
    const css = getComputedStyle(area);
    const number = (value) => parseFloat(value) || 0;
    const layout = frameLayout(device, zoom, {
        width: area.clientWidth - number(css.paddingLeft) - number(css.paddingRight),
        height: area.clientHeight - number(css.paddingTop) - number(css.paddingBottom),
    });
    surface.style.width = `${layout.frame.width}px`;
    surface.style.height = `${layout.frame.height}px`;
    surface.style.setProperty("--canvas-scale", String(layout.scale));
    iframe.style.width = `${layout.viewport.width}px`;
    iframe.style.height = `${layout.viewport.height}px`;
    iframe.style.transform = layout.scale === 1 ? "" : `scale(${layout.scale})`;
    return layout;
}
// Module evaluation runs before main() awaits bootstrap, while the deferred module's DOM exists.
let initialSizing = null;
if (typeof document !== "undefined") {
    const area = document.querySelector("[data-canvas-area]");
    const surface = document.querySelector("[data-canvas-frame]");
    const iframe = document.querySelector("[data-canvas]");
    if (area && surface && iframe) {
        const reserve = () => reserveFrame(area, surface, iframe);
        reserve();
        initialSizing = new ResizeObserver(reserve);
        initialSizing.observe(area);
    }
}
/** The app's interface font, handed to the agent as bytes so the slug in the site matches the app. */
const UI_FONT_URL = "/static/fonts/onest-variable-latin.woff2";
let uiFont = null;
function loadUiFont() {
    uiFont ??= fetch(UI_FONT_URL, { credentials: "same-origin" })
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .catch(() => null);
    return uiFont;
}
/** Which part is chosen, so a moved or resized selection does not count as a new one. */
function focusKey(s) {
    return s.focus.kind === "selected" ? s.focus.selection.element : s.focus.kind === "blocked" ? "blocked" : null;
}
function makeIframe(title) {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
    iframe.setAttribute("referrerpolicy", "no-referrer");
    iframe.className = "canvas-iframe";
    iframe.title = title;
    return iframe;
}
export function createCanvas(store, handlers) {
    const area = must(document, "[data-canvas-area]");
    const surface = must(document, "[data-canvas-frame]");
    const loading = must(document, "[data-canvas-loading]");
    const loadingText = must(document, "[data-canvas-loading-text]");
    const zoomButton = must(document, "[data-zoom]");
    const zoomLabel = must(document, "[data-zoom-label]");
    const hintText = must(document, "[data-canvas-hint-text]");
    const tip = must(document, "[data-editable-tip]");
    const welcomeUrl = new URL(window.location.href);
    const welcome = welcomeUrl.searchParams.get("welcome") === "1";
    if (welcome) {
        welcomeUrl.searchParams.delete("welcome");
        window.history.replaceState(window.history.state, "", welcomeUrl);
    }
    /** The tip and the agent's tint share one lifetime: shown together, gone together. */
    function showEditable() {
        store.dispatch({ type: "mode", mode: "edit" });
        if (store.get().focus.kind !== "none") {
            send({ type: "deselect" });
            store.dispatch({ type: "deselected" });
        }
        tip.hidden = false;
        if (!awaitingReady)
            send({ type: "show_editable" });
        announce(must(tip, "[data-editable-tip-text]").textContent ?? "");
    }
    function dismissEditable() {
        if (tip.hidden)
            return false;
        tip.hidden = true;
        if (!awaitingReady)
            send({ type: "hide_editable" });
        return true;
    }
    must(tip, "[data-editable-tip-close]").addEventListener("click", () => {
        dismissEditable();
        surface.focus({ preventScroll: true });
    });
    /** The frame on screen, and the one loading behind it until its agent says it is ready. */
    let active = must(surface, "[data-canvas]");
    let pending = null;
    let layout = frameLayout("desktop", "fit", { width: 1, height: 1 });
    let restore = { scrollY: null, select: null, pulse: false };
    let slowTimer = 0;
    let veilTimer = 0;
    let expectedPath = store.get().path;
    let awaitingReady = true;
    let readyFrame = null;
    let navigationVersion = 0;
    let textSession = null;
    let drag = null;
    let dragTimer = 0;
    const dragHandle = h("button", {
        class: "canvas-drag-handle", hidden: true,
        attrs: { type: "button", "aria-label": "Drag selected part to move", title: "Drag to move. Escape cancels." },
    }, icon("grip"));
    Object.assign(dragHandle.style, {
        position: "absolute", zIndex: "2", width: "44px", height: "44px", minWidth: "44px", minHeight: "44px",
        display: "grid", placeItems: "center", border: "1px solid var(--control-edge)", borderRadius: "8px",
        background: "var(--surface)", color: "var(--ink)", cursor: "grab", touchAction: "none", userSelect: "none",
    });
    surface.append(dragHandle);
    function renderDragHandle() {
        const s = store.get();
        const sel = selection(s);
        const rect = sel?.rect;
        const visible = drag || (rect && rect.width > 0 && rect.height > 0 && rect.x + rect.width > 0 && rect.y + rect.height > 0
            && rect.x < layout.viewport.width && rect.y < layout.viewport.height);
        dragHandle.hidden = awaitingReady || s.canvasLoading || s.mode !== "edit" || !!textSession || !sel?.can.includes("m") || !visible;
        dragHandle.style.display = dragHandle.hidden ? "none" : "grid";
        if (drag || !rect)
            return;
        const left = rect.x * layout.scale;
        const beside = left >= 44 ? left - 44 : (rect.x + rect.width) * layout.scale;
        dragHandle.style.left = `${Math.max(0, Math.min(layout.frame.width - 44, beside))}px`;
        dragHandle.style.top = `${Math.max(0, Math.min(layout.frame.height - 44, rect.y * layout.scale))}px`;
    }
    function clearDrag() {
        const old = drag;
        drag = null;
        window.clearTimeout(dragTimer);
        surface.removeAttribute("data-dragging");
        dragHandle.style.cursor = "grab";
        if (old && old.phase !== "committing" && dragHandle.hasPointerCapture(old.pointerId))
            dragHandle.releasePointerCapture(old.pointerId);
        renderDragHandle();
    }
    function cancelDrag() {
        const old = drag;
        clearDrag();
        if (old)
            old.source.postMessage(envelope({ type: "drag_cancel", drag: old.token }), old.origin);
    }
    function currentDrag(owner) {
        const s = store.get();
        return owner.frame === active && owner.source === active.contentWindow && owner.origin === originOf(active)
            && owner.path === expectedPath && owner.path === s.path && !awaitingReady && !s.canvasLoading
            && s.mode === "edit" && !textSession && selection(s)?.element === owner.element;
    }
    function dragPoint(event) {
        const r = active.getBoundingClientRect();
        const bound = (value) => Math.max(-1e6, Math.min(1e6, value));
        return { x: bound((event.clientX - r.left) / layout.scale), y: bound((event.clientY - r.top) / layout.scale) };
    }
    dragHandle.addEventListener("pointerdown", (event) => {
        const s = store.get();
        const sel = selection(s);
        if (!event.isTrusted || !event.isPrimary || event.button !== 0 || drag || dragHandle.hidden
            || awaitingReady || s.canvasLoading || s.mode !== "edit" || textSession || !sel?.can.includes("m") || !active.contentWindow)
            return;
        event.preventDefault();
        event.stopPropagation();
        try {
            dragHandle.setPointerCapture(event.pointerId);
        }
        catch {
            return;
        }
        dragHandle.focus({ preventScroll: true });
        drag = { phase: "pressed", frame: active, source: active.contentWindow, origin: originOf(active), path: expectedPath,
            element: sel.element, token: crypto.randomUUID(), pointerId: event.pointerId, start: { x: event.clientX, y: event.clientY } };
        send({ type: "drag_start", drag: drag.token, element: drag.element, point: dragPoint(event) });
        dragTimer = window.setTimeout(cancelDrag, 60_000);
    });
    window.addEventListener("pointermove", (event) => {
        if (!event.isTrusted || !drag || drag.phase === "committing" || event.pointerId !== drag.pointerId)
            return;
        if (!currentDrag(drag) || !(event.buttons & 1)) {
            cancelDrag();
            return;
        }
        event.preventDefault();
        if (drag.phase === "pressed" && Math.hypot(event.clientX - drag.start.x, event.clientY - drag.start.y) < 4)
            return;
        drag.phase = "dragging";
        surface.setAttribute("data-dragging", "");
        dragHandle.style.cursor = "grabbing";
        send({ type: "drag_point", drag: drag.token, point: dragPoint(event) });
    }, { capture: true, passive: false });
    window.addEventListener("pointerup", (event) => {
        if (!event.isTrusted || !drag || drag.phase === "committing" || event.pointerId !== drag.pointerId)
            return;
        event.preventDefault();
        const point = dragPoint(event);
        const areaRect = area.getBoundingClientRect();
        if (drag.phase !== "dragging" || !currentDrag(drag) || event.button !== 0
            || point.x < 0 || point.y < 0 || point.x > layout.viewport.width || point.y > layout.viewport.height
            || event.clientX < areaRect.left || event.clientX > areaRect.right || event.clientY < areaRect.top || event.clientY > areaRect.bottom) {
            cancelDrag();
            return;
        }
        const pointerId = drag.pointerId;
        // The request is disclosed to the untrusted page only after the owner's release.
        drag = { ...drag, phase: "committing", request: crypto.randomUUID(), expiresAt: Date.now() + 800 };
        window.clearTimeout(dragTimer);
        dragTimer = window.setTimeout(cancelDrag, 800);
        if (dragHandle.hasPointerCapture(pointerId))
            dragHandle.releasePointerCapture(pointerId);
        send({ type: "drag_end", drag: drag.token, request: drag.request, point });
    }, true);
    dragHandle.addEventListener("lostpointercapture", (event) => {
        if (drag && drag.phase !== "committing" && drag.pointerId === event.pointerId)
            cancelDrag();
    });
    window.addEventListener("pointercancel", (event) => {
        if (drag && drag.phase !== "committing" && drag.pointerId === event.pointerId)
            cancelDrag();
    }, true);
    dragHandle.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); });
    window.addEventListener("blur", cancelDrag);
    document.addEventListener("visibilitychange", () => { if (document.hidden)
        cancelDrag(); });
    /**
     * The preview origin each frame was loaded from. The preview address changes every time the
     * editor reloads its state (publishing again, undo), so a frame already on screen keeps
     * talking to the origin it was opened on until the next page load.
     */
    const frameOrigins = new WeakMap();
    const originOf = (frame) => frameOrigins.get(frame) ?? store.get().previewOrigin;
    function url(origin, path) {
        return `${origin}/${path.split("/").map(encodeURIComponent).join("/")}`;
    }
    function title(s) {
        const page = s.pages.find((p) => p.path === s.path);
        const name = page ? pageLabel(page, s.project.name, s.pages) : s.path;
        return `Your page: ${name}, ${s.mode === "edit" ? "editing" : "preview"}`;
    }
    function sizeIframe(iframe) {
        iframe.style.width = `${layout.viewport.width}px`;
        iframe.style.height = `${layout.viewport.height}px`;
        iframe.style.transform = layout.scale === 1 ? "" : `scale(${layout.scale})`;
    }
    function applyLayout() {
        cancelDrag();
        const s = store.get();
        layout = reserveFrame(area, surface, active, s.device, s.zoom);
        for (const iframe of [active, pending])
            if (iframe)
                sizeIframe(iframe);
        if (!awaitingReady)
            send({ type: "scale", scale: layout.scale });
        const percent = Math.round(layout.scale * 100);
        zoomLabel.textContent = s.zoom === "fit" ? `Fit ${percent}%` : `${percent}%`;
        zoomButton.setAttribute("aria-label", s.zoom === "fit" ? `Zoom: fit to window, ${percent} percent. Show at actual size` : "Zoom: actual size. Fit to window");
        zoomButton.dataset["tip"] = s.zoom === "fit"
            ? layout.scale < 0.6 ? "Text is small at this size. Widen the window or show at actual size." : "Show at actual size"
            : "Fit to window";
        zoomButton.hidden = s.zoom === "fit" && percent === 100;
        zoomButton.classList.toggle("is-small", s.zoom === "fit" && layout.scale < 0.6);
        renderDragHandle();
    }
    initialSizing?.disconnect();
    initialSizing = null;
    new ResizeObserver(() => applyLayout()).observe(area);
    function setLoadingVeil(on) {
        loading.setAttribute("aria-hidden", String(!on));
        window.clearTimeout(veilTimer);
        if (on)
            veilTimer = window.setTimeout(() => surface.classList.add("is-loading"), VEIL_DELAY_MS);
        else
            surface.classList.remove("is-loading");
    }
    /** Frames whose next load event is one the editor asked for. */
    const expectedLoads = new WeakSet();
    function watchLoads(frame) {
        frame.addEventListener("load", () => {
            if (expectedLoads.has(frame)) {
                expectedLoads.delete(frame);
                window.setTimeout(() => {
                    if (pending === frame && awaitingReady) {
                        window.clearTimeout(slowTimer);
                        swap();
                        loading.removeAttribute("aria-hidden");
                        surface.classList.add("is-loading");
                        loadingText.textContent = "This page can't be edited. It may not be a web page.";
                    }
                }, 4000);
            }
            else if (frame === active && !awaitingReady) {
                // The page moved itself (a script or a refresh). Go back to the page the editor chose.
                textSession = null;
                const s = store.get();
                restore = { scrollY: s.scrollY, select: s.focus.kind === "selected" ? s.focus.selection.element : null, pulse: false };
                store.dispatch({ type: "canvas_loading" });
                void navigate(expectedPath);
            }
        });
    }
    watchLoads(active);
    let textFinished = null;
    let textCompletion = null;
    function finishText() {
        if (textCompletion)
            return textCompletion;
        if (!textSession)
            return Promise.resolve(true);
        textCompletion = new Promise((resolve) => {
            const done = (acknowledged) => {
                window.clearTimeout(timer);
                textFinished = null;
                textCompletion = null;
                if (!acknowledged)
                    toast("Your text is still being edited. Choose Done again before continuing.", { kind: "error" });
                resolve(acknowledged);
            };
            const timer = window.setTimeout(() => done(false), 2000);
            textFinished = () => done(true);
            send({ type: "finish_text", commit: true });
        });
        return textCompletion;
    }
    async function navigate(path, suffix = "") {
        const version = ++navigationVersion;
        cancelDrag();
        if (!await finishText() || version !== navigationVersion)
            return;
        expectedPath = path;
        awaitingReady = true;
        readyFrame = null;
        textSession = null;
        if (Date.now() - store.get().bootstrappedAt > PREVIEW_MAX_AGE_MS)
            await handlers.refreshPreview();
        if (version !== navigationVersion)
            return;
        window.clearTimeout(slowTimer);
        loadingText.textContent = "Opening your page…";
        slowTimer = window.setTimeout(() => {
            loadingText.textContent = "This page is taking a while to open…";
        }, 8000);
        setLoadingVeil(true);
        if (pending && pending !== active)
            pending.remove();
        if (pending === active || !active.getAttribute("src")) {
            pending = active;
        }
        else {
            pending = makeIframe(title(store.get()));
            pending.classList.add("is-pending");
            pending.tabIndex = -1;
            sizeIframe(pending);
            watchLoads(pending);
            active.after(pending);
        }
        expectedLoads.add(pending);
        const origin = store.get().previewOrigin;
        frameOrigins.set(pending, origin);
        pending.src = url(origin, path) + suffix;
        readyFrame = pending;
    }
    /** Shows the frame that just became ready and drops the old one. */
    function swap() {
        if (!pending)
            return;
        if (pending !== active) {
            const hadFocus = document.activeElement === active;
            active.remove();
            active = pending;
            active.classList.remove("is-pending");
            if (hadFocus)
                surface.focus({ preventScroll: true });
        }
        pending = null;
        syncFocusability(store.get());
    }
    function syncFocusability(s) {
        const editing = s.mode === "edit";
        active.tabIndex = editing ? -1 : 0;
        surface.tabIndex = editing ? 0 : -1;
        active.title = title(s);
        surface.setAttribute("aria-label", editing
            ? `${title(s)}. Use the arrow keys to choose a part of the page and Enter to change it.`
            : title(s));
    }
    function send(message) {
        if (["start_text", "mode", "select_element", "select_relative", "deselect", "cancel_drag"].includes(message.type))
            cancelDrag();
        if (message.type === "start_text") {
            const state = store.get();
            if (awaitingReady || state.mode !== "edit" || state.focus.kind !== "selected" || state.focus.selection.element !== message.element || !state.focus.selection.can.includes("t"))
                return;
            textSession = { element: message.element, path: expectedPath, finishing: false };
        }
        else if (message.type === "mode" || message.type === "finish_text") {
            if (textSession)
                textSession.finishing = true;
            if (message.type === "finish_text" && !message.commit) {
                textSession = null;
                store.dispatch({ type: "editing", active: false, formats: { bold: false, italic: false, link: false } });
            }
        }
        active.contentWindow?.postMessage(envelope(message), originOf(active));
    }
    /** After a click in the page, keys go back to the app so shortcuts and arrow keys keep working. */
    function reclaimFocus() {
        const focused = document.activeElement;
        if (!textSession && store.get().mode === "edit" && (focused === active || focused === document.body || focused === null))
            surface.focus({ preventScroll: true });
    }
    window.addEventListener("message", (event) => {
        const source = awaitingReady ? (pending ?? active) : active;
        if (awaitingReady && source !== readyFrame)
            return;
        if (event.source !== source.contentWindow || event.origin !== originOf(source))
            return;
        const message = parseAgentMessage(event.data);
        const state = store.get();
        const sel = selection(state);
        if (!message || !acceptsCanvasMessage({
            path: expectedPath,
            mode: state.mode,
            loading: awaitingReady,
            textElement: textSession?.element ?? null,
            finishing: textSession?.finishing ?? false,
            committing: drag?.phase === "committing" && currentDrag(drag) ? drag : null,
        }, message))
            return;
        switch (message.type) {
            case "ready": {
                awaitingReady = false;
                window.clearTimeout(slowTimer);
                setLoadingVeil(false);
                swap();
                store.dispatch({ type: "page_ready", path: expectedPath, title: message.title, description: message.description, origin: originOf(active) });
                active.contentWindow?.postMessage(envelope({ type: "init", mode: store.get().mode, scrollY: restore.scrollY, select: restore.select, scale: layout.scale }), originOf(active));
                if (!tip.hidden)
                    send({ type: "show_editable" });
                const ready = active;
                void loadUiFont().then((data) => {
                    if (data && ready === active)
                        send({ type: "font", data });
                });
                if (restore.select && restore.pulse)
                    send({ type: "reveal", element: restore.select, pulse: true });
                restore = { scrollY: null, select: null, pulse: false };
                break;
            }
            case "request_text":
                if (sel?.element === message.element && sel.can.includes("t")) {
                    announce("Press Enter or choose Edit text to edit");
                }
                break;
            case "select":
                handlers.onPageClick();
                if (textSession?.element !== message.element)
                    textSession = null;
                store.dispatch({
                    type: "selected",
                    selection: { element: message.element, can: message.can, tag: message.tag, kind: message.kind, name: message.name, ancestors: message.ancestors, rect: message.rect, info: message.info },
                    obstacles: message.obstacles,
                });
                reclaimFocus();
                break;
            case "blocked":
                handlers.onPageClick();
                textSession = null;
                store.dispatch({ type: "blocked", rect: message.rect, around: message.around });
                reclaimFocus();
                break;
            case "deselect":
                handlers.onPageClick();
                textSession = null;
                store.dispatch({ type: "deselected" });
                reclaimFocus();
                break;
            case "viewport":
                store.dispatch({ type: "viewport", scrollY: message.scrollY, rect: message.rect, obstructions: message.obstructions, obstacles: message.obstacles });
                break;
            case "outline":
                store.dispatch({ type: "outline", outline: { heading: message.heading, images: message.images } });
                break;
            case "palette":
                store.dispatch({ type: "palette", colors: message.colors });
                break;
            case "anchors":
                store.dispatch({ type: "anchors", items: message.items });
                break;
            case "editing":
                if (!message.active)
                    textSession = null;
                store.dispatch({ type: "editing", active: message.active, formats: message.formats });
                if (!message.active) {
                    textFinished?.();
                    reclaimFocus();
                }
                break;
            case "text":
                if (textSession)
                    handlers.onText(message.element, message.html, textSession.path);
                textSession = null;
                store.dispatch({ type: "editing", active: false, formats: { bold: false, italic: false, link: false } });
                textFinished?.();
                reclaimFocus();
                break;
            case "structure":
                handlers.onStructure?.(message.nodes, message.truncated);
                break;
            case "dragging":
                break;
            case "move_element":
                clearDrag();
                handlers.onMove?.(message.element, message.target, message.position);
                break;
            case "navigate": {
                const target = canvasNavigation(message.href, originOf(active), expectedPath, state.pages);
                if (target) {
                    restore = { scrollY: null, select: null, pulse: false };
                    store.dispatch({ type: "open_page", path: target.path });
                    void navigate(target.path, target.suffix);
                }
                break;
            }
        }
    });
    // Focus usually sits on the canvas surface during a drag, so the page never sees this Escape.
    window.addEventListener("keydown", (event) => {
        if (!drag || event.key !== "Escape")
            return;
        event.preventDefault();
        event.stopImmediatePropagation();
        cancelDrag();
        send({ type: "cancel_drag" });
    }, true);
    zoomButton.addEventListener("click", () => {
        store.dispatch({ type: "zoom", zoom: store.get().zoom === "fit" ? "actual" : "fit" });
    });
    let phoneHintShown = false;
    let hintTimer = 0;
    store.subscribe((s, prev) => {
        if (drag && !currentDrag(drag))
            cancelDrag();
        renderDragHandle();
        if (!prev || s.mode !== prev.mode) {
            if (prev)
                send({ type: "mode", mode: s.mode });
            if (s.mode !== "edit")
                cancelDrag();
            area.dataset["mode"] = s.mode;
            syncFocusability(s);
        }
        if (prev && changed(s, prev, "pages", "path"))
            syncFocusability(s);
        surface.toggleAttribute("data-has-selection", s.focus.kind !== "none");
        if (prev && focusKey(s) !== focusKey(prev) && focusKey(s) !== null)
            dismissEditable();
        if (prev && s.mode !== prev.mode && s.mode === "preview")
            dismissEditable();
        if (!prev || s.mode !== prev.mode || s.device !== prev.device) {
            window.clearTimeout(hintTimer);
            hintText.textContent = s.mode === "preview"
                ? "Previewing. Links and buttons work like on your website."
                : s.device !== "desktop" && !phoneHintShown ? `${s.device === "mobile" ? "Phone" : "Tablet"} view. Style and layout changes apply on every screen size.` : "";
            if (s.mode === "edit" && s.device !== "desktop" && !phoneHintShown) {
                phoneHintShown = true;
                hintTimer = window.setTimeout(() => { hintText.textContent = ""; }, 3500);
            }
        }
        if (!prev) {
            area.dataset["device"] = s.device;
            applyLayout();
        }
        else if (s.device !== prev.device) {
            area.dataset["device"] = s.device;
            applyLayout();
            requestAnimationFrame(() => {
                const current = store.get();
                if (current.device !== s.device || current.focus.kind !== "selected")
                    return;
                if (awaitingReady)
                    restore.select = current.focus.selection.element;
                else if (textSession)
                    send({ type: "reveal", element: current.focus.selection.element, pulse: false });
                else
                    send({ type: "select_element", element: current.focus.selection.element });
            });
        }
        else if (s.zoom !== prev.zoom) {
            applyLayout();
        }
    });
    if (welcome)
        showEditable();
    return {
        frame: () => active,
        surface,
        showEditable,
        dismissEditable,
        startText(input = null) {
            const s = store.get();
            const sel = selection(s);
            if (!sel || !sel.can.includes("t") || textSession || awaitingReady || s.mode !== "edit")
                return false;
            active.focus();
            send({ type: "start_text", element: sel.element, input });
            return true;
        },
        open(path, reveal) {
            cancelDrag();
            void finishText().then((finished) => {
                if (!finished)
                    return;
                restore = { scrollY: null, select: reveal ?? null, pulse: Boolean(reveal) };
                store.dispatch({ type: "open_page", path });
                void navigate(path);
            });
        },
        reload(select = null, pulse = false) {
            cancelDrag();
            void finishText().then((finished) => {
                if (!finished)
                    return;
                const s = store.get();
                restore = { scrollY: s.scrollY, select, pulse };
                store.dispatch({ type: "canvas_loading" });
                void navigate(s.path);
            });
        },
        send,
        finishText,
        scale: () => layout.scale,
        toApp(rect) {
            const r = active.getBoundingClientRect();
            return { x: r.left + rect.x * layout.scale, y: r.top + rect.y * layout.scale, width: rect.width * layout.scale, height: rect.height * layout.scale };
        },
        visibleBox() {
            const f = surface.getBoundingClientRect();
            const a = area.getBoundingClientRect();
            const x = Math.max(f.left, a.left);
            const y = Math.max(f.top, a.top);
            return { x, y, width: Math.max(0, Math.min(f.right, a.right) - x), height: Math.max(0, Math.min(f.bottom, a.bottom) - y) };
        },
    };
}
