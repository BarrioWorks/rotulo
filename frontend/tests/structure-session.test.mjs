import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../assets/static/js/editor/structure.js', import.meta.url), 'utf8');
const run = source.slice(source.indexOf('async function run('), source.indexOf('function validMove('));

test('a structural command waiting for text cannot switch its destination page', async () => {
  let path = 'index.html';
  let finish;
  const text = new Promise((resolve) => { finish = resolve; });
  const writes = [];
  const context = {
    busy: false, pendingNew: null, byId: new Map(),
    store: { get: () => ({ path, mode: 'edit', saves: { pending: 0, problem: null } }) },
    canvas: { finishText: () => text },
    edits: { save: async (edit, options) => { writes.push({ edit, options }); return true; } },
    sync() {}, announce() {}, status: {}, supported: () => true, toast() {},
  };
  vm.runInNewContext(run + ';globalThis.start = run;', context);
  const pending = context.start({ op: 'remove_element', element: 'a' }, 'Deleted');
  path = 'about.html';
  finish(true);
  await pending;
  assert.deepEqual(writes, []);
});

test('a structural command explicitly saves against its originating page', async () => {
  const writes = [];
  const context = {
    busy: false, pendingNew: null, byId: new Map(),
    store: { get: () => ({ path: 'index.html', mode: 'edit', saves: { pending: 0, problem: null } }) },
    canvas: { finishText: async () => true },
    edits: { save: async (edit, options) => { writes.push({ edit, options }); return true; } },
    sync() {}, announce() {}, status: {}, supported: () => true, toast() {},
  };
  vm.runInNewContext(run + ';globalThis.start = run;', context);
  await context.start({ op: 'remove_element', element: 'a' }, 'Deleted');
  assert.equal(writes.length, 1);
  assert.equal(writes[0].options.page, 'index.html');
});


test('structural commands are blocked while a new canvas is loading', async () => {
  const writes = [];
  const context = {
    busy: false, pendingNew: null, byId: new Map(),
    store: { get: () => ({ path: 'about.html', canvasLoading: true, mode: 'edit', saves: { pending: 0, problem: null } }) },
    canvas: { finishText: async () => true },
    edits: { save: async (edit) => { writes.push(edit); return true; } },
    sync() {}, announce() {}, status: {}, supported: () => true, toast() {},
  };
  vm.runInNewContext(run + ';globalThis.start = run;', context);
  await context.start({ op: 'remove_element', element: 'a' }, 'Deleted');
  assert.deepEqual(writes, []);
});
