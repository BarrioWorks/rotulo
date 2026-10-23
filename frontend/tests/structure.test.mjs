import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  PHRASING,
  PHRASING_PARENTS,
  PHRASING_PARTS,
  admits,
  contentOf,
  fitOf,
  flowOf,
  isNoop,
  lineFor,
  localFlow,
  nearEdge,
  slotAt,
  structureOf,
} from "../../assets/static/js/agent/structure.js";
import { acceptsCanvasMessage } from "../../assets/static/js/editor/canvas-policy.js";

const box = (x, y, width, height) => ({ x, y, width, height });
const block = { display: "block", flexDirection: "row", gridAutoFlow: "row", direction: "ltr" };
const column = { axis: "y", reverse: false };
const stack = [box(0, 0, 400, 100), box(0, 100, 400, 100), box(0, 200, 400, 100)];
const row = [box(0, 0, 100, 50), box(120, 0, 100, 50), box(240, 0, 100, 50)];

test("a container's style gives the flow for a lone child", () => {
  assert.deepEqual(flowOf(block), { axis: "y", reverse: false });
  assert.deepEqual(flowOf({ ...block, display: "flex" }), { axis: "x", reverse: false });
  assert.deepEqual(flowOf({ ...block, display: "inline-flex", flexDirection: "row-reverse" }), { axis: "x", reverse: true });
  assert.deepEqual(flowOf({ ...block, display: "flex", direction: "rtl" }), { axis: "x", reverse: true });
  assert.deepEqual(flowOf({ ...block, display: "flex", flexDirection: "row-reverse", direction: "rtl" }), { axis: "x", reverse: false });
  assert.deepEqual(flowOf({ ...block, display: "flex", flexDirection: "column-reverse" }), { axis: "y", reverse: true });
  assert.deepEqual(flowOf({ ...block, display: "grid" }), { axis: "x", reverse: false });
  assert.deepEqual(flowOf({ ...block, display: "grid", gridAutoFlow: "column dense" }), { axis: "y", reverse: false });
  assert.deepEqual(slotAt({ x: 10, y: 5 }, [box(0, 0, 400, 100)], flowOf({ ...block, display: "flex" })).position, "before");
  assert.deepEqual(slotAt({ x: 390, y: 5 }, [box(0, 0, 400, 100)], flowOf({ ...block, display: "flex" })).position, "after");
});

test("stacked children split at their middle, and gaps go to the nearest child", () => {
  assert.deepEqual(slotAt({ x: 200, y: 140 }, stack, column), { index: 1, position: "before", flow: column });
  assert.deepEqual(slotAt({ x: 200, y: 160 }, stack, column), { index: 1, position: "after", flow: column });
  assert.deepEqual(slotAt({ x: 200, y: 900 }, stack, column), { index: 2, position: "after", flow: column }, "below the last child");
  assert.deepEqual(slotAt({ x: 900, y: 10 }, stack, { axis: "x", reverse: false }).flow, column, "the layout on screen wins over the style");
  assert.equal(slotAt({ x: 0, y: 0 }, [], column), null);
});

test("children side by side split left and right, even when the style says column", () => {
  assert.deepEqual(slotAt({ x: 150, y: 25 }, row, column), { index: 1, position: "before", flow: { axis: "x", reverse: false } });
  assert.deepEqual(slotAt({ x: 230, y: 25 }, row, column).position, "after");
  assert.deepEqual(slotAt({ x: 225, y: 25 }, row, column), { index: 1, position: "after", flow: { axis: "x", reverse: false } }, "the gap after the middle child");
});

test("a reversed row or column swaps before and after on screen", () => {
  const reversed = [...row].reverse();
  // Document order runs right to left: child 0 is on the right.
  assert.deepEqual(localFlow(0, reversed, column), { axis: "x", reverse: true });
  assert.deepEqual(slotAt({ x: 250, y: 25 }, reversed, column), { index: 0, position: "after", flow: { axis: "x", reverse: true } }, "left of the first child is after it");
  assert.equal(slotAt({ x: 330, y: 25 }, reversed, column).position, "before");
  const upward = [...stack].reverse();
  assert.equal(slotAt({ x: 10, y: 210 }, upward, column).position, "after", "column-reverse: the upper half of the first child is after it");
});

