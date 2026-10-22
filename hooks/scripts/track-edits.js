// H04 PostToolUse: mark the session dirty after file changes (F01).
import { start } from '../lib/project.js';
import { updateState, readState } from '../lib/state.js';
import { READ_ONLY_COMMANDS } from '../lib/patterns.js';

const ctx = start();
if (!ctx) process.exit(0);
const { input, dir } = ctx;
const tool = input.tool_name;

let dirty = false;
if (tool === 'Edit' || tool === 'Write' || tool === 'NotebookEdit') {
  dirty = true;
} else if (tool === 'Bash' || tool === 'PowerShell') {
  const cmd = String(input.tool_input?.command ?? '');
  dirty = !READ_ONLY_COMMANDS.test(cmd);
}

if (dirty && !readState(dir).dirty) {
  updateState(dir, { dirty: true, lastEditAt: new Date().toISOString() });
} else if (dirty) {
  updateState(dir, { lastEditAt: new Date().toISOString() });
}
process.exit(0);
