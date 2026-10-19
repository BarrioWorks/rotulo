/**
 * Messages between the editor (app origin) and the agent inside the preview iframe.
 * Both sides check origin and source first, then parse every message with these parsers
 * and drop anything that does not match exactly.
 */
import { bool, lit, num, obj, opt, str } from "./schema.js";
export const CHANNEL = "pagehaven";
export const ELEMENT_ID = /^[0-9a-z]{1,10}$/;
export const CAPABILITIES = /^[tilsxudc]{0,8}$/;
const TAG = /^[a-z][a-z0-9-]{0,31}$/;
export const STYLE_KEYS = [
    "color",
    "background-color",
    "font-size",
    "font-weight",
    "text-align",
    "padding-top",
    "padding-bottom",
    "padding-left",
    "padding-right",
    "margin-top",
    "margin-bottom",
];
const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const LENGTH = /^(?:0|\d{1,4}(?:\.\d{1,3})?(?:px|rem|em|%))$/;
const WEIGHT = /^[1-9]00$/;
const ALIGN = /^(?:left|center|right|justify)$/;
/** Mirrors the values the server accepts for `set_style`. */
export function isStyleValue(key, value) {
    switch (key) {
        case "color":
        case "background-color":
            return HEX_COLOR.test(value);
        case "font-weight":
            return WEIGHT.test(value);
        case "text-align":
            return ALIGN.test(value);
        case "font-size":
            return value !== "0" && LENGTH.test(value);
        default:
            return LENGTH.test(value);
    }
}
function isStyleKey(key) {
    return STYLE_KEYS.includes(key);
}
export const parseStyleChanges = (v) => {
    if (typeof v !== "object" || v === null || Array.isArray(v))
        return undefined;
    const entries = Object.entries(v);
    if (entries.length === 0 || entries.length > STYLE_KEYS.length)
        return undefined;
    const out = {};
    for (const [key, value] of entries) {
        if (!isStyleKey(key))
            return undefined;
        if (value === null)
            out[key] = null;
        else if (typeof value === "string" && isStyleValue(key, value))
            out[key] = value;
        else
            return undefined;
    }
    return out;
};
const parseStyleSnapshot = (v) => {
    if (typeof v !== "object" || v === null || Array.isArray(v))
        return undefined;
    const out = {};
    for (const [key, value] of Object.entries(v)) {
        if (!isStyleKey(key) || typeof value !== "string" || value.length > 64)
            return undefined;
        out[key] = value;
    }
    return out;
};
const elementId = str(10, ELEMENT_ID);
const scroll = num(0, 1e7);
export const parseRect = obj({
    x: num(-1e6, 1e6),
    y: num(-1e6, 1e6),
    width: num(0, 1e6),
    height: num(0, 1e6),
});
const parseFormats = obj({ bold: bool, italic: bool, link: bool });
const parseSelectionInfo = obj({
    href: opt(str(2048)),
    newTab: bool,
    src: opt(str(2048)),
    alt: opt(str(1000)),
    hidden: bool,
    text: str(200),
    styles: parseStyleSnapshot,
});
const agentMessages = {
    ready: obj({
        type: lit("ready"),
        path: str(1024),
        title: str(300),
        description: str(1000),
        scrollY: scroll,
    }),
    select: obj({
        type: lit("select"),
        element: elementId,
        can: str(8, CAPABILITIES),
        tag: str(32, TAG),
        hasParent: bool,
        rect: parseRect,
        info: parseSelectionInfo,
    }),
    blocked: obj({ type: lit("blocked"), rect: parseRect }),
    deselect: obj({ type: lit("deselect") }),
    viewport: obj({ type: lit("viewport"), scrollY: scroll, rect: opt(parseRect) }),
    editing: obj({ type: lit("editing"), element: elementId, active: bool, formats: parseFormats }),
    text: obj({ type: lit("text"), element: elementId, html: str(65536) }),
    shortcut: obj({ type: lit("shortcut"), action: lit("undo", "redo") }),
};
const editorMessages = {
    init: obj({
        type: lit("init"),
        mode: lit("edit", "preview"),
        scrollY: opt(scroll),
        select: opt(elementId),
    }),
    mode: obj({ type: lit("mode"), mode: lit("edit", "preview") }),
    select_parent: obj({ type: lit("select_parent") }),
    deselect: obj({ type: lit("deselect") }),
    start_text: obj({ type: lit("start_text") }),
    finish_text: obj({ type: lit("finish_text"), commit: bool }),
    format: obj({ type: lit("format"), command: lit("bold", "italic", "link", "unlink"), href: opt(str(2048)) }),
    preview_style: obj({ type: lit("preview_style"), element: elementId, styles: parseStyleChanges }),
    preview_image: obj({ type: lit("preview_image"), element: elementId, src: str(2048), alt: str(1000) }),
    preview_alt: obj({ type: lit("preview_alt"), element: elementId, alt: str(1000) }),
    preview_link: obj({ type: lit("preview_link"), element: elementId, href: str(2048), newTab: bool }),
    preview_hidden: obj({ type: lit("preview_hidden"), element: elementId, hidden: bool }),
};
function parseWith(table) {
    return (raw) => {
        if (typeof raw !== "object" || raw === null || Array.isArray(raw))
            return undefined;
        const record = raw;
        if (record["channel"] !== CHANNEL || typeof record["type"] !== "string")
            return undefined;
        if (!Object.prototype.hasOwnProperty.call(table, record["type"]))
            return undefined;
        return table[record["type"]]?.(record);
    };
}
/** Used by the editor on messages from the preview. */
export const parseAgentMessage = parseWith(agentMessages);
/** Used by the agent on messages from the editor. */
export const parseEditorMessage = parseWith(editorMessages);
export function envelope(message) {
    return { ...message, channel: CHANNEL };
}
/** Mirrors the server's link check: web, email, phone, fragments and paths in the site. */
export function isSafeHref(value) {
    const href = value.trim();
    if (href === "" || href.length > 2048 || /[\u0000-\u001f\u007f\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]/.test(href))
        return false;
    if (href.startsWith("\\\\") || href.startsWith("/\\"))
        return false;
    const colon = href.indexOf(":");
    const delimiter = href.search(/[/?#]/);
    if (colon < 0 || (delimiter >= 0 && delimiter < colon))
        return true;
    const scheme = href.slice(0, colon).toLowerCase();
    if (scheme === "http" || scheme === "https")
        return href.slice(colon + 1).startsWith("//");
    return scheme === "mailto" || scheme === "tel";
}
