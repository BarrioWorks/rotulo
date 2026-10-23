/**
 * The page's editable parts as a tree, which containers take a dragged part, and where it would
 * land among a container's children. Pure functions over tags, rects and computed style values,
 * so the agent's event code stays thin and all of it can be tested without a browser.
 */
import { MAX_STRUCTURE_NODES, TAG_NAME, type Position, type Rect, type StructureNode } from "../protocol.js";

export interface Point {
  x: number;
  y: number;
}

/** The axis children follow and whether document order runs against it (right to left, bottom to top). */
export interface Flow {
  axis: "x" | "y";
  reverse: boolean;
}

/** A drop beside the child at `index`, in document order. */
export interface Slot {
  index: number;
  position: Exclude<Position, "inside">;
  flow: Flow;
}

export type FlowStyle = Pick<CSSStyleDeclaration, "display" | "flexDirection" | "gridAutoFlow" | "direction">;

/** The flow a container's style promises. Used when its children's rects cannot tell, such as a single child. */
export function flowOf(style: FlowStyle): Flow {
  const rtl = style.direction === "rtl";
  if (/flex/.test(style.display)) {
    const dir = style.flexDirection;
    if (dir.startsWith("column")) return { axis: "y", reverse: dir === "column-reverse" };
    return { axis: "x", reverse: (dir === "row-reverse") !== rtl };
  }
  if (/grid/.test(style.display)) {
    return style.gridAutoFlow.includes("column") ? { axis: "y", reverse: false } : { axis: "x", reverse: rtl };
  }
  return { axis: "y", reverse: false };
}

function overlap(a0: number, a1: number, b0: number, b1: number): number {
  return Math.min(a1, b1) - Math.max(a0, b0);
}

function sameRow(a: Rect, b: Rect): boolean {
  return overlap(a.y, a.y + a.height, b.y, b.y + b.height) > 0.5 * Math.min(a.height, b.height)
    && overlap(a.x, a.x + a.width, b.x, b.x + b.width) < 0.5 * Math.min(a.width, b.width);
}

function sameColumn(a: Rect, b: Rect): boolean {
  return overlap(a.x, a.x + a.width, b.x, b.x + b.width) > 0.5 * Math.min(a.width, b.width)
    && overlap(a.y, a.y + a.height, b.y, b.y + b.height) < 0.5 * Math.min(a.height, b.height);
}

const centre = (r: Rect, axis: Flow["axis"]) => (axis === "x" ? r.x + r.width / 2 : r.y + r.height / 2);

/**
 * How the children around `index` are laid out, read from where they are on screen: side by side
 * means a row, stacked means a column. The nearest sibling in document order on the same line
 * shows whether the order runs backwards, as in `row-reverse` or right-to-left text.
 */
export function localFlow(index: number, rects: readonly Rect[], fallback: Flow): Flow {
  const self = rects[index];
  if (!self) return fallback;
  for (const [axis, same] of [["x", sameRow], ["y", sameColumn]] as const) {
    let nearest = -1;
    rects.forEach((r, j) => {
      if (j !== index && same(self, r) && (nearest < 0 || Math.abs(j - index) < Math.abs(nearest - index))) nearest = j;
    });
    const other = rects[nearest];
    if (other) return { axis, reverse: (nearest < index) === (centre(other, axis) > centre(self, axis)) };
  }
  return fallback;
}

function distance(p: Point, r: Rect): number {
  const dx = Math.max(r.x - p.x, 0, p.x - (r.x + r.width));
  const dy = Math.max(r.y - p.y, 0, p.y - (r.y + r.height));
  return Math.hypot(dx, dy);
}

/** The child nearest the point, and which side of it the point is on along the children's flow. */
export function slotAt(p: Point, rects: readonly Rect[], fallback: Flow): Slot | null {
  let index = -1;
  let best = Infinity;
  rects.forEach((r, i) => {
    const d = distance(p, r);
    if (d < best) {
      best = d;
      index = i;
    }
  });
  const rect = rects[index];
  if (!rect) return null;
  const flow = localFlow(index, rects, fallback);
  const startHalf = (flow.axis === "x" ? p.x : p.y) < centre(rect, flow.axis);
  return { index, position: startHalf !== flow.reverse ? "before" : "after", flow };
}

/** True when the slot would put the child at `dragged` back where it already is. */
export function isNoop(dragged: number, slot: Slot): boolean {
  if (dragged < 0) return false;
  return slot.index === dragged
    || (slot.index === dragged - 1 && slot.position === "after")
    || (slot.index === dragged + 1 && slot.position === "before");
}

