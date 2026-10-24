// C-golden: a freshly scaffolded project passes its own checks, and the hooks enforce inside it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runPilot, runHook, decision, abs, PLUGIN } from './helpers.js';

for (const [stack, projectType, hasAI] of [['web-ts', 'web-app', false], ['generic', 'ai-system', true], ['generic', 'script', false]]) {
  test(`golden ${stack}/${projectType}: scaffold, check, hooks`, () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `pilot-golden-${stack}-`));
    const answers = path.join(os.tmpdir(), `answers-${path.basename(dir)}.json`);
    fs.writeFileSync(answers, JSON.stringify({
      project_name: 'Golden', projectType, stack, profile: 'pro', hasAI,
      design: projectType === 'script' ? 'not-applicable' : 'pending',
      checks: stack === 'generic' ? { fast: 'node -e "process.exit(0)"', full: 'node -e "process.exit(0)"', acceptance: 'node -e "process.exit(0)"' } : undefined
    }));
    assert.equal(runPilot(['scaffold', '--project', dir, '--answers', answers]).code, 0);

    // A fresh project has warnings (nothing tested yet) but no errors.
    runPilot(['trace', '--project', dir, '--write']);
    const check = runPilot(['check', '--project', dir]);
    assert.equal(check.code, 0, check.stdout);

    // Hooks are active in the scaffolded project.
    const put = (rel, extra = {}) => decision(runHook('guard-files.js', dir, { tool_name: 'Write', tool_input: { file_path: abs(dir, rel), content: 'x' }, ...extra }));
    assert.equal(put('.env'), 'deny');
    assert.equal(put('tests/acceptance/a.test.ts', { agent_type: 'pilot:implementer' }), 'deny');
    assert.equal(put('src/index.ts'), 'allow');
    const start = runHook('session-start.js', dir, { hook_event_name: 'SessionStart', source: 'startup' });
    const ctx = start.json.hookSpecificOutput.additionalContext;
    assert.match(ctx, /Next action/);
    if (projectType === 'script') assert.doesNotMatch(ctx, /Design system not created yet/);
    else assert.match(ctx, /Design system not created yet/);
  });
}

test('hooks.json: edit and shell guards fail closed; the read guard and the rest fail open', () => {
  const h = JSON.parse(fs.readFileSync(path.join(PLUGIN, 'hooks', 'hooks.json'), 'utf8')).hooks;
  const entry = m => h.PreToolUse.find(e => e.matcher === m).hooks[0];
  assert.equal(entry('Edit|Write|NotebookEdit').onFailure, 'block');
  assert.equal(entry('Bash|PowerShell').onFailure, 'block');
  assert.equal(entry('Read').onFailure, undefined);
  for (const ev of ['SessionStart', 'PostToolUse', 'Stop']) for (const g of h[ev]) for (const x of g.hooks) assert.equal(x.onFailure, undefined, ev);
});

test('scaffold without a profile defaults to pro; CI points at the real pilot-check; doctor still catches an OWNER placeholder', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pilot-golden-noprofile-'));
  const answers = path.join(os.tmpdir(), `answers-${path.basename(dir)}.json`);
  fs.writeFileSync(answers, JSON.stringify({ project_name: 'NoProfile', projectType: 'web-app', stack: 'web-ts', hasAI: false, design: 'pending' }));
  assert.equal(runPilot(['scaffold', '--project', dir, '--answers', answers]).code, 0);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, '.claude/settings.json'), 'utf8')).model, 'opusplan');
  const ci = path.join(dir, '.github/workflows/ci.yml');
  assert.match(fs.readFileSync(ci, 'utf8'), /uses: dmv000\/pilot\/\.github\/actions\/pilot-check@/);
  assert.match(runPilot(['doctor', '--project', dir]).stdout, /PASS\s+CI calls pilot-check: present/);
  fs.writeFileSync(ci, fs.readFileSync(ci, 'utf8').replace('dmv000/pilot', 'OWNER/pilot'));
  assert.match(runPilot(['doctor', '--project', dir]).stdout, /FAIL\s+CI calls pilot-check: present, but the action owner is still the OWNER placeholder/);
});

test('new projects get the architecture and scale sections, and the interview guide ships with the plugin', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pilot-golden-arch-'));
  const answers = path.join(os.tmpdir(), `answers-${path.basename(dir)}.json`);
  fs.writeFileSync(answers, JSON.stringify({ project_name: 'Arch', projectType: 'web-app', stack: 'web-ts', profile: 'pro', hasAI: false, design: 'pending' }));
  assert.equal(runPilot(['scaffold', '--project', dir, '--answers', answers]).code, 0);
  const spec = fs.readFileSync(path.join(dir, 'docs/requirements/TECH-SPEC.md'), 'utf8');
  for (const h of ['## Architecture style', '## Design patterns', '## Scalability and load']) assert.match(spec, new RegExp(`^${h}$`, 'm'), h);
  assert.match(fs.readFileSync(path.join(dir, 'docs/requirements/SRS.md'), 'utf8'), /^### NFR-002 Capacity and response time$/m);
  const guide = fs.readFileSync(path.join(PLUGIN, 'skills/new/architecture.md'), 'utf8');
  for (const s of ['Clean / hexagonal', 'Modular monolith', 'Microservices', 'Circuit breaker', 'Read replicas']) assert.ok(guide.includes(s), s);
  assert.match(fs.readFileSync(path.join(PLUGIN, 'skills/new/questions.md'), 'utf8'), /^## Phase 7b — Architecture and scale$/m);
});

test('the pattern catalogue covers all 22 classic patterns, and every big system cites a source', () => {
  const NEW = path.join(PLUGIN, 'skills/new');
  const patterns = fs.readFileSync(path.join(NEW, 'patterns.md'), 'utf8');
  const gof = ['factory-method', 'abstract-factory', 'builder', 'prototype', 'singleton', 'adapter', 'bridge', 'composite', 'decorator', 'facade', 'flyweight', 'proxy',
    'chain-of-responsibility', 'command', 'iterator', 'mediator', 'memento', 'observer', 'state', 'strategy', 'template-method', 'visitor'];
  for (const slug of gof) assert.ok(patterns.includes(`(https://refactoring.guru/design-patterns/${slug})`), slug);
  for (const p of ['Sharding', 'Consistent hashing', 'Fan-out on write', 'Actor model', 'Cell-based']) assert.ok(patterns.includes(p), p);

  const systems = fs.readFileSync(path.join(NEW, 'big-systems.md'), 'utf8');
  const rows = systems.split('\n').filter(l => /^\| \*\*/.test(l));
  for (const name of ['Meta', 'WhatsApp', 'YouTube', 'Netflix', 'X (Twitter)', 'Discord', 'Telegram', 'Uber', 'Amazon', 'Shopify']) {
    const row = rows.find(r => r.includes(`**${name}`));
    assert.ok(row, name);
    assert.match(row.split('|').at(-2), /\]\(https:\/\//, `${name} has a source link`);
  }
  // Every relative link between the interview guides points at a file that ships.
  for (const f of fs.readdirSync(NEW).filter(f => f.endsWith('.md'))) {
    for (const [, target] of fs.readFileSync(path.join(NEW, f), 'utf8').matchAll(/\]\(([^)#:]+\.md)\)/g)) assert.ok(fs.existsSync(path.join(NEW, target)), `${f} -> ${target}`);
  }
});
