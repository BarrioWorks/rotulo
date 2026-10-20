import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { envelope, parseEditorMessage, parseAgentMessage } from '../../assets/static/js/protocol.js';

const agent = readFileSync(new URL('../../assets/static/js/agent/agent.js', import.meta.url), 'utf8');
function section(source, start, end) { return source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start))); }

test('show_editable is a bounded editor-only command with no caller-controlled payload', () => {
  assert.deepEqual(parseEditorMessage(envelope({ type: 'show_editable' })), { type: 'show_editable' });
  assert.deepEqual(parseEditorMessage(envelope({ type: 'show_editable', duration: Infinity, elements: new Array(10000) })), { type: 'show_editable' });
  for (const raw of [null, [], 'show_editable', { type: 'show_editable' }, { channel: 'other', type: 'show_editable' }, { ...envelope({ type: 'show_editable' }), channel: 'other' }, envelope({ type: 'show_editable_forever' })]) {
    assert.equal(parseEditorMessage(raw), undefined);
  }
  assert.equal(parseAgentMessage(envelope({ type: 'show_editable' })), undefined);
});

test('discovery draws only visible stops, caps work, clears and cancels its timer', () => {
  class Box {}
  const layer = { children: [], get childElementCount() { return this.children.length; }, get lastElementChild() { return { remove: () => this.children.pop() }; }, replaceChildren() { this.children = []; } };
  let visible = Array.from({ length: 200 }, () => ({ getBoundingClientRect: () => ({ left: 0, right: 80, top: 10, bottom: 30 }), visibility: 'visible', opacity: '1' }));
  const cancelled = [];
  const context = { div: () => layer, HTMLElement: Box, mode: 'edit', innerHeight: 800, innerWidth: 1280, k: 1,
    stops: () => visible, getComputedStyle: el => el, place() {}, window: { clearTimeout: id => cancelled.push(id) } };
  const sandbox = vm.createContext({ ...context, div: (_cls, parent) => { if (!parent) return layer; const box = new Box(); parent.children.push(box); return box; } });
  vm.runInContext(section(agent, 'const editableLayer =', 'const veilLayer =') + '\nshowingEditable = true; editableTimer = 9; drawEditable();', sandbox);
  assert.equal(layer.children.length, 120);
  visible = [visible[0], { ...visible[0], visibility: 'hidden' }, { ...visible[0], opacity: '0' }, { ...visible[0], getBoundingClientRect: () => ({ left: 1300, right: 1400, top: 0, bottom: 30 }) }];
  vm.runInContext('drawEditable();', sandbox);
  assert.equal(layer.children.length, 1);
  vm.runInContext('clearEditable(); drawEditable();', sandbox);
  assert.equal(layer.children.length, 0);
  assert.equal(cancelled.at(-1), 9);
});

test('discovery expires in four seconds and selection cancels it immediately', () => {
  let timer, delay, cleared = 0, scheduled = 0;
  const context = { mode: 'edit', showingEditable: false, clearEditable: () => cleared++, schedule: () => scheduled++, window: { setTimeout: (fn, ms) => { timer = fn; delay = ms; return 1; } }, message: { type: 'show_editable' } };
  vm.runInNewContext('let editableTimer; switch(message.type) {' + section(agent, 'case "show_editable":', 'case "mode":') + '}', context);
  assert.equal(delay, 4000); assert.equal(context.showingEditable, true);
  timer(); assert.equal(cleared, 2); assert.equal(scheduled, 2);
  assert.match(section(agent, 'function select(', 'function showBlocked('), /clearEditable\(\)/);
});


