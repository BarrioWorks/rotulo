import { TYPED_MAX } from "../protocol.js";
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
        // Accepted only to move focus to the app's Edit text control. Editing starts from the owner's input in the app.
        case "request_text":
            return session.mode === "edit" && session.textElement === null;
        case "navigate":
            return session.mode === "preview";
        default:
            return true;
    }
}
/**
 * The character a key press types, when it should start editing the selected text. Space and
 * Enter keep their usual meaning on a focused control, and "?" keeps opening the shortcuts.
 */
export function typedCharacter(event) {
    if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing)
        return null;
    const { key } = event;
    if ([...key].length !== 1 || key.length > TYPED_MAX || key.trim() === "" || key === "?")
        return null;
    return key;
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
