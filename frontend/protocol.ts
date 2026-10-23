/**
 * Messages between the editor (app origin) and the agent inside the preview iframe.
 * Both sides check origin and source first, then parse every message with these parsers
 * and drop anything that does not match exactly.
 */
import { arr, bool, bytes, lit, num, obj, opt, str, type Parsed, type Parser } from "./schema.js";

export const CHANNEL = "rotulo";

export const ELEMENT_ID = /^[0-9a-z]{1,10}$/;
/** One letter per capability the server grants; `m` can be moved and `n` can hold other parts. */
export const CAPABILITIES = /^[tilsbxudcmn]{0,11}$/;
const CAN_MAX = 11;
export const TAG_NAME = /^[a-z][a-z0-9-]{0,31}$/;
/** An `id` a link can point at with `#id`. */
export const ANCHOR_ID = /^[A-Za-z][\w-]{0,63}$/;
const HEX6 = /^#[0-9a-f]{6}$/;
/** One typed character: no control, format or separator characters. */
const TYPED = /^[^\p{Cc}\p{Cf}\p{Zl}\p{Zp}]+$/u;
export const TYPED_MAX = 4;

/** What the agent thinks the selected element is, from its tag, capabilities and computed style. */
export const KINDS = ["image", "button", "link", "heading", "menu", "banner", "header", "footer", "section", "card", "list-item", "text", "box"] as const;
export type Kind = (typeof KINDS)[number];

export const KIND_LABELS: Record<Kind, string> = {
  image: "Image",
  button: "Button",
  link: "Link",
  heading: "Heading",
  menu: "Menu",
  banner: "Banner",
  header: "Header",
  footer: "Footer",
  section: "Section",
  card: "Card",
  "list-item": "List item",
  text: "Text",
  box: "Area",
};

/** Lengths in `px`, `rem`, `em`, `%` and, where `viewport` is above zero, `vh` and `vw`. */
interface Bounds { minPx: number; maxPx: number; percent: number; viewport: number; zero: boolean; keywords: readonly string[] }
type Grammar =
  | { kind: "color" }
  | ({ kind: "length" } & Bounds)
  | { kind: "keyword"; values: readonly string[] }
  | { kind: "opacity" }
  | { kind: "grid-columns" };

const SPACE: Bounds = { minPx: 0, maxPx: 400, percent: 400, viewport: 0, zero: true, keywords: [] };
const SIZE: Bounds = { minPx: 0, maxPx: 4000, percent: 100, viewport: 0, zero: true, keywords: [] };
const COLOR: Grammar = { kind: "color" };
const length = (bounds: Bounds, extra: Partial<Bounds> = {}): Grammar => ({ kind: "length", ...bounds, ...extra });
const keyword = (...values: string[]): Grammar => ({ kind: "keyword", values });
const SPACING = length(SPACE);
const MARGIN = length(SPACE, { keywords: ["auto"] });

/** Mirrors `StyleProperty::grammar` in `src/document.rs`; `fixtures/style-values.json` holds the cases both sides test. */
const STYLE_SPEC = {
  color: COLOR,
  "background-color": COLOR,
  "font-size": length(SPACE, { minPx: 4, maxPx: 160, zero: false }),
  "font-weight": keyword("100", "200", "300", "400", "500", "600", "700", "800", "900"),
  "text-align": keyword("left", "center", "right", "justify"),
  "padding-top": SPACING,
  "padding-bottom": SPACING,
  "padding-left": SPACING,
  "padding-right": SPACING,
  "margin-top": MARGIN,
  "margin-bottom": MARGIN,
  "margin-left": MARGIN,
  "margin-right": MARGIN,
  width: length(SIZE, { keywords: ["auto", "fit-content"] }),
  "max-width": length(SIZE, { keywords: ["none"] }),
  height: length(SIZE, { viewport: 100, keywords: ["auto"] }),
  "min-height": length(SIZE, { viewport: 100 }),
  display: keyword("block", "inline-block", "inline", "flex", "inline-flex", "grid"),
  "flex-direction": keyword("row", "row-reverse", "column", "column-reverse"),
  "flex-wrap": keyword("nowrap", "wrap"),
  "justify-content": keyword("flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly"),
  "align-items": keyword("stretch", "flex-start", "center", "flex-end", "baseline"),
  gap: length(SPACE, { percent: 100 }),
  "grid-template-columns": { kind: "grid-columns" },
  "border-width": length(SPACE, { maxPx: 32, percent: 0 }),
  "border-style": keyword("none", "solid", "dashed", "dotted", "double"),
  "border-color": COLOR,
  "border-radius": length(SPACE, { maxPx: 999, percent: 50 }),
  opacity: { kind: "opacity" },
  overflow: keyword("visible", "hidden", "clip", "auto"),
} as const satisfies Record<string, Grammar>;

