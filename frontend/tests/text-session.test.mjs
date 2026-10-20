import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanvas } from '../../assets/static/js/editor/canvas.js';
import { createStore, initialState } from '../../assets/static/js/editor/state.js';
import { envelope, parseEditorMessage } from '../../assets/static/js/protocol.js';

const ORIGIN = 'https://token.preview.example';

class FakeElement {
  constructor(children = {}) {
    this.attrs = {}; this.dataset = {}; this.listeners = {}; this.children = children;
    this.hidden = false; this.textContent = ''; this.tabIndex = 0;
    this.style = { setProperty() {} };
    this.classList = { add() {}, remove() {}, toggle() {}, contains: () => false };
  }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  getAttribute(name) { return this.attrs[name] ?? null; }
  hasAttribute(name) { return name in this.attrs; }
  removeAttribute(name) { delete this.attrs[name]; }
  toggleAttribute(name, on) { if (on) this.attrs[name] = ''; else delete this.attrs[name]; }
  addEventListener(type, listener) { (this.listeners[type] ??= []).push(listener); }
  querySelector(selector) { return this.children[selector] ?? null; }
  focus() { globalThis.document.activeElement = this; }
  getBoundingClientRect() { return { left: 0, top: 0, right: 1000, bottom: 700, width: 1000, height: 700 }; }
  click() { for (const listener of this.listeners.click ?? []) listener({}); }
}

/** The editor page around the canvas, and the frame whose script posts what it likes. */
function editorPage() {
  const toFrame = [];
  const iframe = new FakeElement();
  iframe.contentWindow = { postMessage: (message) => toFrame.push(parseEditorMessage(message)) };
  Object.defineProperty(iframe, 'src', { set(value) { iframe.attrs.src = value; } });
  const surface = new FakeElement({ '[data-canvas]': iframe });
  const tip = new FakeElement({ '[data-editable-tip-text]': new FakeElement(), '[data-editable-tip-close]': new FakeElement() });
  tip.hidden = true;
  const area = new FakeElement();
  area.clientWidth = 1000; area.clientHeight = 700;
  const elements = {
    '[data-canvas-area]': area, '[data-canvas-frame]': surface, '[data-canvas-loading]': new FakeElement(),
    '[data-canvas-loading-text]': new FakeElement(), '[data-zoom]': new FakeElement(), '[data-zoom-label]': new FakeElement(),
    '[data-canvas-hint-text]': new FakeElement(), '[data-editable-tip]': tip,
  };
  const windowListeners = {};
  Object.assign(globalThis, {
    document: { querySelector: (selector) => elements[selector] ?? null, getElementById: () => null, activeElement: null, addEventListener() {} },
    window: {
      location: { href: 'http://127.0.0.1:5194/projects/p/edit' }, history: { state: null, replaceState() {} },
      addEventListener: (type, listener) => { (windowListeners[type] ??= []).push(listener); },
      setTimeout: (run) => { run(); return 0; }, clearTimeout() {},
    },
    ResizeObserver: class { observe() {} disconnect() {} },
    getComputedStyle: () => ({ paddingLeft: '0', paddingRight: '0', paddingTop: '0', paddingBottom: '0' }),
    fetch: () => Promise.reject(new Error('offline')),
    performance: { now: () => 1e9 },
  });
  // The owner just clicked in the site, so the browser reports a fresh activation, as in the attack.
  Object.defineProperty(globalThis, 'navigator', { value: { userActivation: { isActive: true } }, configurable: true });
  const fromFrame = (message) => {
    for (const listener of windowListeners.message ?? []) listener({ source: iframe.contentWindow, origin: ORIGIN, data: envelope(message) });
  };
  return { toFrame, fromFrame, surface, iframe, tip };
}

async function openEditor() {
  const page = editorPage();
  const store = createStore(initialState({
    project: { pid: 'p', name: 'Site', revision: 0, site_url: 'http://site.localhost', live_release: null },
    pages: [{ path: 'index.html', title: 'Home' }], preview_origin: ORIGIN, limits: { image_bytes: 1 },
    history: { can_undo: false, can_redo: false, undo_label: null, redo_label: null }, draft_changed_since_publish: false,
  }, Date.now()));
  const saved = [];
  let focusRequests = 0;
  const canvas = createCanvas(store, {
    onText: (element, html, page) => saved.push({ element, html, page }),
    refreshPreview: async () => {}, onPageClick() {}, onRequestText: () => { focusRequests++; },
  });
  canvas.open('index.html');
  await new Promise((resolve) => setImmediate(resolve));
  page.fromFrame({ type: 'ready', path: 'index.html', title: 'Home', description: '', scrollY: 0 });
  return { ...page, store, canvas, saved, focusRequests: () => focusRequests };
}

