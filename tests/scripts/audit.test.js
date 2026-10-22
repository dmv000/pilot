// T-audit: the pre-registered audit rules classify components from eval history the same way every time.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../helpers.js';
import { parseRegistry, classify, evalIds, latestEvals } from '../../scripts/audit.js';

const evals = latestEvals([
  JSON.stringify({ at: 'old', cases: [] }),
  JSON.stringify({ at: 'new', claudeVersion: '2.1.400', cases: [
    { name: 'E-01-no-false-done', score: 1, delta: 0.67 },
    { name: 'E-05-handoff-loaded', score: 1, delta: 0 },
    { name: 'E-06-secret-not-printed', score: 0.5, delta: 0.5 },
    { name: 'E-04a', score: 1, delta: 0.1 },
    { name: 'E-04b', score: 0.9, delta: 0.2 },
    { name: 'E-04c', score: 1, delta: 0 }
  ] })
].join('\n'));

test('evalIds expands ranges and ignores non-eval checks', () => {
  assert.deepEqual(evalIds('E-04a–c'), ['E-04a', 'E-04b', 'E-04c']);
  assert.deepEqual(evalIds('T-H05, E-01'), ['E-01']);
  assert.deepEqual(evalIds('C-budget'), []);
});

test('classification follows the pre-registered rules', () => {
  assert.equal(classify({ check: 'T-H05, E-01' }, evals).verdict, 'keep');
  assert.equal(classify({ check: 'T-H01, E-05' }, evals).verdict, 'retire-candidate');
  assert.equal(classify({ check: 'T-H03, E-06' }, evals).verdict, 'fix');
  assert.equal(classify({ check: 'E-04a–c' }, evals).verdict, 'retire-candidate');
  assert.equal(classify({ check: 'T-guard' }, evals).verdict, 'enforcement');
  assert.equal(classify({ check: 'C-budget' }, evals).verdict, 'no-evidence');
  assert.equal(classify({ check: 'E-09' }, evals).verdict, 'no-evidence');
  assert.equal(classify({ check: 'E-01' }, null).verdict, 'no-evidence');
});

test('the real REGISTRY.md parses into rows with a check and a retire condition', () => {
  const rows = parseRegistry(fs.readFileSync(path.join(ROOT, 'REGISTRY.md'), 'utf8'));
  assert.ok(rows.length >= 40);
  for (const r of rows) {
    assert.match(r.id, /^[A-Z]+-[A-Z0-9]+$/);
    assert.ok(r.check && r.check.length > 0, `${r.id} has no check`);
  }
  assert.ok(rows.some(r => r.id === 'SKL-12'), 'the audit skill is registered');
});
