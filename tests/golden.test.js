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

test('scaffold without a profile defaults to pro; doctor fails CI that still names OWNER', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pilot-golden-noprofile-'));
  const answers = path.join(os.tmpdir(), `answers-${path.basename(dir)}.json`);
  fs.writeFileSync(answers, JSON.stringify({ project_name: 'NoProfile', projectType: 'web-app', stack: 'web-ts', hasAI: false, design: 'pending' }));
  assert.equal(runPilot(['scaffold', '--project', dir, '--answers', answers]).code, 0);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, '.claude/settings.json'), 'utf8')).model, 'opusplan');
  const doc = runPilot(['doctor', '--project', dir]);
  assert.match(doc.stdout, /FAIL\s+CI calls pilot-check: present, but the action owner is still the OWNER placeholder/);
});
