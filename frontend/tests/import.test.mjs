import assert from "node:assert/strict";
import { test } from "node:test";
import { inspectZip as inspectArchive, classifyIndex, zipDirectory, SOURCE_ONLY, editorDestination, outcome, summary } from "../../assets/static/js/import.js";

// Small stored ZIPs exercise the actual central and local headers, without a ZIP library.
function zip(files, comment = "") {
  const encoder = new TextEncoder();
  const local = [], central = [];
  function field(out, value, size) {
    for (let i = 0; i < size; i++) out.push((value >>> (8 * i)) & 255);
  }
  for (const [path, text] of files) {
    const name = encoder.encode(path), body = encoder.encode(text), offset = local.length;
    field(local, 0x04034b50, 4);
    for (const n of [20, 0, 0, 0, 0]) field(local, n, 2);
    field(local, 0, 4); // CRC is the server's responsibility.
    field(local, body.length, 4); field(local, body.length, 4);
    field(local, name.length, 2); field(local, 0, 2);
    local.push(...name, ...body);
    field(central, 0x02014b50, 4);
    for (const n of [20, 20, 0, 0, 0, 0]) field(central, n, 2);
    field(central, 0, 4); field(central, body.length, 4); field(central, body.length, 4);
    for (const n of [name.length, 0, 0, 0, 0]) field(central, n, 2);
    field(central, 0, 4); field(central, offset, 4);
    central.push(...name);
  }
  const bytes = [...local, ...central];
  field(bytes, 0x06054b50, 4);
  for (const n of [0, 0, files.length, files.length]) field(bytes, n, 2);
  field(bytes, central.length, 4); field(bytes, local.length, 4);
  const note = encoder.encode(comment);
  field(bytes, note.length, 2); bytes.push(...note);
  return Uint8Array.from(bytes).buffer;
}

// Node has no DOMParser. ZIP tests supply parsed summaries; import-browser.mjs
// exercises the real parser, selectors and hostile HTML in a browser.
const ready = { moduleScript: false, emptyRoot: false, sourceScript: false };
const moduleRoot = { moduleScript: true, emptyRoot: true, sourceScript: false };
const summaries = new Map();
function inspectZip(bytes) {
  return inspectArchive(bytes, (html) => {
    assert.ok(summaries.has(html), `Missing parsed fixture: ${html}`);
    return summaries.get(html);
  });
}
const shell = '<html><body><div id="root"></div><script type="module" src="/assets/app.js"></script></body></html>';
summaries.set("<h1>Café</h1>", ready);
summaries.set("<h1>Built</h1>", ready);
summaries.set(shell, moduleRoot);
summaries.set(shell.replace("/assets/app.js", "/src/main.tsx"), { ...moduleRoot, sourceScript: true });
summaries.set(shell.replace("/assets/app.js", "/src/app.js"), moduleRoot);
summaries.set('<div id=app></div><script type=module src=app.js></script>', moduleRoot);
summaries.set("<!-- " + shell + " --><h1>Real page</h1>", ready);


test("reads central directory names and stored HTML, including ZIP comments", async () => {
  const bytes = zip([["dist/index.html", "<h1>Café</h1>"], ["package.json", "{}"]], "export");
  assert.deepEqual(zipDirectory(bytes).map((e) => e.name), ["dist/index.html", "package.json"]);
  assert.deepEqual(await inspectZip(bytes), { kind: "ready" });
});

test("source markers without any index show the server's exact refusal", async () => {
  for (const marker of ["package.json", "project/src/App.tsx", "src/App.jsx", "src/App.vue", "src/App.svelte", "vite.config.ts"]) {
    assert.deepEqual(await inspectZip(zip([[marker, "source"]])), { kind: "refused", message: SOURCE_ONLY });
  }
});

test("a Vite source index is refused before upload; a built export stays eligible", async () => {
  const source = shell.replace("/assets/app.js", "/src/main.tsx");
  assert.deepEqual(await inspectZip(zip([["index.html", source], ["src/main.tsx", "source"]])), { kind: "refused", message: SOURCE_ONLY });
  assert.deepEqual(await inspectZip(zip([["index.html", source], ["dist/index.html", "<h1>Built</h1>"], ["package.json", "{}"]])), { kind: "ready" });
  assert.equal((await inspectZip(zip([["index.html", shell.replace("/assets/app.js", "/src/app.js")], ["package.json", "{}"]]))).kind, "warning");
});

test("empty roots with module scripts warn but allow continuation", async () => {
  const check = await inspectZip(zip([["build/index.html", shell]]));
  assert.equal(check.kind, "warning");
  assert.equal((await inspectZip(zip([["index.html", '<div id=app></div><script type=module src=app.js></script>']]))).kind, "warning");
  assert.match(check.message, /only content written in HTML can be edited/);
  assert.deepEqual(await inspectZip(zip([["index.html", "<!-- " + shell + " --><h1>Real page</h1>"]])), { kind: "ready" });
});

