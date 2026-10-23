import assert from "node:assert/strict";
import { test } from "node:test";

import { VIEW_KEY, arrange, createOutcome, featured, matches, projectRequest, readView, resultLine, writeView } from "../../assets/static/js/dashboard.js";

const DAY = 86_400_000;
const sites = [
  { pid: "a", name: "Harbor Bakery", addresses: ["harbor-bakery.sites.example", "harborbakery.com"], status: "published", edited: 10 * DAY },
  { pid: "b", name: "Agency", addresses: ["agency.sites.example"], status: "changes", edited: 30 * DAY },
  { pid: "c", name: "Café Lune", addresses: ["cafe-lune.sites.example"], status: "draft", edited: 20 * DAY },
  { pid: "d", name: "agency 2", addresses: ["agency-2.sites.example"], status: "offline", edited: 5 * DAY },
  { pid: "e", name: "Studio 10", addresses: ["studio-10.sites.example"], status: "changes", edited: 1 * DAY },
  { pid: "f", name: "Studio 9", addresses: ["studio-9.sites.example"], status: "published", edited: 10 * DAY },
];
const pids = (list) => list.map((s) => s.pid);
const recent = { text: "", sort: "recent" };

test("search finds websites by any part of the name, ignoring case and accents", () => {
  assert.deepEqual(pids(arrange(sites, { ...recent, text: "BAKERY" })), ["a"]);
  assert.deepEqual(pids(arrange(sites, { ...recent, text: "cafe" })), ["c"]);
  assert.deepEqual(pids(arrange(sites, { ...recent, text: "  " })).length, sites.length);
});

test("search matches the Rótulo address and verified domains, even pasted as a URL", () => {
  assert.deepEqual(pids(arrange(sites, { ...recent, text: "harborbakery.com" })), ["a"]);
  assert.deepEqual(pids(arrange(sites, { ...recent, text: "https://cafe-lune.sites.example/" })), ["c"]);
  assert.equal(matches(sites[0], "sites.example"), true);
});

test("every typed word has to match, so adding words narrows the list", () => {
  assert.deepEqual(pids(arrange(sites, { ...recent, text: "agency" })), ["b", "d"]);
  assert.deepEqual(pids(arrange(sites, { ...recent, text: "agency 2" })), ["d"]);
  assert.deepEqual(pids(arrange(sites, { ...recent, text: "bakery lune" })), []);
});

test("last edited puts the newest first and breaks ties by name", () => {
  assert.deepEqual(pids(arrange(sites, recent)), ["b", "c", "a", "f", "d", "e"]);
});

test("name order ignores case and counts numbers naturally", () => {
  assert.deepEqual(pids(arrange(sites, { text: "", sort: "name" })), ["b", "d", "c", "a", "f", "e"]);
});

test("publishing status puts unpublished changes first, then live, offline and never published", () => {
  assert.deepEqual(pids(arrange(sites, { text: "", sort: "status" })), ["b", "e", "a", "f", "d", "c"]);
});

test("arranging never reorders the caller's list", () => {
  const copy = sites.slice();
  arrange(copy, { text: "", sort: "name" });
  assert.deepEqual(copy, sites);
});

test("only the newest website gets the wide card, and only in the grid's natural order", () => {
  const shown = arrange(sites, recent);
  assert.equal(featured(shown, sites.length, recent, "grid"), "b");
  assert.equal(featured(shown, sites.length, recent, "list"), null);
  assert.equal(featured(shown, sites.length, { text: "", sort: "name" }, "grid"), null);
  assert.equal(featured(arrange(sites, { ...recent, text: "studio" }), sites.length, { ...recent, text: "studio" }, "grid"), null);
  assert.equal(featured(shown.slice(0, 1), 1, recent, "grid"), null);
});

test("the result line counts what a search shows out of every website", () => {
  assert.equal(resultLine(6, 6, ""), "6 websites");
  assert.equal(resultLine(2, 6, "agency"), "2 of 6 websites");
  assert.equal(resultLine(0, 6, " zzz "), "0 of 6 websites");
  assert.equal(resultLine(1, 1, "x"), "1 of 1 website");
});

test("the grid or list choice is remembered, and broken storage falls back to the grid", () => {
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  assert.equal(readView(storage), "grid");
  writeView(storage, "list");
  assert.equal(store.get(VIEW_KEY), "list");
  assert.equal(readView(storage), "list");
  store.set(VIEW_KEY, "<script>");
  assert.equal(readView(storage), "grid");
  const blocked = { getItem: () => { throw new Error("SecurityError"); }, setItem: () => { throw new Error("QuotaExceededError"); } };
  assert.equal(readView(blocked), "grid");
  assert.doesNotThrow(() => writeView(blocked, "list"));
  assert.equal(readView(null), "grid");
});

test("the view script reads the same storage key the dashboard writes", async () => {
  const { readFile } = await import("node:fs/promises");
  const script = await readFile(new URL("../../assets/static/js/dashboard-view.js", import.meta.url), "utf8");
  const root = { dataset: {} };
  new Function("window", "document", script)({ localStorage: { getItem: (k) => (k === VIEW_KEY ? "list" : null) } }, { documentElement: root });
  assert.equal(root.dataset.dashView, "list");
});

test("create and duplicate send same-origin JSON, with the name trimmed or left out", () => {
  const create = projectRequest({ name: "  My bakery " });
  assert.equal(create.method, "POST");
  assert.equal(create.credentials, "same-origin");
  assert.equal(create.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(create.body), { name: "My bakery" });
  assert.deepEqual(JSON.parse(projectRequest({}).body), {});
});

test("create and duplicate answers map to what the dashboard does next", () => {
  const failure = "We couldn't create the website.";
  assert.deepEqual(createOutcome(201, { pid: "p1", name: "My bakery" }, failure), { kind: "created", pid: "p1", name: "My bakery" });
  assert.equal(createOutcome(201, { pid: 7 }, failure).kind, "failed");
  assert.deepEqual(createOutcome(401, null, failure), { kind: "signed_out" });
  assert.deepEqual(
    createOutcome(422, { error: "not_allowed", message: "You can have up to 25 websites." }, failure),
    { kind: "failed", message: "You can have up to 25 websites." },
  );
  assert.match(createOutcome(404, null, failure).message, /no longer exists/);
  assert.deepEqual(createOutcome(500, "<html>", failure), { kind: "failed", message: failure });
});

test("flash and focus hints are best effort when session storage is blocked", async (t) => {
  const { flash, recall, remember } = await import("../../assets/static/js/app.js");
  const previous = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  t.after(() => (previous ? Object.defineProperty(globalThis, "sessionStorage", previous) : delete globalThis.sessionStorage));

  const store = new Map();
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: {
    getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k),
  } });
  remember("ph.dashboard.focus", "p1");
  assert.equal(recall("ph.dashboard.focus"), "p1");
  assert.equal(recall("ph.dashboard.focus"), null, "a hint is used once");

  const fail = () => { throw new Error("SecurityError"); };
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: { getItem: fail, setItem: fail, removeItem: fail } });
  assert.doesNotThrow(() => flash("Harbor Bakery copy is ready."));
  assert.doesNotThrow(() => remember("ph.dashboard.focus", "p1"));
  assert.equal(recall("ph.dashboard.focus"), null);

  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, get: fail });
  assert.doesNotThrow(() => flash("x"));
  assert.equal(recall("ph.flash"), null);
});
