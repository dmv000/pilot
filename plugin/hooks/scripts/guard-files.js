// H02 PreToolUse Edit|Write|NotebookEdit (F02, F06, F16, F20).
// Fails closed: hooks.json sets onFailure "block" for this script.
import fs from 'node:fs';
import path from 'node:path';
import { start, relPath, matchesAny, readText, decide, isImplementer } from '../lib/project.js';
import {
  DEFAULT_PROTECTED, PROTECTED_EXCEPTIONS, DEFAULT_ACCEPTANCE, GATE_CONFIG, SECRET_GLOBS,
  SKIP_PATTERNS, SKIP_ALLOW, TEST_CONFIG, TEST_EXCLUSION
} from '../lib/patterns.js';

const ctx = start();
if (!ctx) process.exit(0);
const { input, dir, manifest } = ctx;
const ti = input.tool_input ?? {};
const filePath = ti.file_path ?? ti.notebook_path ?? '';
const rel = relPath(dir, filePath);
const agent = input.agent_type;
const isMain = !agent;

// Text this call adds and the text it replaces.
const current = readText(path.isAbsolute(filePath) ? filePath : path.join(dir, filePath)) ?? '';
let before = '';
let after = '';
if (input.tool_name === 'Write') { before = current; after = ti.content ?? ''; }
else if (input.tool_name === 'Edit') { before = ti.old_string ?? ''; after = ti.new_string ?? ''; }
else { before = ''; after = ti.new_source ?? ''; }

// 0. Reading secret files (F06). Project deny rules do the same, but they only apply once the
// project settings load and the folder is trusted; this works everywhere pilot is active.
if (input.tool_name === 'Read') {
  if (matchesAny(rel, SECRET_GLOBS) && !matchesAny(rel, PROTECTED_EXCEPTIONS)) {
    decide('deny', `pilot: ${rel} holds secrets. Reading it would copy them into the plain-text transcript. Ask the user to check the value themselves.`);
  }
  process.exit(0);
}

// 1. Protected paths.
const protectedGlobs = [...DEFAULT_PROTECTED, ...(manifest.protectedPaths ?? [])];
if (matchesAny(rel, protectedGlobs) && !matchesAny(rel, PROTECTED_EXCEPTIONS)) {
  decide('deny', `pilot: ${rel} is a protected file (manifest.protectedPaths or secrets). Ask the user to change it themselves, or explain why it must change.`);
  process.exit(0);
}

// 1b. Files that configure the gates.
if (matchesAny(rel, GATE_CONFIG)) {
  if (!isMain) {
    decide('deny', `pilot: subagents may not change ${rel}; it configures pilot's quality gates. Report what should change in your result.`);
    process.exit(0);
  }
  decide('ask', `pilot: ${rel} configures pilot's quality gates (checks, permissions, model). Approve only if you asked for this change.`);
  process.exit(0);
}

// 2. Acceptance tests belong to the test-writer.
const acceptance = manifest.acceptancePaths ?? DEFAULT_ACCEPTANCE;
if (matchesAny(rel, acceptance)) {
  if (isImplementer(agent)) {
    decide('deny', `pilot: the implementer may not edit acceptance tests (${rel}). Make the code pass them. If a test is wrong, report it in your result and stop.`);
    process.exit(0);
  }
  if (isMain) {
    decide('ask', `pilot: ${rel} is an acceptance test written from the spec. Changing it changes what "done" means. Approve only if the spec changed.`);
    process.exit(0);
  }
}

// 3. New test skips need an issue reference.
const countSkips = text => SKIP_PATTERNS.reduce((n, re) => n + (text.match(re)?.length ?? 0), 0);
if (countSkips(after) > countSkips(before) && !SKIP_ALLOW.test(after)) {
  decide('deny', 'pilot: this edit adds a skipped or focused test. Fix the code instead, or add a comment "pilot-allow-skip: #<issue>" that links a filed bug.');
  process.exit(0);
}

// 4. Test-runner config that excludes tests.
if (matchesAny(rel, TEST_CONFIG) && TEST_EXCLUSION.test(after) && !TEST_EXCLUSION.test(before)) {
  const reason = `pilot: this change to ${rel} excludes tests from the run. Excluding failing tests hides defects.`;
  if (isImplementer(agent) || (agent && !isMain)) { decide('deny', reason); process.exit(0); }
  decide('ask', reason + ' Approve only if these tests should never run.');
  process.exit(0);
}

// 5. A roadmap step may be marked done only with a passing review (DoD).
if (rel === 'docs/planning/PROGRESS.md') {
  const doneSteps = text => new Set([...text.matchAll(/^\|\s*(\d+)\s*\|\s*done\s*\|/gim)].map(m => m[1]));
  const was = doneSteps(input.tool_name === 'Edit' ? current : before);
  let nextText = after;
  if (input.tool_name === 'Edit') nextText = current.split(ti.old_string ?? '').join(ti.new_string ?? '');
  const missing = [];
  for (const step of doneSteps(nextText)) {
    if (was.has(step)) continue;
    const reviewFile = path.join(dir, '.pilot', 'reviews', `step-${step}.json`);
    let review = null;
    try { review = JSON.parse(fs.readFileSync(reviewFile, 'utf8')); } catch { /* missing */ }
    const ok = review && review.verdict === 'pass' && review.acceptance && review.acceptance.exitCode === 0;
    if (!ok) missing.push(step);
  }
  if (missing.length) {
    decide('deny', `pilot: step ${missing.join(', ')} cannot be marked done. .pilot/reviews/step-<n>.json must record acceptance.exitCode 0 and verdict "pass". Run the acceptance tests and the review first (/pilot:step).`);
    process.exit(0);
  }
}

process.exit(0);
