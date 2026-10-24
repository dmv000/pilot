// gh is optional: a project can keep its issues in docs/issues/ with only git installed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { tmpProject, runHook, runPilot, read, write } from '../helpers.js';

// PATH without gh (or anything else): proves a command never needs gh.
const NO_GH = { env: { ...process.env, PATH: '', Path: '' } };
const PENDING = '| ID | Type | Title | IDs | Body file |\n| --- | --- | --- | --- | --- |\n| LOCAL-001 | bug | Crash on zero people | FR-001 | .pilot/pending/LOCAL-001.md |\n| LOCAL-002 | problem | Pick a currency | - | .pilot/pending/LOCAL-002.md |\n| LOCAL-003 | bug | Rounding | FR-001 | .pilot/pending/LOCAL-003.md |\n';

const scaffold = extra => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pilot-issues-'));
  const answers = path.join(os.tmpdir(), `answers-${path.basename(dir)}.json`);
  fs.writeFileSync(answers, JSON.stringify({ project_name: 'Issues', projectType: 'script', stack: 'generic', profile: 'pro', hasAI: false, design: 'not-applicable', checks: { fast: 'node -e "process.exit(0)"' }, ...extra }));
  assert.equal(runPilot(['scaffold', '--project', dir, '--answers', answers]).code, 0);
  return { dir, manifest: JSON.parse(read(dir, '.pilot/manifest.json')) };
};

test('scaffold records the issue-tracking choice; github stays the default', () => {
  assert.equal(scaffold({ issues: 'local' }).manifest.issues, 'local');
  const { dir, manifest } = scaffold({});
  assert.equal(manifest.issues, 'github');
  assert.equal(runPilot(['check', '--project', dir]).code, 0);
});

test('sync with local issues succeeds without gh and reports the open count', () => {
  const dir = tmpProject({ manifest: { issues: 'local' }, files: { 'docs/issues/PENDING.md': PENDING } });
  const r = runPilot(['sync', '--project', dir], NO_GH);
  assert.equal(r.code, 0, r.stderr);
  const outp = JSON.parse(r.stdout);
  assert.equal(outp.issues, 'local');
  assert.equal(outp.open, 3);
});

test('sync with GitHub issues and no gh fails with a hint about local issues', () => {
  const dir = tmpProject();
  const r = runPilot(['sync', '--project', dir], NO_GH);
  assert.equal(r.code, 2);
  assert.match(r.stderr, /"issues": "local"/);
});

test('session start counts local bugs and problems and does not ask for a sync', () => {
  const dir = tmpProject({ manifest: { issues: 'local' }, files: { 'docs/issues/PENDING.md': PENDING } });
  const ctx = runHook('session-start.js', dir, { hook_event_name: 'SessionStart', source: 'startup' }).json.hookSpecificOutput.additionalContext;
  assert.match(ctx, /Open bugs: 2\. Open problems: 1\./);
  assert.doesNotMatch(ctx, /Run \/pilot:sync/);
});

test('moving to GitHub keeps the issues resolved locally', () => {
  const dir = tmpProject();
  write(dir, 'docs/issues/RESOLVED.md', 'old mirror\n\n## Resolved without GitHub\n\n| ID | Title | Root cause | Regression test | Closed |\n| --- | --- | --- | --- | --- |\n| LOCAL-003 | Rounding | float math | tests/unit/split.test.js | 2026-10-24 |\n');
  const f = path.join(dir, 'issues.json');
  fs.writeFileSync(f, JSON.stringify([{ number: 9, title: 'Off by one', state: 'CLOSED', labels: [{ name: 'bug' }], body: '', closedAt: '2026-10-25T00:00:00Z' }]));
  assert.equal(runPilot(['sync', '--project', dir, '--from', f]).code, 0);
  const resolved = read(dir, 'docs/issues/RESOLVED.md');
  assert.match(resolved, /\| #9 \| Off by one \|/);
  assert.match(resolved, /\| LOCAL-003 \| Rounding \| float math \|/);
  assert.doesNotMatch(resolved, /old mirror/);
});

test('doctor treats gh as optional: a WARN, never a FAIL', () => {
  const rows = dir => JSON.parse(runPilot(['doctor', '--project', dir, '--json'], NO_GH).stdout);
  const gh = list => list.find(r => r.name.startsWith('gh '));
  const github = gh(rows(tmpProject()));
  assert.equal(github.optional, true);
  assert.equal(github.ok, false);
  assert.match(github.detail, /PENDING\.md/);
  assert.equal(gh(rows(tmpProject({ manifest: { issues: 'local' } }))).ok, true);
});
