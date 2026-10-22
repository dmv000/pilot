// Fingerprints of each task's hidden tests. Frozen before the first benchmark run (P3 section 8);
// bench/run.mjs refuses to run when a fingerprint no longer matches bench/HIDDEN-HASHES.txt.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { BENCH } from './build.mjs';

const TASKS = ['B-1', 'B-2', 'B-3', 'B-4', 'B-5'];
const FILE = path.join(BENCH, 'HIDDEN-HASHES.txt');

const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

export function hiddenHash(task) {
  const dir = path.join(BENCH, 'tasks', task, 'hidden');
  const h = crypto.createHash('sha256');
  for (const f of walk(dir).sort()) {
    h.update(path.relative(dir, f).split(path.sep).join('/'));
    h.update(fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n'));
  }
  return h.digest('hex');
}

export function freeze() {
  const lines = TASKS.map(t => `${t} ${hiddenHash(t)}`);
  fs.writeFileSync(FILE, '# sha256 of each task hidden/ folder, frozen before any benchmark run. bench/run.mjs refuses to run if these change.\n' + lines.join('\n') + '\n');
  return lines;
}

export function verify() {
  const recorded = Object.fromEntries(fs.readFileSync(FILE, 'utf8').split('\n').filter(l => /^B-\d /.test(l)).map(l => l.split(' ')));
  return TASKS.filter(t => recorded[t] !== hiddenHash(t));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === 'freeze') console.log(freeze().join('\n'));
  else { const bad = verify(); console.log(bad.length ? `CHANGED: ${bad.join(', ')}` : 'hidden tests match the frozen hashes'); process.exit(bad.length ? 1 : 0); }
}
