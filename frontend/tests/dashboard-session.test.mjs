import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { test } from 'node:test';

class Control extends EventTarget {
  attrs = new Map();
  value = '';
  disabled = false;
  hidden = false;
  open = false;
  textContent = '';
  setAttribute(key, value) { this.attrs.set(key, value); }
  getAttribute(key) { return this.attrs.get(key) ?? null; }
  removeAttribute(key) { this.attrs.delete(key); }
  focus() {}
  showModal() { this.open = true; }
  close() { this.open = false; this.dispatchEvent(new Event('close')); }
  click() { this.dispatchEvent(new Event('click')); }
}

async function createDialog() {
  const code = await readFile(new URL('../../assets/static/js/dashboard.js', import.meta.url), 'utf8');
  const controls = new Map(['dialog', 'form', 'input', 'error', 'submit', 'cancel', 'trigger'].map(key => [key, new Control()]));
  const field = selector => {
    const key = { '[data-create-form]': 'form', '[data-create-input]': 'input', '[data-create-error]': 'error', '[data-create-submit]': 'submit', '[data-create-cancel]': 'cancel' }[selector];
    assert.ok(key, selector);
    return controls.get(key);
  };
  const root = { querySelector: () => controls.get('dialog'), querySelectorAll: () => [controls.get('trigger')] };
  const requests = [];
  const navigations = [];
  vm.runInNewContext(code.slice(code.indexOf('function wireCreate('), code.indexOf('function wireDuplicate(')) + '\nwireCreate(root);', {
    root, must: (_root, selector) => field(selector),
    send: (_url, body) => new Promise(resolve => requests.push({ body, resolve })),
    window: { location: { assign: path => navigations.push(path) } }, encodeURIComponent,
  });
  return { controls, requests, navigations, submit: () => controls.get('form').dispatchEvent(new Event('submit', { cancelable: true })) };
}

test('closing and reopening a pending create dialog cannot submit a second website', async () => {
  const { controls, requests, navigations, submit } = await createDialog();
  controls.get('trigger').click();
  controls.get('input').value = 'First website';
  submit();
  assert.equal(requests.length, 1);
  assert.equal(controls.get('submit').disabled, true);
  assert.equal(controls.get('cancel').disabled, true);
  assert.equal(controls.get('dialog').dispatchEvent(new Event('cancel', { cancelable: true })), false);
  controls.get('cancel').click();
  assert.equal(controls.get('dialog').open, true);
  controls.get('dialog').close();
  controls.get('trigger').click();
  controls.get('input').value = 'Second website';
  submit();
  assert.equal(requests.length, 1, 'request ownership survives dialog presentation changes');
  requests[0].resolve({ kind: 'created', pid: 'first', name: 'First website' });
  await new Promise(setImmediate);
  assert.deepEqual(navigations, ['/projects/first']);
});

test('a failed creation restores controls and permits a deliberate retry', async () => {
  const { controls, requests, navigations, submit } = await createDialog();
  controls.get('trigger').click();
  controls.get('input').value = 'My website';
  submit();
  requests[0].resolve({ kind: 'failed', message: 'Try again shortly.' });
  await new Promise(setImmediate);
  assert.equal(controls.get('submit').disabled, false);
  assert.equal(controls.get('cancel').disabled, false);
  assert.equal(controls.get('input').disabled, false);
  assert.equal(controls.get('error').textContent, 'Try again shortly.');
  submit();
  assert.equal(requests.length, 2);
  requests[1].resolve({ kind: 'created', pid: 'retry', name: 'My website' });
  await new Promise(setImmediate);
  assert.deepEqual(navigations, ['/projects/retry']);
});
