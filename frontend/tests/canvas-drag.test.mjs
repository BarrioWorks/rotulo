import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanvas } from '../../assets/static/js/editor/canvas.js';
import { createStore, initialState } from '../../assets/static/js/editor/state.js';
import { envelope, parseEditorMessage } from '../../assets/static/js/protocol.js';

const ORIGIN = 'https://token.preview.example';
const request = '22222222-2222-4222-8222-222222222222';
const rect = { x: 100, y: 100, width: 200, height: 40 };
const selected = {
  type: 'select', element: 'a', can: 'tsm', tag: 'h1', kind: 'heading', name: 'Welcome', ancestors: [], rect, obstacles: [],
  info: { href: null, newTab: false, src: null, alt: null, hidden: false, text: 'Welcome', styles: {}, bgImage: false, image: null, anchorLinks: 0 },
};
const move = { type: 'move_element', request, element: 'a', target: 'b', position: 'after' };

class Element {
  attrs = {}; dataset = {}; listeners = {}; children = []; hidden = false;
  style = { setProperty() {} };
  classList = { add() {}, remove() {}, toggle() {} };
  clientWidth = 1000; clientHeight = 700;
  contentWindow = { postMessage: () => {} };
  constructor(selectors = {}) { this.selectors = selectors; }
  setAttribute(key, value) { this.attrs[key] = String(value); }
  getAttribute(key) { return this.attrs[key] ?? null; }
  removeAttribute(key) { delete this.attrs[key]; }
  toggleAttribute(key, on) { if (on) this.attrs[key] = ''; else delete this.attrs[key]; }
  querySelector(key) { return this.selectors[key] ?? null; }
  append(...els) { this.children.push(...els); }
  after() {}
  remove() {}
  focus() { document.activeElement = this; }
  addEventListener(key, callback) { (this.listeners[key] ??= []).push(callback); }
  fire(key, event) { for (const cb of this.listeners[key] ?? []) cb(event); }
  setPointerCapture(id) { this.capture = id; }
  hasPointerCapture(id) { return this.capture === id; }
  releasePointerCapture(id) { this.capture = null; this.fire('lostpointercapture', { pointerId: id }); }
  getBoundingClientRect() { return { left: 10, top: 20, right: 1010, bottom: 720 }; }
}

async function editor() {
  const frame = new Element();
  const surface = new Element({ '[data-canvas]': frame });
  const tip = new Element({ '[data-editable-tip-close]': new Element(), '[data-editable-tip-text]': new Element() });
  tip.hidden = true;
  const elements = {
    '[data-canvas-area]': new Element(), '[data-canvas-frame]': surface, '[data-editable-tip]': tip,
    ...Object.fromEntries(['canvas-loading', 'canvas-loading-text', 'zoom', 'zoom-label', 'canvas-hint-text'].map(k => [`[data-${k}]`, new Element()])),
  };
  const windowEvents = new Element();
  const documentEvents = new Element();
  const timers = new Map(); let timer = 0;
  Object.assign(globalThis, {
    document: {
      createElement: () => new Element(), createElementNS: () => new Element(), activeElement: null,
      querySelector: (key) => elements[key], getElementById: () => null,
      addEventListener: (...args) => documentEvents.addEventListener(...args),
    },
    window: {
      location: { href: 'http://127.0.0.1/projects/p' },
      addEventListener: (...args) => windowEvents.addEventListener(...args),
      setTimeout: (callback, ms) => { timers.set(++timer, { callback, ms }); return timer; },
      clearTimeout: (id) => timers.delete(id),
    },
    getComputedStyle: () => ({ paddingLeft: '0', paddingRight: '0', paddingTop: '0', paddingBottom: '0' }),
    ResizeObserver: class { observe() {} disconnect() {} },
    fetch: () => Promise.reject(new Error('offline')),
  });
  const store = createStore(initialState({
    project: { pid: 'p', name: 'Site', revision: 0, site_url: 'http://site.localhost', live_release: null },
    pages: [{ path: 'index.html', title: 'Home' }], preview_origin: ORIGIN, limits: { image_bytes: 1 },
    history: { can_undo: false, can_redo: false, undo_label: null, redo_label: null }, draft_changed_since_publish: false,
  }, Date.now()));
  const sent = [], saves = [];
  frame.contentWindow.postMessage = (message) => sent.push(parseEditorMessage(message));
  const canvas = createCanvas(store, { onText() {}, refreshPreview: async () => {}, onPageClick() {}, onMove: (...args) => saves.push(args) });
  const receive = (message, patch = {}) => windowEvents.fire('message', { data: envelope(message), source: frame.contentWindow, origin: ORIGIN, ...patch });
  canvas.open('index.html');
  await new Promise(resolve => setImmediate(resolve));
  receive({ type: 'ready', path: 'index.html', title: 'Home', description: '', scrollY: 0 });
  receive(selected);
  const handle = surface.children[0];
  const pointer = (type, patch = {}) => {
    const event = { isTrusted: true, isPrimary: true, pointerId: 7, button: 0, buttons: 1,
      clientX: 100, clientY: 120, preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() {}, ...patch };
    (type === 'pointerdown' ? handle : windowEvents).fire(type, event);
  };
  const start = () => { pointer('pointerdown'); pointer('pointermove', { clientX: 410, clientY: 420 }); };
  const end = () => {
    pointer('pointerup', { clientX: 410, clientY: 420, buttons: 0 });
    return sent.findLast(m => m.type === 'drag_end');
  };
  return { receive, sent, saves, canvas, store, handle, frame, windowEvents, pointer, start, end, timers };
}

