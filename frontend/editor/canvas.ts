import { envelope, parseAgentMessage, type EditorMessage, type Rect } from "../protocol.js";
import { must } from "../ui.js";
import type { Box } from "./placement.js";
import { changed, type State, type Store } from "./state.js";
import { acceptsCanvasMessage, canvasNavigation } from "./canvas-policy.js";

export interface CanvasHandlers {
  onText(element: string, html: string, page: string): void;
  /** Called before loading a page when the preview address may have expired. */
  refreshPreview(): Promise<void>;
  /** A click or key in the page. The app document never sees those, so popovers close here. */
  onPageClick(): void;
}

export interface Canvas {
  /** The visible canvas iframe. It changes on every page load. */
  frame(): HTMLIFrameElement;
  /** The focusable canvas region the keyboard selects parts through. */
  surface: HTMLElement;
  open(path: string): void;
  /** Reloads the current page, keeping the scroll position and, if given, the selection. */
  reload(select?: string | null, pulse?: boolean): void;
  send(message: EditorMessage): void;
  /** Commits an open text session and resolves once its save is queued. */
  finishText(): Promise<void>;
  /** Maps a rect from the site's CSS pixels to app pixels. */
  toApp(rect: Rect): Box;
  /** App pixels per site CSS pixel. */
  scale(): number;
  /** The part of the canvas the owner can see, in app pixels. */
  visibleBox(): Box;
}

const PREVIEW_MAX_AGE_MS = 11 * 60 * 60 * 1000;
/** The site always lays out at least this wide on "Computer", then scales to fit. */
export const DESKTOP_WIDTH = 1280;
export const PHONE = { width: 390, height: 844 };
const BEZEL = 11;
const GUTTER = 12;
const VEIL_DELAY_MS = 300;

export interface FrameLayout {
  scale: number;
  /** The site's viewport in CSS pixels. */
  viewport: { width: number; height: number };
  /** The frame's size on screen. */
  frame: { width: number; height: number };
}

/** Fits a 1280 px desktop or a 390 by 844 phone into the space the window leaves. */
export function frameLayout(device: State["device"], zoom: State["zoom"], available: { width: number; height: number }): FrameLayout {
  const width = Math.max(1, available.width);
  const height = Math.max(1, available.height);
  if (device === "mobile") {
    const fit = Math.min(1, (width - 2 * BEZEL) / PHONE.width, (height - 2 * BEZEL) / PHONE.height);
    const scale = zoom === "actual" ? 1 : Math.max(0.2, fit);
    return { scale, viewport: { ...PHONE }, frame: { width: PHONE.width * scale, height: PHONE.height * scale } };
  }
  const layoutWidth = Math.max(width, DESKTOP_WIDTH);
  const scale = zoom === "actual" ? 1 : width / layoutWidth;
  return { scale, viewport: { width: layoutWidth, height: height / scale }, frame: { width: layoutWidth * scale, height } };
}

/** The app's interface font, handed to the agent as bytes so the slug in the site matches the app. */
const UI_FONT_URL = "/static/fonts/schibsted-grotesk-400-700.woff2";
let uiFont: Promise<ArrayBuffer | null> | null = null;

function loadUiFont(): Promise<ArrayBuffer | null> {
  uiFont ??= fetch(UI_FONT_URL, { credentials: "same-origin" })
    .then((r) => (r.ok ? r.arrayBuffer() : null))
    .catch(() => null);
  return uiFont;
}

function makeIframe(title: string): HTMLIFrameElement {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
  iframe.setAttribute("referrerpolicy", "no-referrer");
  iframe.className = "canvas-iframe";
  iframe.title = title;
  return iframe;
}

