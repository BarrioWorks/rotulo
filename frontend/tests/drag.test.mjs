import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import * as geometry from "../../assets/static/js/agent/structure.js";

const source = readFileSync(new URL("../../assets/static/js/agent/agent.js", import.meta.url), "utf8");
function section(start, end) {
  const from = source.indexOf(start);
  return source.slice(from, source.indexOf(end, from));
}
const dragCode = section("/* Dragging the selected part.", 'for (const type of ["mousedown"');
const clickCode = section('window.addEventListener("click"', 'for (const type of ["auxclick"');

const token = "11111111-1111-4111-8111-111111111111";
const request = "22222222-2222-4222-8222-222222222222";
const flowStyle = { display: "block", flexDirection: "row", gridAutoFlow: "row", direction: "ltr" };

/**
 * A page of four stacked sections on an 800 by 700 viewport. Section b holds two cards side by
 * side, section c holds one paragraph and section d is empty.
 */
function page() {
  const html = { localName: "html", parentElement: null, clientWidth: 800 };
  const body = { localName: "body", id: "root", can: "n", parentElement: html };
  const all = [];
  const el = (id, can, rect, parentElement, style = flowStyle) => {
    const node = { id, can, rect, parentElement, style, localName: "div", children: [] };
    node.contains = (other) => { for (let x = other; x; x = x.parentElement) if (x === node) return true; return false; };
    node.querySelectorAll = () => all.filter((other) => other !== node && node.contains(other));
    all.push(node);
    return node;
  };
  body.querySelectorAll = () => [...all];
  const a = el("a", "sxmn", { x: 0, y: 0, width: 800, height: 200 }, body);
  const b = el("b", "sxmn", { x: 0, y: 200, width: 800, height: 200 }, body, { ...flowStyle, display: "flex" });
  const b1 = el("b1", "tsm", { x: 40, y: 240, width: 320, height: 120 }, b);
  const b2 = el("b2", "tsm", { x: 440, y: 240, width: 320, height: 120 }, b);
  const c = el("c", "sxmn", { x: 0, y: 400, width: 800, height: 200 }, body);
  const c1 = el("c1", "tsm", { x: 40, y: 440, width: 720, height: 120 }, c);
  const d = el("d", "sxmn", { x: 0, y: 600, width: 800, height: 200 }, body);
  const inside = (r, x, y) => x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height;
  const depth = (n) => { let i = 0; for (let x = n; x; x = x.parentElement) i++; return i; };
  const elementsFromPoint = (x, y) => [...all.filter((n) => inside(n.rect, x, y)).sort((p, q) => depth(q) - depth(p)), body, html];
  return { html, body, elementsFromPoint, parts: { a, b, b1, b2, c, c1, d } };
}

function overlayElement() {
  const listeners = new Map();
  return {
    hidden: true,
    style: {},
    classList: { toggle() {} },
    setPointerCapture() {},
    addEventListener: (type, callback) => listeners.set(type, callback),
    fire: (type, event) => listeners.get(type)?.(event),
  };
}

/** Sends parent drag commands to the agent and records its proposals. Pointer events remain unprivileged. */
function harness({ selected = "a" } = {}) {
  const { html, body, elementsFromPoint, parts } = page();
  const windowListeners = new Map();
  const posts = [];
  const frames = [];
  const timers = [];
  const scrolls = [];
  const selections = [];
  const editable = (el) => Boolean(el && el.id && el.can);
  const context = {
    ...geometry,
    k: 1,
    mode: "edit",
    editing: null,
    selected: parts[selected],
    hovered: null,
    origin: { x: 0, y: 0 },
    host: {},
    innerHeight: 700,
    dropBox: overlayElement(),
    dropLine: overlayElement(),
    document: { body, documentElement: html, elementsFromPoint },
    window: {
      scrollY: 0,
      addEventListener: (type, callback) => windowListeners.set(type, [...(windowListeners.get(type) ?? []), callback]),
      setTimeout: (callback) => timers.push(callback),
      scrollBy: ({ top }) => { scrolls.push(top); context.window.scrollY += top; },
    },
    requestAnimationFrame: (callback) => frames.push(callback),
    cancelAnimationFrame() {},
    getComputedStyle: (el) => el.style ?? flowStyle,
    byId: (id) => parts[id] ?? null,
    idOf: (el) => el.id ?? null,
    canOf: (el) => el.can ?? "",
    editable,
    chain: (start) => { const out = []; for (let x = start; x && x !== html; x = x.parentElement) if (editable(x)) out.push(x); return out; },
    visible: () => true,
    rectOf: (el) => el.rect,
    place: () => null,
    schedule() {},
    post: (message) => posts.push(JSON.parse(JSON.stringify(message))),
    isOurs: (event) => event.ours === true,
    asElement: (target) => target,
    pickAt: (_x, _y, target) => ({ kind: "element", el: target }),
    editingContains: () => false,
    previewNavigation() {},
    select: (el) => selections.push(el?.id ?? null),
    showBlocked() {},
  };
  vm.runInNewContext(`${dragCode}\n${clickCode}`, context);
  const fire = (type, event) => { for (const callback of windowListeners.get(type) ?? []) callback(event); };
  const pointer = (type, x, y) => {
    context.message = { drag: token, element: selected, point: { x, y } };
    if (type === "pointerdown") vm.runInNewContext("startDrag(message)", context);
    if (type === "pointermove") vm.runInNewContext("pointDrag(message.drag, message.point)", context);
    if (type === "pointerup") vm.runInNewContext(`if (drag?.token === message.drag && drag.phase === "dragging") { pointDrag(message.drag, message.point); endDrag("${request}"); } else endDrag();`, context);
    if (type === "pointercancel") vm.runInNewContext("endDrag()", context);
  };
  const click = () => {
    const seen = { stopped: false, prevented: false };
    fire("click", { target: parts.c1, clientX: 0, clientY: 0, stopImmediatePropagation() { seen.stopped = true; }, preventDefault() { seen.prevented = true; } });
    return seen;
  };
  const runFrames = (limit = 10) => { for (let i = 0; i < limit && frames.length; i++) frames.shift()(); };
  const runTimers = () => { while (timers.length) timers.shift()(); };
  const drag = (x, y) => { pointer("pointerdown", 400, 100); pointer("pointermove", 400, 120); pointer("pointermove", x, y); };
  return { context, posts, scrolls, selections, fire, pointer, click, runFrames, runTimers, drag, parts };
}

