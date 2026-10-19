import assert from "node:assert/strict";
import { test } from "node:test";

import { frameLayout } from "../../assets/static/js/editor/canvas.js";
import { classifyHref, describeHref, relativeHref } from "../../assets/static/js/editor/links.js";
import { pageLabel, slugify } from "../../assets/static/js/editor/pages.js";
import { colorName, step, SIZES, SPACES } from "../../assets/static/js/editor/panels.js";
import { changeSummary } from "../../assets/static/js/editor/publish.js";
import { createStore, initialState, pagePath, siteState, statusPill } from "../../assets/static/js/editor/state.js";
import { actionsFor, shouldRenderToolbar } from "../../assets/static/js/editor/toolbar.js";

const bootstrap = {
  project: { pid: "p1", name: "Harbor Bakery", slug: "harbor", revision: 3, site_url: "http://harbor.sites.localhost:5150", live_release: null },
  pages: [{ path: "about.html", title: "Our story | Harbor Bakery" }, { path: "index.html", title: "Harbor Bakery" }],
  preview_origin: "http://tok.preview.localhost:5150",
  history: { can_undo: false, can_redo: false, undo_label: null, redo_label: null },
  draft_changed_since_publish: true,
  limits: { image_bytes: 8388608 },
};

const info = { href: null, newTab: false, src: null, alt: null, hidden: false, text: "", styles: {}, bgImage: false, image: null };
const rect = { x: 0, y: 100, width: 10, height: 10 };

function sel(overrides = {}) {
  return { element: "t", can: "ts", tag: "h1", kind: "heading", name: "", ancestors: [], rect, info, ...overrides };
}

function saved(store, { undo = null, redo = null, draftChanged = true, log = "edit" } = {}) {
  store.dispatch({ type: "save_queued" });
  store.dispatch({
    type: "save_ok",
    revision: store.get().project.revision + 1,
    history: { can_undo: undo !== null, can_redo: redo !== null, undo_label: undo, redo_label: redo },
    draftChanged,
    log,
    at: 1,
  });
}

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

