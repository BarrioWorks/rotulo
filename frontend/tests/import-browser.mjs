// Serve the repository root, then run in a browser console:
// await (await import('/frontend/tests/import-browser.mjs')).runImportBrowserChecks()
// Uses the shipped module and the browser's real inert DOMParser; no dependencies.
import { summarizeIndex, classifyIndex, SOURCE_ONLY } from "../../assets/static/js/import.js";

export function runImportBrowserChecks() {
  let checks = 0;
  function equal(actual, expected, label) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
    checks++;
  }
  const ready = { moduleScript: false, emptyRoot: false, sourceScript: false };
  const module = '<script type="module"></script>';
  const cases = [
    ["<h1>Static</h1>", ready],
    ['<!-- <div id=root></div><script type=module src=main.tsx></script> -->', ready],
    ['<script>globalThis.__importScriptExecuted = true</script>', ready],
    ['<script>"<script type=module src=main.tsx>"</script>', ready],
  ];
  for (const id of ["root", "app", "__next"]) {
    cases.push([`<div id="${id}"> \n <!-- placeholder --> </div>${module}`, { ...ready, moduleScript: true, emptyRoot: true }]);
    cases.push([`<div id="${id}"><span>Content</span></div>${module}`, { ...ready, moduleScript: true }]);
  }
  for (const extension of ["ts", "tsx", "jsx", "vue", "svelte"]) {
    for (const suffix of ["", "?v=1", "#main"]) {
      cases.push([`<script src="/main.${extension.toUpperCase()}${suffix}"></script>`, { ...ready, sourceScript: true }]);
    }
  }
  for (const [html, expected] of cases) equal(summarizeIndex(html), expected, html);
  equal(globalThis.__importScriptExecuted, undefined, "scripts stay inert");
  equal(classifyIndex(summarizeIndex('<script src="main.tsx"></script>'), true, 1),
    { kind: "refused", message: SOURCE_ONLY }, "exact source refusal");
  equal(classifyIndex(summarizeIndex(`<div id=root></div>${module}`), false, 1), {
    kind: "warning",
    message: "This website builds its pages in the browser with JavaScript. It will publish and work, but Pagehaven can only edit text and images that are written in its HTML files.",
  }, "exact JavaScript warning");
  for (const token of ["<!--", "<script ", "<div id=root "]) {
    const hostile = token.repeat(Math.ceil(65536 / token.length)).slice(0, 65536);
    // Exercise malformed raw-text scripts from the finding, plus closed scripts
    // so the repeated markup also reaches the HTML tokenizer outside script text.
    for (const prefix of ['<script type=module>', module, `<div id=root></div>${module}`]) {
      const start = performance.now();
      const summary = summarizeIndex(prefix + hostile);
      equal(summary, { ...ready, moduleScript: true, emptyRoot: prefix.startsWith("<div") }, "hostile summary");
      equal(classifyIndex(summary, true, 1).kind, prefix.startsWith("<div") ? "warning" : "ready", "hostile classification");
      if (performance.now() - start >= 2000) throw new Error("64 KB hostile HTML took over 2 seconds");
      checks++;
    }
  }
  return { checks, passed: true };
}