export type StyleKey = keyof typeof STYLE_SPEC;
export const STYLE_KEYS = Object.keys(STYLE_SPEC) as StyleKey[];

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function decimal(text: string, maxLength: number): number | null {
  if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(text) || text.length > maxLength) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function isLength(value: string, b: Bounds): boolean {
  if (b.keywords.includes(value) || (b.zero && value === "0")) return true;
  const m = /^([^a-z%]*)([a-z]+|%)$/i.exec(value);
  const n = m ? decimal(m[1] ?? "", 7) : null;
  if (!m || n === null) return false;
  switch (m[2]) {
    case "px": return n >= b.minPx && n <= b.maxPx;
    case "rem": case "em": return n >= b.minPx / 16 && n <= b.maxPx / 10;
    case "%": return b.percent > 0 && n <= b.percent;
    case "vh": case "vw": return b.viewport > 0 && n <= b.viewport;
    default: return false;
  }
}

/** `repeat(N, minmax(0, 1fr))` for 1 to 12 equal columns, or as many columns of at least 80 to 640 px as fit. */
export const GRID_EQUAL = (n: number) => `repeat(${n}, minmax(0, 1fr))`;
export const GRID_FIT = (px: number) => `repeat(auto-fit, minmax(${px}px, 1fr))`;

function isGridColumns(value: string): boolean {
  const m = /^repeat\(([1-9]\d*), minmax\(0, 1fr\)\)$/.exec(value);
  if (m) return Number(m[1]) <= 12;
  const fit = /^repeat\(auto-fit, minmax\(([1-9]\d*)px, 1fr\)\)$/.exec(value);
  return fit !== null && Number(fit[1]) >= 80 && Number(fit[1]) <= 640;
}

/** Mirrors the values the server accepts for `set_style`. */
export function isStyleValue(key: StyleKey, value: string): boolean {
  const g: Grammar = STYLE_SPEC[key];
  switch (g.kind) {
    case "color": return HEX_COLOR.test(value);
    case "length": return isLength(value, g);
    case "keyword": return g.values.includes(value);
    case "opacity": { const n = decimal(value, 4); return n !== null && n >= 0 && n <= 1; }
    case "grid-columns": return isGridColumns(value);
  }
}

function isStyleKey(key: string): key is StyleKey {
  return (STYLE_KEYS as readonly string[]).includes(key);
}

/** A style change: a valid value per key, or null to remove the property. */
export type StyleChanges = Partial<Record<StyleKey, string | null>>;

export const parseStyleChanges: Parser<StyleChanges> = (v) => {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return undefined;
  const entries = Object.entries(v as Record<string, unknown>);
  if (entries.length === 0 || entries.length > STYLE_KEYS.length) return undefined;
  const out: StyleChanges = {};
  for (const [key, value] of entries) {
    if (!isStyleKey(key)) return undefined;
    if (value === null) out[key] = null;
    else if (typeof value === "string" && isStyleValue(key, value)) out[key] = value;
    else return undefined;
  }
  return out;
};

/** Current computed values the toolbar shows; free-form but short. */
export type StyleSnapshot = Partial<Record<StyleKey, string>>;

const parseStyleSnapshot: Parser<StyleSnapshot> = (v) => {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return undefined;
  const out: StyleSnapshot = {};
  for (const [key, value] of Object.entries(v as Record<string, unknown>)) {
    if (!isStyleKey(key) || typeof value !== "string" || value.length > 64) return undefined;
    out[key] = value;
  }
  return out;
};

