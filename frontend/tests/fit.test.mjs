import assert from "node:assert/strict";
import { test } from "node:test";

import { fitBox } from "../../assets/static/js/editor/edits.js";

const frame43 = { width: 356, height: 267 };

test("a wide photo is cropped from its middle to the old picture's 4:3 frame", () => {
  const box = fitBox({ width: 1600, height: 900 }, frame43, "fill");
  assert.ok(Math.abs(box.canvas.width / box.canvas.height - 4 / 3) < 0.01, "same shape as the frame");
  assert.equal(box.canvas.height, 900, "no upscaling, full height kept");
  assert.equal(box.crop.x, (1600 - 1200) / 2, "cropped evenly from both sides");
});

test("showing the whole picture keeps all of it and pads the short side", () => {
  const box = fitBox({ width: 1600, height: 900 }, frame43, "whole");
  assert.ok(Math.abs(box.canvas.width / box.canvas.height - 4 / 3) < 0.01);
  assert.deepEqual(box.draw, { x: 0, y: Math.round((1200 - 900) / 2), width: 1600, height: 900 });
  assert.deepEqual(box.crop, { x: 0, y: 0, width: 1600, height: 900 });
});

test("a picture already the frame's shape is uploaded untouched", () => {
  assert.equal(fitBox({ width: 800, height: 600 }, frame43, "fill"), null);
  assert.equal(fitBox({ width: 800, height: 600 }, { width: 0, height: 0 }, "fill"), null);
});

test("very large results are scaled down to 3200 px on the long side", () => {
  const box = fitBox({ width: 8000, height: 3000 }, frame43, "whole");
  assert.equal(Math.max(box.canvas.width, box.canvas.height), 3200);
});