const moves = (posts) => posts.filter((m) => m.type === "move_element");

test("a parent press without a drag point stays a click", () => {
  const h = harness();
  h.pointer("pointerdown", 400, 100);
  h.pointer("pointerup", 402, 102);
  assert.deepEqual(h.posts, []);
  h.click();
  assert.deepEqual(h.selections, ["c1"], "the click selects as usual");
});

test("dropping in the middle of a section places the part among its children", () => {
  const h = harness();
  h.drag(400, 520);
  h.pointer("pointerup", 400, 520);
  assert.deepEqual(h.posts, [
    { type: "move_element", request, element: "a", target: "c1", position: "after" },
  ]);
});

test("near a section's edge the part lands beside the section instead", () => {
  const h = harness();
  h.drag(400, 590);
  h.pointer("pointerup", 400, 590);
  assert.deepEqual(moves(h.posts), [{ type: "move_element", request, element: "a", target: "c", position: "after" }]);
  const top = harness();
  top.drag(400, 405);
  top.pointer("pointerup", 400, 405);
  assert.deepEqual(moves(top.posts), [{ type: "move_element", request, element: "a", target: "c", position: "before" }]);
});

test("a section dragged over a paragraph lands beside it, never inside the text", () => {
  const h = harness();
  Object.assign(h.parts.c1, { localName: "p", can: "tsmn" });
  h.drag(400, 520);
  h.pointer("pointerup", 400, 520);
  assert.deepEqual(moves(h.posts), [{ type: "move_element", request, element: "a", target: "c1", position: "after" }]);
});

test("an empty container takes the part inside it", () => {
  const h = harness();
  h.drag(400, 650);
  h.pointer("pointerup", 400, 650);
  assert.deepEqual(moves(h.posts), [{ type: "move_element", request, element: "a", target: "d", position: "inside" }]);
});

test("cards side by side split left and right", () => {
  const h = harness({ selected: "c1" });
  h.pointer("pointerdown", 400, 500);
  h.pointer("pointermove", 400, 480);
  h.pointer("pointermove", 480, 300);
  h.pointer("pointerup", 480, 300);
  assert.deepEqual(moves(h.posts), [{ type: "move_element", request, element: "c1", target: "b2", position: "before" }]);
});

test("letting go where the part already is moves nothing", () => {
  const h = harness();
  h.drag(400, 150);
  h.pointer("pointerup", 400, 150);
  assert.deepEqual(h.posts, []);
});

test("a cancelled pointer ends the drag without a move", () => {
  const h = harness();
  h.drag(400, 520);
  h.pointer("pointercancel", 400, 520);
  h.pointer("pointerup", 400, 520);
  assert.deepEqual(h.posts, []);
});

test("iframe pointer input cannot produce a move or drag authorization", () => {
  const h = harness();
  for (const type of ["pointerdown", "pointermove", "pointerup"]) {
    h.fire(type, { pointerId: 1, isTrusted: true, isPrimary: true, button: 0, clientX: 400, clientY: 520 });
  }
  assert.deepEqual(h.posts, []);
});

test("parts the server does not mark movable do not drag", () => {
  const h = harness({ selected: "b1" });
  h.parts.b1.can = "ts";
  h.pointer("pointerdown", 100, 300);
  h.pointer("pointermove", 400, 520);
  h.pointer("pointerup", 400, 520);
  assert.deepEqual(h.posts, []);
});

test("holding near the bottom edge scrolls the page until the drop", () => {
  const h = harness();
  h.drag(400, 690);
  h.runFrames();
  assert.ok(h.scrolls.length > 0 && h.scrolls.every((top) => top > 0), "scrolls down");
  const scrolled = h.scrolls.length;
  h.pointer("pointerup", 400, 690);
  h.runFrames();
  assert.equal(h.scrolls.length, scrolled, "no scrolling after the drop");
});

test("root children remain drop targets when the body is annotated", () => {
  const h = harness();
  h.drag(400, 590);
  h.pointer("pointerup", 400, 590);
  assert.deepEqual(moves(h.posts), [{ type: "move_element", request, element: "a", target: "c", position: "after" }]);
});

test("mismatched drag points do not change the proposed destination", () => {
  const h = harness();
  h.drag(400, 520);
  vm.runInNewContext('pointDrag("wrong", { x: 400, y: 650 })', h.context);
  vm.runInNewContext(`endDrag("${request}")`, h.context);
  assert.equal(moves(h.posts)[0].target, "c1");
});