const elementId = str(10, ELEMENT_ID);
const requestToken = str(36, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
const point = obj({ x: num(-1e6, 1e6), y: num(-1e6, 1e6) });

/** Where a moved or new part lands, relative to a target part. `inside` appends it as the target's last child. */
export const POSITIONS = ["before", "after", "inside"] as const;
export type Position = (typeof POSITIONS)[number];
const position = lit(...POSITIONS);

/** The editable parts of the page as a tree, in document order, for the navigator. */
export const MAX_STRUCTURE_NODES = 5000;
const parseStructureNode = obj({ element: elementId, parent: opt(elementId), tag: str(32, TAG_NAME), name: str(60), can: str(CAN_MAX, CAPABILITIES) });
export type StructureNode = Parsed<typeof parseStructureNode>;

/** Accepts only a real tree: unique ids, and every parent listed before its children. */
const parseStructureNodes: Parser<StructureNode[]> = (v) => {
  const nodes = arr(parseStructureNode, MAX_STRUCTURE_NODES)(v);
  if (!nodes) return undefined;
  const seen = new Set<string>();
  for (const node of nodes) {
    if (seen.has(node.element) || (node.parent !== null && !seen.has(node.parent))) return undefined;
    seen.add(node.element);
  }
  return nodes;
};
const scroll = num(0, 1e7);

export const parseRect = obj({
  x: num(-1e6, 1e6),
  y: num(-1e6, 1e6),
  width: num(0, 1e6),
  height: num(0, 1e6),
});
export type Rect = Parsed<typeof parseRect>;

const parseFormats = obj({ bold: bool, italic: bool, link: bool });
export type Formats = Parsed<typeof parseFormats>;

const size = num(0, 1e5);

const parseSelectionInfo = obj({
  href: opt(str(2048)),
  newTab: bool,
  src: opt(str(2048)),
  alt: opt(str(1000)),
  hidden: bool,
  text: str(200),
  styles: parseStyleSnapshot,
  /** The values written in the element's own `style` attribute, so a panel can tell a set value from an inherited one. */
  own: opt(parseStyleSnapshot),
  /** The computed background is a photo (`background-image: url(...)`). */
  bgImage: bool,
  /** For images: the file's own size and the size it is shown at, in CSS px. */
  image: opt(obj({ naturalWidth: size, naturalHeight: size, width: size, height: size })),
  /** Links on this page that jump to this part or something inside it (`href="#id"`). */
  anchorLinks: num(0, 1000),
});
export type SelectionInfo = Parsed<typeof parseSelectionInfo>;

const kind = lit(...KINDS);
export const MAX_OBSTACLES = 12;
export const MAX_OUTLINE_IMAGES = 40;
/** The canvas scale, so the agent draws its marks at a constant size on screen. */
const scale = num(0.05, 8);
const name = str(60);

/** `photo`: the ancestor can take a background photo and shows one now (a banner behind a heading). */
const parseAncestor = obj({ element: elementId, kind, name, photo: bool });
export type Ancestor = Parsed<typeof parseAncestor>;

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
    can: str(CAN_MAX, CAPABILITIES),
    tag: str(32, TAG_NAME),
    kind,
    /** A short human name: a section's first heading, an image's description, a link's text. */
    name,
    /** Editable ancestors, nearest first, for the breadcrumb. */
    ancestors: arr(parseAncestor, 8),
    rect: parseRect,
    info: parseSelectionInfo,
    /** Visible words and pictures around the selection, nearest first, so the toolbar can avoid them. */
    obstacles: arr(parseRect, MAX_OBSTACLES),
  }),
  /** A click on something the site's code made. `around` is the nearest editable ancestor. */
  blocked: obj({ type: lit("blocked"), rect: parseRect, around: opt(elementId) }),
  /** A second click on selected text. The parent only announces a hint; it never moves focus or starts a session from this. */
  request_text: obj({ type: lit("request_text"), element: elementId }),
  deselect: obj({ type: lit("deselect") }),
  /** Sent every frame that moves. `obstructions` are the site's own fixed or sticky bars; `obstacles` as in `select`. */
  viewport: obj({ type: lit("viewport"), scrollY: scroll, rect: opt(parseRect), obstructions: arr(parseRect, 4), obstacles: arr(parseRect, MAX_OBSTACLES) }),
  /** The page's main heading and its pictures, for the rail's shortcuts and picture list. */
  outline: obj({
    type: lit("outline"),
    heading: opt(elementId),
    images: arr(obj({ element: elementId, name, src: str(2048) }), MAX_OUTLINE_IMAGES),
  }),
  /** The page's own colours, most used first, for the style swatches. */
  palette: obj({ type: lit("palette"), colors: arr(str(7, HEX6), 10) }),
  /** Parts of the page a link can jump to. */
  anchors: obj({ type: lit("anchors"), items: arr(obj({ id: str(64, ANCHOR_ID), name }), 50) }),
  editing: obj({ type: lit("editing"), element: elementId, active: bool, formats: parseFormats }),
  text: obj({ type: lit("text"), element: elementId, html: str(65536) }),
  navigate: obj({ type: lit("navigate"), href: str(2048) }),
  /** Sent on `init` and on `request_structure`. `truncated` when the page has more parts than the cap. */
  structure: obj({ type: lit("structure"), nodes: parseStructureNodes, truncated: bool }),
  /** Legacy feedback only. This never authorizes a move in the app. */
  dragging: obj({ type: lit("dragging"), active: bool }),
  /** A proposal answering the app's single-use drag_end request. */
  move_element: (v: unknown) => {
    const message = obj({ type: lit("move_element"), request: requestToken, element: elementId, target: elementId, position })(v);
    return message && message.element !== message.target ? message : undefined;
  },
} as const;

