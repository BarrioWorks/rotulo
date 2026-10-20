import assert from "node:assert/strict";
import { test } from "node:test";

import { collapseOrder, coverage, fitRow, intersect, placeToolbar, TOOLBAR_MAX_WIDTH } from "../../assets/static/js/editor/placement.js";

const canvas = { x: 260, y: 68, width: 1008, height: 688 };
const size = { width: 300, height: 40 };
const nav = { x: 260, y: 68, width: 1008, height: 74 };

function box(p) {
  return { x: p.x, y: p.y, width: p.width ?? size.width, height: size.height };
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

test("a subheading right above a selected headline pushes the toolbar below it", () => {
  const headline = { x: 400, y: 400, width: 560, height: 60 };
  const subheading = { x: 520, y: 350, width: 320, height: 36 };
  const p = placeToolbar({ target: headline, canvas, obstructions: [], obstacles: [subheading], size });
  assert.equal(p.candidate, "below-start");
  assert.equal(coverage(box(p), [subheading]), 0);
});

test("an icon above a short heading is avoided by moving to the other end", () => {
  const heading = { x: 400, y: 400, width: 700, height: 30 };
  const icon = { x: 420, y: 330, width: 90, height: 60 };
  const paragraph = { x: 400, y: 440, width: 700, height: 80 };
  const p = placeToolbar({ target: heading, canvas, obstructions: [], obstacles: [icon, paragraph], size });
  assert.equal(p.candidate, "above-end");
  assert.equal(coverage(box(p), [icon, paragraph]), 0);
});

test("content above and below a narrow selection sends the toolbar to its side", () => {
  const button = { x: 400, y: 400, width: 120, height: 40 };
  const above = { x: 300, y: 330, width: 700, height: 60 };
  const below = { x: 300, y: 450, width: 700, height: 60 };
  const p = placeToolbar({ target: button, canvas, obstructions: [], obstacles: [above, below], size });
  assert.equal(p.candidate, "right");
  assert.equal(p.x, 400 + 120 + 8);
  assert.equal(intersect(box(p), button), null);
});

test("when every spot covers content it docks in a strip along the top of the canvas, under the site's bar", () => {
  const target = { x: 300, y: 400, width: 940, height: 60 };
  const text = [{ x: 260, y: 300, width: 1008, height: 96 }, { x: 260, y: 468, width: 1008, height: 120 }];
  const p = placeToolbar({ target, canvas, obstructions: [], obstacles: text, size });
  assert.equal(p.candidate, "docked");
  assert.deepEqual({ x: p.x, y: p.y, width: p.width }, { x: canvas.x, y: canvas.y, width: canvas.width });
  const under = placeToolbar({ target, canvas, obstructions: [nav], obstacles: text, size });
  assert.equal(under.candidate, "docked");
  assert.equal(under.y, nav.y + nav.height, "the site's own menu stays visible");
});

test("a docked toolbar moves to the bottom edge when the selection is at the top", () => {
  const target = { x: 300, y: 80, width: 940, height: 60 };
  const text = [{ x: 260, y: 148, width: 1008, height: 200 }];
  const p = placeToolbar({ target, canvas, obstructions: [], obstacles: text, size });
  assert.equal(p.candidate, "docked");
  assert.equal(p.y, canvas.y + canvas.height - size.height);
  assert.equal(intersect(box(p), target), null);
});

test("grazing a descender does not count as covering content", () => {
  const target = { x: 400, y: 400, width: 500, height: 60 };
  const lineAbove = { x: 400, y: 314, width: 300, height: 40 };
  const p = placeToolbar({ target, canvas, obstructions: [], obstacles: [lineAbove], size });
  assert.equal(p.candidate, "above-start");
});

test("a selection taller than the canvas gets the toolbar pinned under the header", () => {
  const target = { x: 260, y: 20, width: 1008, height: 2000 };
  const p = placeToolbar({ target, canvas, obstructions: [nav], size });
  assert.equal(p.candidate, "pinned");
  assert.equal(p.y, nav.y + nav.height + 8);
});

test("an offscreen selection reports which way it went, sideways included", () => {
  assert.deepEqual(placeToolbar({ target: { x: 400, y: -500, width: 100, height: 40 }, canvas, obstructions: [], size }), { kind: "offscreen", direction: "above" });
  assert.deepEqual(placeToolbar({ target: { x: 400, y: 2000, width: 100, height: 40 }, canvas, obstructions: [], size }), { kind: "offscreen", direction: "below" });
  assert.deepEqual(placeToolbar({ target: { x: -300, y: 300, width: 100, height: 40 }, canvas, obstructions: [], size }), { kind: "offscreen", direction: "left" });
  assert.deepEqual(placeToolbar({ target: { x: 1400, y: 300, width: 100, height: 40 }, canvas, obstructions: [], size }), { kind: "offscreen", direction: "right" });
});

test("while scrolling it keeps its side as long as that side stays clear", () => {
  const target = { x: 400, y: 300, width: 500, height: 60 };
  const first = placeToolbar({ target, canvas, obstructions: [], size, previous: "below-start" });
  assert.equal(first.candidate, "below-start");
  const covered = placeToolbar({ target, canvas, obstructions: [], obstacles: [{ x: 400, y: 368, width: 500, height: 40 }], size, previous: "below-start" });
  assert.equal(covered.candidate, "above-start", "a side that now covers words is given up");
  const docked = placeToolbar({ target, canvas, obstructions: [], size, previous: "docked" });
  assert.equal(docked.candidate, "above-start", "a fallback spot is not sticky");
});

/* Fitting the toolbar row to the canvas. Widths measured from "Tell me more" in the Agency demo. */

const buttonRow = collapseOrder([
  { key: "edit-text", width: 90, detail: 0 },
  { key: "link", width: 170, detail: 110 },
  { key: "style", width: 71, detail: 0 },
  { key: "banner-photo", width: 172, detail: 0 },
  { key: "background", width: 115, detail: 0 },
]);
const crumbAndChrome = 75 + 10;
const rowWidth = crumbAndChrome + 90 + 170 + 71 + 172 + 115;
const more = 46;

test("a button's toolbar wider than the 640 px cap moves its last action into More and keeps the link's destination", () => {
  const fit = fitRow({ width: rowWidth, available: TOOLBAR_MAX_WIDTH, order: buttonRow, more, hasMore: false });
  assert.deepEqual(fit, { collapsed: ["background"], fits: true });
});

test("in the phone view the row gives up actions, then the link's destination, until it fits the phone", () => {
  const fit = fitRow({ width: rowWidth, available: 300, order: buttonRow, more, hasMore: false });
  assert.deepEqual(fit.collapsed, ["background", "banner-photo", "style", "link:detail"]);
  assert.equal(fit.fits, true);
  const left = rowWidth - 115 - 172 - 71 - 110 + more;
  assert.ok(left <= 300, `${left} px fits a 300 px phone`);
});

test("a row that already fits keeps everything and adds no More", () => {
  assert.deepEqual(fitRow({ width: 400, available: 640, order: buttonRow, more, hasMore: false }), { collapsed: [], fits: true });
});

test("More is paid for once, and not at all when the row already shows it", () => {
  const order = [{ key: "a", width: 40, into: "more" }, { key: "b", width: 40, into: "more" }];
  assert.deepEqual(fitRow({ width: 200, available: 150, order, more: 30, hasMore: false }).collapsed, ["a", "b"], "200 - 40 + 30 = 190 still too wide, so b goes too");
  assert.deepEqual(fitRow({ width: 200, available: 150, order, more: 30, hasMore: true }).collapsed, ["a", "b"], "230 - 80 = 150");
  assert.deepEqual(fitRow({ width: 160, available: 150, order: [{ key: "label", width: 80, into: "drop" }], more: 30, hasMore: false }), { collapsed: ["label"], fits: true }, "dropping a label adds no More");
});

test("a canvas narrower than the shortest row is reported, so the toolbar wraps instead of spilling out", () => {
  const fit = fitRow({ width: rowWidth, available: 100, order: buttonRow, more, hasMore: false });
  assert.equal(fit.fits, false);
  assert.equal(fit.collapsed.length, buttonRow.length);
});

test("an action with a detail loses the detail before it moves into More", () => {
  assert.deepEqual(collapseOrder([{ key: "a", width: 50, detail: 0 }, { key: "link", width: 170, detail: 110 }, { key: "b", width: 60, detail: 0 }]), [
    { key: "b", width: 60, into: "more" },
    { key: "link:detail", width: 110, into: "drop" },
    { key: "link", width: 60, into: "more" },
    { key: "a", width: 50, into: "more" },
  ]);
});
