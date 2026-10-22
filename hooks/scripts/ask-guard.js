// H06 PostToolUse AskUserQuestion: an unanswered question becomes a logged assumption
// and Claude is told to ask again (F13). Only relevant when askUserQuestionTimeout is set.
import fs from 'node:fs';
import path from 'node:path';
import { start, emit, readText } from '../lib/project.js';
import { UNANSWERED } from '../lib/patterns.js';

const ctx = start();
if (!ctx) process.exit(0);
const { input, dir } = ctx;
const response = typeof input.tool_response === 'string' ? input.tool_response : JSON.stringify(input.tool_response ?? '');
if (!UNANSWERED.test(response)) process.exit(0);

const questions = (input.tool_input?.questions ?? []).map(q => q.question).filter(Boolean);
const title = (questions[0] ?? 'question').replace(/\s+/g, ' ').slice(0, 80);
const file = path.join(dir, 'docs', 'planning', 'ASSUMPTIONS.md');
const existing = readText(file) ?? 'Purpose: every assumption made without an explicit answer from the owner.\nRead this when: you need to know what was decided without the owner.\nRelated files: docs/planning/HANDOFF.md\n';
const ids = [...existing.matchAll(/^### A-(\d+)/gm)].map(m => Number(m[1]));
const next = String((ids.length ? Math.max(...ids) : 0) + 1).padStart(3, '0');
const entry = `\n### A-${next} Unanswered: ${title}\n- Question(s): ${questions.join(' | ') || '(not recorded)'}\n- What happened: the question timed out without an answer.\n- Status: open. Ask again before relying on any choice.\n- Logged: ${new Date().toISOString().slice(0, 10)} by the pilot ask-guard hook\n`;
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, existing.replace(/\s*$/, '\n') + entry);

emit({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: `pilot: the user did not answer this question (logged as A-${next} in docs/planning/ASSUMPTIONS.md). Do not pick an answer for them. Ask again, or stop and wait.` } });
