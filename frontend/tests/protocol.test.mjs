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
  bgImage: false,
  anchorLinks: 0,
  image: null,
};
const ancestors = [{ element: "s1", kind: "section", name: "Menu", photo: false }];
const select = envelope({ type: "select", element: "w", can: "tls", tag: "a", kind: "link", name: "See today's menu", ancestors, rect, info, obstacles: [rect] });

test("the editor accepts a well-formed selection from the agent", () => {
  const parsed = parseAgentMessage(select);
  assert.equal(parsed?.type, "select");
  assert.equal(parsed.element, "w");
  assert.deepEqual(parsed.rect, rect);
});

test("messages without the Rótulo channel or with an unknown type are dropped", () => {
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

test("the page cannot ask for undo or redo; inside a text editor those keys stay native", () => {
  assert.equal(parseAgentMessage(envelope({ type: "shortcut", action: "undo" })), undefined);
});

test("the agent accepts init with optional scroll and selection", () => {
  assert.deepEqual(parseEditorMessage(envelope({ type: "init", mode: "edit" })), { type: "init", mode: "edit", scrollY: null, select: null, scale: null });
  assert.deepEqual(parseEditorMessage(envelope({ type: "init", mode: "preview", scrollY: 120, select: "1d", scale: 0.79 })), {
    type: "init",
    mode: "preview",
    scrollY: 120,
    select: "1d",
    scale: 0.79,
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

test("selection kind, name and ancestors are validated", () => {
  assert.equal(parseAgentMessage({ ...select, kind: "widget" }), undefined);
  assert.equal(parseAgentMessage({ ...select, name: "x".repeat(61) }), undefined);
  assert.equal(parseAgentMessage({ ...select, ancestors: Array(9).fill(ancestors[0]) }), undefined);
  assert.equal(parseAgentMessage({ ...select, ancestors: [{ element: "BAD", kind: "section", name: "" }] }), undefined);
  assert.equal(parseAgentMessage({ ...select, ancestors: [{ element: "a", kind: "nav", name: "" }] }), undefined);
  assert.deepEqual(parseAgentMessage(select)?.ancestors, ancestors);
});

test("image metrics are finite numbers in range", () => {
  const image = { naturalWidth: 700, naturalHeight: 525, width: 356, height: 267 };
  assert.deepEqual(parseAgentMessage({ ...select, info: { ...info, image } })?.info.image, image);
  assert.equal(parseAgentMessage({ ...select, info: { ...info, image: { ...image, width: Number.NaN } } }), undefined);
  assert.equal(parseAgentMessage({ ...select, info: { ...info, image: { ...image, width: -1 } } }), undefined);
  assert.equal(parseAgentMessage({ ...select, info: { ...info, bgImage: "yes" } }), undefined);
});

test("the viewport carries at most four obstruction rects", () => {
  const viewport = envelope({ type: "viewport", scrollY: 10, rect: null, obstructions: [rect], obstacles: [] });
  assert.ok(parseAgentMessage(viewport));
  assert.equal(parseAgentMessage({ ...viewport, obstructions: Array(5).fill(rect) }), undefined);
  assert.equal(parseAgentMessage({ ...viewport, obstructions: [{ ...rect, x: Number.POSITIVE_INFINITY }] }), undefined);
});

test("palette colours are six-digit lowercase hex, at most ten", () => {
  assert.deepEqual(parseAgentMessage(envelope({ type: "palette", colors: ["#fed136", "#212529"] }))?.colors, ["#fed136", "#212529"]);
  for (const colors of [["red"], ["#FED136"], ["#fff"], ["url(x)"], Array(11).fill("#000000")]) {
    assert.equal(parseAgentMessage(envelope({ type: "palette", colors })), undefined, JSON.stringify(colors));
  }
});

test("anchor ids are safe fragment names and names are capped", () => {
  assert.ok(parseAgentMessage(envelope({ type: "anchors", items: [{ id: "services", name: "Services" }] })));
  for (const item of [{ id: "1abc", name: "x" }, { id: "a b", name: "x" }, { id: "a\"><x", name: "x" }, { id: "ok", name: "x".repeat(61) }]) {
    assert.equal(parseAgentMessage(envelope({ type: "anchors", items: [item] })), undefined, JSON.stringify(item));
  }
  assert.equal(parseAgentMessage(envelope({ type: "anchors", items: Array(51).fill({ id: "a", name: "a" }) })), undefined);
});

test("blocked clicks may name the editable part around them", () => {
  assert.equal(parseAgentMessage(envelope({ type: "blocked", rect, around: "1k" }))?.around, "1k");
  assert.equal(parseAgentMessage(envelope({ type: "blocked", rect }))?.around, null);
  assert.equal(parseAgentMessage(envelope({ type: "blocked", rect, around: "<b>" })), undefined);
});

test("keyboard selection messages are closed sets", () => {
  for (const direction of ["parent", "child", "next", "prev"]) {
    assert.ok(parseEditorMessage(envelope({ type: "select_relative", direction })));
  }
  assert.equal(parseEditorMessage(envelope({ type: "select_relative", direction: "first" })), undefined);
  assert.equal(parseEditorMessage(envelope({ type: "select_parent" })), undefined, "select_parent was replaced");
  assert.ok(parseEditorMessage(envelope({ type: "select_element", element: "1k" })));
  assert.equal(parseEditorMessage(envelope({ type: "select_element", element: "#x" })), undefined);
  assert.deepEqual(parseEditorMessage(envelope({ type: "reveal", element: "1k", pulse: true })), { type: "reveal", element: "1k", pulse: true });
  assert.equal(parseEditorMessage(envelope({ type: "reveal", element: "1k" })), undefined);
});

test("background previews carry an element and a capped URL", () => {
  assert.ok(parseEditorMessage(envelope({ type: "preview_background", element: "k", src: "http://tok.preview.localhost/images/uploads/a.jpg" })));
  assert.equal(parseEditorMessage(envelope({ type: "preview_background", element: "k", src: "x".repeat(2049) })), undefined);
  assert.equal(parseEditorMessage(envelope({ type: "preview_background", element: "k" })), undefined);
});

test("obstacles around the selection are capped rects", () => {
  assert.equal(parseAgentMessage({ ...select, obstacles: Array(12).fill(rect) })?.obstacles.length, 12);
  assert.equal(parseAgentMessage({ ...select, obstacles: Array(13).fill(rect) }), undefined, "at most twelve");
  assert.equal(parseAgentMessage({ ...select, obstacles: [{ ...rect, width: -4 }] }), undefined);
  assert.equal(parseAgentMessage({ ...select, obstacles: undefined }), undefined, "the field is required");
});

test("banner photos on ancestors must be flagged as booleans", () => {
  assert.equal(parseAgentMessage({ ...select, ancestors: [{ ...ancestors[0], photo: "yes" }] }), undefined);
  assert.equal(parseAgentMessage({ ...select, ancestors: [{ ...ancestors[0], kind: "banner", photo: true }] })?.ancestors[0].kind, "banner");
});

test("the page outline names a heading and at most forty pictures", () => {
  const outline = envelope({ type: "outline", heading: "h1", images: [{ element: "i1", name: "Loaves", src: "https://tok.preview.localhost/a.jpg" }] });
  assert.ok(parseAgentMessage(outline));
  assert.ok(parseAgentMessage({ ...outline, heading: null }));
  assert.equal(parseAgentMessage({ ...outline, heading: "BAD ID" }), undefined);
  assert.equal(parseAgentMessage({ ...outline, images: Array(41).fill(outline.images[0]) }), undefined);
  assert.equal(parseAgentMessage({ ...outline, images: [{ ...outline.images[0], name: "x".repeat(61) }] }), undefined);
});

test("the canvas scale and the interface font are bounded", () => {
  assert.ok(parseEditorMessage(envelope({ type: "scale", scale: 0.79 })));
  assert.equal(parseEditorMessage(envelope({ type: "scale", scale: 0 })), undefined);
  assert.equal(parseEditorMessage(envelope({ type: "scale", scale: Number.NaN })), undefined);
  assert.ok(parseEditorMessage(envelope({ type: "font", data: new ArrayBuffer(46584) })));
  assert.equal(parseEditorMessage(envelope({ type: "font", data: new ArrayBuffer(256 * 1024 + 1) })), undefined, "capped at 256 KB");
  assert.equal(parseEditorMessage(envelope({ type: "font", data: "AAEC" })), undefined, "bytes only");
  assert.equal(parseAgentMessage(envelope({ type: "font", data: new ArrayBuffer(8) })), undefined, "the page cannot send fonts to the app");
});
