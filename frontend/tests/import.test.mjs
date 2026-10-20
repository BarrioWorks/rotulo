import assert from "node:assert/strict";
import { test } from "node:test";
import { inspectZip, zipDirectory, SOURCE_ONLY, editorDestination } from "../../assets/static/js/import.js";

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

const shell = '<html><body><div id="root"></div><script type="module" src="/assets/app.js"></script></body></html>';

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
  assert.match(check.message, /only edit text and images.*HTML files/);
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
