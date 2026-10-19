import test from "node:test";
import assert from "node:assert/strict";
import { acceptsCanvasMessage, canvasNavigation } from "../../assets/static/js/editor/canvas-policy.js";

const idle = { path: "index.html", mode: "edit", loading: false, textElement: null };
const text = { type: "text", element: "a", html: "forged" };

test("text needs a parent-started session for that element", () => {
  assert.equal(acceptsCanvasMessage(idle, text), false);
  assert.equal(acceptsCanvasMessage({ ...idle, textElement: "b" }, text), false);
  assert.equal(acceptsCanvasMessage({ ...idle, textElement: "a" }, text), true);
  assert.equal(acceptsCanvasMessage({ ...idle, textElement: "a", loading: true }, text), false);
  assert.equal(acceptsCanvasMessage({ ...idle, textElement: "a", mode: "preview" }, text), false);
});

test("iframe shortcuts cannot drive idle history", () => {
  const shortcut = { type: "shortcut", action: "undo" };
  assert.equal(acceptsCanvasMessage(idle, shortcut), false);
  assert.equal(acceptsCanvasMessage({ ...idle, textElement: "a" }, shortcut), true);
});

test("an editing report cannot create a text session", () => {
  const editing = { type: "editing", element: "a", active: true, formats: { bold: false, italic: false, link: false } };
  assert.equal(acceptsCanvasMessage(idle, editing), false);
  assert.equal(acceptsCanvasMessage({ ...idle, textElement: "b" }, editing), false);
  assert.equal(acceptsCanvasMessage({ ...idle, textElement: "a" }, editing), true);
});

test("ready must match the page the parent is opening, once", () => {
  const ready = { type: "ready", path: "/about.html", title: "forged", description: "", scrollY: 0 };
  assert.equal(acceptsCanvasMessage({ ...idle, loading: true }, ready), false);
  assert.equal(acceptsCanvasMessage({ ...idle, path: "about.html", loading: true }, ready), true);
  assert.equal(acceptsCanvasMessage({ ...idle, path: "about.html" }, ready), false);
  assert.equal(acceptsCanvasMessage({ ...idle, loading: true }, { ...ready, path: "/" }), true);
});

test("finishing an authorized session can save once while switching mode", () => {
  assert.equal(acceptsCanvasMessage({ ...idle, mode: "preview", textElement: "a", finishing: true }, text), true);
  assert.equal(acceptsCanvasMessage({ ...idle, mode: "preview", textElement: "b", finishing: true }, text), false);
});

test("preview navigation resolves only known pages on the preview origin", () => {
  const origin = "https://token.preview.example";
  const pages = [{ path: "index.html" }, { path: "about.html" }, { path: "blog/index.html" }];
  assert.deepEqual(canvasNavigation("/about?x=1#team", origin, "index.html", pages), { path: "about.html", suffix: "?x=1#team" });
  assert.deepEqual(canvasNavigation("/blog/", origin, "index.html", pages), { path: "blog/index.html", suffix: "" });
  assert.deepEqual(canvasNavigation("../about.html", origin, "blog/index.html", pages), { path: "about.html", suffix: "" });
  for (const href of ["https://attacker.example/about.html", "javascript:alert(1)", "/missing.html", "//attacker.example/index.html"]) {
    assert.equal(canvasNavigation(href, origin, "index.html", pages), null);
  }
  assert.equal(acceptsCanvasMessage(idle, { type: "navigate", href: "/about.html" }), false);
  assert.equal(acceptsCanvasMessage({ ...idle, mode: "preview" }, { type: "navigate", href: "/about.html" }), true);
});
