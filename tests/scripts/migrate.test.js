// C-migrate: golden upgrade tests (P3 5.1). Untouched files migrate automatically, edited files wait for
// approval, nothing is deleted, backups are taken, migrations chain, and running twice equals running once.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runPilot, write, read, ROOT } from '../helpers.js';

const FIXTURES = path.join(ROOT, 'tests', 'fixtures', 'migrations');
const V2_ONLY = (() => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'mig-v2-')); fs.copyFileSync(path.join(FIXTURES, 'v1-to-v2.js'), path.join(d, 'v1-to-v2.js')); return d; })();

function v1Project() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pilot-mig-'));
  const answers = path.join(os.tmpdir(), `answers-${path.basename(dir)}.json`);
  fs.writeFileSync(answers, JSON.stringify({ project_name: 'Golden', projectType: 'web-app', stack: 'web-ts', profile: 'pro', hasAI: false, design: 'pending' }));
  assert.equal(runPilot(['scaffold', '--project', dir, '--answers', answers]).code, 0);
  return dir;
}
const migrate = (dir, args, dirOfMigrations = V2_ONLY) => runPilot(['migrate', '--project', dir, '--migrations', dirOfMigrations, ...args]);
const plan = (dir, dirOfMigrations) => JSON.parse(migrate(dir, ['--plan', '--json'], dirOfMigrations).stdout);
const manifest = dir => JSON.parse(read(dir, '.pilot/manifest.json'));
const files = dir => { const out = []; const rec = s => { for (const e of fs.readdirSync(path.join(dir, s), { withFileTypes: true })) { const r = s ? `${s}/${e.name}` : e.name; if (e.isDirectory()) { if (!['.pilot', '.git'].includes(e.name)) rec(r); } else out.push(r); } }; rec(''); return out; };
const byStatus = (p, s) => p.files.filter(f => f.status === s).map(f => f.path).sort();

test('untouched project: everything migrates automatically, with backups, and a re-plan says up to date', () => {
  const dir = v1Project();
  const before = files(dir);
  const p = plan(dir);
  assert.equal(p.from, 'v1');
  assert.equal(p.to, 'v2');
  assert.deepEqual(byStatus(p, 'auto'), ['.claude/rules/common/tests.md', '.claude/settings.json', 'docs/planning/HANDOFF.md']);
  assert.deepEqual(byStatus(p, 'create'), ['docs/planning/RISKS.md']);
  assert.deepEqual(byStatus(p, 'approval'), []);
  const r = migrate(dir, ['--apply']);
  assert.equal(r.code, 0, r.stderr);
  assert.match(read(dir, 'docs/planning/HANDOFF.md'), /## Blockers/);
  assert.ok(JSON.parse(read(dir, '.claude/settings.json')).permissions.deny.includes('Read(./**/*.key)'));
  assert.ok(fs.existsSync(path.join(dir, 'docs/planning/RISKS.md')));
  assert.equal(manifest(dir).templateVersion, 'v2');
  assert.ok(before.every(f => fs.existsSync(path.join(dir, f))), 'no file was deleted');
  const backupRoot = path.join(dir, '.pilot', 'backups');
  const stamp = fs.readdirSync(backupRoot)[0];
  assert.ok(fs.existsSync(path.join(backupRoot, stamp, 'docs/planning/HANDOFF.md')));
  assert.doesNotMatch(fs.readFileSync(path.join(backupRoot, stamp, 'docs/planning/HANDOFF.md'), 'utf8'), /## Blockers/);
  assert.match(migrate(dir, ['--plan']).stdout, /up to date \(v2\)/);
});

test('edited files need approval: declined ones stay untouched and are recorded; approved ones change', () => {
  const dir = v1Project();
  write(dir, 'docs/planning/HANDOFF.md', read(dir, 'docs/planning/HANDOFF.md') + '\nMy own note.\n');
  const settings = JSON.parse(read(dir, '.claude/settings.json'));
  settings.model = 'sonnet';
  write(dir, '.claude/settings.json', JSON.stringify(settings, null, 2) + '\n');
  const p = plan(dir);
  assert.deepEqual(byStatus(p, 'approval'), ['.claude/settings.json', 'docs/planning/HANDOFF.md']);
  assert.match(p.files.find(f => f.path === 'docs/planning/HANDOFF.md').diff, /^\+ ## Blockers$/m);
  const editedSettings = read(dir, '.claude/settings.json');
  const r = migrate(dir, ['--apply', '--approve', 'docs/planning/HANDOFF.md']);
  assert.equal(r.code, 0, r.stderr);
  assert.match(read(dir, 'docs/planning/HANDOFF.md'), /My own note\.[\s\S]*## Blockers/);
  assert.equal(read(dir, '.claude/settings.json'), editedSettings, 'declined file untouched');
  const m = manifest(dir);
  assert.deepEqual(m.migrations.declined.map(d => d.path), ['.claude/settings.json']);
  assert.equal(m.templateVersion, 'v2');
});

test('half-migrated project: an already-applied change is detected as unchanged, not re-applied', () => {
  const dir = v1Project();
  write(dir, 'docs/planning/HANDOFF.md', read(dir, 'docs/planning/HANDOFF.md').replace(/\s*$/, '\n\n## Blockers\n\n- None.\n'));
  const p = plan(dir);
  assert.ok(byStatus(p, 'unchanged').includes('docs/planning/HANDOFF.md'));
  assert.ok(!byStatus(p, 'approval').includes('docs/planning/HANDOFF.md'));
  migrate(dir, ['--apply']);
  assert.equal((read(dir, 'docs/planning/HANDOFF.md').match(/## Blockers/g) ?? []).length, 1);
});

test('running a migration twice equals running it once', () => {
  const dir = v1Project();
  migrate(dir, ['--apply']);
  const snapshot = Object.fromEntries(files(dir).map(f => [f, read(dir, f)]));
  const m = manifest(dir);
  m.templateVersion = 'v1';
  write(dir, '.pilot/manifest.json', JSON.stringify(m, null, 2));
  migrate(dir, ['--apply', '--approve', 'all']);
  for (const [f, text] of Object.entries(snapshot)) assert.equal(read(dir, f), text, f);
});

test('migrations chain: v1 -> v2 -> v3 in one run, including edits to a file v2 creates', () => {
  const dir = v1Project();
  const p = plan(dir, FIXTURES);
  assert.equal(p.to, 'v3');
  assert.equal(p.steps.length, 2);
  migrate(dir, ['--apply'], FIXTURES);
  assert.match(read(dir, 'docs/planning/RISKS.md'), /\| Risk \| Likelihood/);
  assert.equal(manifest(dir).templateVersion, 'v3');
});

test('the shipped kit has no migrations yet, so a v1 project is up to date', () => {
  const dir = v1Project();
  const r = runPilot(['migrate', '--project', dir, '--plan']);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /up to date \(v1\)/);
});
