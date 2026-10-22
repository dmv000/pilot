// The benchmark's hidden tests are valid: they fail on each starting workspace and pass 100% on the
// reference solution (B-5: the original tests pass on the reference too). No network needed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildWorkspace, loadTask, BENCH } from '../bench/lib/build.mjs';

const python = ['python3', 'python'].find(p => spawnSync(p, ['--version']).status === 0);

function runHidden(task, dir) {
  fs.cpSync(path.join(BENCH, 'tasks', task.id, 'hidden'), path.join(dir, '.bench-hidden'), { recursive: true });
  const cmd = python ? task.hidden.command.replace(/^python3\b/, python) : task.hidden.command;
  // A nested `node --test` inherits NODE_TEST_CONTEXT from this runner and would report to it instead of printing TAP.
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const r = spawnSync(cmd, { cwd: dir, shell: true, encoding: 'utf8', timeout: 120000, env });
  const out = `${r.stdout}\n${r.stderr}`;
  if (task.hidden.format === 'tap') return { pass: Number(out.match(/^# pass (\d+)/m)?.[1] ?? 0), fail: Number(out.match(/^# fail (\d+)/m)?.[1] ?? 0), out };
  const ran = Number(out.match(/Ran (\d+) tests?/)?.[1] ?? 0);
  const fail = Number(out.match(/failures=(\d+)/)?.[1] ?? 0) + Number(out.match(/errors=(\d+)/)?.[1] ?? 0);
  return { pass: ran - fail, fail: ran ? fail : 1, out };
}

for (const id of ['B-1', 'B-2', 'B-3', 'B-4', 'B-5']) {
  const task = loadTask(id);
  const skip = task.stack !== 'web-ts' && !python ? 'python not installed' : false;
  test(`${id}: hidden tests fail on the start and pass on the reference`, { skip }, () => {
    for (const arm of ['vanilla', 'pilot']) {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), `bench-${id}-${arm}-`));
      buildWorkspace(id, arm, dir, { install: false });
      assert.ok(fs.existsSync(path.join(dir, arm === 'vanilla' ? 'SPEC.md' : 'docs/requirements/SRS.md')));
      if (arm === 'pilot') {
        const check = spawnSync(process.execPath, [path.join(BENCH, '..', 'scripts', 'pilot.js'), 'check', '--project', dir], { encoding: 'utf8' });
        assert.equal(check.status, 0, check.stdout);
      }
      const start = runHidden(task, dir);
      assert.ok(start.fail > 0, `${id} ${arm}: hidden tests should fail before any work\n${start.out.slice(-500)}`);
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `bench-${id}-ref-`));
    buildWorkspace(id, 'vanilla', dir, { install: false });
    fs.cpSync(path.join(BENCH, 'tasks', id, 'reference'), dir, { recursive: true });
    const ref = runHidden(task, dir);
    assert.equal(ref.fail, 0, `${id}: reference fails hidden tests\n${ref.out.slice(-1500)}`);
    assert.ok(ref.pass >= 7, `${id}: too few hidden tests (${ref.pass})`);
    if (id === 'B-5') {
      const env = { ...process.env };
      delete env.NODE_TEST_CONTEXT;
      const orig = spawnSync(process.execPath, ['--test', 'tests/zoned.test.ts'], { cwd: dir, encoding: 'utf8', env });
      assert.equal(orig.status, 0, orig.stdout + orig.stderr);
    }
  });
}
