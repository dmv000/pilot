// H05 Stop: a turn that changed code may not end while the fast checks fail (F01, F02).
// The hook runs the checks itself instead of trusting a claim that they passed.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import { start, emit } from '../lib/project.js';
import { readState, updateState } from '../lib/state.js';
import { TODO_WITHOUT_ISSUE } from '../lib/patterns.js';
import { trimFailure } from '../lib/output.js';

// After the first "done" is blocked, Claude gets this many fix attempts; then it stops (owner's choice, to cap token use).
const MAX_FIX_ATTEMPTS = 3;

const ctx = start();
if (!ctx) process.exit(0);
const { input, dir, manifest } = ctx;
const state = readState(dir);
if (!state.dirty) process.exit(0);

const fast = manifest.checks?.fast;
if (!fast) {
  emit({ systemMessage: 'pilot: code changed, but .pilot/manifest.json has no checks.fast command, so nothing verified it. Run /pilot:doctor.' });
  process.exit(0);
}

// 1. New TODO/FIXME lines without an issue reference.
const todos = [];
const diff = spawnSync('git', ['diff', '-U0', '--no-color', 'HEAD'], { cwd: dir, encoding: 'utf8' });
if (diff.status === 0) {
  let file = '';
  for (const line of diff.stdout.split('\n')) {
    if (line.startsWith('+++ ')) file = line.replace(/^\+\+\+ (b\/)?/, '');
    else if (line.startsWith('+') && TODO_WITHOUT_ISSUE.test(line)) todos.push(`${file}: ${line.slice(1).trim()}`);
  }
}
// New files are not in `git diff`; scan untracked (not ignored) source files too.
// Before the first commit `git diff HEAD` fails and every file is new, so staged files are scanned as well.
const listArgs = diff.status === 0 ? ['ls-files', '--others', '--exclude-standard'] : ['ls-files', '--cached', '--others', '--exclude-standard'];
const newFiles = spawnSync('git', listArgs, { cwd: dir, encoding: 'utf8' });
for (const file of (newFiles.stdout ?? '').split('\n').filter(f => f && !/\.(md|json|lock)$/i.test(f)).slice(0, 500)) {
  let text = '';
  try { const st = fs.statSync(path.join(dir, file)); if (st.size > 1_000_000) continue; text = fs.readFileSync(path.join(dir, file), 'utf8'); } catch { continue; }
  for (const line of text.split('\n')) if (TODO_WITHOUT_ISSUE.test(line)) todos.push(`${file}: ${line.trim()}`);
}

// 2. Run the fast checks.
const run = spawnSync(fast, { cwd: dir, shell: true, encoding: 'utf8', timeout: 300000, maxBuffer: 20 * 1024 * 1024 });
const output = `${run.stdout ?? ''}\n${run.stderr ?? ''}`.trim();
const timedOut = run.error?.code === 'ETIMEDOUT';
const passed = run.status === 0 && !timedOut;

if (passed && todos.length === 0) {
  updateState(dir, { dirty: false, lastGreen: { at: new Date().toISOString(), command: fast }, stopFailures: null });
  process.exit(0);
}

const lines = [];
if (!passed) {
  lines.push(`The fast checks failed${timedOut ? ' (timed out after 300 s)' : ` (exit ${run.status})`}: \`${fast}\``, trimFailure(output));
}
if (todos.length) lines.push('New TODO/FIXME without an issue reference. Add "(#<issue>)" or file one with /pilot:bug:', ...todos.slice(0, 10));
const reason = ('pilot: this turn changed code and is not done yet.\n' + lines.join('\n')).slice(0, 3000);

const hash = crypto.createHash('sha256').update(lines.join('\n')).digest('hex').slice(0, 16);
const prev = state.stopFailures;
// Blocks in a row while Claude keeps going because of this hook: the first "done", then one per fix attempt.
const blocks = input.stop_hook_active && prev ? (prev.blocks ?? 1) + 1 : 1;
const next = { hash, count: prev && prev.hash === hash ? prev.count + 1 : 1, blocks };
if (input.stop_hook_active && prev && prev.hash === hash && prev.count >= 1) {
  updateState(dir, { stopFailures: next });
  emit({ systemMessage: `pilot: the fast checks still fail after a retry with no change in the failure. Claude was allowed to stop, but this work is NOT verified.\n${reason}` });
  process.exit(0);
}
if (blocks > MAX_FIX_ATTEMPTS) {
  updateState(dir, { stopFailures: next });
  emit({ systemMessage: `pilot: ${MAX_FIX_ATTEMPTS} fix attempts did not make the checks pass, so Claude was stopped to save tokens. This work is NOT verified.\n${reason}\nNext: /pilot:debug for a step-by-step attempt, or /pilot:bug to record it.` });
  process.exit(0);
}
updateState(dir, { stopFailures: next });
emit({ decision: 'block', reason });
process.exit(0);