export function createCanvas(store: Store, handlers: CanvasHandlers): Canvas {
  const area = must<HTMLElement>(document, "[data-canvas-area]");
  const surface = must<HTMLElement>(document, "[data-canvas-frame]");
  const loadingText = must<HTMLElement>(document, "[data-canvas-loading-text]");
  const zoomButton = must<HTMLButtonElement>(document, "[data-zoom]");
  const zoomLabel = must<HTMLElement>(document, "[data-zoom-label]");
  const hint = must<HTMLElement>(document, "[data-canvas-hint]");

  /** The frame on screen, and the one loading behind it until its agent says it is ready. */
  let active = must<HTMLIFrameElement>(surface, "[data-canvas]");
  let pending: HTMLIFrameElement | null = null;
  let layout = frameLayout("desktop", "fit", { width: 1, height: 1 });
  let restore: { scrollY: number | null; select: string | null; pulse: boolean } = { scrollY: null, select: null, pulse: false };
  let slowTimer = 0;
  let veilTimer = 0;
  let expectedPath = store.get().path;
  let awaitingReady = true;
  let textSession: { element: string; path: string; finishing: boolean } | null = null;

  function url(path: string): string {
    return `${store.get().previewOrigin}/${path.split("/").map(encodeURIComponent).join("/")}`;
  }

  function title(s: State): string {
    const page = s.pages.find((p) => p.path === s.path);
    const name = page ? (page.path === "index.html" ? "Home" : page.title || page.path) : s.path;
    return `Your page: ${name}, ${s.mode === "edit" ? "editing" : "preview"}`;
  }

  function sizeIframe(iframe: HTMLIFrameElement): void {
    iframe.style.width = `${layout.viewport.width}px`;
    iframe.style.height = `${layout.viewport.height}px`;
    iframe.style.transform = layout.scale === 1 ? "" : `scale(${layout.scale})`;
  }

  function applyLayout(): void {
    const s = store.get();
    const available = { width: area.clientWidth - 2 * GUTTER, height: area.clientHeight - 2 * GUTTER };
    layout = frameLayout(s.device, s.zoom, available);
    surface.style.width = `${layout.frame.width}px`;
    surface.style.height = `${layout.frame.height}px`;
    surface.style.setProperty("--canvas-scale", String(layout.scale));
    for (const iframe of [active, pending]) if (iframe) sizeIframe(iframe);
    if (!awaitingReady) send({ type: "scale", scale: layout.scale });
    const percent = Math.round(layout.scale * 100);
    zoomLabel.textContent = s.zoom === "fit" ? `Fit ${percent}%` : `${percent}%`;
    zoomButton.setAttribute("aria-label", s.zoom === "fit" ? `Zoom: fit to window, ${percent} percent. Show at actual size` : "Zoom: actual size. Fit to window");
    zoomButton.dataset["tip"] = s.zoom === "fit"
      ? layout.scale < 0.6 ? "Text is small at this size. Widen the window or show at actual size." : "Show at actual size"
      : "Fit to window";
    zoomButton.hidden = s.zoom === "fit" && percent === 100;
    zoomButton.classList.toggle("is-small", s.zoom === "fit" && layout.scale < 0.6);
  }
  new ResizeObserver(() => applyLayout()).observe(area);

  function setLoadingVeil(on: boolean): void {
    window.clearTimeout(veilTimer);
    if (on) veilTimer = window.setTimeout(() => surface.classList.add("is-loading"), VEIL_DELAY_MS);
    else surface.classList.remove("is-loading");
  }

  /** Frames whose next load event is one the editor asked for. */
  const expectedLoads = new WeakSet<HTMLIFrameElement>();

  function watchLoads(frame: HTMLIFrameElement): void {
    frame.addEventListener("load", () => {
      if (expectedLoads.has(frame)) {
        expectedLoads.delete(frame);
        window.setTimeout(() => {
          if (pending === frame && awaitingReady) {
            window.clearTimeout(slowTimer);
            swap();
            surface.classList.add("is-loading");
            loadingText.textContent = "This page can't be edited. It may not be a web page.";
          }
        }, 4000);
      } else if (frame === active && !awaitingReady) {
        // The page moved itself (a script or a refresh). Go back to the page the editor chose.
        textSession = null;
        restore = { scrollY: null, select: null, pulse: false };
        store.dispatch({ type: "canvas_loading" });
        void navigate(expectedPath);
      }
    });
  }
  watchLoads(active);

  /** Resolves once an open text session has been committed, so nothing typed is lost. */
  let textFinished: (() => void) | null = null;
  function finishText(): Promise<void> {
    if (!textSession) return Promise.resolve();
    return new Promise((resolve) => {
      const done = () => {
        window.clearTimeout(timer);
        textFinished = null;
        resolve();
      };
      const timer = window.setTimeout(done, 800);
      textFinished = done;
      send({ type: "finish_text", commit: true });
    });
  }

  async function navigate(path: string, suffix = ""): Promise<void> {
    await finishText();
    if (Date.now() - store.get().bootstrappedAt > PREVIEW_MAX_AGE_MS) await handlers.refreshPreview();
    expectedPath = path;
    awaitingReady = true;
    textSession = null;
    window.clearTimeout(slowTimer);
    loadingText.textContent = "Opening your page…";
    slowTimer = window.setTimeout(() => {
      loadingText.textContent = "This page is taking a while to open…";
    }, 8000);
    setLoadingVeil(true);
    if (pending && pending !== active) pending.remove();
    if (pending === active || !active.getAttribute("src")) {
      pending = active;
    } else {
      pending = makeIframe(title(store.get()));
      pending.classList.add("is-pending");
      pending.tabIndex = -1;
      sizeIframe(pending);
      watchLoads(pending);
      active.after(pending);
    }
    expectedLoads.add(pending);
    pending.src = url(path) + suffix;
  }

  /** Shows the frame that just became ready and drops the old one. */
  function swap(): void {
    if (!pending) return;
    if (pending !== active) {
      const hadFocus = document.activeElement === active;
      active.remove();
      active = pending;
      active.classList.remove("is-pending");
      if (hadFocus) surface.focus({ preventScroll: true });
    }
    pending = null;
    syncFocusability(store.get());
  }

  function syncFocusability(s: State): void {
    const editing = s.mode === "edit";
    active.tabIndex = editing ? -1 : 0;
    surface.tabIndex = editing ? 0 : -1;
    active.title = title(s);
    surface.setAttribute("aria-label", editing
      ? `${title(s)}. Use the arrow keys to choose a part of the page and Enter to change it.`
      : title(s));
  }

  function send(message: EditorMessage): void {
    if (message.type === "start_text") {
      const state = store.get();
      if (awaitingReady || state.mode !== "edit" || state.focus.kind !== "selected" || state.focus.selection.element !== message.element || !state.focus.selection.can.includes("t")) return;
      textSession = { element: message.element, path: expectedPath, finishing: false };
    } else if (message.type === "mode" || message.type === "finish_text") {
      if (textSession) textSession.finishing = true;
      if (message.type === "finish_text" && !message.commit) {
        textSession = null;
        store.dispatch({ type: "editing", active: false, formats: { bold: false, italic: false, link: false } });
      }
    }
    active.contentWindow?.postMessage(envelope(message), store.get().previewOrigin);
  }

  /** After a click in the page, keys go back to the app so shortcuts and arrow keys keep working. */
  function reclaimFocus(): void {
    const focused = document.activeElement;
    if (!textSession && store.get().mode === "edit" && (focused === active || focused === document.body || focused === null)) surface.focus({ preventScroll: true });
  }

  window.addEventListener("message", (event) => {
    const source = awaitingReady ? (pending ?? active) : active;
    if (event.source !== source.contentWindow || event.origin !== store.get().previewOrigin) return;
    const message = parseAgentMessage(event.data);
    if (!message || !acceptsCanvasMessage({ path: expectedPath, mode: store.get().mode, loading: awaitingReady, textElement: textSession?.element ?? null, finishing: textSession?.finishing ?? false }, message)) return;
    switch (message.type) {
      case "ready": {
        awaitingReady = false;
        window.clearTimeout(slowTimer);
        setLoadingVeil(false);
        swap();
        store.dispatch({ type: "page_ready", path: expectedPath, title: message.title, description: message.description });
        active.contentWindow?.postMessage(envelope({ type: "init", mode: store.get().mode, scrollY: restore.scrollY, select: restore.select, scale: layout.scale }), store.get().previewOrigin);
        const ready = active;
        void loadUiFont().then((data) => {
          if (data && ready === active) send({ type: "font", data });
        });
        if (restore.select && restore.pulse) send({ type: "reveal", element: restore.select, pulse: true });
        restore = { scrollY: null, select: null, pulse: false };
        break;
      }
      case "select":
        handlers.onPageClick();
        if (textSession?.element !== message.element) textSession = null;
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
        if (!message.active) textSession = null;
        store.dispatch({ type: "editing", active: message.active, formats: message.formats });
        if (!message.active) {
          textFinished?.();
          reclaimFocus();
        }
        break;
      case "text":
        if (textSession) handlers.onText(message.element, message.html, textSession.path);
        textSession = null;
        store.dispatch({ type: "editing", active: false, formats: { bold: false, italic: false, link: false } });
        textFinished?.();
        reclaimFocus();
        break;
      case "navigate": {
        const state = store.get();
        const target = canvasNavigation(message.href, state.previewOrigin, expectedPath, state.pages);
        if (target) {
          restore = { scrollY: null, select: null, pulse: false };
          store.dispatch({ type: "open_page", path: target.path });
          void navigate(target.path, target.suffix);
        }
        break;
      }
    }
  });

  zoomButton.addEventListener("click", () => {
    store.dispatch({ type: "zoom", zoom: store.get().zoom === "fit" ? "actual" : "fit" });
  });

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  store.subscribe((s, prev) => {
    if (!prev || s.mode !== prev.mode) {
      if (prev) send({ type: "mode", mode: s.mode });
      area.dataset["mode"] = s.mode;
      syncFocusability(s);
    }
    if (prev && changed(s, prev, "pages", "path")) syncFocusability(s);
    surface.toggleAttribute("data-has-selection", s.focus.kind !== "none");
    if (!prev || s.mode !== prev.mode || s.device !== prev.device) {
      hint.textContent = s.mode === "preview"
        ? "Previewing. Links and buttons work like on your website."
        : s.device === "mobile" ? "Phone view. Changes made here also apply on computers." : "";
    }
    if (!prev) {
      area.dataset["device"] = s.device;
      applyLayout();
    } else if (s.device !== prev.device) {
      const swapDevice = () => {
        area.dataset["device"] = s.device;
        applyLayout();
        requestAnimationFrame(() => surface.classList.remove("is-switching"));
        if (s.focus.kind === "selected") send({ type: "reveal", element: s.focus.selection.element, pulse: false });
      };
      if (reducedMotion.matches) swapDevice();
      else {
        surface.classList.add("is-switching");
        window.setTimeout(swapDevice, 90);
      }
    } else if (s.zoom !== prev.zoom) {
      applyLayout();
    }
  });

  return {
    frame: () => active,
    surface,
    open(path) {
      restore = { scrollY: null, select: null, pulse: false };
      store.dispatch({ type: "open_page", path });
      void navigate(path);
    },
    reload(select = null, pulse = false) {
      const s = store.get();
      restore = { scrollY: s.scrollY, select, pulse };
      store.dispatch({ type: "canvas_loading" });
      void navigate(s.path);
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
