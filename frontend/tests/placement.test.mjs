import assert from "node:assert/strict";
import { test } from "node:test";

import { collapseOrder, placePanel, fitRow, intersect, placeToolbar, TOOLBAR_MAX_WIDTH } from "../../assets/static/js/editor/placement.js";

const canvas = { x: 260, y: 68, width: 1008, height: 688 };
const size = { width: 300, height: 40 };
const nav = { x: 260, y: 68, width: 1008, height: 74 };

function box(p) {
  return { x: p.x, y: p.y, width: p.width ?? size.width, height: size.height };
}

test("the caption prefers below and starts with the selection", () => {
  const target = { x: 400, y: 400, width: 500, height: 60 };
  const p = placeToolbar({ target, canvas, obstructions: [], size });
  assert.deepEqual(p, { kind: "placed", x: 400, y: 468, candidate: "below-start" });
  assert.equal(intersect(box(p), target), null);
});

test("neighbouring content never changes the preferred side", () => {
  const target = { x: 400, y: 400, width: 500, height: 60 };
  const p = placeToolbar({ target, canvas, obstructions: [nav], obstacles: [{ x: 400, y: 468, width: 500, height: 80 }], size, previous: "above-end" });
  assert.equal(p.candidate, "below-start");
});

test("only the bottom canvas edge flips the caption above", () => {
  const target = { x: 400, y: 710, width: 500, height: 40 };
  const p = placeToolbar({ target, canvas, obstructions: [], size });
  assert.equal(p.candidate, "above-start");
  assert.equal(p.y + size.height, target.y - 8);
  assert.equal(intersect(box(p), target), null);
});

test("the caption stays horizontally inside the visible canvas", () => {
  const p = placeToolbar({ target: { x: 1200, y: 400, width: 60, height: 30 }, canvas, obstructions: [], size });
  assert.ok(p.x + size.width <= canvas.x + canvas.width);
  assert.ok(p.x >= canvas.x);
});

test("offscreen selections report their direction", () => {
  for (const [x, y, direction] of [[400, -500, "above"], [400, 2000, "below"], [-300, 300, "left"], [1400, 300, "right"]]) {
    assert.deepEqual(placeToolbar({ target: { x, y, width: 100, height: 40 }, canvas, obstructions: [], size }), { kind: "offscreen", direction });
  }
});

test("properties sit on the far side of the caption without touching it or the ring", () => {
  const selection = { x: 400, y: 300, width: 500, height: 60 };
  for (const caption of [{ x: 400, y: 368, width: 500, height: 40 }, { x: 400, y: 252, width: 500, height: 40 }]) {
    const p = placePanel({ caption, selection, canvas, size: { width: 320, height: 100 } });
    assert.equal(intersect(p, caption), null);
    assert.equal(intersect(p, selection), null);
  }
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

test("a lower caption flips its Link panel above and keeps every edge in the window", () => {
  const caption = { x: 1100, y: 685, width: 170, height: 40 };
  const p = placePanel({ caption, selection: { x: 500, y: 600, width: 220, height: 69 }, canvas: { x: 0, y: 0, width: 1280, height: 800 }, size: { width: 320, height: 297 } });
  assert.equal(p.y + p.height, caption.y - 8);
  assert.ok(p.x >= 8 && p.x + p.width <= 1272);
  assert.ok(p.y >= 8 && p.y + p.height <= 792);
});

test("an oversized panel scrolls within the roomier side without a minimum-height overflow", () => {
  const p = placePanel({ caption: { x: 8, y: 90, width: 300, height: 40 }, selection: { x: 8, y: 50, width: 100, height: 30 }, canvas: { x: 0, y: 0, width: 390, height: 220 }, size: { width: 500, height: 600 } });
  assert.ok(p.y >= 8 && p.y + p.height <= 212);
  assert.equal(p.width, 374);
  assert.equal(p.height, 74);
});

test("typing tools stay above downward-growing text, or yield when neither side fits", () => {
  for (const height of [60, 150, 320]) {
    const target = { x: 400, y: 300, width: 500, height };
    const p = placeToolbar({ target, canvas, size, editing: true, obstructions: [] });
    assert.equal(p.candidate, "above-start");
    assert.equal(p.y, 252);
    assert.equal(intersect(box(p), target), null);
  }
  assert.deepEqual(placeToolbar({ target: { ...canvas }, canvas, size, editing: true, obstructions: [] }), { kind: "hidden" });
});

test("a full-width top banner puts its caption inside its bottom edge, below the site's navigation", () => {
  const p = placeToolbar({ target: { ...canvas, height: 680 }, canvas, size, obstructions: [nav], banner: true });
  assert.equal(p.candidate, "pinned");
  assert.ok(p.y > nav.y + nav.height);
  assert.ok(p.y + size.height < canvas.y + 680);
});
