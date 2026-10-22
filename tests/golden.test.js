// C-golden: a freshly scaffolded project passes its own checks, and the hooks enforce inside it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runPilot, runHook, decision, abs } from './helpers.js';

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
