// H04 PostToolUse: mark the session dirty after changes that can affect the code checks (F01).
// Markdown, pilot's own files and generated docs do not; test/lint/type-check runs do not.
import { start, relPath, matchesAny } from '../lib/project.js';
import { updateState } from '../lib/state.js';
import { READ_ONLY_COMMANDS, NON_CODE_FILES } from '../lib/patterns.js';

const ctx = start();
if (!ctx) process.exit(0);
const { input, dir } = ctx;
const tool = input.tool_name;

let dirty = false;
if (tool === 'Edit' || tool === 'Write' || tool === 'NotebookEdit') {
  const rel = relPath(dir, input.tool_input?.file_path ?? input.tool_input?.notebook_path ?? '');
  dirty = !matchesAny(rel, NON_CODE_FILES);
} else if (tool === 'Bash' || tool === 'PowerShell') {
  const cmd = String(input.tool_input?.command ?? '');
  dirty = !READ_ONLY_COMMANDS.test(cmd);
}

if (dirty) updateState(dir, { dirty: true, lastEditAt: new Date().toISOString() });
process.exit(0);