test("a link's destination is classified and described in words", () => {
  const pages = ["index.html", "about.html"];
  assert.deepEqual(classifyHref("#services", "index.html", pages), { kind: "anchor", id: "services" });
  assert.deepEqual(classifyHref("about.html#team", "index.html", pages), { kind: "page", path: "about.html", hash: "#team" });
  assert.equal(classifyHref("mailto:a@b.co", "index.html", pages).kind, "email");
  assert.equal(classifyHref("tel:+441234", "index.html", pages).kind, "phone");
  assert.equal(classifyHref("https://example.com", "index.html", pages).kind, "web");
  const s = { ...initialState(bootstrap, 0), anchors: [{ id: "services", name: "Services" }] };
  assert.equal(describeHref("#services", s), "Services section");
  assert.equal(describeHref("about.html", s), "Our story page");
  assert.equal(describeHref("https://www.themesberg.com/x", s), "themesberg.com");
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

test("saves are counted, and a failure keeps its message until the next save lands", () => {
  const store = createStore(initialState(bootstrap, 0));
  assert.equal(store.get().path, "index.html");
  store.dispatch({ type: "save_queued" });
  store.dispatch({ type: "save_queued" });
  assert.equal(store.get().saves.pending, 2);
  store.dispatch({ type: "save_ok", revision: 4, history: { ...bootstrap.history, can_undo: true }, draftChanged: true, log: "edit", at: 1 });
  store.dispatch({ type: "save_failed", message: "Not saved" });
  let s = store.get();
  assert.equal(s.saves.pending, 0);
  assert.equal(s.project.revision, 4);
  assert.deepEqual(s.saves.problem, { kind: "error", message: "Not saved" });
  assert.equal(statusPill(s, false).text, "Not saved");
  saved(store, { undo: "edit text" });
  s = store.get();
  assert.equal(s.saves.problem, null);
});

test("an offline save waits in the queue and the pill says so", () => {
  const store = createStore(initialState(bootstrap, 0));
  store.dispatch({ type: "save_queued" });
  store.dispatch({ type: "save_offline" });
  assert.deepEqual(statusPill(store.get(), true), { tone: "warning", text: "Offline · 1 change waiting", busy: false });
  store.dispatch({ type: "save_ok", revision: 4, history: bootstrap.history, draftChanged: true, log: "edit", at: 1 });
  assert.equal(store.get().saves.problem, null);
});

test("the pill shows saving only once the delay has passed", () => {
  const store = createStore(initialState(bootstrap, 0));
  store.dispatch({ type: "save_queued" });
  assert.equal(statusPill(store.get(), false).text, "Not online yet");
  assert.equal(statusPill(store.get(), true).text, "Saving…");
});

test("unpublished changes are listed from the session's undo labels, and undo removes them", () => {
  const store = createStore(initialState({ ...bootstrap, project: { ...bootstrap.project, live_release: { number: 2, created_at: "2026-10-19T10:00:00Z" } } }, 0));
  saved(store, { undo: "edit text" });
  saved(store, { undo: "image change" });
  assert.equal(statusPill(store.get(), false).text, "2 changes not live");
  saved(store, { undo: "edit text", redo: "image change", log: "undo" });
  assert.equal(statusPill(store.get(), false).text, "1 change not live");
  saved(store, { undo: "image change", log: "redo" });
  assert.deepEqual(store.get().changes.map((c) => c.label), ["edit text", "image change"]);
  assert.deepEqual(changeSummary(store.get()), [{ page: "Home", labels: ["Image change", "Edit text"] }]);
  saved(store, { undo: null, draftChanged: false, log: "undo" });
  assert.deepEqual(store.get().changes, []);
  assert.equal(statusPill(store.get(), false).text, "Live · up to date");
});

test("what visitors see is derived from the live release, the versions and the draft", () => {
  const live = { number: 1, created_at: "2026-10-19T10:00:00Z" };
  const base = { project: { ...bootstrap.project, live_release: null }, releases: [], draftChanged: true, changes: [] };
  assert.deepEqual(siteState(base), { kind: "never" });
  assert.deepEqual(siteState({ ...base, project: { ...base.project, live_release: live }, draftChanged: false }), { kind: "current", live: 1 });
  assert.deepEqual(siteState({ ...base, project: { ...base.project, live_release: live } }), { kind: "changes", live: 1, count: 0 });
  const releases = [{ number: 3 }, { number: 2 }, { number: 1 }];
  assert.deepEqual(siteState({ ...base, project: { ...base.project, live_release: live }, releases }), { kind: "older", live: 1, latest: 3, draftChanged: true });
  assert.equal(statusPill({ ...base, project: { ...base.project, live_release: live }, releases, saves: { pending: 0, problem: null, savedAt: null } }, false).text, "Visitors see version 1");
});

test("a conflict outranks every other state in the pill", () => {
  const s = { ...initialState(bootstrap, 0), saves: { pending: 1, problem: { kind: "conflict" }, savedAt: null } };
  assert.deepEqual(statusPill(s, true), { tone: "error", text: "Changed in another tab", busy: false });
});

test("publishing clears the change list and marks the site current", () => {
  const store = createStore(initialState(bootstrap, 0));
  saved(store, { undo: "edit text" });
  store.dispatch({ type: "published", release: { number: 1, created_at: "2026-10-19T10:00:00Z", live: true, file_count: 3, bytes: 10 } });
  assert.equal(store.get().draftChanged, false);
  assert.equal(statusPill(store.get(), false).text, "Live · up to date");
  saved(store, { undo: "edit text" });
  store.dispatch({ type: "nothing_to_publish" });
  assert.deepEqual(store.get().changes, []);
});

test("scrolling moves the toolbar target with the selection and reports the site's bars", () => {
  const store = createStore(initialState(bootstrap, 0));
  store.dispatch({ type: "selected", selection: sel() });
  store.dispatch({ type: "viewport", scrollY: 50, rect: { ...rect, y: 50 }, obstructions: [{ x: 0, y: 0, width: 1280, height: 72 }] });
  assert.equal(store.get().focus.selection.rect.y, 50);
  assert.equal(store.get().scrollY, 50);
  assert.equal(store.get().obstructions.length, 1);
  store.dispatch({ type: "mode", mode: "preview" });
  assert.equal(store.get().focus.kind, "none");
});

test("a rail panel follows the selection when it applies and returns to the pages otherwise", () => {
  const store = createStore(initialState(bootstrap, 0));
  store.dispatch({ type: "open_panel", panel: "style" });
  assert.equal(store.get().rail.kind, "pages", "style needs a selection");
  store.dispatch({ type: "selected", selection: sel({ element: "a" }) });
  store.dispatch({ type: "open_panel", panel: "style" });
  assert.deepEqual(store.get().rail, { kind: "panel", panel: "style", element: "a", replaced: false });
  store.dispatch({ type: "selected", selection: sel({ element: "b" }) });
  assert.equal(store.get().rail.element, "b");
  store.dispatch({ type: "selected", selection: sel({ element: "c", can: "i", tag: "img", kind: "image" }) });
  assert.equal(store.get().rail.kind, "pages");
  store.dispatch({ type: "open_panel", panel: "page" });
  store.dispatch({ type: "deselected" });
  assert.equal(store.get().rail.panel, "page", "page settings need no selection");
  store.dispatch({ type: "close_panel" });
  assert.equal(store.get().rail.kind, "pages");
});

test("the link panel for selected words closes when text editing ends", () => {
  const store = createStore(initialState(bootstrap, 0));
  store.dispatch({ type: "selected", selection: sel() });
  store.dispatch({ type: "editing", active: true, formats: { bold: false, italic: false, link: false } });
  store.dispatch({ type: "open_panel", panel: "text-link" });
  assert.equal(store.get().rail.panel, "text-link");
  store.dispatch({ type: "editing", active: false, formats: { bold: false, italic: false, link: false } });
  assert.equal(store.get().rail.kind, "pages");
});

test("the toolbar shows at most five labelled actions, then More", () => {
  const heading = actionsFor(sel({ can: "tsb" }));
  assert.deepEqual(heading.primary, ["edit-text", "style", "background"]);
  const hero = actionsFor(sel({ kind: "header", tag: "header", can: "sbxudc", info: { ...info, bgImage: true } }));
  assert.deepEqual(hero, { primary: ["bg-photo"], overflow: ["background"] }, "the demo hero offers its background photo first");
  const image = actionsFor(sel({ kind: "image", tag: "img", can: "isb", ancestors: [{ element: "l", kind: "link", name: "" }] }));
  assert.deepEqual(image.primary, ["replace-image", "description", "parent-link"]);
  const hidden = actionsFor(sel({ kind: "section", tag: "section", can: "sx", info: { ...info, hidden: true } }));
  assert.equal(hidden.primary[0], "show");
  for (const kind of ["heading", "text", "link", "button", "image", "section", "box"]) {
    const { primary } = actionsFor(sel({ kind, can: "tilsbxudc", info: { ...info, bgImage: true, href: "#a" }, ancestors: [{ element: "l", kind: "link", name: "" }] }));
    assert.ok(primary.length <= 5, kind);
  }
});

test("toolbar re-renders when the selection changes even while a field has focus", () => {
  const typing = { force: false, keyChanged: true, selectionChanged: false, fieldFocused: true };
  assert.equal(shouldRenderToolbar(typing), false);
  assert.equal(shouldRenderToolbar({ ...typing, force: true }), true);
  assert.equal(shouldRenderToolbar({ ...typing, selectionChanged: true }), true);
  assert.equal(shouldRenderToolbar({ ...typing, fieldFocused: false }), true);
  assert.equal(shouldRenderToolbar({ ...typing, fieldFocused: false, keyChanged: false }), false);
});

test("the site lays out at 1280 px on a computer and is scaled to fit", () => {
  const fit = frameLayout("desktop", "fit", { width: 1008, height: 700 });
  assert.equal(fit.viewport.width, 1280);
  assert.equal(fit.scale, 1008 / 1280);
  assert.equal(fit.frame.width, 1008);
  assert.equal(Math.round(fit.viewport.height), Math.round(700 / (1008 / 1280)));
  const wide = frameLayout("desktop", "fit", { width: 1500, height: 900 });
  assert.equal(wide.scale, 1);
  assert.equal(wide.viewport.width, 1500);
  const actual = frameLayout("desktop", "actual", { width: 1008, height: 700 });
  assert.equal(actual.scale, 1);
  assert.equal(actual.frame.width, 1280, "actual size scrolls instead of scaling");
});

test("the phone is always 390 by 844 and shrinks as a whole when it does not fit", () => {
  const roomy = frameLayout("mobile", "fit", { width: 1000, height: 900 });
  assert.deepEqual(roomy.viewport, { width: 390, height: 844 });
  assert.equal(roomy.scale, 1);
  const short = frameLayout("mobile", "fit", { width: 1000, height: 700 });
  assert.deepEqual(short.viewport, { width: 390, height: 844 });
  assert.ok(short.scale < 1);
  assert.equal(Math.round(short.frame.height), Math.round(844 * short.scale));
});

test("steppers move through the scale from the nearest step", () => {
  assert.equal(step(SIZES, "16px", 1), "18px");
  assert.equal(step(SIZES, "17px", 1), "18px");
  assert.equal(step(SIZES, "17px", -1), "16px");
  assert.equal(step(SIZES, "96px", 1), "96px");
  assert.equal(step(SPACES, "0px", -1), "0");
  assert.equal(step(SPACES, undefined, 1), "4px");
});

test("swatches get plain colour names", () => {
  assert.equal(colorName("#ffffff"), "white");
  assert.equal(colorName("#000000"), "black");
  assert.equal(colorName("#fed136"), "yellow");
  assert.equal(colorName("#212529"), "dark grey");
});
