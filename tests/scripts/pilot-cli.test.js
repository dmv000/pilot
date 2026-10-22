// T-manifest, T-sync, T-preview, T-schema, T-settings, and C-* fixture checks for scripts/pilot.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { runPilot, write, read, ROOT } from '../helpers.js';
import { validate } from '../../scripts/lib/schema.js';
import { mergeSettings } from '../../scripts/lib/scaffold.js';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'pilot-cli-'));
const schema = n => JSON.parse(fs.readFileSync(path.join(ROOT, 'templates/schemas', `${n}.schema.json`), 'utf8'));
const answersFile = (dir, extra = {}) => {
  const f = path.join(dir, '..', path.basename(dir) + '-answers.json');
  fs.writeFileSync(f, JSON.stringify({ project_name: 'Demo', projectType: 'web-app', stack: 'web-ts', profile: 'pro', hasAI: false, design: 'pending', ...extra }));
  return f;
};

test('scaffold web-ts: creates docs, rules, settings, CI and a valid manifest with hashes', () => {
  const dir = tmp();
  const r = runPilot(['scaffold', '--project', dir, '--answers', answersFile(dir)]);
  assert.equal(r.code, 0, r.stderr);
  for (const f of ['CLAUDE.md', 'docs/requirements/PRD.md', 'docs/planning/HANDOFF.md', '.claude/rules/web-ts/typescript.md', '.claude/settings.json', '.github/workflows/ci.yml', '.worktreeinclude', '.gitignore']) {
    assert.ok(fs.existsSync(path.join(dir, f)), f);
  }
  assert.ok(!fs.existsSync(path.join(dir, 'docs/ai/PERSONA.md')), 'no AI docs when hasAI is false');
  const manifest = JSON.parse(read(dir, '.pilot/manifest.json'));
  assert.deepEqual(validate(schema('manifest'), manifest), []);
  assert.equal(manifest.checks.fast, 'npm run check:fast');
  assert.ok(manifest.files['docs/requirements/PRD.md'].sha256.match(/^[0-9a-f]{64}$/));
  const settings = JSON.parse(read(dir, '.claude/settings.json'));
  assert.equal(settings.model, 'opusplan');
  assert.equal(settings.outputStyle, 'pilot:direct');
  assert.ok(settings.permissions.deny.includes('Read(./.env)'));
  assert.ok(settings.permissions.ask.includes('Bash(gh issue create *)'));
  assert.match(read(dir, 'CLAUDE.md'), /npm run check:fast/);
  assert.match(read(dir, '.gitignore'), /\.pilot\/state\.json/);
});

test('scaffold with AI and generic stack; never overwrites existing files', () => {
  const dir = tmp();
  write(dir, 'CLAUDE.md', '# Mine\n');
  write(dir, '.claude/settings.json', '{"model":"sonnet"}');
  const r = runPilot(['scaffold', '--project', dir, '--answers', answersFile(dir, { stack: 'generic', projectType: 'ai-system', hasAI: true, checks: { fast: 'pytest -q', acceptance: 'pytest tests/acceptance' } })]);
  assert.equal(r.code, 0, r.stderr);
  assert.equal(read(dir, 'CLAUDE.md'), '# Mine\n');
  assert.equal(read(dir, '.claude/settings.json'), '{"model":"sonnet"}');
  assert.ok(fs.existsSync(path.join(dir, 'CLAUDE.pilot-proposed.md')));
  assert.ok(fs.existsSync(path.join(dir, '.claude/settings.pilot-proposed.json')));
  assert.ok(fs.existsSync(path.join(dir, 'docs/ai/GUARDRAILS.md')));
  assert.ok(!fs.existsSync(path.join(dir, '.claude/rules/web-ts')));
  const manifest = JSON.parse(read(dir, '.pilot/manifest.json'));
  assert.equal(manifest.checks.fast, 'pytest -q');
});

