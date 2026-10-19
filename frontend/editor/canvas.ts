import { envelope, parseAgentMessage, type EditorMessage } from "../protocol.js";
import { must } from "../ui.js";
import { pagePath, type Store } from "./state.js";

export interface CanvasHandlers {
  onText(element: string, html: string): void;
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

  function url(path: string): string {
    return `${store.get().previewOrigin}/${path.split("/").map(encodeURIComponent).join("/")}`;
  }

  async function navigate(path: string): Promise<void> {
    if (Date.now() - store.get().bootstrappedAt > PREVIEW_MAX_AGE_MS) await handlers.refreshPreview();
    window.clearTimeout(slowTimer);
    loadingText.textContent = "Opening your page…";
    slowTimer = window.setTimeout(() => {
      loadingText.textContent = "This page is taking a while to open…";
    }, 8000);
    iframe.src = url(path);
  }

  function send(message: EditorMessage): void {
    iframe.contentWindow?.postMessage(envelope(message), store.get().previewOrigin);
  }

  window.addEventListener("message", (event) => {
    if (event.source !== iframe.contentWindow || event.origin !== store.get().previewOrigin) return;
    const message = parseAgentMessage(event.data);
    if (!message) return;
    switch (message.type) {
      case "ready": {
        window.clearTimeout(slowTimer);
        store.dispatch({ type: "page_ready", path: pagePath(message.path), title: message.title, description: message.description });
        send({ type: "init", mode: store.get().mode, scrollY: restore.scrollY, select: restore.select });
        restore = { scrollY: null, select: null };
        break;
      }
      case "select":
        store.dispatch({
          type: "selected",
          selection: { element: message.element, can: message.can, tag: message.tag, hasParent: message.hasParent, rect: message.rect, info: message.info },
        });
        break;
      case "blocked":
        store.dispatch({ type: "blocked", rect: message.rect });
        break;
      case "deselect":
        store.dispatch({ type: "deselected" });
        break;
      case "viewport":
        store.dispatch({ type: "viewport", scrollY: message.scrollY, rect: message.rect });
        break;
      case "editing":
        store.dispatch({ type: "editing", active: message.active, formats: message.formats });
        break;
      case "text":
        handlers.onText(message.element, message.html);
        break;
      case "shortcut":
        handlers.onShortcut(message.action);
        break;
    }
  });

  iframe.addEventListener("load", () => {
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
