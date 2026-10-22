#!/usr/bin/env node
// MNT-01: every component file has a REGISTRY.md row, and every row points to something that exists.
// Rows with status "built" or "verified" must name check IDs that exist in tests/, plugin/evals/ or the P3 plan.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PLUGIN = path.join(REPO, 'plugin');
const read = f => { try { return fs.readFileSync(f, 'utf8'); } catch { return null; } };
const walk = dir => {
  const out = [];
  const rec = sub => {
    let entries = [];
    try { entries = fs.readdirSync(path.join(dir, sub), { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const rel = sub ? `${sub}/${e.name}` : e.name;
      if (e.isDirectory()) rec(rel); else out.push(rel);
    }
  };
  rec('');
  return out.sort();
};

const rows = read(path.join(REPO, 'REGISTRY.md')).split('\n')
  .filter(l => /^\|\s*[A-Z]+-[A-Z0-9]+\s*\|/.test(l))
  .map(l => l.split('|').map(c => c.trim()))
  .map(r => ({ id: r[1], path: r[2].replace(/`/g, '').replace(/\s*\(.*\)$/, ''), check: r[5], status: r[6] }));

const errors = [];
for (const r of rows) {
  if (!fs.existsSync(path.join(REPO, r.path.replace(/\/$/, '')))) errors.push(`${r.id}: ${r.path} does not exist`);
}

// Component files that must be listed (paths relative to the repo root).
const components = [
  ...walk(path.join(PLUGIN, 'skills')).filter(f => f.endsWith('/SKILL.md')).map(f => `plugin/skills/${f.split('/')[0]}/`),
  ...walk(path.join(PLUGIN, 'agents')).map(f => `plugin/agents/${f}`),
  ...walk(path.join(PLUGIN, 'hooks', 'scripts')).map(f => `plugin/hooks/scripts/${f}`),
  ...walk(path.join(PLUGIN, 'workflows')).map(f => `plugin/workflows/${f}`),
  ...walk(path.join(PLUGIN, 'output-styles')).map(f => `plugin/output-styles/${f}`)
];
const listed = new Set(rows.map(r => r.path));
for (const c of components) if (!listed.has(c)) errors.push(`${c} has no row in REGISTRY.md`);

// Nothing but runtime may sit in plugin/ (installs should carry only what runs).
const allowed = new Set(['.claude-plugin', 'skills', 'agents', 'hooks', 'output-styles', 'workflows', 'scripts', 'templates', 'evals', 'package.json', 'README.md', 'LICENSE']);
for (const e of fs.readdirSync(PLUGIN)) if (!allowed.has(e)) errors.push(`plugin/${e} is not a runtime part; keep it in the repository root`);

// Check IDs on built rows must be defined somewhere.
const haystack = [read(path.join(REPO, 'docs/design/P3-verification.md')) ?? '',
  ...walk(path.join(REPO, 'tests')).map(f => read(path.join(REPO, 'tests', f)) ?? ''),
  ...walk(path.join(PLUGIN, 'evals'))].join('\n');
for (const r of rows.filter(r => /built|verified/.test(r.status))) {
  for (const id of r.check.match(/\b[TEC]-[A-Za-z0-9-]+/g) ?? []) {
    if (!haystack.includes(id)) errors.push(`${r.id}: check ${id} is not defined in tests/, plugin/evals/ or P3`);
  }
}

if (errors.length) { console.log(errors.map(e => `ERROR ${e}`).join('\n')); process.exit(1); }
console.log(`registry: ${rows.length} rows, ${components.length} component files, plugin/ holds runtime only, all consistent.`);