test('record re-hashes edited files', () => {
  const dir = tmp();
  runPilot(['scaffold', '--project', dir, '--answers', answersFile(dir)]);
  const before = JSON.parse(read(dir, '.pilot/manifest.json')).files['docs/requirements/PRD.md'].sha256;
  write(dir, 'docs/requirements/PRD.md', read(dir, 'docs/requirements/PRD.md') + '\nmore\n');
  const r = runPilot(['record', '--project', dir, 'docs/requirements/PRD.md']);
  assert.equal(r.code, 0, r.stderr);
  const after = JSON.parse(read(dir, '.pilot/manifest.json')).files['docs/requirements/PRD.md'].sha256;
  assert.notEqual(before, after);
});

// A small, clean project for the check fixtures.
function cleanProject() {
  const dir = tmp();
  const h = 'Purpose: x.\nRead this when: x.\nRelated files: x.\n\nStatus: Approved (2026-10-22)\n';
  write(dir, 'docs/requirements/PRD.md', `# PRD\n\n${h}\n### US-001 Shorten a link\n\nAs a visitor I want a short link.\n`);
  write(dir, 'docs/requirements/SRS.md', `# SRS\n\n${h}\n### FR-001 Create short link\n\nWhen a valid URL is posted, the system shall return a code.\n\n- Traces to: US-001\n`);
  write(dir, 'docs/requirements/TECH-SPEC.md', `# Tech\n\n${h}\n### Module: links\n\n- Serves: FR-001\n`);
  write(dir, 'docs/planning/ROADMAP.md', `# Roadmap\n\n${h}\n## Step 1 Links\n\n- Stories: US-001\n`);
  write(dir, 'docs/planning/PROGRESS.md', `# Progress\n\n${h}\n| Step | Status | Review | Date |\n| --- | --- | --- | --- |\n| 1 | done | r | d |\n`);
  write(dir, 'tests/acceptance/links.test.ts', "// @req FR-001\ntest('creates a code', () => {});\n");
  write(dir, 'CLAUDE.md', '# Demo\n');
  runPilot(['trace', '--project', dir, '--write']);
  return dir;
}
const check = dir => runPilot(['check', '--project', dir]);

test('check passes on a clean project', () => {
  const dir = cleanProject();
  const r = check(dir);
  assert.equal(r.code, 0, r.stdout);
});

test('C-trace: a done step with an untested FR fails', () => {
  const dir = cleanProject();
  write(dir, 'tests/acceptance/links.test.ts', "test('creates a code', () => {});\n");
  runPilot(['trace', '--project', dir, '--write']);
  const r = check(dir);
  assert.equal(r.code, 1);
  assert.match(r.stdout, /\[trace\] FR-001 has no test/);
});

test('C-ids: duplicate definition and dangling reference fail', () => {
  const dir = cleanProject();
  write(dir, 'docs/requirements/TECH-SPEC.md', read(dir, 'docs/requirements/TECH-SPEC.md') + '\n### FR-001 copy\n\nSee FR-099.\n');
  const r = check(dir);
  assert.equal(r.code, 1);
  assert.match(r.stdout, /FR-001 is defined in 2 places/);
  assert.match(r.stdout, /FR-099, which is not defined/);
});

test('C-restate: 30 identical words copied between PRD and SRS fail', () => {
  const dir = cleanProject();
  const para = 'the visitor pastes a long address into the form and the service validates the address checks that the scheme is http or https rejects private network targets and then stores the mapping with an expiry date';
  write(dir, 'docs/requirements/PRD.md', read(dir, 'docs/requirements/PRD.md') + '\n' + para + '\n');
  write(dir, 'docs/requirements/SRS.md', read(dir, 'docs/requirements/SRS.md') + '\n' + para + '\n');
  const r = check(dir);
  assert.equal(r.code, 1);
  assert.match(r.stdout, /\[restate\]/);
});