test("a wrapped grid reads each row left to right", () => {
  const grid = [box(0, 0, 100, 100), box(110, 0, 100, 100), box(0, 110, 100, 100), box(110, 110, 100, 100)];
  assert.deepEqual(slotAt({ x: 130, y: 150 }, grid, column), { index: 3, position: "before", flow: { axis: "x", reverse: false } });
  assert.deepEqual(slotAt({ x: 90, y: 50 }, grid, column), { index: 0, position: "after", flow: { axis: "x", reverse: false } });
  assert.deepEqual(localFlow(1, [box(0, 0, 100, 100), box(0, 110, 100, 100)], { axis: "x", reverse: false }), column, "a one-column grid stacks");
});

test("dropping a part next to where it already is does nothing", () => {
  const slot = (index, position) => ({ index, position, flow: column });
  assert.equal(isNoop(1, slot(1, "before")), true);
  assert.equal(isNoop(1, slot(1, "after")), true);
  assert.equal(isNoop(1, slot(0, "after")), true);
  assert.equal(isNoop(1, slot(2, "before")), true);
  assert.equal(isNoop(1, slot(0, "before")), false);
  assert.equal(isNoop(1, slot(2, "after")), false);
  assert.equal(isNoop(-1, slot(0, "after")), false, "a part from another container always moves");
});

test("edge bands are capped at a quarter of the part, so small parts keep a middle", () => {
  const section = box(0, 100, 800, 400);
  assert.equal(nearEdge({ x: 400, y: 110 }, section, "y", 24), true);
  assert.equal(nearEdge({ x: 400, y: 490 }, section, "y", 24), true);
  assert.equal(nearEdge({ x: 400, y: 130 }, section, "y", 24), false);
  assert.equal(nearEdge({ x: 5, y: 300 }, section, "y", 24), false, "only the flow axis counts");
  assert.equal(nearEdge({ x: 400, y: 105 }, box(0, 100, 800, 40), "y", 24), true);
  assert.equal(nearEdge({ x: 400, y: 120 }, box(0, 100, 800, 40), "y", 24), false);
});

test("the insertion line sits on the side the part lands on", () => {
  const r = box(10, 20, 100, 50);
  assert.deepEqual(lineFor({ index: 0, position: "before", flow: column }, r, 2), box(10, 19, 100, 2));
  assert.deepEqual(lineFor({ index: 0, position: "after", flow: column }, r, 2), box(10, 69, 100, 2));
  assert.deepEqual(lineFor({ index: 0, position: "before", flow: { axis: "x", reverse: false } }, r, 2), box(9, 20, 2, 50));
  assert.deepEqual(lineFor({ index: 0, position: "before", flow: { axis: "x", reverse: true } }, r, 2), box(109, 20, 2, 50));
});

function element(id, parentElement = null, extra = {}) {
  return { id, parentElement, tag: "div", ...extra };
}
const describe = (el) => (el.id ? { element: el.id, tag: el.tag, name: el.name ?? "", can: "sm" } : null);

test("the tree skips undescribed wrappers and parents each part to its nearest listed ancestor", () => {
  const section = element("s");
  const wrapper = element(null, section);
  const card = element("c", wrapper);
  const text = element("t", card, { tag: "p", name: "Hello" });
  const footer = element("f");
  assert.deepEqual(structureOf([section, wrapper, card, text, footer], describe), {
    nodes: [
      { element: "s", parent: null, tag: "div", name: "", can: "sm" },
      { element: "c", parent: "s", tag: "div", name: "", can: "sm" },
      { element: "t", parent: "c", tag: "p", name: "Hello", can: "sm" },
      { element: "f", parent: null, tag: "div", name: "", can: "sm" },
    ],
    truncated: false,
  });
});

