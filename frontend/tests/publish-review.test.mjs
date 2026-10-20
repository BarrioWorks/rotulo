import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { initialState, reduce } from '../../assets/static/js/editor/state.js';
const publishing = readFileSync(new URL('../../assets/static/js/editor/publish.js', import.meta.url), 'utf8');
function section(source, start, end) { return source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start))); }

test('saved element ids survive in the review log; non-element saves and redo have no invented id', () => {
  const bootstrap = { project: { revision: 0 }, pages: [], preview_origin: '', history: { undo_label: null }, draft_changed_since_publish: true, limits: { image_bytes: 100 } };
  const initial = initialState(bootstrap);
  const action = { type: 'save_ok', revision: 1, history: { undo_label: 'Edit text' }, draftChanged: true, log: 'edit', page: 'about.html', element: 'abc', at: 1 };
  const saved = reduce(initial, action);
  assert.deepEqual(saved.changes, [{ label: 'Edit text', page: 'about.html', element: 'abc' }]);
  assert.deepEqual(reduce(initial, { ...action, element: null }).changes, [{ label: 'Edit text', page: 'about.html' }]);
  assert.deepEqual(reduce(saved, { ...action, log: 'undo' }).changes, []);
  assert.deepEqual(reduce(saved, { ...action, draftChanged: false }).changes, []);
});

test('live confirmation dismisses to Publish and stays closed on subsequent dismissals', () => {
  let focused = 0;
  const sheet = { hidden: false };
  vm.runInNewContext(section(publishing, 'function closeLive()', 'function placeLive()') + 'closeLive(); closeLive();', {
    liveSheet: sheet, document: { querySelector: selector => { assert.equal(selector, '[data-action="publish"]'); return { focus: () => focused++ }; } },
  });
  assert.equal(sheet.hidden, true); assert.equal(focused, 1);
});

test('review buttons reveal the saved element on its page and legacy rows stay text', () => {
  for (const path of ['index.html', 'about.html']) {
    const calls = [];
    const s = { path, canvasLoading: false, project: { name: 'Site', site_url: 'http://site.localhost', live_release: null },
      pages: [{ path: 'about.html', title: 'About' }], saves: {}, changes: [{ page: 'about.html', label: 'Edit text', element: 'abc' }, { page: 'about.html', label: 'Earlier edit' }] };
    function h(tag, props, ...children) { return { tag, ...props, children, events: {}, addEventListener(type, run) { this.events[type] = run; } }; }
    const context = { s, h, icon: () => null, siteState: () => ({ kind: 'changes' }), displayUrl: url => url, pageLabel: p => p.title,
      publishing: false, publishError: null, store: { get: () => s, dispatch: action => calls.push(action) },
      closeReview: flag => calls.push(['close', flag]), canvas: { open: (...args) => calls.push(['open', ...args]), send: msg => calls.push(msg), surface: { focus() {} } } };
    const nodes = vm.runInNewContext(section(publishing, 'function review(', 'function renderReview(') + 'review(s, "manage")', context);
    const list = nodes.find(n => n.tag === 'ul');
    const button = list.children.flatMap(n => n.children).find(n => n.tag === 'button');
    assert.ok(button);
    assert.equal(list.children.filter(n => n.children.some(c => c.tag === 'button')).length, 1);
    button.events.click();
    assert.deepEqual(calls[0], ['close', false]);
    if (path === 'index.html') assert.deepEqual(calls.at(-1), ['open', 'about.html', 'abc']);
    else assert.equal(JSON.stringify(calls.at(-1)), JSON.stringify({ type: 'reveal', element: 'abc', pulse: true }));
  }
});

test('welcome is consumed once while preserving the rest of the editor address and history state', () => {
  const canvas = readFileSync(new URL('../../assets/static/js/editor/canvas.js', import.meta.url), 'utf8');
  const source = section(canvas, 'const welcomeUrl =', 'function showEditable()');
  for (const [query, expected] of [['?welcome=1&page=about#part', true], ['?page=about#part', false], ['?welcome=0', false]]) {
    const replacements = [];
    const state = { returnTo: 'dashboard' };
    const context = { URL, window: { location: { href: 'http://127.0.0.1:5184/projects/site/edit' + query }, history: { state, replaceState: (...args) => replacements.push(args) } } };
    vm.runInNewContext(source, context);
    assert.equal(replacements.length, Number(expected));
    if (expected) {
      assert.equal(replacements[0][0], state);
      assert.equal(replacements[0][2].search, '?page=about');
      assert.equal(replacements[0][2].hash, '#part');
    }
  }
});

test('Domains explains the disabled host feature and hides its form', () => {
  let subscriber;
  const form = {}, list = {}, intro = {}, disabled = {};
  const context = { store: { subscribe: fn => { subscriber = fn; } }, settings: {}, pop: { hidden: true }, changed: () => false,
    domainForm: form, domainList: list, domainSection: {}, must: (_root, selector) => selector === '[data-domains-disabled]' ? disabled : intro };
  const start = publishing.lastIndexOf('store.subscribe((s, prev) => {');
  vm.runInNewContext(publishing.slice(start, publishing.indexOf('window.setInterval', start)), context);
  subscriber({ surface: { kind: 'none' }, customDomains: false }, null);
  assert.equal(form.hidden, true); assert.equal(list.hidden, true);
  assert.equal(disabled.hidden, false); assert.equal(intro.hidden, true);
  subscriber({ surface: { kind: 'none' }, customDomains: true }, null);
  assert.equal(form.hidden, false); assert.equal(disabled.hidden, true);
});

test('history gets the full canvas height even with a selected part', async () => {
  const { intersect } = await import('../../assets/static/js/editor/placement.js');
  const pop = { offsetWidth: 380, style: {} }, historySheet = { hidden: true };
  const context = { pop, historySheet, intersect, document: { querySelector: selector => selector === '.ed-top-right' ? { getBoundingClientRect: () => ({ bottom: 47, right: 1274 }) } : null },
    window: { innerWidth: 1280 }, canvas: { visibleBox: () => ({ x: 0, y: 52, width: 1280, height: 748 }), toApp: r => r },
    store: { get: () => ({ focus: { kind: 'selected', selection: { rect: { x: 1000, y: 300, width: 100, height: 100 } } } }) } };
  const sandbox = vm.createContext(context);
  vm.runInContext(section(publishing, 'function placeReview()', 'function onOutside(') + 'placeReview()', sandbox);
  const limited = Number.parseInt(pop.style.maxHeight);
  historySheet.hidden = false;
  vm.runInContext('placeReview()', sandbox);
  assert.ok(Number.parseInt(pop.style.maxHeight) > limited);
  assert.equal(pop.style.maxHeight, '732px');
});