test('C-header, C-01, C-handoff, placeholders and stale traceability fail', () => {
  const dir = cleanProject();
  write(dir, 'docs/RUNBOOK.md', '# Runbook\n\nNo header here.\n');
  write(dir, 'CLAUDE.md', 'x\n'.repeat(201));
  write(dir, 'docs/planning/HANDOFF.md', 'Purpose: x.\nRead this when: x.\nRelated files: x.\n' + 'y'.repeat(8001));
  write(dir, 'docs/GLOSSARY.md', 'Purpose: x.\nRead this when: x.\nRelated files: x.\n\nStatus: Approved\n\n| {{term}} |\n');
  write(dir, 'tests/unit/extra.test.ts', '// @req FR-001\n');
  const r = check(dir);
  assert.equal(r.code, 1);
  assert.match(r.stdout, /\[header\] docs\/RUNBOOK\.md/);
  assert.match(r.stdout, /CLAUDE\.md has 202 lines/);
  assert.match(r.stdout, /HANDOFF\.md has \d+ characters/);
  assert.match(r.stdout, /placeholder \{\{term\}\}/);
  assert.match(r.stdout, /traceability\.json is stale/);
});

test('C-todo: a new TODO without an issue reference fails against the base branch', () => {
  const dir = cleanProject();
  const git = (...a) => spawnSync('git', a, { cwd: dir, encoding: 'utf8' });
  git('init', '-q', '-b', 'main'); git('config', 'user.email', 't@t'); git('config', 'user.name', 't');
  git('add', '-A'); git('commit', '-qm', 'init');
  git('checkout', '-qb', 'feature');
  write(dir, 'src/a.ts', '// TODO later\nexport const a = 1;\n');
  git('add', '-A'); git('commit', '-qm', 'feat');
  const r = runPilot(['check', '--project', dir, '--base', 'main']);
  assert.equal(r.code, 1);
  assert.match(r.stdout, /\[todo\] src\/a\.ts/);
});

