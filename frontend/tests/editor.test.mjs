import assert from "node:assert/strict";
import { test } from "node:test";

import { frameLayout } from "../../assets/static/js/editor/canvas.js";
import { checkEmail, checkPhone, checkWeb, classifyHref, describeHref, relativeHref } from "../../assets/static/js/editor/links.js";
import { pageLabel, slugify } from "../../assets/static/js/editor/pages.js";
import { arrangementOf, colorName, parseDimension, step, SIZES, SPACES } from "../../assets/static/js/editor/panels.js";
import { changeSummary } from "../../assets/static/js/editor/publish.js";
import { createStore, initialState, pagePath, panelApplies, siteState, statusLine } from "../../assets/static/js/editor/state.js";
import { actionsFor, describeSelection, shouldRenderToolbar } from "../../assets/static/js/editor/toolbar.js";

const bootstrap = {
  project: { pid: "p1", name: "Harbor Bakery", slug: "harbor", revision: 3, site_url: "http://harbor.sites.localhost:5150", live_release: null },
  pages: [{ path: "about.html", title: "Our story | Harbor Bakery" }, { path: "index.html", title: "Harbor Bakery" }],
  preview_origin: "http://tok.preview.localhost:5150",
  history: { can_undo: false, can_redo: false, undo_label: null, redo_label: null },
  draft_changed_since_publish: true,
  limits: { image_bytes: 8388608 },
};

const info = { href: null, newTab: false, src: null, alt: null, hidden: false, text: "", styles: {}, bgImage: false, image: null, anchorLinks: 0 };
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
    page: "index.html",
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
  store.dispatch({ type: "save_ok", revision: 4, history: { ...bootstrap.history, can_undo: true }, draftChanged: true, log: "edit", page: "index.html", at: 1 });
  store.dispatch({ type: "save_failed", message: "Not saved" });
  let s = store.get();
  assert.equal(s.saves.pending, 0);
  assert.equal(s.project.revision, 4);
  assert.deepEqual(s.saves.problem, { kind: "error", message: "Not saved" });
  assert.equal(statusLine(s, false).text, "Couldn't save");
  saved(store, { undo: "edit text" });
  s = store.get();
  assert.equal(s.saves.problem, null);
});

test("an offline save waits in the queue and the pill says so", () => {
  const store = createStore(initialState(bootstrap, 0));
  store.dispatch({ type: "save_queued" });
  store.dispatch({ type: "save_offline" });
  assert.deepEqual(statusLine(store.get(), true), { tone: "warning", text: "Offline: changes will be saved when you're back", save: "Offline: changes will be saved when you're back", publish: null, mark: "problem" });
  store.dispatch({ type: "save_ok", revision: 4, history: bootstrap.history, draftChanged: true, log: "edit", page: "index.html", at: 1 });
  assert.equal(store.get().saves.problem, null);
});

test("the status keeps saying Saved next to the publication state, and shows saving only after the delay", () => {
  const store = createStore(initialState(bootstrap, 0));
  assert.deepEqual(statusLine(store.get(), false), { tone: "neutral", text: "Saved · Not published yet", save: "Saved", publish: "Not published yet", mark: "saved" });
  store.dispatch({ type: "save_queued" });
  assert.equal(statusLine(store.get(), false).text, "Saved · Not published yet", "a quick save never flashes Saving");
  assert.deepEqual(statusLine(store.get(), true), { tone: "neutral", text: "Saving… · Not published yet", save: "Saving…", publish: "Not published yet", mark: "saving" });
  saved(store, { undo: "edit text" });
  store.dispatch({ type: "save_ok", revision: 5, history: bootstrap.history, draftChanged: true, log: "none", page: "index.html", at: 2 });
  assert.equal(statusLine(store.get(), false).save, "Saved");
  assert.equal(statusLine(store.get(), true).save, "Saved", "Saved stays: it does not time out");
});

test("with a live website the status counts what is saved but not published", () => {
  const store = createStore(initialState({ ...bootstrap, project: { ...bootstrap.project, live_release: { number: 1, created_at: "2026-10-19T10:00:00Z" } } }, 0));
  for (const label of ["edit text", "image change", "link change"]) saved(store, { undo: label });
  assert.equal(statusLine(store.get(), false).text, "Saved · 3 changes not published");
  assert.equal(statusLine(store.get(), false).tone, "neutral", "unpublished changes are not a problem");
});

