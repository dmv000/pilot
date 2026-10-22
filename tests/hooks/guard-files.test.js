// T-H02: guard-files (F02, F06, F16, F20).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tmpProject, runHook, decision, abs, write } from '../helpers.js';

const edit = (dir, rel, old_string, new_string, extra = {}) =>
  runHook('guard-files.js', dir, { hook_event_name: 'PreToolUse', tool_name: 'Edit', tool_input: { file_path: abs(dir, rel), old_string, new_string }, ...extra });
const writeFile = (dir, rel, content, extra = {}) =>
  runHook('guard-files.js', dir, { hook_event_name: 'PreToolUse', tool_name: 'Write', tool_input: { file_path: abs(dir, rel), content }, ...extra });

test('blocks .env, lockfile from manifest, and .git edits; allows .env.example', () => {
  const dir = tmpProject({ manifest: { protectedPaths: ['package-lock.json', 'migrations/applied/**'] } });
  assert.equal(decision(writeFile(dir, '.env', 'A=1')), 'deny');
  assert.equal(decision(writeFile(dir, 'config/.env.local', 'A=1')), 'deny');
  assert.equal(decision(writeFile(dir, 'package-lock.json', '{}')), 'deny');
  assert.equal(decision(writeFile(dir, 'migrations/applied/001.sql', 'x')), 'deny');
  assert.equal(decision(writeFile(dir, '.git/config', 'x')), 'deny');
  assert.equal(decision(writeFile(dir, '.env.example', 'A=')), 'allow');
  assert.equal(decision(writeFile(dir, 'src/app.ts', 'export {}')), 'allow');
});

test('handles Windows backslash paths', () => {
  const dir = tmpProject();
  const winPath = abs(dir, '.env').replace(/\//g, '\\');
  const r = runHook('guard-files.js', dir, { hook_event_name: 'PreToolUse', tool_name: 'Write', tool_input: { file_path: winPath, content: 'x' } });
  assert.equal(decision(r), 'deny');
});

test('acceptance tests: implementer denied, main session asked, test-writer allowed', () => {
  const dir = tmpProject();
  const rel = 'tests/acceptance/login.test.ts';
  assert.equal(decision(writeFile(dir, rel, 'x', { agent_type: 'pilot:implementer' })), 'deny');
  assert.equal(decision(writeFile(dir, rel, 'x', { agent_type: 'implementer' })), 'deny');
  assert.equal(decision(writeFile(dir, rel, 'x')), 'ask');
  assert.equal(decision(writeFile(dir, rel, 'x', { agent_type: 'pilot:test-writer' })), 'allow');
});

test('new test skips are blocked unless marked with an issue', () => {
  const dir = tmpProject();
  const rel = 'tests/unit/a.test.ts';
  assert.equal(decision(edit(dir, rel, "it('works', () => {", "it.skip('works', () => {")), 'deny');
  assert.equal(decision(edit(dir, rel, 'def test_a():', '@pytest.mark.skip\ndef test_a():')), 'deny');
  assert.equal(decision(edit(dir, rel, "it('works', () => {", "// pilot-allow-skip: #12\nit.skip('works', () => {")), 'allow');
  // An existing skip that is only moved is not new.
  assert.equal(decision(edit(dir, rel, "it.skip('a')\nx", "y\nit.skip('a')")), 'allow');
});

test('test config that excludes tests is blocked for implementer, asked for main', () => {
  const dir = tmpProject();
  const content = 'export default { test: { exclude: ["tests/flaky/**"] } }';
  assert.equal(decision(writeFile(dir, 'vitest.config.ts', content, { agent_type: 'pilot:implementer' })), 'deny');
  assert.equal(decision(writeFile(dir, 'vitest.config.ts', content)), 'ask');
});

test('marking a roadmap step done needs a passing review file', () => {
  const dir = tmpProject({ files: { 'docs/planning/PROGRESS.md': '| Step | Status | Review | Date |\n| --- | --- | --- | --- |\n| 1 | in progress | - | - |\n' } });
  const old = '| 1 | in progress | - | - |';
  const done = '| 1 | done | .pilot/reviews/step-1.json | 2026-10-22 |';
  assert.equal(decision(edit(dir, 'docs/planning/PROGRESS.md', old, done)), 'deny');
  write(dir, '.pilot/reviews/step-1.json', JSON.stringify({ step: 1, acceptance: { command: 'npm run test:acceptance', exitCode: 1 }, verdict: 'pass' }));
  assert.equal(decision(edit(dir, 'docs/planning/PROGRESS.md', old, done)), 'deny');
  write(dir, '.pilot/reviews/step-1.json', JSON.stringify({ step: 1, acceptance: { command: 'npm run test:acceptance', exitCode: 0 }, verdict: 'fail' }));
  assert.equal(decision(edit(dir, 'docs/planning/PROGRESS.md', old, done)), 'deny');
  write(dir, '.pilot/reviews/step-1.json', JSON.stringify({ step: 1, acceptance: { command: 'npm run test:acceptance', exitCode: 0 }, verdict: 'pass' }));
  assert.equal(decision(edit(dir, 'docs/planning/PROGRESS.md', old, done)), 'allow');
});
