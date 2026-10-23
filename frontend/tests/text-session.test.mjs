import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createCanvas } from '../../assets/static/js/editor/canvas.js';
import { typedCharacter } from '../../assets/static/js/editor/canvas-policy.js';
import { createStore, initialState, selection } from '../../assets/static/js/editor/state.js';
import { envelope, parseEditorMessage } from '../../assets/static/js/protocol.js';

const ORIGIN = 'https://token.preview.example';

class FakeElement {
  constructor(children = {}) {
    this.attrs = {}; this.dataset = {}; this.listeners = {}; this.children = children;
    this.hidden = false; this.textContent = ''; this.tabIndex = 0;
    this.style = { setProperty() {} };
    this.classList = { add() {}, remove() {}, toggle() {}, contains: () => false };
  }
  append() {}
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
  press(key, target = this) {
    for (const listener of this.listeners.keydown ?? []) listener({
      key, target, preventDefault() {}, stopPropagation() {},
      ctrlKey: false, metaKey: false, altKey: false, isComposing: false,
    });
  }
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
  const announcer = new FakeElement();
  Object.assign(globalThis, {
    document: { createElement: () => new FakeElement(), createElementNS: () => new FakeElement(), querySelector: (selector) => elements[selector] ?? null, getElementById: (id) => id === 'editor-announcer' ? announcer : null, activeElement: null, addEventListener() {} },
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
  return { toFrame, fromFrame, surface, iframe, tip, announcer };
}

async function openEditor({ refreshPreview = async () => {} } = {}) {
  const page = editorPage();
  const store = createStore(initialState({
    project: { pid: 'p', name: 'Site', revision: 0, site_url: 'http://site.localhost', live_release: null },
    pages: [{ path: 'index.html', title: 'Home' }], preview_origin: ORIGIN, limits: { image_bytes: 1 },
    history: { can_undo: false, can_redo: false, undo_label: null, redo_label: null }, draft_changed_since_publish: false,
  }, Date.now()));
  const saved = [];
  const canvas = createCanvas(store, {
    onText: (element, html, page) => saved.push({ element, html, page }),
    refreshPreview, onPageClick() {},
  });
  canvas.open('index.html');
  await new Promise((resolve) => setImmediate(resolve));
  page.fromFrame({ type: 'ready', path: 'index.html', title: 'Home', description: '', scrollY: 0 });
  const actionHost = new FakeElement();
  const editText = new FakeElement();
  // Run the shipped keyboard wiring, including bubbling keys from caption controls.
  const main = readFileSync(new URL('../../assets/static/js/editor/main.js', import.meta.url), 'utf8');
  const toolbar = readFileSync(new URL('../../assets/static/js/editor/toolbar.js', import.meta.url), 'utf8');
  const context = {
    document, window, canvas, store, typedCharacter, selection, actionHost,
    must: () => new FakeElement(), offscreen: new FakeElement(),
    buttons: () => [editText], rove: (button) => button?.focus(),
  };
  vm.runInNewContext(main.slice(main.indexOf('function wireKeys('), main.indexOf('async function main()')) +
    'wireKeys({ store, canvas, toolbar: { activatePrimary: () => canvas.startText() } });', context);
  vm.runInNewContext(toolbar.slice(toolbar.indexOf('offscreen.addEventListener("click"'),
    toolbar.indexOf('store.subscribe(', toolbar.indexOf('offscreen.addEventListener("click"'))), context);
  return { ...page, store, canvas, saved, actionHost, editText };
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
  assert.equal(editor.announcer.textContent, 'Press Enter or choose Edit text to edit');
});

test('forged select and request_text cannot steer focus and a printable key on Edit text cannot start a session', async () => {
  const editor = await openEditor();
  // The owner is using another app control; the hostile frame cannot reclaim its focus.
  const appControl = new FakeElement();
  appControl.focus();
  editor.fromFrame(select);
  editor.fromFrame({ type: 'request_text', element: 'a' });
  assert.equal(document.activeElement, appControl);
  editor.surface.press('N', document.activeElement);
  assert.deepEqual(startsSent(editor.toFrame), []);

  // Even if Edit text already has focus, a key there is not explicit activation.
  editor.editText.focus();
  editor.fromFrame({ ...select, element: 'b' });
  editor.fromFrame({ type: 'request_text', element: 'b' });
  assert.equal(document.activeElement, editor.editText);
  editor.actionHost.press('N', document.activeElement);
  editor.fromFrame({ type: 'text', element: 'b', html: 'forged' });
  assert.deepEqual(startsSent(editor.toFrame), []);
  assert.deepEqual(editor.saved, []);
});

test('click then type while the canvas surface has focus starts and saves the session text once', async () => {
  const editor = await openEditor();
  editor.iframe.focus();
  editor.fromFrame(select);
  assert.equal(document.activeElement, editor.surface, 'selection returns focus to the canvas surface');
  editor.fromFrame({ type: 'request_text', element: 'a' });
  assert.equal(document.activeElement, editor.surface, 'the hint leaves focus alone');
  editor.surface.press('N');
  assert.deepEqual(startsSent(editor.toFrame), [{ type: 'start_text', element: 'a', input: 'N' }]);
  editor.fromFrame({ type: 'text', element: 'a', html: 'New welcome' });
  assert.deepEqual(editor.saved, [{ element: 'a', html: 'New welcome', page: 'index.html' }]);
  editor.fromFrame({ type: 'text', element: 'a', html: 'replayed' });
  assert.equal(editor.saved.length, 1, 'a session saves once');
});

test('Enter on the canvas after selecting a heading starts a session without another click', async () => {
  const editor = await openEditor();
  editor.iframe.focus();
  editor.fromFrame(select);
  editor.surface.press('Enter');
  assert.deepEqual(startsSent(editor.toFrame), [{ type: 'start_text', element: 'a', input: null }]);
});

test('Edit text or Enter without a second click starts with the default caret, and only on text', async () => {
  const editor = await openEditor();
  assert.equal(editor.canvas.startText(), false, 'nothing selected');
  editor.fromFrame({ ...select, element: 'b', can: 'i', kind: 'image' });
  assert.equal(editor.canvas.startText(), false, 'a photo has no text');
  editor.fromFrame(select);
  assert.equal(editor.canvas.startText(), true);
  assert.deepEqual(startsSent(editor.toFrame), [{ type: 'start_text', element: 'a', input: null }]);
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

test('start_text input stays bounded and unused caret fields are discarded', () => {
  const start = { type: 'start_text', element: 'a', input: 'é' };
  assert.deepEqual(parseEditorMessage(envelope(start)), start);
  assert.deepEqual(parseEditorMessage(envelope({ ...start, caret: 'click' })), start);
  assert.deepEqual(parseEditorMessage(envelope({ ...start, input: null })), { ...start, input: null });
  for (const patch of [{ input: 'abcde' }, { input: '\u0007' }, { input: ' ' }]) {
    assert.equal(parseEditorMessage(envelope({ ...start, ...patch })), undefined);
  }
});

test('text completion shares one acknowledgment and queues changed text before continuing', async () => {
  const editor = await openEditor();
  editor.fromFrame(select);
  assert.equal(editor.canvas.startText(), true);
  editor.fromFrame({ type: 'editing', element: 'a', active: true, formats: { bold: false, italic: false, link: false } });
  window.setTimeout = () => 1;
  const first = editor.canvas.finishText();
  const second = editor.canvas.finishText();
  assert.equal(first, second);
  assert.equal(editor.toFrame.filter((message) => message?.type === 'finish_text').length, 1);
  editor.fromFrame({ type: 'text', element: 'a', html: 'New heading' });
  assert.equal(await first, true);
  assert.deepEqual(editor.saved, [{ element: 'a', html: 'New heading', page: 'index.html' }]);
});

test('a missing text acknowledgment blocks page switching and reports an unfinished session', async () => {
  const editor = await openEditor();
  editor.fromFrame(select);
  assert.equal(editor.canvas.startText(), true);
  let expire;
  window.setTimeout = (run, milliseconds) => { if (milliseconds === 2000) expire = run; return 1; };
  const finish = editor.canvas.finishText();
  editor.canvas.open('about.html');
  assert.equal(editor.store.get().path, 'index.html');
  assert.equal(typeof expire, 'function');
  expire();
  assert.equal(await finish, false);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(editor.store.get().path, 'index.html');
  assert.equal(editor.saved.length, 0);
});


test('expired preview refresh rejects old-frame selection and forged readiness', async () => {
  let release;
  const refresh = new Promise((resolve) => { release = resolve; });
  const editor = await openEditor({ refreshPreview: () => refresh });
  editor.store.get().bootstrappedAt = Date.now() - 12 * 60 * 60 * 1000;
  editor.iframe.removeAttribute('src');
  editor.canvas.open('about.html');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(editor.store.get().canvasLoading, true);
  editor.fromFrame(select);
  editor.fromFrame({ type: 'ready', path: 'about.html', title: 'Forged', description: '', scrollY: 0 });
  assert.equal(editor.store.get().focus.kind, 'none');
  assert.equal(editor.store.get().canvasLoading, true);
  release();
  await new Promise((resolve) => setImmediate(resolve));
  editor.fromFrame({ type: 'ready', path: 'about.html', title: 'About', description: '', scrollY: 0 });
  assert.equal(editor.store.get().canvasLoading, false);
});
