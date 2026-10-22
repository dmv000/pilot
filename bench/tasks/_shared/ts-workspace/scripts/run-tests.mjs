// Runs every *.test.ts / *.test.mjs under a directory with node --test. Exits 0 when there are none.
// Usage: node scripts/run-tests.mjs <dir> [--exclude <dir>]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const [dir = 'tests', flag, excluded] = process.argv.slice(2);
const exclude = flag === '--exclude' && excluded ? path.resolve(excluded) : null;
const files = [];
const walk = d => {
  if (!fs.existsSync(d)) return;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (exclude && path.resolve(p).startsWith(exclude)) continue;
    if (e.isDirectory()) walk(p);
    else if (/\.test\.(ts|mjs|js)$/.test(e.name)) files.push(p);
  }
};
walk(dir);
if (files.length === 0) { console.log(`no tests under ${dir}`); process.exit(0); }
const r = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(r.status ?? 1);
