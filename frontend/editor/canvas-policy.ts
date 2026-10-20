import type { AgentMessage } from "../protocol.js";
import { pagePath, type Mode } from "./state.js";

export interface CanvasSession {
  path: string;
  mode: Mode;
  loading: boolean;
  textElement: string | null;
  finishing?: boolean;
  /** The owner just pressed inside the site: a fresh user activation, with no press in the app's own controls inside the activation window. */
  activated?: boolean;
}

export function acceptsCanvasMessage(session: CanvasSession, message: AgentMessage): boolean {
  if (message.type === "ready") return session.loading && pagePath(message.path) === session.path;
  if (session.loading) return false;
  switch (message.type) {
    case "text":
    case "editing":
      return (session.mode === "edit" || session.finishing === true) && session.textElement === message.element;
    case "request_text":
      return session.mode === "edit" && session.textElement === null && session.activated === true;
    case "navigate":
      return session.mode === "preview";
    default:
      return true;
  }
}

/** Only known draft pages on this preview origin can be opened by an in-canvas link. */
export function canvasNavigation(href: string, origin: string, path: string, pages: readonly { path: string }[]): { path: string; suffix: string } | null {
  let url: URL;
  try {
    url = new URL(href, `${origin}/${path}`);
  } catch {
    return null;
  }
  if (url.origin !== origin) return null;
  const requested = pagePath(url.pathname);
  const target = [requested, `${requested}.html`, `${requested}/index.html`].find((candidate) => pages.some((page) => page.path === candidate));
  return target ? { path: target, suffix: url.search + url.hash } : null;
}
