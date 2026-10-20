import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { publicationShortcut } from '../../assets/static/js/editor/shortcuts.js';
import { pageLabel } from '../../assets/static/js/editor/pages.js';

const source = readFileSync(new URL('../../assets/static/js/editor/toolbar.js', import.meta.url), 'utf8');
test('caption reconciliation puts reused buttons in visible DOM order and preserves the roving focus', () => {
  class Button {
    constructor(key) { this.dataset = { key }; this.hidden = false; this.attributes = []; this.childNodes = []; }
    hasAttribute() { return false; }
    replaceChildren() {}
  }
  const persistent = new Map(['background', 'more', 'edit-text', 'style', 'banner-photo'].map(k => [k, new Button(k)]));
  const children = [...persistent.values()];
  const actionHost = { append(node) { const i = children.indexOf(node); if (i >= 0) children.splice(i, 1); children.push(node); } };
  const order = ['edit-text', 'style', 'banner-photo', 'background', 'more'];
  const block = source.slice(source.indexOf('for (const b of persistent.values())'), source.indexOf('position(s, false);'));
  vm.runInNewContext(`if (true) { ${block}`, { persistent, actionHost, fresh: order.map(k => new Button(k)), HTMLButtonElement: Button, focusedKey: 'style', buttons: () => children.filter(b => !b.hidden) });
  assert.deepEqual(children.filter(b => !b.hidden).map(b => b.dataset.key), order);
  assert.deepEqual(children.filter(b => b.tabIndex === 0).map(b => b.dataset.key), ['style']);
});

test('publish and history shortcuts accept Ctrl and Cmd and require Shift', () => {
  for (const modifier of ['ctrlKey', 'metaKey']) {
    for (const [key, route] of [['P', 'review'], ['h', 'history']]) {
      const event = { key, ctrlKey: false, metaKey: false, shiftKey: true, [modifier]: true };
      assert.equal(publicationShortcut(event), route);
      assert.equal(publicationShortcut({ ...event, shiftKey: false }), null);
    }
  }
  assert.equal(publicationShortcut({ key: 'p', ctrlKey: false, metaKey: false, shiftKey: true }), null);
});

test('page labels recognize imported branding after a rename and reload', () => {
  const pages = [{ path: 'index.html', title: 'Northwind Studio | Brand and product design' }, { path: 'about.html', title: 'The studio | Northwind Studio' }];
  assert.equal(pageLabel(pages[1], 'Northwind Renamed', pages), 'The studio');
  assert.equal(pageLabel({ path: 'a.html', title: 'Hours | Locations' }, 'Bakery', pages), 'Hours · Locations');
});


test('the touch bar reserves two fixed 44 px rows before scripts run', () => {
  const css = readFileSync(new URL('../../assets/static/css/editor.css', import.meta.url), 'utf8');
  const heights = [...css.matchAll(/--studio-bottom-height:\s*calc\((\d+)px \+ env\(safe-area-inset-bottom, 0px\)\)/g)].map(m => Number(m[1]));
  assert.deepEqual(heights, [113, 113]);
  for (const height of heights) assert.equal(height, 44 * 2 + 8 + 16 + 1);
  assert.match(css, /\.ed-main \{ inset: 60px 0 var\(--studio-bottom-height\)/);
  assert.match(css, /\.studio-bottom \{[^}]*height: var\(--studio-bottom-height\)/);
  const topbar = readFileSync(new URL('../../assets/static/js/editor/topbar.js', import.meta.url), 'utf8');
  assert.doesNotMatch(topbar, /setProperty\(["']--studio-bottom-height/);
});

test('rollback focuses the new current-version row after bootstrap and release rendering finish', async () => {
  const source = readFileSync(new URL('../../assets/static/js/editor/publish.js', import.meta.url), 'utf8');
  const publishAgain = source.slice(source.indexOf('async function publishAgain('), source.indexOf('async function openVersion('));
  const focus = source.slice(source.indexOf('function focusCurrentVersion('), source.indexOf('function renderHistory('));
  let focused = null;
  let current = null;
  const row = { focus() { focused = this; } };
  const context = {
    confirmDialog: async () => true,
    change: async run => run(),
    api: { activate: async () => ({ release: { number: 1 } }), bootstrap: async () => ({}) },
    pid: () => 'site', store: { dispatch() { current = null; } },
    loadReleases: async () => { current = row; },
    historyList: { querySelector: () => current }, pop: { querySelector: () => null },
    announce() {}, toast() {}, viewWebsite() {},
  };
  await vm.runInNewContext(`${focus} ${publishAgain} publishAgain({number: 1})`, context);
  assert.equal(focused, row);
});
