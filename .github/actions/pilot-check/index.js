// pilot-check GitHub Action: runs the same checks as `pilot.js check`, from the pinned kit commit.
// Needs no secrets. Projects pin it by full commit SHA.
import path from 'node:path';
import { runAll } from '../../../scripts/lib/trace.js';

const input = name => process.env[`INPUT_${name.toUpperCase()}`] ?? '';
const workspace = process.env.GITHUB_WORKSPACE ?? process.cwd();
const project = path.resolve(workspace, input('project') || '.');
const baseRef = input('base') || (process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : '');

let errors = 0;
for (const r of runAll(project, { base: baseRef || undefined })) {
  for (const e of r.errors) { console.log(`::error title=pilot ${r.id}::${e}`); errors++; }
  for (const w of r.warnings) console.log(`::warning title=pilot ${r.id}::${w}`);
}
console.log(errors ? `pilot-check: ${errors} error(s).` : 'pilot-check: passed.');
process.exit(errors ? 1 : 0);
