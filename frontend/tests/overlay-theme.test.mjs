import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { OVERLAY, OVERLAY_TOKENS } from "../../assets/static/js/overlay-theme.js";

const css = readFileSync(new URL("../../assets/static/css/app.css", import.meta.url), "utf8");
const root = css.slice(css.indexOf(":root {"), css.indexOf("}", css.indexOf(":root {")));

function token(name, depth = 0) {
  const match = new RegExp(`${name}:\\s*([^;]+);`).exec(root);
  assert.ok(match, `${name} is defined in app.css`);
  const value = match[1].trim();
  const alias = /^var\((--[\w-]+)\)$/.exec(value);
  return alias && depth < 4 ? token(alias[1], depth + 1) : value;
}

const normalize = (value) => value.toLowerCase().replace(/\s+/g, "");

test("the agent's overlay colours match the app's tokens", () => {
  for (const [key, name] of Object.entries(OVERLAY_TOKENS)) {
    assert.equal(normalize(OVERLAY[key]), normalize(token(name)), `${key} mirrors ${name}`);
  }
});
