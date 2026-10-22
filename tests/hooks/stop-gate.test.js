// T-H04 and T-H05: track-edits and stop-gate (F01, F02).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { tmpProject, runHook, read, write } from '../helpers.js';

const state = dir => JSON.parse(read(dir, '.pilot/state.json') ?? '{}');
const post = (dir, tool_name, tool_input) => runHook('track-edits.js', dir, { hook_event_name: 'PostToolUse', tool_name, tool_input });
const stop = (dir, extra = {}) => runHook('stop-gate.js', dir, { hook_event_name: 'Stop', stop_hook_active: false, ...extra });

test('track-edits: edits and writing commands mark dirty, read-only commands do not', () => {
  const dir = tmpProject();
  post(dir, 'Bash', { command: 'git status' });
  assert.notEqual(state(dir).dirty, true);
  post(dir, 'Bash', { command: 'cat README.md' });
  assert.notEqual(state(dir).dirty, true);
  post(dir, 'Edit', { file_path: dir + '/src/a.ts' });
  assert.equal(state(dir).dirty, true);
  write(dir, '.pilot/state.json', '{}');
  post(dir, 'Bash', { command: 'npm install left-pad' });
  assert.equal(state(dir).dirty, true);
  write(dir, '.pilot/state.json', '{}');
  post(dir, 'Bash', { command: 'cat a > b' });
  assert.equal(state(dir).dirty, true);
});

test('stop-gate: clean session stops without running checks', () => {
  const dir = tmpProject({ manifest: { checks: { fast: 'node -e "process.exit(1)"' } } });
  const r = stop(dir);
  assert.equal(r.code, 0);
  assert.equal(r.stdout, '');
});

test('stop-gate: dirty + passing checks allows the stop and records green', () => {
  const dir = tmpProject({ manifest: { checks: { fast: 'node -e "process.exit(0)"' } }, files: { '.pilot/state.json': '{"dirty":true}' } });
  const r = stop(dir);
  assert.equal(r.code, 0);
  assert.notEqual(r.json?.decision, 'block');
  assert.equal(state(dir).dirty, false);
  assert.ok(state(dir).lastGreen?.at);
});

test('stop-gate: dirty + failing checks blocks with a short reason', () => {
  const dir = tmpProject({
    manifest: { checks: { fast: 'node -e "console.log(\'FAIL x.test.ts expected 2 got 3\'); process.exit(1)"' } },
    files: { '.pilot/state.json': '{"dirty":true}' }
  });
  const r = stop(dir);
  assert.equal(r.json?.decision, 'block');
  assert.match(r.json.reason, /expected 2 got 3/);
  assert.ok(r.json.reason.length <= 3000);
  assert.equal(state(dir).dirty, true);
});

test('stop-gate: the same failure twice while stop_hook_active stops blocking and warns', () => {
  const dir = tmpProject({ manifest: { checks: { fast: 'node -e "console.log(\'same failure\'); process.exit(1)"' } }, files: { '.pilot/state.json': '{"dirty":true}' } });
  const first = stop(dir);
  assert.equal(first.json?.decision, 'block');
  const second = stop(dir, { stop_hook_active: true });
  assert.notEqual(second.json?.decision, 'block');
  assert.match(second.json?.systemMessage ?? '', /still fail/);
});

test('stop-gate: a new TODO without an issue reference blocks', () => {
  const dir = tmpProject({ manifest: { checks: { fast: 'node -e "process.exit(0)"' } } });
  const git = (...a) => spawnSync('git', a, { cwd: dir, encoding: 'utf8' });
  git('init', '-q'); git('config', 'user.email', 't@t'); git('config', 'user.name', 't');
  write(dir, 'src/a.js', 'export const a = 1;\n');
  git('add', '-A'); git('commit', '-qm', 'init');
  write(dir, 'src/a.js', 'export const a = 1;\n// TODO handle errors\n');
  write(dir, '.pilot/state.json', '{"dirty":true}');
  let r = stop(dir);
  assert.equal(r.json?.decision, 'block');
  assert.match(r.json.reason, /TODO/);
  write(dir, 'src/a.js', 'export const a = 1;\n// TODO handle errors (#7)\n');
  r = stop(dir);
  assert.notEqual(r.json?.decision, 'block');
});

test('stop-gate: no fast check configured warns but does not block', () => {
  const dir = tmpProject({ manifest: { checks: {} }, files: { '.pilot/state.json': '{"dirty":true}' } });
  const r = stop(dir);
  assert.notEqual(r.json?.decision, 'block');
  assert.match(r.json?.systemMessage ?? '', /checks\.fast/);
});

test('track-edits: docs and pilot files do not mark dirty; test runs without fix flags do not either', () => {
  const dir = tmpProject();
  post(dir, 'Edit', { file_path: dir + '/docs/planning/HANDOFF.md' });
  post(dir, 'Write', { file_path: dir + '/README.md' });
  post(dir, 'Bash', { command: 'npm test' });
  post(dir, 'Bash', { command: 'npm run check:fast' });
  post(dir, 'Bash', { command: 'npx vitest run tests/a.test.ts' });
  post(dir, 'Bash', { command: 'python3 -m unittest discover -s tests' });
  assert.notEqual(state(dir).dirty, true);
  post(dir, 'Bash', { command: 'npx vitest run -u' });
  assert.equal(state(dir).dirty, true);
  write(dir, '.pilot/state.json', '{}');
  post(dir, 'Bash', { command: 'npm run lint -- --fix' });
  assert.equal(state(dir).dirty, true);
});

test('stop-gate: a TODO blocks before the first commit too, staged or not', () => {
  // Right after /pilot:new there is no commit, so `git diff HEAD` fails; the TODO scan must still run.
  const dir = tmpProject({ manifest: { checks: { fast: 'node -e "process.exit(0)"' } } });
  const git = (...a) => spawnSync('git', a, { cwd: dir, encoding: 'utf8' });
  git('init', '-q');
  write(dir, 'src/staged.js', 'export const s = 1; // TODO zero people\n');
  git('add', 'src/staged.js');
  write(dir, 'src/loose.js', 'export const l = 1; // HACK rounding\n');
  write(dir, '.pilot/state.json', '{"dirty":true}');
  let r = stop(dir);
  assert.equal(r.json?.decision, 'block');
  assert.match(r.json.reason, /src\/staged\.js: .*TODO/);
  assert.match(r.json.reason, /src\/loose\.js: .*HACK/);
  write(dir, 'src/staged.js', 'export const s = 1; // TODO zero people (#1)\n');
  write(dir, 'src/loose.js', 'export const l = 1;\n');
  r = stop(dir);
  assert.notEqual(r.json?.decision, 'block');
});

test('stop-gate: a TODO in a new untracked file blocks too', () => {
  const dir = tmpProject({ manifest: { checks: { fast: 'node -e "process.exit(0)"' } } });
  const git = (...a) => spawnSync('git', a, { cwd: dir, encoding: 'utf8' });
  git('init', '-q'); git('config', 'user.email', 't@t'); git('config', 'user.name', 't');
  write(dir, 'README.md', '# x\n');
  git('add', '-A'); git('commit', '-qm', 'init');
  write(dir, 'src/new.ts', 'export const n = 1; // FIXME edge cases\n');
  write(dir, '.pilot/state.json', '{"dirty":true}');
  const r = stop(dir);
  assert.equal(r.json?.decision, 'block');
  assert.match(r.json.reason, /src\/new\.ts: .*FIXME/);
});
