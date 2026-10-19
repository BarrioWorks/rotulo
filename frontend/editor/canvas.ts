import { envelope, parseAgentMessage, type EditorMessage } from "../protocol.js";
import { must } from "../ui.js";
import type { Store } from "./state.js";
import { acceptsCanvasMessage, canvasNavigation } from "./canvas-policy.js";

export interface CanvasHandlers {
  onText(element: string, html: string, page: string): void;
  onShortcut(action: "undo" | "redo"): void;
  /** Called before loading a page when the preview address may have expired. */
  refreshPreview(): Promise<void>;
}

export interface Canvas {
  iframe: HTMLIFrameElement;
  open(path: string): void;
  /** Reloads the current page, keeping the scroll position and, if given, the selection. */
  reload(select?: string | null): void;
  send(message: EditorMessage): void;
}

const PREVIEW_MAX_AGE_MS = 11 * 60 * 60 * 1000;

export function createCanvas(store: Store, handlers: CanvasHandlers): Canvas {
  const iframe = must<HTMLIFrameElement>(document, "[data-canvas]");
  const frame = must<HTMLElement>(document, "[data-canvas-frame]");
  const area = must<HTMLElement>(document, "[data-canvas-area]");
  const loadingText = must<HTMLElement>(document, "[data-canvas-loading-text]");
  const modeHint = must<HTMLElement>(document, "[data-mode-hint]");

  let restore: { scrollY: number | null; select: string | null } = { scrollY: null, select: null };
  let slowTimer = 0;
  let expectedPath = store.get().path;
  let awaitingReady = true;
  let textSession: { element: string; path: string; finishing: boolean } | null = null;

  function url(path: string): string {
    return `${store.get().previewOrigin}/${path.split("/").map(encodeURIComponent).join("/")}`;
  }

  async function navigate(path: string, suffix = ""): Promise<void> {
    expectedPath = path;
    awaitingReady = true;
    textSession = null;
    if (Date.now() - store.get().bootstrappedAt > PREVIEW_MAX_AGE_MS) await handlers.refreshPreview();
    window.clearTimeout(slowTimer);
    loadingText.textContent = "Opening your page…";
    slowTimer = window.setTimeout(() => {
      loadingText.textContent = "This page is taking a while to open…";
    }, 8000);
    iframe.src = url(path) + suffix;
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
    iframe.contentWindow?.postMessage(envelope(message), store.get().previewOrigin);
  }

  window.addEventListener("message", (event) => {
    if (event.source !== iframe.contentWindow || event.origin !== store.get().previewOrigin) return;
    const message = parseAgentMessage(event.data);
    if (!message || !acceptsCanvasMessage({ path: expectedPath, mode: store.get().mode, loading: awaitingReady, textElement: textSession?.element ?? null, finishing: textSession?.finishing ?? false }, message)) return;
    switch (message.type) {
      case "ready": {
        awaitingReady = false;
        window.clearTimeout(slowTimer);
        store.dispatch({ type: "page_ready", path: expectedPath, title: message.title, description: message.description });
        send({ type: "init", mode: store.get().mode, scrollY: restore.scrollY, select: restore.select });
        restore = { scrollY: null, select: null };
        break;
      }
      case "select":
        if (textSession?.element !== message.element) textSession = null;
        store.dispatch({
          type: "selected",
          selection: { element: message.element, can: message.can, tag: message.tag, hasParent: message.hasParent, rect: message.rect, info: message.info },
        });
        break;
      case "blocked":
        textSession = null;
        store.dispatch({ type: "blocked", rect: message.rect });
        break;
      case "deselect":
        textSession = null;
        store.dispatch({ type: "deselected" });
        break;
      case "viewport":
        store.dispatch({ type: "viewport", scrollY: message.scrollY, rect: message.rect });
        break;
      case "editing":
        if (!message.active) textSession = null;
        store.dispatch({ type: "editing", active: message.active, formats: message.formats });
        break;
      case "text":
        if (textSession) handlers.onText(message.element, message.html, textSession.path);
        textSession = null;
        store.dispatch({ type: "editing", active: false, formats: { bold: false, italic: false, link: false } });
        break;
      case "navigate": {
        const state = store.get();
        const target = canvasNavigation(message.href, state.previewOrigin, expectedPath, state.pages);
        if (target) {
          restore = { scrollY: null, select: null };
          store.dispatch({ type: "open_page", path: target.path });
          void navigate(target.path, target.suffix);
        }
        break;
      }
      case "shortcut":
        handlers.onShortcut(message.action);
        break;
    }
  });

  iframe.addEventListener("load", () => {
    textSession = null;
    window.setTimeout(() => {
      if (store.get().canvasLoading && iframe.src) {
        window.clearTimeout(slowTimer);
        loadingText.textContent = "This page can't be edited. It may not be a web page.";
      }
    }, 4000);
  });

  store.subscribe((s, prev) => {
    if (!prev || s.mode !== prev.mode) {
      if (prev) send({ type: "mode", mode: s.mode });
      modeHint.hidden = s.mode !== "preview";
    }
    if (!prev || s.device !== prev.device) area.dataset["device"] = s.device;
    if (!prev || s.canvasLoading !== prev.canvasLoading) frame.classList.toggle("is-loading", s.canvasLoading);
  });

  return {
    iframe,
    open(path) {
      restore = { scrollY: null, select: null };
      store.dispatch({ type: "open_page", path });
      void navigate(path);
    },
    reload(select = null) {
      const s = store.get();
      restore = { scrollY: s.scrollY, select };
      store.dispatch({ type: "canvas_loading" });
      void navigate(s.path);
    },
    send,
  };
}
