// H03 PreToolUse Bash|PowerShell (F02, F06). Fails closed via onFailure "block".
import { start, decide } from '../lib/project.js';
import { SECRET_READ, SECRET_REDIRECT, ENV_DUMP, NO_VERIFY, FORCE_PUSH_MAIN } from '../lib/patterns.js';

const ctx = start();
if (!ctx) process.exit(0);
const cmd = String(ctx.input.tool_input?.command ?? '');

const rules = [
  [SECRET_READ, 'this command would print a secret file into the transcript, which is stored as plain text. Ask the user to check the value themselves.'],
  [SECRET_REDIRECT, 'this command feeds a secret file into a program. Load secrets through the app\'s own config loader instead.'],
  [ENV_DUMP, 'dumping all environment variables can print secrets into the transcript. Print only the variable you need, by name.'],
  [NO_VERIFY, '--no-verify skips the project\'s git hooks and quality gates. Fix what the hook reports instead.'],
  [FORCE_PUSH_MAIN, 'force-pushing the default branch rewrites shared history. Push to a branch and open a pull request.']
];

for (const [re, why] of rules) {
  if (re.test(cmd)) {
    decide('deny', `pilot: ${why}`);
    process.exit(0);
  }
}
process.exit(0);
