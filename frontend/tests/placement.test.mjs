import assert from "node:assert/strict";
import { test } from "node:test";

import { intersect, placeToolbar } from "../../assets/static/js/editor/placement.js";

const canvas = { x: 260, y: 68, width: 1008, height: 688 };
const size = { width: 300, height: 40 };
const nav = { x: 260, y: 68, width: 1008, height: 74 };

function box(p) {
  return { x: p.x, y: p.y, width: size.width, height: size.height };
}

test("the toolbar goes above the selection when there is room", () => {
  const target = { x: 400, y: 400, width: 500, height: 60 };
  const p = placeToolbar({ target, canvas, obstructions: [], size });
  assert.equal(p.kind, "placed");
  assert.equal(p.candidate, "above-start");
  assert.equal(intersect(box(p), target), null);
  assert.equal(p.y + size.height, 400 - 8);
});

test("it never covers the selection or the site's sticky header", () => {
  const target = { x: 400, y: 160, width: 500, height: 60 };
  const p = placeToolbar({ target, canvas, obstructions: [nav], size });
  assert.equal(p.candidate, "below-start", "above would sit on the nav");
  assert.equal(intersect(box(p), target), null);
  assert.equal(intersect(box(p), nav), null);
});

test("it stays inside the canvas, not the window", () => {
  const target = { x: 1200, y: 400, width: 60, height: 30 };
  const p = placeToolbar({ target, canvas, obstructions: [], size });
  assert.ok(p.x + size.width <= canvas.x + canvas.width);
  assert.ok(p.x >= canvas.x);
});

test("a selection taller than the canvas gets the toolbar pinned under the header", () => {
  const target = { x: 260, y: 20, width: 1008, height: 2000 };
  const p = placeToolbar({ target, canvas, obstructions: [nav], size });
  assert.equal(p.candidate, "pinned");
  assert.equal(p.y, nav.y + nav.height + 8);
});

test("when nothing else fits it docks at the bottom of the canvas", () => {
  const small = { x: 0, y: 0, width: 800, height: 200 };
  const target = { x: 0, y: 50, width: 800, height: 99 };
  const p = placeToolbar({ target, canvas: small, obstructions: [], size });
  assert.equal(p.candidate, "docked");
  assert.equal(p.y, small.y + small.height - size.height - 12);
});

test("an offscreen selection reports which way it went", () => {
  assert.deepEqual(placeToolbar({ target: { x: 400, y: -500, width: 100, height: 40 }, canvas, obstructions: [], size }), { kind: "offscreen", direction: "above" });
  assert.deepEqual(placeToolbar({ target: { x: 400, y: 2000, width: 100, height: 40 }, canvas, obstructions: [], size }), { kind: "offscreen", direction: "below" });
});

test("while scrolling it keeps its side as long as that side still works", () => {
  const target = { x: 400, y: 300, width: 500, height: 60 };
  const first = placeToolbar({ target, canvas, obstructions: [], size, previous: "below-start" });
  assert.equal(first.candidate, "below-start");
  const docked = placeToolbar({ target, canvas, obstructions: [], size, previous: "docked" });
  assert.equal(docked.candidate, "above-start", "a fallback spot is not sticky");
});
