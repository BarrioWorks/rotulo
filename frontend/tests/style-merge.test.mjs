import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mergeDeclarations } from '../../assets/static/js/agent/style-merge.js';

test("the preview merges inline styles exactly as the server does", () => {
  const cases = JSON.parse(readFileSync(new URL("../../fixtures/style-merge.json", import.meta.url), "utf8"));
  for (const { existing, changes, merged } of cases) assert.equal(mergeDeclarations(existing, changes), merged, existing);
});
