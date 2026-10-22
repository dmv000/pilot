#!/usr/bin/env node
// MNT-01: every component file has a REGISTRY.md row, and every row points to something that exists.
// Rows with status "built" or "verified" must name check IDs that exist in tests/, evals/ or the P3 plan.
import fs from 'node:fs';
import path from 'node:path';
import { KIT_ROOT, read, walk } from './lib/fsutil.js';

const registry = read(path.join(KIT_ROOT, 'REGISTRY.md'));
const rows = registry.split('\n').filter(l => /^\|\s*[A-Z]+-[A-Z0-9]+\s*\|/.test(l)).map(l => l.split('|').map(c => c.trim()));
const paths = rows.map(r => ({ id: r[1], path: r[2].replace(/`/g, '').replace(/\s*\(.*\)$/, ''), check: r[5], status: r[6] }));

const errors = [];
for (const r of paths) {
  const p = r.path.replace(/\/$/, '');
  if (!fs.existsSync(path.join(KIT_ROOT, p))) errors.push(`${r.id}: ${r.path} does not exist`);
}

// Component files that must be listed.
const components = [
  ...walk(path.join(KIT_ROOT, 'skills')).filter(f => f.endsWith('/SKILL.md')).map(f => `skills/${f.split('/')[0]}/`),
  ...walk(path.join(KIT_ROOT, 'agents')).map(f => `agents/${f}`),
  ...walk(path.join(KIT_ROOT, 'hooks', 'scripts')).map(f => `hooks/scripts/${f}`),
  ...walk(path.join(KIT_ROOT, 'workflows')).map(f => `workflows/${f}`),
  ...walk(path.join(KIT_ROOT, 'output-styles')).map(f => `output-styles/${f}`)
];
const listed = new Set(paths.map(r => r.path));
for (const c of components) if (!listed.has(c)) errors.push(`${c} has no row in REGISTRY.md`);

// Check IDs on built rows must be defined somewhere.
const haystack = [read(path.join(KIT_ROOT, 'docs/design/P3-verification.md')) ?? '',
  ...walk(path.join(KIT_ROOT, 'tests')).map(f => read(path.join(KIT_ROOT, 'tests', f)) ?? ''),
  ...walk(path.join(KIT_ROOT, 'evals')).map(f => f)].join('\n');
for (const r of paths.filter(r => /built|verified/.test(r.status))) {
  for (const id of r.check.match(/\b[TEC]-[A-Za-z0-9-]+/g) ?? []) {
    if (!haystack.includes(id)) errors.push(`${r.id}: check ${id} is not defined in tests/, evals/ or P3`);
  }
}

if (errors.length) { console.log(errors.map(e => `ERROR ${e}`).join('\n')); process.exit(1); }
console.log(`registry: ${paths.length} rows, ${components.length} component files, all consistent.`);
