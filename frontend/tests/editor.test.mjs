import assert from "node:assert/strict";
import { test } from "node:test";

import { pageLabel, slugify } from "../../assets/static/js/editor/sidebar.js";
import { createStore, initialState, pagePath } from "../../assets/static/js/editor/state.js";
import { relativeHref } from "../../assets/static/js/editor/toolbar.js";

const bootstrap = {
  project: { pid: "p1", name: "Harbor Bakery", slug: "harbor", revision: 3, site_url: "http://harbor.sites.localhost:5150", live_release: null },
  pages: [{ path: "about.html", title: "Our story | Harbor Bakery" }, { path: "index.html", title: "Harbor Bakery" }],
  preview_origin: "http://tok.preview.localhost:5150",
  history: { can_undo: false, can_redo: false, undo_label: null, redo_label: null },
  draft_changed_since_publish: true,
  limits: { image_bytes: 8388608 },
};

test("preview paths map to draft pages", () => {
  assert.equal(pagePath("/"), "index.html");
  assert.equal(pagePath("/menu.html"), "menu.html");
  assert.equal(pagePath("/blog/"), "blog/index.html");
  assert.equal(pagePath("/our%20story.html"), "our story.html");
});

test("links between pages are relative to the page being edited", () => {
  assert.equal(relativeHref("index.html", "menu.html"), "menu.html");
  assert.equal(relativeHref("blog/post.html", "index.html"), "../index.html");
  assert.equal(relativeHref("index.html", "blog/post.html"), "blog/post.html");
  assert.equal(relativeHref("blog/a.html", "blog/b.html"), "b.html");
  assert.equal(relativeHref("a/b/c.html", "a/d.html"), "../d.html");
});

test("page names become web-safe file names", () => {
  assert.equal(slugify("Summer Offers!"), "summer-offers");
  assert.equal(slugify("Café & Crème"), "cafe-creme");
  assert.equal(slugify("***"), "");
});

test("page labels drop the website name", () => {
  assert.equal(pageLabel({ path: "about.html", title: "Our story | Harbor Bakery" }, "Harbor Bakery"), "Our story");
  assert.equal(pageLabel({ path: "index.html", title: "Anything" }, "Harbor Bakery"), "Home");
  assert.equal(pageLabel({ path: "faq.html", title: "" }, "Harbor Bakery"), "faq");
});

test("the editor opens the home page and tracks saves", () => {
  const store = createStore(initialState(bootstrap, 0));
  assert.equal(store.get().path, "index.html");
  store.dispatch({ type: "save_queued" });
  store.dispatch({ type: "save_queued" });
  assert.equal(store.get().pending, 2);
  store.dispatch({ type: "save_ok", revision: 4, history: { ...bootstrap.history, can_undo: true }, draftChanged: true });
  store.dispatch({ type: "save_failed", message: "Not saved" });
  const s = store.get();
  assert.equal(s.pending, 0);
  assert.equal(s.project.revision, 4);
  assert.equal(s.saveError, "Not saved");
  assert.ok(s.history.can_undo);
});

test("scrolling moves the toolbar target with the selection", () => {
  const store = createStore(initialState(bootstrap, 0));
  const rect = { x: 0, y: 100, width: 10, height: 10 };
  store.dispatch({ type: "selected", selection: { element: "t", can: "ts", tag: "h1", hasParent: true, rect, info: {} } });
  store.dispatch({ type: "viewport", scrollY: 50, rect: { ...rect, y: 50 } });
  assert.equal(store.get().focus.selection.rect.y, 50);
  assert.equal(store.get().scrollY, 50);
  store.dispatch({ type: "mode", mode: "preview" });
  assert.equal(store.get().focus.kind, "none");
});