test("missing HTML and unreadable archives always allow a server check", async () => {
  for (const bytes of [new ArrayBuffer(0), new ArrayBuffer(25), zip([["about.html", "Hello"]]), zip([["index.html", "ok"]]).slice(0, -1)]) {
    assert.equal((await inspectZip(bytes)).kind, "unsure");
  }
});

test("truncated headers, bad offsets, encryption, ZIP64 and split ZIPs are uncertain", async () => {
  const original = zip([["index.html", "<h1>Ready</h1>"]]);
  const central = zipDirectory(original)[0].offset + 30 + "index.html".length + "<h1>Ready</h1>".length;
  for (const mutate of [
    (v) => v.setUint32(central + 42, 0xfffffffe, true),
    (v) => v.setUint32(central + 20, 0xffffffff, true),
    (v) => v.setUint16(central + 8, 1, true),
    (v) => v.setUint16(central + 10, 99, true),
    (v) => v.setUint16(v.byteLength - 18, 1, true),
    (v) => v.setUint16(central + 28, 65535, true),
    (v) => v.setUint32(0, 0, true),
    (v) => v.setUint8(central + 46, 0xff),
  ]) {
    const bytes = original.slice(0); mutate(new DataView(bytes));
    assert.equal((await inspectZip(bytes)).kind, "unsure");
  }
});

test("only clean reports auto-open the editor, with the welcome hint", () => {
  const result = { editor_url: "/projects/p1", report: { pages: ["index.html"], warnings: [], skipped: [], missing: [] } };
  assert.equal(editorDestination(result), "/projects/p1?welcome=1");
  for (const field of ["warnings", "skipped", "missing"]) {
    assert.equal(editorDestination({ ...result, report: { ...result.report, [field]: ["item"] } }), null);
  }
});

test("parsed index classification preserves source refusal and JavaScript warning precedence", () => {
  assert.deepEqual(classifyIndex({ ...moduleRoot, sourceScript: true }, true, 1), { kind: "refused", message: SOURCE_ONLY });
  assert.equal(classifyIndex({ ...moduleRoot, sourceScript: true }, true, 2).kind, "warning");
  assert.equal(classifyIndex(moduleRoot, false, 1).kind, "warning");
  assert.deepEqual(classifyIndex(ready, false, 1), { kind: "ready" });
});

test("parser failure keeps the uncertain upload fallback", async () => {
  const result = await inspectArchive(zip([["index.html", shell]]), () => { throw new Error("parser unavailable"); });
  assert.deepEqual(result, { kind: "unsure", message: "We couldn't finish the quick check. You can upload anyway and let Rótulo check the files." });
});

test("import success accepts only the same-origin editor page route", (t) => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "location");
  Object.defineProperty(globalThis, "location", { configurable: true, value: { origin: "https://rotulo.example" } });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, "location", previous);
    else delete globalThis.location;
  });
  const success = {
    project: { pid: "p1", name: "Site" },
    report: { pages: ["index.html"], skipped: [], missing: [], warnings: [] },
  };
  for (const editor_url of ["/projects/p1", "/projects/p1?welcome=1"]) {
    assert.equal(outcome(201, { ...success, editor_url }).kind, "done");
  }
  for (const editor_url of ["/\t/evil.example/projects/p1", "//evil.example/projects/p1", "https://evil.example/projects/p1", "/projects/p1/editor", "/login", "http://["]) {
    assert.equal(outcome(201, { ...success, editor_url }).kind, "error", editor_url);
  }
});

test("64 KB hostile HTML reaches summary classification without scanning markup", async () => {
  for (const token of ["<!--", "<script ", "<div id=root "]) {
    const html = '<script type=module></script>' + token.repeat(Math.ceil(65536 / token.length)).slice(0, 65536);
    let parsed = false;
    const start = performance.now();
    const result = await inspectArchive(zip([["index.html", html]]), (input) => {
      assert.equal(input, html);
      parsed = true;
      return { ...ready, moduleScript: true };
    });
    assert.equal(parsed, true);
    assert.deepEqual(result, { kind: "ready" });
    assert.ok(performance.now() - start < 2000, "preflight must finish within 2 seconds");
  }
});


test("limited imports never claim generated content is ready to edit or auto-open", () => {
  const report = { editability: "limited", pages: ["index.html"], warnings: [], skipped: [], missing: [] };
  assert.match(summary(report), /limited visual editing/);
  assert.doesNotMatch(summary(report), /ready to edit/);
  assert.equal(editorDestination({ editor_url: "/projects/p1", report }), null);
});