test('forged select and move, even with active dragging, never call persistence', async () => {
  const h = await editor();
  h.receive(move);
  h.receive({ type: 'dragging', active: true });
  h.receive(move);
  h.pointer('pointerup');
  h.receive(move);
  assert.deepEqual(h.saves, []);
  assert.equal(h.sent.some(m => m.type.startsWith('drag_')), false);
});

test('untrusted DOM events cannot start or finish a gesture', async () => {
  const h = await editor();
  h.pointer('pointerdown', { isTrusted: false });
  assert.equal(h.sent.some(m => m.type === 'drag_start'), false);
  h.start();
  h.pointer('pointerup', { isTrusted: false });
  assert.equal(h.sent.some(m => m.type === 'drag_end'), false);
  h.receive(move);
  assert.deepEqual(h.saves, []);
});

test('a real parent drag grants one matching proposal only after release', async () => {
  const h = await editor();
  h.start();
  h.receive(move);
  assert.deepEqual(h.saves, []);
  const end = h.end();
  assert.ok(end);
  assert.deepEqual(end.point, { x: 512, y: 512 }, 'app coordinates use the canvas scale and iframe offset');
  h.receive(move);
  assert.deepEqual(h.saves, [], 'a guessed request is rejected');
  const proposal = { ...move, request: end.request };
  h.receive({ ...proposal, element: 'c' });
  h.receive(proposal, { source: {} });
  h.receive(proposal, { origin: 'https://other.preview.example' });
  assert.deepEqual(h.saves, []);
  h.receive(proposal);
  h.receive(proposal);
  assert.deepEqual(h.saves, [['a', 'b', 'after']]);
});

test('a short press and releases outside the canvas do not commit', async () => {
  for (const outside of [false, true]) {
    const h = await editor();
    h.pointer('pointerdown');
    h.pointer('pointermove', { clientX: outside ? 410 : 102, clientY: 120 });
    h.pointer('pointerup', { clientX: outside ? -5 : 102, clientY: 120 });
    assert.equal(h.sent.some(m => m.type === 'drag_end'), false);
    h.receive(move);
    assert.deepEqual(h.saves, []);
  }
});

test('Escape, pointer cancellation, lost capture, blur, mode, selection and page changes cancel without saving', async () => {
  const cancel = [
    h => h.windowEvents.fire('keydown', { key: 'Escape', preventDefault() {}, stopImmediatePropagation() {} }),
    h => h.pointer('pointercancel'),
    h => h.handle.releasePointerCapture(7),
    h => h.windowEvents.fire('blur', {}),
    h => h.store.dispatch({ type: 'mode', mode: 'preview' }),
    h => h.receive({ ...selected, element: 'c' }),
    h => h.store.dispatch({ type: 'open_page', path: 'other.html' }),
    h => h.store.dispatch({ type: 'canvas_loading' }),
  ];
  for (const run of cancel) {
    const h = await editor();
    h.start(); run(h); h.end(); h.receive(move);
    assert.equal(h.sent.some(m => m.type === 'drag_end'), false);
    assert.deepEqual(h.saves, []);
    assert.ok(h.sent.some(m => m.type === 'drag_cancel'));
  }
});

test('a committing request expires and cannot survive a page or frame change', async () => {
  for (const invalidate of [
    h => [...h.timers.values()].filter(t => t.ms === 800).forEach(t => t.callback()),
    h => h.store.dispatch({ type: 'open_page', path: 'other.html' }),
    h => h.canvas.reload(),
    h => { h.frame.contentWindow = { postMessage() {} }; },
  ]) {
    const h = await editor();
    h.start(); const end = h.end(); invalidate(h);
    h.receive({ ...move, request: end.request });
    assert.deepEqual(h.saves, []);
  }
});

test('autoscrolling the source offscreen keeps the captured handle visible', async () => {
  const h = await editor();
  h.start();
  h.receive({ type: 'viewport', scrollY: 1000, rect: { ...rect, y: -1000 }, obstructions: [], obstacles: [] });
  assert.equal(h.handle.hidden, false);
  assert.equal(h.handle.hasPointerCapture(7), true);
  const end = h.end();
  h.receive({ ...move, request: end.request });
  assert.equal(h.saves.length, 1);
});

test('Escape during commit revokes the disclosed request', async () => {
  const h = await editor();
  h.start(); const end = h.end();
  h.windowEvents.fire('keydown', { key: 'Escape', preventDefault() {}, stopImmediatePropagation() {} });
  h.receive({ ...move, request: end.request });
  assert.deepEqual(h.saves, []);
});

test('another pointer cannot release the captured owner gesture', async () => {
  const h = await editor();
  h.start();
  h.pointer('pointerup', { pointerId: 8 });
  assert.equal(h.sent.some(m => m.type === 'drag_end'), false);
  h.receive(move);
  assert.deepEqual(h.saves, []);
});