const rect = { x: 10, y: 10, width: 200, height: 40 };
const select = {
  type: 'select', element: 'a', can: 't', tag: 'h1', kind: 'heading', name: 'Welcome', ancestors: [], rect, obstacles: [],
  info: { href: null, newTab: false, src: null, alt: null, hidden: false, text: 'Welcome', styles: {}, bgImage: false, image: null, anchorLinks: 0 },
};
const startsSent = (toFrame) => toFrame.filter((m) => m?.type === 'start_text');

test('a forged select, request_text and text from the frame never saves an edit', async () => {
  const editor = await openEditor();
  editor.fromFrame(select);
  editor.fromFrame({ type: 'request_text', element: 'a' });
  editor.fromFrame({ type: 'editing', element: 'a', active: true, formats: { bold: false, italic: false, link: false } });
  editor.fromFrame({ type: 'text', element: 'a', html: 'forged' });
  assert.deepEqual(editor.saved, []);
  assert.deepEqual(startsSent(editor.toFrame), []);
  assert.equal(editor.focusRequests(), 1, 'the request only asks the app to move focus to Edit text');
});

test('a second click then a typed key starts at the click and saves the session text', async () => {
  const editor = await openEditor();
  editor.fromFrame(select);
  editor.fromFrame({ type: 'request_text', element: 'a' });
  assert.equal(editor.canvas.startText('N'), true);
  assert.deepEqual(startsSent(editor.toFrame), [{ type: 'start_text', element: 'a', caret: 'click', input: 'N' }]);
  editor.fromFrame({ type: 'text', element: 'a', html: 'New welcome' });
  assert.deepEqual(editor.saved, [{ element: 'a', html: 'New welcome', page: 'index.html' }]);
  editor.fromFrame({ type: 'text', element: 'a', html: 'replayed' });
  assert.equal(editor.saved.length, 1, 'a session saves once');
});

test('Edit text or Enter without a second click starts with the default caret, and only on text', async () => {
  const editor = await openEditor();
  assert.equal(editor.canvas.startText(), false, 'nothing selected');
  editor.fromFrame({ ...select, element: 'b', can: 'i', kind: 'image' });
  assert.equal(editor.canvas.startText(), false, 'a photo has no text');
  editor.fromFrame(select);
  assert.equal(editor.canvas.startText(), true);
  assert.deepEqual(startsSent(editor.toFrame), [{ type: 'start_text', element: 'a', caret: 'auto', input: null }]);
  assert.equal(editor.canvas.startText(), false, 'one session at a time');
});

test('the first-edit tip lives exactly as long as the tint', async () => {
  const editor = await openEditor();
  editor.canvas.showEditable();
  assert.equal(editor.tip.hidden, false);
  assert.equal(editor.toFrame.at(-1).type, 'show_editable');
  editor.fromFrame(select);
  assert.equal(editor.tip.hidden, true, 'the first selection ends it');
  assert.equal(editor.toFrame.at(-1).type, 'hide_editable');
  editor.canvas.showEditable();
  assert.equal(editor.canvas.dismissEditable(), true);
  assert.equal(editor.canvas.dismissEditable(), false);
  assert.equal(editor.tip.hidden, true);
  assert.equal(editor.toFrame.at(-1).type, 'hide_editable');
});

test('start_text carries at most one short typed character and a known caret', () => {
  const start = { type: 'start_text', element: 'a', caret: 'click', input: 'é' };
  assert.deepEqual(parseEditorMessage(envelope(start)), start);
  assert.deepEqual(parseEditorMessage(envelope({ ...start, input: null })), { ...start, input: null });
  for (const patch of [{ input: 'abcde' }, { input: '\u0007' }, { input: ' ' }, { caret: 'anywhere' }, { caret: undefined }]) {
    assert.equal(parseEditorMessage(envelope({ ...start, ...patch })), undefined);
  }
});
