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

test('the tint marks only visible text, caps its work and clears', () => {
  class Box {}
  const layer = { children: [], get childElementCount() { return this.children.length; }, get lastElementChild() { return { remove: () => this.children.pop() }; }, replaceChildren() { this.children = []; } };
  const part = (kind, can) => ({ kind, can, getBoundingClientRect: () => ({ left: 0, right: 80, top: 10, bottom: 30 }), visibility: 'visible', opacity: '1' });
  let visible = Array.from({ length: 200 }, () => part('heading', 't'));
  const context = { HTMLElement: Box, mode: 'edit', innerHeight: 800, innerWidth: 1280, k: 1,
    stops: () => visible, canOf: el => el.can, kindOf: el => el.kind, getComputedStyle: el => el, place() {} };
  const sandbox = vm.createContext({ ...context, div: (_cls, parent) => { if (!parent) return layer; const box = new Box(); parent.children.push(box); return box; } });
  vm.runInContext(section(agent, 'const editableLayer =', 'const veilLayer =') + '\nshowingEditable = true; drawEditable();', sandbox);
  assert.equal(layer.children.length, 120);
  const heading = visible[0];
  visible = [heading, part('text', 'ts'), part('link', 'tl'), part('image', 'i'), part('section', 'tsx'), part('banner', 'tbs'),
    { ...heading, visibility: 'hidden' }, { ...heading, opacity: '0' }, { ...heading, getBoundingClientRect: () => ({ left: 1300, right: 1400, top: 0, bottom: 30 }) }];
  vm.runInContext('drawEditable();', sandbox);
  assert.equal(layer.children.length, 3, 'a heading, a paragraph and a link; no photo, section or banner');
  vm.runInContext('clearEditable(); drawEditable();', sandbox);
  assert.equal(layer.children.length, 0);
});

test('the tint stays until the editor hides it, a mode change or a selection', () => {
  let scheduled = 0, cleared = 0;
  const run = (message, mode = 'edit') => {
    const context = { mode, showingEditable: false, clearEditable() { cleared++; context.showingEditable = false; }, schedule: () => scheduled++, setMode() {}, message };
    vm.runInNewContext('switch(message.type) {' + section(agent, 'case "show_editable":', 'case "scale":') + '}', context);
    return context;
  };
  assert.equal(run({ type: 'show_editable' }).showingEditable, true);
  assert.equal(run({ type: 'show_editable' }, 'preview').showingEditable, false);
  run({ type: 'hide_editable' }); run({ type: 'mode', mode: 'preview' });
  assert.equal(cleared, 2);
  assert.doesNotMatch(section(agent, 'case "show_editable":', 'case "mode":'), /setTimeout/);
  assert.match(section(agent, 'function select(', 'function showBlocked('), /clearEditable\(\)/);
});