test("the editor's status words never say online or live", () => {
  const live = { number: 2, created_at: "2026-10-19T10:00:00Z" };
  const saves = { pending: 0, problem: null, savedAt: null };
  const base = { project: { ...bootstrap.project, live_release: live }, releases: [], draftChanged: true, changes: [], saves };
  const texts = [
    statusLine({ ...base, project: bootstrap.project }, false).publish,
    statusLine({ ...base, draftChanged: false }, false).publish,
    statusLine(base, false).publish,
    statusLine({ ...base, changes: [{ label: "a", page: "index.html" }, { label: "b", page: "index.html" }, { label: "c", page: "index.html" }] }, false).publish,
    statusLine({ ...base, releases: [{ number: 3 }] }, false).publish,
  ];
  assert.deepEqual(texts, ["Not published yet", "Published", "Changes not published", "3 changes not published", "Visitors see version 2"]);
  for (const t of texts) assert.doesNotMatch(t, /online|live/i);
});

test("unpublished changes are listed from the session's undo labels, and undo removes them", () => {
  const store = createStore(initialState({ ...bootstrap, project: { ...bootstrap.project, live_release: { number: 2, created_at: "2026-10-19T10:00:00Z" } } }, 0));
  saved(store, { undo: "edit text" });
  saved(store, { undo: "image change" });
  assert.equal(statusLine(store.get(), false).publish, "2 changes not published");
  saved(store, { undo: "edit text", redo: "image change", log: "undo" });
  assert.equal(statusLine(store.get(), false).publish, "1 change not published");
  saved(store, { undo: "image change", log: "redo" });
  assert.deepEqual(store.get().changes.map((c) => c.label), ["edit text", "image change"]);
  assert.deepEqual(changeSummary(store.get()), [{ page: "Home", labels: ["Image change", "Edit text"] }]);
  saved(store, { undo: null, draftChanged: false, log: "undo" });
  assert.deepEqual(store.get().changes, []);
  assert.equal(statusLine(store.get(), false).publish, "Published");
});

test("what visitors see is derived from the live release, the versions and the draft", () => {
  const live = { number: 1, created_at: "2026-10-19T10:00:00Z" };
  const base = { project: { ...bootstrap.project, live_release: null }, releases: [], draftChanged: true, changes: [] };
  assert.deepEqual(siteState(base), { kind: "never" });
  assert.deepEqual(siteState({ ...base, project: { ...base.project, live_release: live }, draftChanged: false }), { kind: "current", live: 1 });
  assert.deepEqual(siteState({ ...base, project: { ...base.project, live_release: live } }), { kind: "changes", live: 1, count: 0 });
  const releases = [{ number: 3 }, { number: 2 }, { number: 1 }];
  assert.deepEqual(siteState({ ...base, project: { ...base.project, live_release: live }, releases }), { kind: "older", live: 1, latest: 3, draftChanged: true });
  assert.equal(statusLine({ ...base, project: { ...base.project, live_release: live }, releases, saves: { pending: 0, problem: null, savedAt: null } }, false).publish, "Visitors see version 1");
});

test("a conflict outranks every other state in the pill", () => {
  const s = { ...initialState(bootstrap, 0), saves: { pending: 1, problem: { kind: "conflict" }, savedAt: null } };
  assert.deepEqual(statusLine(s, true), { tone: "error", text: "Reload to check changes", save: "Reload to check changes", publish: null, mark: "problem" });
});