test("copies of an id and tags the protocol rejects are left out instead of failing the whole tree", () => {
  const section = element("s");
  const copy = element("s");
  const odd = element("o", section, { tag: "my_widget" });
  const inside = element("i", odd);
  const { nodes } = structureOf([section, copy, odd, inside], describe);
  assert.deepEqual(nodes.map((n) => [n.element, n.parent]), [["s", null], ["i", "s"]]);
});

test("a long page is cut at the cap and says so", () => {
  const parts = Array.from({ length: 6 }, (_, i) => element(`p${i}`));
  const cut = structureOf(parts, describe, 4);
  assert.equal(cut.nodes.length, 4);
  assert.equal(cut.truncated, true);
  assert.equal(structureOf(parts.slice(0, 4), describe, 4).truncated, false, "exactly the cap is complete");
});

test("iframe selection and drag flags never authorize a move", () => {
  const session = { path: "index.html", mode: "edit", loading: false, textElement: null, selected: { element: "a", can: "sxm" } };
  const move = { type: "move_element", request: "token", element: "a", target: "b", position: "after" };
  assert.equal(acceptsCanvasMessage(session, move), false);
  assert.equal(acceptsCanvasMessage(session, { type: "dragging", active: true }), false);
  const committing = { path: session.path, request: "token", element: "a", expiresAt: Date.now() + 800 };
  assert.equal(acceptsCanvasMessage({ ...session, committing }, move), true);
  for (const patch of [{ element: "b" }, { request: "wrong" }, { path: "other.html" }, { expiresAt: Date.now() - 1 }]) {
    assert.equal(acceptsCanvasMessage({ ...session, committing: { ...committing, ...patch } }, move), false);
  }
  for (const patch of [{ loading: true }, { mode: "preview" }, { textElement: "a" }]) {
    assert.equal(acceptsCanvasMessage({ ...session, committing, ...patch }, move), false);
  }
});

const tag = (localName, ...children) => ({ localName, children });

test("drops follow the server's content model", () => {
  const section = fitOf(tag("section", tag("h2")));
  assert.equal(admits(contentOf(["section", "body"]), section), true);
  assert.equal(admits(contentOf(["p", "section"]), section), false, "no blocks inside text");
  assert.equal(admits(contentOf(["p"]), fitOf(tag("a", tag("img")))), true, "a link with a picture is text-level");
  assert.equal(admits(contentOf(["p"]), fitOf(tag("a", tag("div")))), false, "a link around a card is a block");
  assert.equal(fitOf(tag("span", tag("svg", tag("path")))), "phrasing", "the inside of a drawing does not count");
  assert.equal(admits(contentOf(["ul"]), fitOf(tag("li"))), true);
  assert.equal(admits(contentOf(["ul"]), fitOf(tag("p"))), false, "only list items in a list");
  assert.equal(admits(contentOf(["div"]), fitOf(tag("li"))), false, "list items only in a list");
  assert.equal(contentOf(["a", "div"]), "flow", "a link takes the content of where it sits");
  assert.equal(contentOf(["a", "ul"]), "phrasing");
  assert.equal(contentOf(["a", "p"]), "phrasing");
});

test("the content model lists match the server's", () => {
  const rust = readFileSync(new URL("../../src/document.rs", import.meta.url), "utf8") + readFileSync(new URL("../../src/document/structure.rs", import.meta.url), "utf8");
  const list = (name) => {
    const body = new RegExp(`const ${name}: &\\[&str\\] = &\\[([^\\]]*)\\]`).exec(rust)?.[1];
    assert.ok(body, `${name} is defined in the server`);
    return [...body.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
  };
  assert.deepEqual(PHRASING, list("PHRASING"));
  assert.deepEqual(PHRASING_PARENTS, list("PHRASING_PARENTS"));
  assert.deepEqual(PHRASING_PARTS, list("PHRASING_PARTS"));
});
