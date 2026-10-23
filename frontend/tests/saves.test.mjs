import assert from "node:assert/strict";
import { test } from "node:test";

const listeners = new Map();
globalThis.window = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id),
  addEventListener: (type, fn) => listeners.set(type, fn),
  removeEventListener: (type) => listeners.delete(type),
};

const { ApiError } = await import("../../assets/static/js/editor/api.js");
const { createSaver } = await import("../../assets/static/js/editor/saves.js");
const { createStore, initialState } = await import("../../assets/static/js/editor/state.js");

const bootstrap = {
  project: { pid: "p1", name: "Harbor", slug: "harbor", revision: 3, site_url: "http://harbor.sites.localhost", live_release: null },
  pages: [{ path: "index.html", title: "Harbor" }],
  preview_origin: "http://tok.preview.localhost",
  history: { can_undo: false, can_redo: false, undo_label: null, redo_label: null },
  draft_changed_since_publish: true,
  limits: { image_bytes: 1 },
};

test("a change that fails offline stays queued and lands when the network is back", async () => {
  const store = createStore(initialState(bootstrap, 0));
  const saver = createSaver(store);
  let attempts = 0;
  const done = saver.change(async (base) => {
    attempts += 1;
    if (attempts === 1) throw new ApiError(0, "network", "offline");
    return { revision: base + 1, history: { ...bootstrap.history, can_undo: true, undo_label: "edit text" }, draft_changed_since_publish: true };
  }, { page: "index.html", element: "xyz" });
  await new Promise((r) => setTimeout(r, 10));
  assert.deepEqual(store.get().saves.problem, { kind: "offline" });
  assert.equal(store.get().saves.pending, 1, "the change is still waiting");
  listeners.get("online")?.();
  const result = await done;
  assert.equal(attempts, 2);
  assert.equal(store.get().changes[0].element, "xyz");
  assert.equal(result.revision, 4);
  assert.equal(store.get().saves.pending, 0);
  assert.equal(store.get().saves.problem, null);
  assert.deepEqual(store.get().changes.map((c) => c.label), ["edit text"]);
});

test("later changes wait behind the one being retried, in order", async () => {
  const store = createStore(initialState(bootstrap, 0));
  const saver = createSaver(store);
  const order = [];
  let first = true;
  const a = saver.change(async () => {
    if (first) {
      first = false;
      throw new ApiError(0, "network", "offline");
    }
    order.push("a");
    return null;
  });
  const b = saver.change(async () => {
    order.push("b");
    return null;
  });
  await new Promise((r) => setTimeout(r, 10));
  assert.deepEqual(order, []);
  saver.retryNow();
  await Promise.all([a, b]);
  assert.deepEqual(order, ["a", "b"]);
});

test("a stale retry after a lost answer is a conflict even when the website moved one revision", async () => {
  // Whether the lost attempt landed or not, the server looks the same from here: revision 4.
  const store = createStore(initialState(bootstrap, 0));
  const saver = createSaver(store);
  const sent = [];
  const done = saver.change(async (base) => {
    sent.push(base);
    if (sent.length === 1) throw new ApiError(0, "network", "timed out");
    throw new ApiError(409, "conflict", "stale", 4);
  }, { page: "about.html", element: "abc" });
  await new Promise((r) => setTimeout(r, 10));
  saver.retryNow();
  assert.equal(await done, null);
  assert.deepEqual(sent, [3, 3], "the retry carries the same base revision");
  assert.deepEqual(store.get().saves.problem, { kind: "conflict" });
  assert.deepEqual(store.get().changes, [], "never claimed as saved");
  assert.equal(store.get().project.revision, 3);
});

test("a change that never reached the server is not shown saved when another tab adds one revision", async () => {
  const store = createStore(initialState(bootstrap, 0));
  const saver = createSaver(store);
  let server = 3;
  const sent = [];
  const done = saver.change(async (base) => {
    sent.push(base);
    if (sent.length === 1) {
      // The request dies before reaching the server; meanwhile another tab saves.
      server += 1;
      throw new ApiError(0, "network", "offline");
    }
    if (base !== server) throw new ApiError(409, "conflict", "stale", server);
    server += 1;
    return { revision: server, history: bootstrap.history, draft_changed_since_publish: true };
  }, { page: "index.html", element: "xyz" });
  let laterSent = false;
  const later = saver.change(async () => { laterSent = true; return null; });
  await new Promise((r) => setTimeout(r, 10));
  saver.retryNow();
  assert.equal(await done, null);
  assert.equal(await later, null);
  assert.deepEqual(sent, [3, 3], "sent once more, then stopped");
  assert.equal(server, 4, "only the other tab's revision exists");
  assert.equal(laterSent, false, "the queue stops after the conflict");
  assert.deepEqual(store.get().saves.problem, { kind: "conflict" });
  assert.deepEqual(store.get().changes, []);
  assert.equal(store.get().project.revision, 3);
});

test("a stale retry is still a conflict when someone else moved the website further", async () => {
  const store = createStore(initialState(bootstrap, 0));
  const saver = createSaver(store);
  let attempts = 0;
  const done = saver.change(async () => {
    attempts += 1;
    if (attempts === 1) throw new ApiError(0, "network", "timed out");
    throw new ApiError(409, "conflict", "stale", 6);
  });
  await new Promise((r) => setTimeout(r, 10));
  saver.retryNow();
  assert.equal(await done, null);
  assert.deepEqual(store.get().saves.problem, { kind: "conflict" });
});

test("Retry resends a failed save once through the revision queue", async () => {
  globalThis.document = { getElementById: () => null };
  const store = createStore(initialState(bootstrap, 0));
  const saver = createSaver(store);
  const revisions = [];
  const run = async (base) => {
    revisions.push(base);
    if (revisions.length === 1) throw new ApiError(503, "unavailable", "Try again");
    return { revision: base + 1, history: bootstrap.history, draft_changed_since_publish: true };
  };
  assert.equal(await saver.change(run), null);
  assert.equal(store.get().saves.problem.kind, "error");
  assert.equal(await saver.retryNow(), true);
  assert.deepEqual(revisions, [3, 3]);
  assert.equal(store.get().saves.problem, null);
  assert.equal(store.get().saves.pending, 0);
  assert.equal(await saver.retryNow(), false, "a successful retry is never replayed again");
});
