import assert from "node:assert/strict";
import { test } from "node:test";

import { stepForKey } from "../../assets/static/js/marketing.js";

test("arrow keys move through the demo steps and wrap at both ends", () => {
  assert.equal(stepForKey("ArrowRight", 0, 5), 1);
  assert.equal(stepForKey("ArrowDown", 4, 5), 0);
  assert.equal(stepForKey("ArrowLeft", 0, 5), 4);
  assert.equal(stepForKey("ArrowUp", 2, 5), 1);
});

test("Home and End jump to the first and last step, other keys do nothing", () => {
  assert.equal(stepForKey("Home", 3, 5), 0);
  assert.equal(stepForKey("End", 1, 5), 4);
  assert.equal(stepForKey("Enter", 2, 5), null);
  assert.equal(stepForKey("a", 2, 5), null);
});
