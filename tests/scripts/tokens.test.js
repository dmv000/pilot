// Token savings: trimmed failure output, the 3-attempt cap at the end-of-turn check, and the saver profile.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpProject, runHook, runPilot, read, PLUGIN } from '../helpers.js';
import { buildWorkspace } from '../../bench/lib/build.mjs';

const { trimFailure } = await import(pathToFileURL(path.join(PLUGIN, 'hooks', 'lib', 'output.js')).href);

test('trimFailure drops colors, runtime stack frames and repeats, and keeps the failure', () => {
  const raw = [
    '\x1b[31m✖ FR-001: 90 with 10% tip (0.8ms)\x1b[39m',
    '  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:',
    '  33.01 !== 33',
    '      at TestContext.<anonymous> (file:///p/tests/unit/split.test.js:5:77)',
    '      at Test.runInAsyncScope (node:async_hooks:227:14)',
    '      at Test.run (node:internal/test_runner/test:1402:25)',
    '      at startSubtestAfterBootstrap (node:internal/test_runner/harness:387:17)',
    '      at Object.<anonymous> (/p/node_modules/vitest/dist/index.js:1:1)',
    '', '', '',
    'ℹ duration_ms 51.7', 'ℹ fail 1', 'ℹ fail 1'
  ].join('\n');
  const out = trimFailure(raw);
  assert.match(out, /33\.01 !== 33/);
  assert.match(out, /tests\/unit\/split\.test\.js:5:77/);
  assert.doesNotMatch(out, /\x1b|node:internal|node_modules|duration_ms|runInAsyncScope/);
  assert.equal(out.match(/ℹ fail 1/g).length, 1);
  assert.match(out, /^\(\d+ noise or earlier lines trimmed\)/);
  const long = trimFailure(Array.from({ length: 500 }, (_, i) => `line ${i} ${'x'.repeat(40)}`).join('\n'));
  assert.ok(long.length <= 2100, `${long.length}`);
  assert.match(long, /line 499/);
});

test('stop-gate: after 3 fix attempts Claude is stopped, marked NOT verified', () => {
  // A different failure each time, so the "same failure twice" rule never fires first.
  const dir = tmpProject({ manifest: { checks: { fast: 'node -e "console.log(\'fail \' + Date.now() + Math.random()); process.exit(1)"' } }, files: { '.pilot/state.json': '{"dirty":true}' } });
  const stop = active => runHook('stop-gate.js', dir, { hook_event_name: 'Stop', stop_hook_active: active });
  assert.equal(stop(false).json?.decision, 'block'); // "done" claimed, checks fail
  assert.equal(stop(true).json?.decision, 'block'); // after attempt 1
  assert.equal(stop(true).json?.decision, 'block'); // after attempt 2
  const last = stop(true); // after attempt 3
  assert.notEqual(last.json?.decision, 'block');
  assert.match(last.json?.systemMessage ?? '', /3 fix attempts .* NOT verified/s);
  assert.match(last.json.systemMessage, /\/pilot:debug/);
  // A new turn from the owner starts a fresh count.
  assert.equal(stop(false).json?.decision, 'block');
});

test('saver profile: scaffold, switch and the bench arm all use sonnet', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pilot-saver-'));
  const answers = path.join(os.tmpdir(), `answers-${path.basename(dir)}.json`);
  fs.writeFileSync(answers, JSON.stringify({ project_name: 'Saver', projectType: 'script', stack: 'generic', profile: 'saver', hasAI: false, design: 'not-applicable', checks: { fast: 'node -e "process.exit(0)"' } }));
  assert.equal(runPilot(['scaffold', '--project', dir, '--answers', answers]).code, 0);
  assert.equal(JSON.parse(read(dir, '.pilot/manifest.json')).profile, 'saver');
  assert.equal(JSON.parse(read(dir, '.claude/settings.json')).model, 'sonnet');
  assert.equal(runPilot(['check', '--project', dir]).code, 0);

  assert.equal(runPilot(['profile', 'pro', '--project', dir]).code, 0);
  assert.equal(JSON.parse(read(dir, '.claude/settings.json')).model, 'opusplan');
  assert.equal(runPilot(['profile', 'saver', '--project', dir]).code, 0);
  assert.equal(JSON.parse(read(dir, '.claude/settings.json')).model, 'sonnet');
  assert.notEqual(runPilot(['profile', 'cheap', '--project', dir]).code, 0);

  const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'bench-saver-'));
  buildWorkspace('B-3', 'pilot-saver', ws, { install: false });
  assert.equal(JSON.parse(read(ws, '.claude/settings.json')).model, 'sonnet');
});

test('verify-change passes the review model through; the step skill names it for saver', () => {
  const wf = fs.readFileSync(path.join(PLUGIN, 'workflows', 'verify-change.js'), 'utf8');
  assert.equal((wf.match(/model: reviewModel/g) ?? []).length, 2);
  assert.doesNotMatch(wf, /model: 'opus'/);
  assert.match(fs.readFileSync(path.join(PLUGIN, 'skills', 'step', 'SKILL.md'), 'utf8'), /\| pilot:code-reviewer, pilot:security-reviewer, pilot:design-reviewer \| opus \| opus \| sonnet \|/);
});