const editorMessages = {
  /** Tints the text the owner can edit until `hide_editable`, a selection or a mode change. No caller-controlled element list. */
  show_editable: obj({ type: lit("show_editable") }),
  hide_editable: obj({ type: lit("hide_editable") }),
  init: obj({
    type: lit("init"),
    mode: lit("edit", "preview"),
    scrollY: opt(scroll),
    select: opt(elementId),
    scale: opt(scale),
  }),
  mode: obj({ type: lit("mode"), mode: lit("edit", "preview") }),
  scale: obj({ type: lit("scale"), scale }),
  /** The app's interface font, as bytes, for the slug inside the site. Fetched by the app from its own origin. */
  font: obj({ type: lit("font"), data: bytes(256 * 1024) }),
  /** Keyboard selection: the part around, the first part inside, or the next or previous part. */
  select_relative: obj({ type: lit("select_relative"), direction: lit("parent", "child", "next", "prev") }),
  /** Breadcrumb selection. The agent re-checks the id and its capabilities. */
  select_element: obj({ type: lit("select_element"), element: elementId }),
  /** Scrolls an element into view, optionally with a one-off pulse after a change. */
  reveal: obj({ type: lit("reveal"), element: elementId, pulse: bool }),
  deselect: obj({ type: lit("deselect") }),
  request_structure: obj({ type: lit("request_structure") }),
  /** Ends a drag on the canvas without moving anything, for Escape pressed while the app has focus. */
  cancel_drag: obj({ type: lit("cancel_drag") }),
  drag_start: obj({ type: lit("drag_start"), drag: requestToken, element: elementId, point }),
  drag_point: obj({ type: lit("drag_point"), drag: requestToken, point }),
  drag_end: obj({ type: lit("drag_end"), drag: requestToken, request: requestToken, point }),
  drag_cancel: obj({ type: lit("drag_cancel"), drag: requestToken }),
  /**
   * Sent only after the owner's own input in the app. `input` is the key the owner
   * typed on the canvas surface to start, inserted as the first change.
   */
  start_text: obj({ type: lit("start_text"), element: elementId, input: opt(str(TYPED_MAX, TYPED)) }),
  finish_text: obj({ type: lit("finish_text"), commit: bool }),
  format: obj({ type: lit("format"), command: lit("bold", "italic", "link", "unlink"), href: opt(str(2048)) }),
  preview_style: obj({ type: lit("preview_style"), element: elementId, styles: parseStyleChanges }),
  preview_image: obj({ type: lit("preview_image"), element: elementId, src: str(2048), alt: str(1000) }),
  preview_alt: obj({ type: lit("preview_alt"), element: elementId, alt: str(1000) }),
  preview_link: obj({ type: lit("preview_link"), element: elementId, href: str(2048), newTab: bool }),
  preview_hidden: obj({ type: lit("preview_hidden"), element: elementId, hidden: bool }),
  /** Shows a new background photo at once. The agent accepts only URLs on the preview origin. */
  preview_background: obj({ type: lit("preview_background"), element: elementId, src: str(2048) }),
} as const;

type MessageOf<T extends Record<string, Parser<unknown>>> = { [K in keyof T]: Parsed<T[K]> }[keyof T];

export type AgentMessage = MessageOf<typeof agentMessages>;
export type EditorMessage = MessageOf<typeof editorMessages>;

function parseWith<M>(table: Record<string, Parser<unknown>>): Parser<M> {
  return (raw) => {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return undefined;
    const record = raw as Record<string, unknown>;
    if (record["channel"] !== CHANNEL || typeof record["type"] !== "string") return undefined;
    if (!Object.prototype.hasOwnProperty.call(table, record["type"])) return undefined;
    return table[record["type"]]?.(record) as M | undefined;
  };
}

/** Used by the editor on messages from the preview. */
export const parseAgentMessage: Parser<AgentMessage> = parseWith<AgentMessage>(agentMessages);
/** Used by the agent on messages from the editor. */
export const parseEditorMessage: Parser<EditorMessage> = parseWith<EditorMessage>(editorMessages);

export function envelope<M extends { type: string }>(message: M): M & { channel: typeof CHANNEL } {
  return { ...message, channel: CHANNEL };
}

/** Mirrors the server's link check: web, email, phone, fragments and paths in the site. */
export function isSafeHref(value: string): boolean {
  const href = value.trim();
  if (href === "" || href.length > 2048 || /[\u0000-\u001f\u007f\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]/.test(href)) return false;
  if (href.startsWith("\\\\") || href.startsWith("/\\")) return false;
  const colon = href.indexOf(":");
  const delimiter = href.search(/[/?#]/);
  if (colon < 0 || (delimiter >= 0 && delimiter < colon)) return true;
  const scheme = href.slice(0, colon).toLowerCase();
  if (scheme === "http" || scheme === "https") return href.slice(colon + 1).startsWith("//");
  return scheme === "mailto" || scheme === "tel";
}