test('T-sync: gh issue JSON becomes the three mirrors and pending rows are pruned', () => {
  const dir = tmp();
  write(dir, 'docs/issues/PENDING.md', '| ID | Type | Title | IDs | Body file |\n| --- | --- | --- | --- | --- |\n| LOCAL-001 | bug | crash | FR-001 | x |\n| LOCAL-002 | bug | other | - | y |\n');
  const issues = [
    { number: 3, title: 'Crash on empty URL', state: 'OPEN', labels: [{ name: 'bug' }], body: 'Breaks FR-001.\npilot-local-id: LOCAL-001', createdAt: '2026-10-20T00:00:00Z' },
    { number: 4, title: 'Need DB decision', state: 'OPEN', labels: [{ name: 'problem' }], body: '', createdAt: '2026-10-21T00:00:00Z' },
    { number: 2, title: 'Off by one', state: 'CLOSED', labels: [{ name: 'bug' }], body: '### Root cause (fill when fixed)\n\nloop bound\n\n### Regression test (fill when fixed)\n\ntests/unit/a.test.ts', createdAt: '2026-10-01T00:00:00Z', closedAt: '2026-10-02T00:00:00Z' }
  ];
  const f = path.join(dir, 'issues.json');
  fs.writeFileSync(f, JSON.stringify(issues));
  const r = runPilot(['sync', '--project', dir, '--from', f]);
  assert.equal(r.code, 0, r.stderr);
  assert.match(read(dir, 'docs/issues/BUGS.md'), /\| #3 \| Crash on empty URL \| FR-001 \|/);
  assert.match(read(dir, 'docs/issues/PROBLEMS.md'), /#4/);
  assert.match(read(dir, 'docs/issues/RESOLVED.md'), /\| #2 \| Off by one \| loop bound \| tests\/unit\/a\.test\.ts \|/);
  assert.doesNotMatch(read(dir, 'docs/issues/PENDING.md'), /LOCAL-001/);
  assert.match(read(dir, 'docs/issues/PENDING.md'), /LOCAL-002/);
});

test('review records the real acceptance exit code', () => {
  const dir = tmp();
  write(dir, '.pilot/manifest.json', JSON.stringify({ checks: { acceptance: 'node -e "process.exit(3)"' } }));
  const v = path.join(dir, 'v.json');
  fs.writeFileSync(v, JSON.stringify({ verdict: 'pass', findings: [] }));
  let r = runPilot(['review', '--project', dir, '--step', '1', '--verdict', v]);
  assert.equal(r.code, 0, r.stderr);
  let review = JSON.parse(read(dir, '.pilot/reviews/step-1.json'));
  assert.equal(review.acceptance.exitCode, 3);
  write(dir, '.pilot/manifest.json', JSON.stringify({ checks: { acceptance: 'node -e "process.exit(0)"' } }));
  r = runPilot(['review', '--project', dir, '--step', '1', '--verdict', v]);
  review = JSON.parse(read(dir, '.pilot/reviews/step-1.json'));
  assert.equal(review.acceptance.exitCode, 0);
  assert.match(r.stdout, /"canMarkDone": true/);
});

test('T-preview: rendering is deterministic', () => {
  const dir = tmp();
  write(dir, 'docs/design/tokens.json', JSON.stringify({ color: { primary: { $value: '#0055ff', $type: 'color' }, bg: { $value: '#ffffff', $type: 'color' } }, space: { s: { $value: '4px', $type: 'dimension' } } }));
  write(dir, 'docs/design/DESIGN.md', '# Demo design\n');
  runPilot(['preview', '--project', dir]);
  const a = read(dir, 'docs/design/preview.html');
  runPilot(['preview', '--project', dir]);
  assert.equal(read(dir, 'docs/design/preview.html'), a);
  assert.match(a, /#0055ff/);
  assert.match(a, /<title>Demo design<\/title>/);
});

test('T-schema: each schema accepts its example and rejects broken ones', () => {
  const okManifest = { schemaVersion: 1, kitVersion: '0.1.0', templateVersion: 'v1', profile: 'pro', projectType: 'web-app', stack: 'web-ts', hasAI: false, design: 'pending', checks: { fast: 'x' }, files: {} };
  assert.deepEqual(validate(schema('manifest'), okManifest), []);
  assert.notDeepEqual(validate(schema('manifest'), { ...okManifest, profile: 'free' }), []);
  assert.notDeepEqual(validate(schema('manifest'), { ...okManifest, checks: { quick: 'x' } }), []);
  const { files, ...noFiles } = okManifest;
  assert.notDeepEqual(validate(schema('manifest'), noFiles), []);
  const okReview = { step: 1, acceptance: { command: 'x', exitCode: 0 }, verdict: 'pass', findings: [] };
  assert.deepEqual(validate(schema('review'), okReview), []);
  assert.notDeepEqual(validate(schema('review'), { ...okReview, verdict: 'ok' }), []);
  assert.notDeepEqual(validate(schema('review'), { ...okReview, step: 0 }), []);
  assert.notDeepEqual(validate(schema('review'), { ...okReview, findings: [{ severity: 'huge', summary: 'x' }] }), []);
  const okTrace = { generated: 'x', stories: { 'US-001': { requirements: ['FR-001'] } }, requirements: { 'FR-001': { tests: [], status: 'uncovered' } } };
  assert.deepEqual(validate(schema('traceability'), okTrace), []);
  assert.notDeepEqual(validate(schema('traceability'), { ...okTrace, generated: 1 }), []);
  assert.notDeepEqual(validate(schema('traceability'), { stories: {}, requirements: {} }), []);
  assert.notDeepEqual(validate(schema('traceability'), { ...okTrace, requirements: { 'FR-001': { tests: [], status: 'maybe' } } }), []);
});

test('T-settings: every profile and pack merges into valid settings with the secret deny list', () => {
  const s = n => JSON.parse(fs.readFileSync(path.join(ROOT, 'templates/settings', n), 'utf8'));
  for (const profile of ['pro', 'max']) for (const pack of ['web-ts', 'generic']) {
    const merged = mergeSettings(s('base.json'), s(`profile-${profile}.json`), s(`pack-${pack}.json`));
    assert.equal(merged.outputStyle, 'pilot:direct');
    assert.equal(merged.model, profile === 'pro' ? 'opusplan' : 'opus');
    for (const p of ['Read(./.env)', 'Read(./.env.*)', 'Read(./**/*.pem)', 'Read(~/.ssh/**)']) assert.ok(merged.permissions.deny.includes(p), p);
    assert.ok(merged.permissions.ask.includes('Bash(gh issue create *)'));
    assert.ok(!merged.permissions.allow.some(a => /gh issue create/.test(a)));
  }
});