test("publishing clears the change list and marks the site current", () => {
  const store = createStore(initialState(bootstrap, 0));
  saved(store, { undo: "edit text" });
  store.dispatch({ type: "published", release: { number: 1, created_at: "2026-10-19T10:00:00Z", live: true, file_count: 3, bytes: 10 } });
  assert.equal(store.get().draftChanged, false);
  assert.equal(statusLine(store.get(), false).publish, "Published");
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

test("a surface panel follows the selection when it applies and closes otherwise", () => {
  const store = createStore(initialState(bootstrap, 0));
  store.dispatch({ type: "open_panel", panel: "style" });
  assert.equal(store.get().surface.kind, "none", "style needs a selection");
  store.dispatch({ type: "selected", selection: sel({ element: "a" }) });
  store.dispatch({ type: "open_panel", panel: "style" });
  assert.deepEqual(store.get().surface, { kind: "panel", panel: "style", element: "a", subject: "heading", replaced: false });
  store.dispatch({ type: "selected", selection: sel({ element: "b" }) });
  assert.equal(store.get().surface.element, "b");
  store.dispatch({ type: "selected", selection: sel({ element: "c", can: "i", tag: "img", kind: "image" }) });
  assert.equal(store.get().surface.kind, "none");
  store.dispatch({ type: "selected", selection: sel({ element: "d", kind: "heading", can: "tsb" }) });
  store.dispatch({ type: "open_panel", panel: "background" });
  store.dispatch({ type: "selected", selection: sel({ element: "e", kind: "card", tag: "div", can: "sb" }) });
  assert.equal(store.get().surface.kind, "none", "a panel opened for a heading does not stay open for a card");
  store.dispatch({ type: "open_panel", panel: "page" });
  store.dispatch({ type: "deselected" });
  assert.equal(store.get().surface.panel, "page", "page settings need no selection");
  store.dispatch({ type: "close_panel" });
  assert.equal(store.get().surface.kind, "none");
});

test("the link panel for selected words closes when text editing ends", () => {
  const store = createStore(initialState(bootstrap, 0));
  store.dispatch({ type: "selected", selection: sel() });
  store.dispatch({ type: "editing", active: true, formats: { bold: false, italic: false, link: false } });
  store.dispatch({ type: "open_panel", panel: "text-link" });
  assert.equal(store.get().surface.panel, "text-link");
  store.dispatch({ type: "editing", active: false, formats: { bold: false, italic: false, link: false } });
  assert.equal(store.get().surface.kind, "none");
});

test("the toolbar shows at most five labelled actions, then More", () => {
  const heading = actionsFor(sel({ can: "tsb" }));
  assert.deepEqual(heading.primary, ["edit-text", "style", "background", "layout"]);
  const hero = actionsFor(sel({ kind: "header", tag: "header", can: "sbxudc", info: { ...info, bgImage: true } }));
  assert.deepEqual(hero, { primary: ["bg-photo"], overflow: ["layout", "background"] }, "the demo hero offers its background photo first");
  const image = actionsFor(sel({ kind: "image", tag: "img", can: "isb", ancestors: [{ element: "l", kind: "link", name: "", photo: false }] }));
  assert.deepEqual(image.primary, ["replace-image", "description", "parent-link", "layout"], "an image can be resized");
  const hidden = actionsFor(sel({ kind: "section", tag: "section", can: "sx", info: { ...info, hidden: true } }));
  assert.equal(hidden.primary[0], "show");
  for (const kind of ["heading", "text", "link", "button", "image", "banner", "section", "card", "box"]) {
    const { primary } = actionsFor(sel({ kind, can: "tilsbxudc", info: { ...info, bgImage: true, href: "#a" }, ancestors: [{ element: "l", kind: "link", name: "", photo: true }] }));
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

test("the tablet is 834 by 1112 and shrinks as a whole when it does not fit", () => {
  const short = frameLayout("tablet", "fit", { width: 1200, height: 800 });
  assert.deepEqual(short.viewport, { width: 834, height: 1112 }, "the site sees a real tablet width");
  assert.ok(short.scale < 1);
  assert.equal(Math.round(short.frame.width), Math.round(834 * short.scale));
  const actual = frameLayout("tablet", "actual", { width: 1200, height: 800 });
  assert.equal(actual.scale, 1);
  const narrow = frameLayout("tablet", "fit", { width: 500, height: 900 });
  assert.deepEqual(narrow.viewport, { width: 834, height: 1112 }, "a narrow window scales the tablet instead of turning it into a phone");
});

test("typed sizes become values the server accepts, and nonsense is refused", () => {
  assert.equal(parseDimension("width", "320"), "320px", "a bare number is pixels");
  assert.equal(parseDimension("width", " 50 % "), "50%");
  assert.equal(parseDimension("width", "AUTO"), "auto");
  assert.equal(parseDimension("max-width", "0"), "0");
  assert.equal(parseDimension("width", ""), null, "an empty field goes back to the original");
  assert.equal(parseDimension("width", "calc(100% - 1px)"), undefined);
  assert.equal(parseDimension("width", "5000"), undefined, "beyond the server's bounds");
  assert.equal(parseDimension("height", "100vh"), "100vh");
  assert.equal(parseDimension("width", "100vh"), undefined, "screen units only for heights");
  assert.equal(parseDimension("padding-left", "auto"), undefined);
  assert.equal(parseDimension("margin-left", "auto"), "auto");
});

test("the arrangement follows the computed display", () => {
  assert.equal(arrangementOf({ display: "block" }), "block");
  assert.equal(arrangementOf({ display: "flex", "flex-direction": "row" }), "row");
  assert.equal(arrangementOf({ display: "inline-flex", "flex-direction": "column-reverse" }), "column");
  assert.equal(arrangementOf({ display: "grid" }), "grid");
  assert.equal(arrangementOf({}), "block");
});

test("size and layout applies to anything that can be styled", () => {
  assert.equal(panelApplies("layout", sel({ can: "tsb" }), false), true);
  assert.equal(panelApplies("layout", sel({ kind: "image", tag: "img", can: "is" }), false), true);
  assert.equal(panelApplies("layout", sel({ can: "t" }), false), false);
  assert.equal(panelApplies("layout", null, false), false);
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

test("a change is listed under the page it was made on, even after switching pages", () => {
  const store = createStore(initialState(bootstrap, 0));
  store.dispatch({ type: "save_queued" });
  store.dispatch({ type: "open_page", path: "index.html" });
  store.dispatch({ type: "save_ok", revision: 4, history: { ...bootstrap.history, can_undo: true, undo_label: "image change" }, draftChanged: true, log: "edit", page: "about.html", at: 1 });
  assert.deepEqual(changeSummary(store.get()), [{ page: "Our story", labels: ["Image change"] }]);
});

test("text on a banner offers to change the banner's photo, not its own background", () => {
  const banner = { element: "hdr", kind: "banner", name: "Welcome", photo: true };
  const heading = actionsFor(sel({ can: "tsb", ancestors: [banner] }));
  assert.deepEqual(heading.primary.slice(0, 3), ["edit-text", "style", "banner-photo"]);
  const plain = actionsFor(sel({ can: "tsb", ancestors: [{ ...banner, kind: "section", photo: false }] }));
  assert.ok(!plain.primary.includes("banner-photo") && !plain.overflow.includes("banner-photo"));
});

test("screen readers hear a real description, never an empty name", () => {
  const s = initialState(bootstrap, 0);
  const image = (alt, src) => sel({ kind: "image", tag: "img", can: "i", info: { ...info, alt, src } });
  assert.equal(describeSelection(image("Sourdough loaves", "http://tok.preview.localhost/img/a.jpg"), s), "Image selected: Sourdough loaves");
  assert.equal(describeSelection(image("", "http://tok.preview.localhost/img/portfolio%201.jpg"), s), "Image selected: portfolio 1.jpg, a picture without a description");
  assert.equal(describeSelection(image(null, null), s), "Image selected: a picture without a description");
  assert.equal(describeSelection(image("...", "http://tok.preview.localhost/img/1.jpg"), s), "Image selected: 1.jpg, a picture without a description", "a placeholder alt is no description");
  assert.equal(describeSelection(sel({ kind: "link", tag: "a", can: "l", info: { ...info, href: "about.html" } }), s), "Link selected: goes to Our story page");
  assert.equal(describeSelection(sel({ name: "Welcome!" }), s), "Heading selected: Welcome");
  assert.equal(describeSelection(sel({ kind: "box", name: "" }), s), "Box selected");
  assert.equal(describeSelection(sel({ kind: "section", name: "" }), s), "Section selected");
});

test("phone, email and web links are checked before they are saved", () => {
  assert.deepEqual(checkPhone("+44 (20) 1234-5678"), { ok: true, href: "tel:+442012345678" });
  assert.deepEqual(checkPhone("555 0134"), { ok: true, href: "tel:5550134" });
  for (const bad of ["abc", "12", "", "555 0134 ext. 2", "44+20"]) assert.equal(checkPhone(bad).ok, false, bad);
  assert.deepEqual(checkEmail("rosa@harbor-bakery.com"), { ok: true, href: "mailto:rosa@harbor-bakery.com" });
  for (const bad of ["rosa", "rosa@bakery", "rosa @bakery.com", "a@b@c.com", ""]) assert.equal(checkEmail(bad).ok, false, bad);
  assert.deepEqual(checkWeb("harbor-bakery.com/menu"), { ok: true, href: "https://harbor-bakery.com/menu" });
  assert.deepEqual(checkWeb("http://example.com"), { ok: true, href: "http://example.com" });
  for (const bad of ["bakery", "javascript:alert(1)", "ftp://example.com", "two words.com", "name@example.com", ""]) assert.equal(checkWeb(bad).ok, false, bad);
});

test("undo puts away the 'Picture replaced' note and its fit choices", () => {
  const store = createStore(initialState(bootstrap, 0));
  store.dispatch({ type: "selected", selection: sel({ element: "i", kind: "image", tag: "img", can: "i" }) });
  store.dispatch({ type: "open_panel", panel: "image", replaced: true });
  saved(store, { undo: "image change" });
  assert.equal(store.get().surface.replaced, true, "a new save keeps it");
  saved(store, { undo: null, redo: "image change", log: "undo" });
  assert.equal(store.get().surface.replaced, false);
  assert.equal(store.get().surface.panel, "image");
});

test("Edit text starts with short text selected, so typing replaces it, and long paragraphs with the caret at the end", async () => {
  const { startSelection, REPLACE_MAX_CHARS } = await import("../../assets/static/js/agent/text-start.js");
  assert.equal(startSelection("heading", "It's Nice To Meet You"), "all");
  assert.equal(startSelection("button", "Tell Me More"), "all");
  assert.equal(startSelection("text", "Lorem ipsum dolor sit amet consectetur."), "all");
  const paragraph = "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Minima maxime quam architecto quo inventore harum ex magni, dicta impedit.";
  assert.ok(paragraph.length > REPLACE_MAX_CHARS);
  assert.equal(startSelection("text", paragraph), "end");
  assert.equal(startSelection("list-item", paragraph), "end");
  assert.equal(startSelection("heading", paragraph), "all", "a heading is always replaced whole");
  assert.equal(startSelection("text", `  ${"word ".repeat(23)}  \n\n  `), "all", "whitespace does not count");
});

test("reloading the editor's state keeps the page on screen on the origin it was opened from", () => {
  const store = createStore(initialState(bootstrap, 0));
  store.dispatch({ type: "page_ready", path: "index.html", title: "Home", description: "", origin: bootstrap.preview_origin });
  store.dispatch({ type: "bootstrapped", data: { ...bootstrap, preview_origin: "http://fresh.preview.localhost:5150" } });
  assert.equal(store.get().previewOrigin, "http://fresh.preview.localhost:5150", "the next page load uses the new address");
  assert.equal(store.get().canvasOrigin, bootstrap.preview_origin, "the open page keeps its own");
  store.dispatch({ type: "page_ready", path: "index.html", title: "Home", description: "", origin: "http://fresh.preview.localhost:5150" });
  assert.equal(store.get().canvasOrigin, "http://fresh.preview.localhost:5150");
});

test("one Surface replaces any other surface and panels retain their subject", () => {
  const store = createStore(initialState(bootstrap, 0));
  assert.equal(store.get().surface.kind, "none");
  for (const surface of ["pages", "images", "settings", "publish", "none"]) {
    store.dispatch({ type: "open_surface", surface });
    assert.deepEqual(store.get().surface, { kind: surface });
  }
  store.dispatch({ type: "selected", selection: sel() });
  store.dispatch({ type: "open_panel", panel: "style" });
  assert.equal(store.get().surface.kind, "panel");
  store.dispatch({ type: "open_surface", surface: "settings" });
  assert.deepEqual(store.get().surface, { kind: "settings" });
});

test("phone editing uses the real phone viewport at readable actual size", () => {
  for (const width of [320, 390, 599]) {
    const p = frameLayout('mobile', 'fit', { width, height: 540 });
    assert.equal(p.scale, 1);
    assert.equal(p.viewport.width, Math.min(390, width));
    assert.equal(p.viewport.height, 540);
    assert.ok(p.frame.width <= width);
  }
});
