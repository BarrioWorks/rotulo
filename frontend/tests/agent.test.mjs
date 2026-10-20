import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { reserveFrame } from '../../assets/static/js/editor/canvas.js';
import { envelope, parseAgentMessage } from '../../assets/static/js/protocol.js';
import { acceptsCanvasMessage } from '../../assets/static/js/editor/canvas-policy.js';

const source = readFileSync(new URL('../../assets/static/js/agent/agent.js', import.meta.url), 'utf8');
function section(start, end) { return source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start))); }
function keyHandler() {
  let handler;
  const calls = [];
  vm.runInNewContext(section('window.addEventListener("keydown", (event)', 'document.addEventListener("paste"'), {
    window: { addEventListener: (_, callback) => { handler = callback; } },
    editing: {}, mode: 'edit', commitText: () => calls.push('commit'), cancelText: () => calls.push('cancel'),
    document: { execCommand: () => { calls.push('line'); return true; } },
  });
  return { calls, press: (key, options = {}) => handler({ key, preventDefault() {}, stopImmediatePropagation() {}, ...options }) };
}
test('Escape and Enter keep text through the same commit path', () => {
  const h = keyHandler(); h.press('Escape'); h.press('Enter');
  assert.deepEqual(h.calls, ['commit', 'commit']);
});
test('IME composition ignores Escape, Enter and Shift+Enter', () => {
  const h = keyHandler();
  for (const key of ['Escape', 'Enter']) h.press(key, { isComposing: true });
  h.press('Enter', { isComposing: true, shiftKey: true });
  assert.deepEqual(h.calls, []);
});
test('touch pointer and touch events preserve native tap clicks while stopping site handlers', () => {
  const handlers = new Map();
  class MouseEvent {}
  class PointerEvent extends MouseEvent {}
  vm.runInNewContext(section('for (const type of ["mousedown"', 'function previewNavigation'), {
    window: { addEventListener: (type, callback) => handlers.set(type, callback) },
    mode: 'edit', isOurs: () => false, editingContains: () => false, MouseEvent, PointerEvent,
  });
  for (const type of ['touchstart', 'touchend', 'pointerdown', 'pointerup']) {
    let stopped = false, cancelled = false;
    const event = Object.assign(type.startsWith('pointer') ? new PointerEvent() : {}, {
      type, pointerType: 'touch', cancelable: true,
      stopImmediatePropagation() { stopped = true; }, preventDefault() { cancelled = true; },
    });
    handlers.get(type)(event);
    assert.equal(stopped, true); assert.equal(cancelled, false);
  }
});
test('tap click selects; a second tap requests parent-authorized editing and never navigates', () => {
  let handler, selected = null;
  const requests = [], el = {};
  const context = { window: { addEventListener: (_, callback) => { handler = callback; } },
    isOurs: () => false, mode: 'edit', editingContains: () => false,
    asElement: () => el, pickAt: () => ({ kind: 'element', el }),
    canOf: () => 't', idOf: () => 'a', post: (m) => requests.push(m),
    select: (value) => { selected = value; context.selected = selected; }, selected,
  };
  vm.runInNewContext(section('window.addEventListener("click"', 'for (const type of ["auxclick"'), context);
  let prevented = 0;
  const tap = { target: el, preventDefault() { prevented++; }, stopImmediatePropagation() {} };
  handler(tap); assert.equal(selected, el); assert.equal(requests.length, 0);
  handler(tap); assert.equal(requests[0].type, 'request_text'); assert.equal(prevented, 2);
});
test('text requests are bounded ids and cannot authorize text or editing reports', () => {
  assert.deepEqual(parseAgentMessage(envelope({ type: 'request_text', element: 'a' })), { type: 'request_text', element: 'a' });
  for (const element of ['', 'a'.repeat(11), 'a" onclick=']) assert.equal(parseAgentMessage(envelope({ type: 'request_text', element })), undefined);
  const session = { path: 'index.html', mode: 'edit', loading: false, textElement: null };
  const request = { type: 'request_text', element: 'a' };
  assert.equal(acceptsCanvasMessage(session, request), true);
  for (const patch of [{ mode: 'preview' }, { loading: true }, { textElement: 'a' }]) assert.equal(acceptsCanvasMessage({ ...session, ...patch }, request), false);
  assert.equal(acceptsCanvasMessage(session, { type: 'text', element: 'a', html: 'forged' }), false);
});
test('canvas reserves its container content box without bootstrap or assumed chrome heights', () => {
  const previous = globalThis.getComputedStyle;
  globalThis.getComputedStyle = () => ({ paddingLeft: '12px', paddingRight: '12px', paddingTop: '20px', paddingBottom: '44px' });
  try {
    const area = { clientWidth: 1024, clientHeight: 700 };
    const surface = { style: { setProperty() {} } }, iframe = { style: {} };
    const layout = reserveFrame(area, surface, iframe);
    assert.equal(surface.style.width, '1000px'); assert.equal(surface.style.height, '636px');
    assert.equal(iframe.style.width, '1280px'); assert.equal(layout.scale, 1000 / 1280);
    reserveFrame(area, surface, iframe, 'mobile'); assert.equal(iframe.style.width, '390px'); assert.equal(iframe.style.height, '844px');
  } finally { globalThis.getComputedStyle = previous; }
});
test('outline includes a selectable CSS photo, excludes gradients, and retains the cap', () => {
  class HTMLImageElement {}
  const banner = { photo: 'url("/hero.jpg")', id: 'a', name: 'Welcome', can: 'b' };
  const gradient = { photo: 'linear-gradient(red, blue)', id: 'b', can: 'b' };
  const elements = [banner, gradient, ...Array.from({ length: 45 }, (_, i) => ({ ...banner, id: String(i) }))];
  const context = { HTMLImageElement, document: { querySelectorAll: (selector) => selector.includes("='t'") ? [] : elements },
    editable: () => true, visible: () => true, kindOf: () => 'banner', idOf: (el) => el.id,
    canOf: (el) => el.can, hasPhoto: (el) => el.photo.includes('url('), getComputedStyle: (el) => ({ backgroundImage: el.photo }),
    nameOf: (el) => el.name, fileName: () => 'hero.jpg', MAX_OUTLINE_IMAGES: 40,
  };
  const outline = vm.runInNewContext(`${section('function outline()', 'let factsTimer')} outline()`, context);
  assert.equal(outline.images.length, 40); assert.equal(outline.images[0].element, 'a');
  assert.equal(outline.images[0].src, '/hero.jpg'); assert.equal(outline.images[0].name, 'Welcome');
  assert.ok(!outline.images.some((img) => img.element === 'b'));
  assert.ok(parseAgentMessage(envelope(outline)));
});
test('overlay has tint, editing glow, fades only, no chip and no reduced-motion animation', () => {
  assert.match(source, /\.hover \{[^\n]*background:/);
  assert.match(source, /\.select\.editing \{[^\n]*inset/);
  assert.doesNotMatch(source, /\.glide|className = "slug|@keyframes pulse/);
  assert.match(source, /prefers-reduced-motion: reduce[\s\S]*animation: none/);
  assert.match(source, /forced-colors: active[\s\S]*Highlight/);
});

test('device switching reselects after layout, or restores selection on ready while loading', () => {
  const canvas = readFileSync(new URL('../../assets/static/js/editor/canvas.js', import.meta.url), 'utf8');
  const begin = canvas.indexOf('else if (s.device !== prev.device)');
  const end = canvas.indexOf('else if (s.zoom !== prev.zoom)', begin);
  for (const loading of [false, true]) {
    let nextFrame;
    const messages = [], restore = { select: null };
    const state = { device: 'mobile', focus: { kind: 'selected', selection: { element: 'a' } } };
    vm.runInNewContext(`if (false) {} ${canvas.slice(begin, end)}`, {
      s: state, prev: { device: 'desktop' }, area: { dataset: {} }, applyLayout() {},
      requestAnimationFrame(callback) { nextFrame = callback; }, store: { get: () => state },
      awaitingReady: loading, restore, textSession: null, send: (message) => messages.push(message),
    });
    assert.equal(messages.length, 0);
    nextFrame();
    if (loading) assert.equal(restore.select, 'a');
    else assert.equal(messages[0].type, 'select_element');
  }
});

test('a site-triggered frame reload preserves selection for the next ready handshake', () => {
  const source = readFileSync(new URL('../../assets/static/js/editor/canvas.js', import.meta.url), 'utf8');
  const begin = source.indexOf('function watchLoads(');
  const end = source.indexOf('watchLoads(active);', begin);
  let onLoad;
  const active = { addEventListener: (_, callback) => { onLoad = callback; } };
  const context = { active, awaitingReady: false, textSession: null, restore: null, expectedPath: 'index.html',
    expectedLoads: new WeakSet(), store: { get: () => ({ scrollY: 120, focus: { kind: 'selected', selection: { element: 'a' } } }), dispatch() {} },
    navigate: () => Promise.resolve(),
  };
  vm.runInNewContext(`${source.slice(begin, end)} watchLoads(active);`, context);
  onLoad();
  assert.equal(context.restore.select, 'a'); assert.equal(context.restore.scrollY, 120);
});

test('obstacle hit grid walks repeated content only once without dropping the obstacle', () => {
  const hit = {}, content = {}, sel = { getBoundingClientRect: () => ({ top: 200, bottom: 300, left: 100, right: 200, height: 100 }) };
  let walks = 0;
  const context = { document: { documentElement: { clientWidth: 1280 }, body: {}, elementFromPoint: () => hit },
    innerWidth: 1280, innerHeight: 800, k: 1, host: {}, contentAt: () => { walks++; return content; },
  };
  const find = vm.runInNewContext(`${section('function findObstacles(', 'function boxOf(')} findObstacles`, context);
  assert.equal(find(sel)[0], content); assert.equal(walks, 1);
});
