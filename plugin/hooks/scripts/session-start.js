// H01 SessionStart: inject HANDOFF.md and open reminders (F05, R9).
// Output stays under 8,000 characters: SessionStart context is capped at 10,000.
import fs from 'node:fs';
import path from 'node:path';
import { start, readText, emit } from '../lib/project.js';
import { readState } from '../lib/state.js';

const LIMIT = 8000;
const ctx = start();
if (!ctx) process.exit(0);
const { dir, manifest } = ctx;
const p = rel => path.join(dir, ...rel.split('/'));

const parts = ['[pilot] Project state loaded by the session-start hook.'];
const reminders = [];

if (manifest.broken) reminders.push('.pilot/manifest.json is not valid JSON. Run /pilot:doctor.');

if (manifest.design === 'pending' && !fs.existsSync(p('docs/design/DESIGN.md'))) {
  reminders.push('Design system not created yet. Run /pilot:design when ready; until then follow accessibility defaults (WCAG 2.2 AA).');
}

const drafts = ['docs/requirements/PRD.md', 'docs/requirements/SRS.md', 'docs/requirements/TECH-SPEC.md']
  .filter(rel => /^Status:\s*Draft/m.test(readText(p(rel)) ?? ''));
if (drafts.length) reminders.push(`Docs still Draft (need owner approval): ${drafts.join(', ')}.`);

const countRows = rel => {
  const t = readText(p(rel));
  if (!t) return null;
  return t.split('\n').filter(l => /^\|\s*(#\d+|LOCAL-\d+)/.test(l)).length;
};
const bugs = countRows('docs/issues/BUGS.md');
const problems = countRows('docs/issues/PROBLEMS.md');
const pending = countRows('docs/issues/PENDING.md');
if (bugs !== null || problems !== null) parts.push(`Open bugs: ${bugs ?? 0}. Open problems: ${problems ?? 0}.`);
if (pending) reminders.push(`${pending} issue(s) waiting in docs/issues/PENDING.md. Run /pilot:sync.`);

if (readState(dir).dirty) reminders.push('Code changed since the last run of the fast checks; it has not yet passed the fast checks.');

if (reminders.length) parts.push('Open reminders:\n' + reminders.map(r => `- ${r}`).join('\n'));

let head = parts.join('\n\n');
let handoff = readText(p('docs/planning/HANDOFF.md'));
if (handoff) {
  const room = LIMIT - head.length - 200;
  if (handoff.length > room) {
    handoff = handoff.slice(0, Math.max(0, room)) + '\n[pilot: HANDOFF.md truncated; keep it under 8,000 characters]';
  }
  head += '\n\n--- docs/planning/HANDOFF.md ---\n' + handoff;
} else {
  head += '\n\nNo docs/planning/HANDOFF.md yet.';
}

emit({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: head.slice(0, LIMIT) } });
