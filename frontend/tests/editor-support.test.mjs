import assert from "node:assert/strict";
import { test } from "node:test";

globalThis.document = { querySelector: () => null, getElementById: () => null };
globalThis.window = { setTimeout, clearTimeout, addEventListener() {}, removeEventListener() {} };

const { STYLE_KEYS } = await import("../../assets/static/js/protocol.js");
const { createEdits } = await import("../../assets/static/js/editor/edits.js");
const { LAYOUT_STYLE_KEYS, LEGACY_EDIT_SUPPORT, canEditStructure, editSupportOf, initialState, panelApplies, reduce, supportsStyles } =
  await import("../../assets/static/js/editor/state.js");

const legacy = {
  project: { pid: "p1", name: "Harbor", slug: "harbor", revision: 3, site_url: "http://harbor.sites.localhost", live_release: null },
  pages: [{ path: "index.html", title: "Harbor" }],
  preview_origin: "http://tok.preview.localhost",
  history: { can_undo: false, can_redo: false, undo_label: null, redo_label: null },
  draft_changed_since_publish: false,
  limits: { image_bytes: 1 },
  features: { custom_domains: true, editor: null },
};
const current = { ...legacy, features: { custom_domains: true, editor: { style_properties: [...STYLE_KEYS], structural_editing: true } } };

const rect = { x: 0, y: 0, width: 10, height: 10 };
const selection = (overrides = {}) => ({ element: "a", can: "s", tag: "div", kind: "banner", name: "", ancestors: [], rect, info: {}, ...overrides });

test("a server that does not describe its support gets the legacy baseline", () => {
  const support = editSupportOf(legacy);
  assert.equal(support, LEGACY_EDIT_SUPPORT);
  assert.equal(support.styleProperties.size, 11);
  assert.equal(canEditStructure(support), false);
  assert.equal(supportsStyles(support, ["width"]), false);
  assert.equal(editSupportOf({ ...legacy, features: null }), LEGACY_EDIT_SUPPORT);
});

test("a current server's advertised properties and structure editing are used as sent", () => {
  const support = editSupportOf({ ...current, features: { custom_domains: true, editor: { style_properties: ["width", "made-up"], structural_editing: false } } });
  assert.deepEqual([...support.styleProperties], ["width"], "unknown names are dropped");
  assert.equal(canEditStructure(support), false);
  const full = initialState(current, 0).editSupport;
  assert.equal(supportsStyles(full, LAYOUT_STYLE_KEYS), true);
  assert.equal(canEditStructure(full), true);
});

test("Layout is hidden entirely against a legacy server and shown against a current one", () => {
  const sel = selection();
  assert.equal(panelApplies("layout", sel, false, initialState(legacy, 0).editSupport), false);
  assert.equal(panelApplies("layout", sel, false, initialState(current, 0).editSupport), true);
  assert.equal(panelApplies("style", selection({ can: "st" }), false, LEGACY_EDIT_SUPPORT), true);

  const old = reduce(initialState(legacy, 0), { type: "selected", selection: sel });
  assert.equal(reduce(old, { type: "open_panel", panel: "layout" }).surface.kind, "none");
  const fresh = reduce(initialState(current, 0), { type: "selected", selection: sel });
  assert.equal(reduce(fresh, { type: "open_panel", panel: "layout" }).surface.panel, "layout");
});

test("reloading against a server without the support closes an open Layout panel", () => {
  let s = reduce(initialState(current, 0), { type: "selected", selection: selection() });
  s = reduce(s, { type: "open_panel", panel: "layout" });
  s = reduce(s, { type: "bootstrapped", data: legacy });
  assert.equal(s.editSupport, LEGACY_EDIT_SUPPORT);
  assert.deepEqual(s.surface, { kind: "none" });
});

test("a panel stays on the same element when its kind changes, and follows the new kind", () => {
  let s = reduce(initialState(current, 0), { type: "selected", selection: selection() });
  s = reduce(s, { type: "open_panel", panel: "layout" });
  s = reduce(s, { type: "selected", selection: selection({ kind: "card" }) });
  assert.equal(s.surface.panel, "layout");
  assert.equal(s.surface.subject, "card");
  s = reduce(s, { type: "selected", selection: selection({ element: "b", kind: "section" }) });
  assert.deepEqual(s.surface, { kind: "none" }, "another element of another kind still closes it");
});

test("a canvas reload closes selection panels but keeps the page panel", () => {
  let s = reduce(initialState(current, 0), { type: "selected", selection: selection() });
  s = reduce(s, { type: "open_panel", panel: "layout" });
  s = reduce(s, { type: "canvas_loading" });
  assert.deepEqual(s.surface, { kind: "none" });
  s = reduce(s, { type: "open_panel", panel: "page" });
  s = reduce(s, { type: "canvas_loading" });
  assert.equal(s.surface.panel, "page");
});

function edits(data) {
  const sent = [];
  const saved = [];
  const state = reduce(initialState(data, 0), { type: "selected", selection: selection() });
  const store = { get: () => state, dispatch() {}, subscribe() {} };
  const canvas = { send: (m) => sent.push(m), reload() {} };
  const change = async (run) => { saved.push(run); return { revision: 4 }; };
  return { sent, saved, edits: createEdits({ store, canvas, change, undo() {} }) };
}

test("an unsupported style change is refused before any preview or request", async () => {
  const { sent, saved, edits: e } = edits(legacy);
  assert.equal(await e.setStyle(selection(), { width: "auto" }), false);
  assert.deepEqual(sent, []);
  assert.deepEqual(saved, []);
});

test("a supported style change previews and saves", async () => {
  const { sent, saved, edits: e } = edits(current);
  assert.equal(await e.setStyle(selection(), { width: "auto" }), true);
  assert.equal(sent[0].type, "preview_style");
  assert.equal(saved.length, 1);
  const old = edits(legacy);
  assert.equal(await old.edits.setStyle(selection(), { color: "#000" }), true, "legacy properties still work");
});
