/**
 * Messages between the editor (app origin) and the agent inside the preview iframe.
 * Both sides check origin and source first, then parse every message with these parsers
 * and drop anything that does not match exactly.
 */
import { arr, bool, lit, num, obj, opt, str } from "./schema.js";
export const CHANNEL = "pagehaven";
export const ELEMENT_ID = /^[0-9a-z]{1,10}$/;
export const CAPABILITIES = /^[tilsbxudc]{0,9}$/;
const TAG = /^[a-z][a-z0-9-]{0,31}$/;
/** An `id` a link can point at with `#id`. */
export const ANCHOR_ID = /^[A-Za-z][\w-]{0,63}$/;
const HEX6 = /^#[0-9a-f]{6}$/;
/** What the agent thinks the selected element is, from its tag, capabilities and computed style. */
export const KINDS = ["image", "button", "link", "heading", "menu", "header", "footer", "section", "list-item", "text", "box"];
export const KIND_LABELS = {
    image: "Image",
    button: "Button",
    link: "Link",
    heading: "Heading",
    menu: "Menu",
    header: "Header",
    footer: "Footer",
    section: "Section",
    "list-item": "List item",
    text: "Text",
    box: "Box",
};
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
const size = num(0, 1e5);
const parseSelectionInfo = obj({
    href: opt(str(2048)),
    newTab: bool,
    src: opt(str(2048)),
    alt: opt(str(1000)),
    hidden: bool,
    text: str(200),
    styles: parseStyleSnapshot,
    /** The computed background is a photo (`background-image: url(...)`). */
    bgImage: bool,
    /** For images: the file's own size and the size it is shown at, in CSS px. */
    image: opt(obj({ naturalWidth: size, naturalHeight: size, width: size, height: size })),
});
const kind = lit(...KINDS);
const name = str(60);
const parseAncestor = obj({ element: elementId, kind, name });
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
        can: str(9, CAPABILITIES),
        tag: str(32, TAG),
        kind,
        /** A short human name: a section's first heading, an image's description, a link's text. */
        name,
        /** Editable ancestors, nearest first, for the breadcrumb. */
        ancestors: arr(parseAncestor, 8),
        rect: parseRect,
        info: parseSelectionInfo,
    }),
    /** A click on something the site's code made. `around` is the nearest editable ancestor. */
    blocked: obj({ type: lit("blocked"), rect: parseRect, around: opt(elementId) }),
    deselect: obj({ type: lit("deselect") }),
    /** Sent every frame that moves. `obstructions` are the site's own fixed or sticky bars. */
    viewport: obj({ type: lit("viewport"), scrollY: scroll, rect: opt(parseRect), obstructions: arr(parseRect, 4) }),
    /** The page's own colours, most used first, for the style swatches. */
    palette: obj({ type: lit("palette"), colors: arr(str(7, HEX6), 10) }),
    /** Parts of the page a link can jump to. */
    anchors: obj({ type: lit("anchors"), items: arr(obj({ id: str(64, ANCHOR_ID), name }), 50) }),
    editing: obj({ type: lit("editing"), element: elementId, active: bool, formats: parseFormats }),
    text: obj({ type: lit("text"), element: elementId, html: str(65536) }),
    navigate: obj({ type: lit("navigate"), href: str(2048) }),
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
    /** Keyboard selection: the part around, the first part inside, or the next or previous part. */
    select_relative: obj({ type: lit("select_relative"), direction: lit("parent", "child", "next", "prev") }),
    /** Breadcrumb selection. The agent re-checks the id and its capabilities. */
    select_element: obj({ type: lit("select_element"), element: elementId }),
    /** Scrolls an element into view, optionally with a one-off pulse after a change. */
    reveal: obj({ type: lit("reveal"), element: elementId, pulse: bool }),
    deselect: obj({ type: lit("deselect") }),
    start_text: obj({ type: lit("start_text"), element: elementId }),
    finish_text: obj({ type: lit("finish_text"), commit: bool }),
    format: obj({ type: lit("format"), command: lit("bold", "italic", "link", "unlink"), href: opt(str(2048)) }),
    preview_style: obj({ type: lit("preview_style"), element: elementId, styles: parseStyleChanges }),
    preview_image: obj({ type: lit("preview_image"), element: elementId, src: str(2048), alt: str(1000) }),
    preview_alt: obj({ type: lit("preview_alt"), element: elementId, alt: str(1000) }),
    preview_link: obj({ type: lit("preview_link"), element: elementId, href: str(2048), newTab: bool }),
    preview_hidden: obj({ type: lit("preview_hidden"), element: elementId, hidden: bool }),
    /** Shows a new background photo at once. The agent accepts only URLs on the preview origin. */
    preview_background: obj({ type: lit("preview_background"), element: elementId, src: str(2048) }),
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