/** True when the point is within `band` of the rect's start or end along the axis. */
export function nearEdge(p: Point, r: Rect, axis: Flow["axis"], band: number): boolean {
  const [at, start, size] = axis === "x" ? [p.x, r.x, r.width] : [p.y, r.y, r.height];
  const width = Math.min(band, size / 4);
  return at - start < width || start + size - at < width;
}

/** The insertion line for a slot: a bar across the child's side the drop lands on. */
export function lineFor(slot: Slot, r: Rect, thickness: number): Rect {
  const atStart = (slot.position === "before") !== slot.flow.reverse;
  if (slot.flow.axis === "y") {
    return { x: r.x, y: (atStart ? r.y : r.y + r.height) - thickness / 2, width: r.width, height: thickness };
  }
  return { x: (atStart ? r.x : r.x + r.width) - thickness / 2, y: r.y, width: thickness, height: r.height };
}

/*
 * A copy of the server's content model (`fit`, `own_content` and `admits` in src/document/structure.rs),
 * so the canvas only offers drops the server takes: no section inside a paragraph, only list items
 * in a list. The server still checks every move. A test fails when these lists drift from the Rust ones.
 */
export const PHRASING = ["a", "abbr", "b", "bdi", "bdo", "br", "cite", "code", "data", "dfn", "em", "i", "kbd", "mark", "q", "s", "samp", "small", "span", "strong", "sub", "sup", "time", "u", "var", "wbr"];
export const PHRASING_PARENTS = ["p", "h1", "h2", "h3", "h4", "h5", "h6", "pre", "summary", "legend", "caption", "dt", "button", "label"];
export const PHRASING_PARTS = ["img", "picture", "svg", "button", "label", "input", "select", "textarea", "iframe", "canvas", "object", "embed", "meter", "progress", "output", "video", "audio"];
const LISTS = ["ul", "ol", "menu"];

export type Content = "flow" | "phrasing" | "list";
export type Fit = "flow" | "phrasing" | "list-item";

export interface Tagged {
  localName: string;
  children: ArrayLike<Tagged>;
}

/** What a container's children may be. `tags` runs from the container outwards: a link takes the content of where it sits. */
export function contentOf(tags: Iterable<string>): Content {
  let link = false;
  for (const tag of tags) {
    if (tag === "a") {
      link = true;
      continue;
    }
    const own: Content = LISTS.includes(tag) ? "list" : PHRASING_PARENTS.includes(tag) || PHRASING.includes(tag) ? "phrasing" : "flow";
    return link && own === "list" ? "phrasing" : own;
  }
  return "flow";
}

/** Where a part may go. A link or span wrapping blocks, such as a whole card, goes where blocks go. */
export function fitOf(el: Tagged): Fit {
  if (el.localName === "li") return "list-item";
  if (!PHRASING.includes(el.localName) && !PHRASING_PARTS.includes(el.localName)) return "flow";
  const stack = [el];
  for (let node = stack.pop(); node; node = stack.pop()) {
    if (node !== el && PHRASING_PARTS.includes(node.localName)) continue;
    for (const child of Array.from(node.children)) {
      if (fitOf({ localName: child.localName, children: [] }) !== "phrasing") return "flow";
      stack.push(child);
    }
  }
  return "phrasing";
}

export function admits(content: Content, fit: Fit): boolean {
  if (content === "list" || fit === "list-item") return content === "list" && fit === "list-item";
  return content === "flow" || fit === "phrasing";
}

export type Described = Omit<StructureNode, "parent">;

/**
 * The tree the navigator shows, in document order, so every parent comes before its children
 * and any prefix is still a tree. A part's parent is its nearest listed ancestor. Parts that
 * cannot be described, and copies of an id the site's own script made, are left out.
 */
export function structureOf(
  elements: Iterable<Element>,
  describe: (el: Element) => Described | null,
  max = MAX_STRUCTURE_NODES,
): { nodes: StructureNode[]; truncated: boolean } {
  const listed = new Map<Element, string>();
  const ids = new Set<string>();
  const nodes: StructureNode[] = [];
  for (const el of elements) {
    const node = describe(el);
    if (!node || ids.has(node.element) || !TAG_NAME.test(node.tag)) continue;
    if (nodes.length === max) return { nodes, truncated: true };
    let parent: string | null = null;
    for (let up = el.parentElement; up && parent === null; up = up.parentElement) parent = listed.get(up) ?? null;
    listed.set(el, node.element);
    ids.add(node.element);
    nodes.push({ ...node, parent });
  }
  return { nodes, truncated: false };
}
