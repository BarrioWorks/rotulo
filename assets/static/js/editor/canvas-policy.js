import { pagePath } from "./state.js";
export function acceptsCanvasMessage(session, message) {
    if (message.type === "ready")
        return session.loading && pagePath(message.path) === session.path;
    if (session.loading)
        return false;
    switch (message.type) {
        case "text":
        case "editing":
            return (session.mode === "edit" || session.finishing === true) && session.textElement === message.element;
        case "request_text":
            return session.mode === "edit" && session.textElement === null;
        case "navigate":
            return session.mode === "preview";
        default:
            return true;
    }
}
/** Only known draft pages on this preview origin can be opened by an in-canvas link. */
export function canvasNavigation(href, origin, path, pages) {
    let url;
    try {
        url = new URL(href, `${origin}/${path}`);
    }
    catch {
        return null;
    }
    if (url.origin !== origin)
        return null;
    const requested = pagePath(url.pathname);
    const target = [requested, `${requested}.html`, `${requested}/index.html`].find((candidate) => pages.some((page) => page.path === candidate));
    return target ? { path: target, suffix: url.search + url.hash } : null;
}
