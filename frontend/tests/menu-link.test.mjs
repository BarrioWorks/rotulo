import test from "node:test";
import assert from "node:assert/strict";
import { insertProblem, menuSlot } from "../../assets/static/js/editor/structure.js";
import { actionsFor } from "../../assets/static/js/editor/toolbar.js";

const n = (element, tag, parent, can = "smn") => ({ element, tag, parent, name: "", can });
const listNav = [
  n("body", "body", null, "sn"), n("header", "header", "body", "smnx"), n("logo", "a", "header", "tlsmn"),
  n("nav", "nav", "header"), n("ul", "ul", "nav"),
  n("li1", "li", "ul", "tsmn"), n("a1", "a", "li1", "tlsmn"), n("li2", "li", "ul", "tsmn"), n("a2", "a", "li2", "tlsmn"),
];
const flexNav = [n("body", "body", null, "sn"), n("nav", "nav", "body"), n("f1", "a", "nav", "tlsmn"), n("f2", "a", "nav", "tlsmn")];
const chain = (nodes, id) => {
  const byId = new Map(nodes.map((x) => [x.element, x]));
  const out = [];
  for (let at = byId.get(id); at; at = byId.get(at.parent ?? "")) out.push(at);
  return out;
};

test("a clicked link in a list menu adds a new list item after its own, styled like it", () => {
  assert.deepEqual(menuSlot(listNav, "a1"), { target: "li1", position: "after", like: "li1" });
  assert.deepEqual(menuSlot(listNav, "li2"), { target: "li2", position: "after", like: "li2" });
});

test("a whole menu or list gets a new item after its last", () => {
  assert.deepEqual(menuSlot(listNav, "nav"), { target: "ul", position: "inside", like: "li2" });
  assert.deepEqual(menuSlot(listNav, "ul"), { target: "ul", position: "inside", like: "li2" });
  assert.deepEqual(menuSlot(listNav, "header"), { target: "ul", position: "inside", like: "li2" });
});

test("a row of links gets a link beside the clicked one", () => {
  assert.deepEqual(menuSlot(flexNav, "f1"), { target: "f1", position: "after", like: "f1" });
  assert.deepEqual(menuSlot(flexNav, "nav"), { target: "f2", position: "after", like: "f2" });
});

test("links outside a menu, such as a header logo, are not menu items", () => {
  assert.equal(menuSlot(listNav, "logo"), null);
  assert.equal(menuSlot([n("body", "body", null, "sn"), n("p", "p", "body", "tsmn"), n("x", "a", "p", "tlsmn")], "x"), null);
});

test("inserting inside a link is refused with a reason and After is offered instead", () => {
  const at = chain(listNav, "a1");
  assert.match(insertProblem(at, "link", "inside"), /Before or After/);
  assert.match(insertProblem(at, "paragraph", "inside"), /Before or After/);
  assert.equal(insertProblem(at, "link", "after"), null);
  assert.match(insertProblem(at, "list_item", "after"), /list/);
  assert.equal(insertProblem(chain(listNav, "li1"), "list_item", "after"), null);
  assert.equal(insertProblem(chain(listNav, "ul"), "link", "inside"), null);
});

test("Add menu link shows on menu links only when the server edits structure", () => {
  const sel = { element: "a1", kind: "link", tag: "a", can: "tlsmn", name: "Home", rect: { x: 0, y: 0, width: 1, height: 1 }, ancestors: [], info: { href: "/", alt: null, src: null, hidden: false, bgImage: false } };
  const support = (structuralEditing) => ({ styleProperties: new Set(), structuralEditing });
  assert.ok(actionsFor(sel, support(true), true).primary.includes("menu-link"));
  assert.ok(!actionsFor(sel, support(false), true).primary.includes("menu-link"));
  assert.ok(!actionsFor(sel, support(true), false).primary.includes("menu-link"));
  assert.equal(actionsFor(sel, support(true), true).primary[0], "edit-text");
});

test("the generic Add Link inside a menu uses its list rather than adding beside it", async () => {
  const { readFileSync } = await import('node:fs');
  const { runInNewContext } = await import('node:vm');
  const source = readFileSync(new URL('../../assets/static/js/editor/structure.js', import.meta.url), 'utf8');
  const handler = source.slice(source.indexOf('const add = button('), source.indexOf('const reason =', source.indexOf('const add = button(')));
  const writes = [];
  const context = { button: (_label, action) => action, current: () => listNav.find(n => n.element === 'nav'), problem: () => null,
    kind: () => 'link', position: () => 'inside', menuSlotOf: id => menuSlot(listNav, id), run: edit => writes.push(edit), LISTS: ["ul", "ol", "menu"], };
  runInNewContext(handler + ';globalThis.clickAdd = add;', context);
  context.clickAdd();
  assert.deepEqual(JSON.parse(JSON.stringify(writes)), [{ op: 'insert_element', element: 'ul', position: 'inside', kind: 'link', like: 'li2' }]);
});
