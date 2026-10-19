import assert from "node:assert/strict";
import { test } from "node:test";

import {
  envelope,
  isSafeHref,
  isStyleValue,
  parseAgentMessage,
  parseEditorMessage,
} from "../../assets/static/js/protocol.js";

const rect = { x: 10, y: 20, width: 300, height: 40 };
const info = {
  href: "menu.html",
  newTab: false,
  src: null,
  alt: null,
  hidden: false,
  text: "See today's menu",
  styles: { color: "#ffffff", "font-size": "16px" },
};
const select = envelope({ type: "select", element: "w", can: "tls", tag: "a", hasParent: true, rect, info });

test("the editor accepts a well-formed selection from the agent", () => {
  const parsed = parseAgentMessage(select);
  assert.equal(parsed?.type, "select");
  assert.equal(parsed.element, "w");
  assert.deepEqual(parsed.rect, rect);
});

test("messages without the Pagehaven channel or with an unknown type are dropped", () => {
  const { channel: _channel, ...bare } = select;
  assert.equal(parseAgentMessage(bare), undefined);
  assert.equal(parseAgentMessage({ ...select, channel: "other" }), undefined);
  assert.equal(parseAgentMessage(envelope({ type: "publish" })), undefined);
  assert.equal(parseAgentMessage(envelope({ type: "toString" })), undefined);
  assert.equal(parseAgentMessage(envelope({ type: "__proto__" })), undefined);
  for (const junk of [null, undefined, 42, "select", [select]]) assert.equal(parseAgentMessage(junk), undefined);
});

test("element ids must be 1 to 10 lowercase letters or digits", () => {
  for (const element of ["", "W", "a-b", "abcdefghijk", "1 2", 7, null]) {
    assert.equal(parseAgentMessage({ ...select, element }), undefined, `id ${String(element)}`);
  }
  assert.ok(parseAgentMessage({ ...select, element: "0z9" }));
});

test("capabilities, tags and numbers are checked", () => {
  assert.equal(parseAgentMessage({ ...select, can: "tq" }), undefined);
  assert.equal(parseAgentMessage({ ...select, tag: "<img>" }), undefined);
  for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, "10", 1e9]) {
    assert.equal(parseAgentMessage({ ...select, rect: { ...rect, x: bad } }), undefined, `x ${bad}`);
  }
  assert.equal(parseAgentMessage({ ...select, rect: { ...rect, width: -1 } }), undefined);
});

test("strings are length-capped", () => {
  const html = "a".repeat(65536);
  assert.ok(parseAgentMessage(envelope({ type: "text", element: "t", html })));
  assert.equal(parseAgentMessage(envelope({ type: "text", element: "t", html: `${html}a` })), undefined);
  assert.equal(parseAgentMessage({ ...select, info: { ...info, text: "x".repeat(201) } }), undefined);
});

test("shortcut messages only carry undo or redo", () => {
  assert.deepEqual(parseAgentMessage(envelope({ type: "shortcut", action: "redo" })), { type: "shortcut", action: "redo" });
  assert.equal(parseAgentMessage(envelope({ type: "shortcut", action: "publish" })), undefined);
});

test("the agent accepts init with optional scroll and selection", () => {
  assert.deepEqual(parseEditorMessage(envelope({ type: "init", mode: "edit" })), { type: "init", mode: "edit", scrollY: null, select: null });
  assert.deepEqual(parseEditorMessage(envelope({ type: "init", mode: "preview", scrollY: 120, select: "1d" })), {
    type: "init",
    mode: "preview",
    scrollY: 120,
    select: "1d",
  });
  assert.equal(parseEditorMessage(envelope({ type: "init", mode: "design" })), undefined);
});

test("agent and editor messages are not interchangeable", () => {
  assert.equal(parseEditorMessage(select), undefined);
  assert.equal(parseAgentMessage(envelope({ type: "init", mode: "edit" })), undefined);
});

test("style previews accept only the server's properties and values", () => {
  const ok = parseEditorMessage(envelope({ type: "preview_style", element: "t", styles: { color: "#2f5ce0", "font-size": null } }));
  assert.deepEqual(ok?.styles, { color: "#2f5ce0", "font-size": null });
  for (const styles of [
    {},
    { position: "fixed" },
    { color: "red" },
    { color: "#12345" },
    { "background-color": "url(x)" },
    { "font-size": "12px; color: red" },
    { "font-weight": "bold" },
    { "text-align": "middle" },
  ]) {
    assert.equal(parseEditorMessage(envelope({ type: "preview_style", element: "t", styles })), undefined, JSON.stringify(styles));
  }
});

test("style values mirror the server's rules", () => {
  assert.ok(isStyleValue("color", "#fff"));
  assert.ok(isStyleValue("padding-top", "0"));
  assert.ok(isStyleValue("margin-bottom", "1.5rem"));
  assert.ok(isStyleValue("font-weight", "700"));
  assert.ok(!isStyleValue("font-size", "0"));
  assert.ok(!isStyleValue("font-weight", "750"));
  assert.ok(!isStyleValue("padding-left", "-4px"));
});

test("links follow the server's scheme rules", () => {
  for (const href of ["https://example.com", "http://example.com/a?b#c", "mailto:hi@example.com", "tel:+441234", "menu.html", "../index.html", "#order", "/about.html", "?q=1"]) {
    assert.ok(isSafeHref(href), href);
  }
  for (const href of ["javascript:alert(1)", "JavaScript:alert(1)", " javascript:alert(1)", "data:text/html,x", "vbscript:x", "http:example.com", "https:/x", "java\tscript:x", "a b", "\\\\evil", "/\\evil", "", "x".repeat(2049)]) {
    assert.ok(!isSafeHref(href), JSON.stringify(href));
  }
});

test("background image capability survives selection validation", () => {
  assert.equal(parseAgentMessage({ ...select, can: "tilsbxudc" })?.can, "tilsbxudc");
});
