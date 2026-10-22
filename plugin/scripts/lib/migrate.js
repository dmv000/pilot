// Template migrations (P2 section 11). A migration moves project files from one template version to the next.
//
// A migration file (plugin/migrations/<from>-to-<to>.js) default-exports:
//   { from: 'v1', to: 'v2', describe: '...', operations: [ op, ... ] }
// Each op is one of:
//   { id, describe, file: '<glob>', transform: (text, ctx) => text }      edit matching existing files
//   { id, describe, file: '<path.json>', json: (obj, ctx) => obj }        edit a JSON file (2-space output)
//   { id, describe, create: '<path>', content: string | (ctx) => string } create a file if it is missing
// Every transform must be idempotent: applying it to already-migrated text returns the same text.
//
// Rules: a file whose current hash equals the manifest's recorded hash (nobody edited it) is updated
// automatically; an edited or untracked file needs the owner's approval; nothing is ever deleted;
// every file that changes is backed up first under .pilot/backups/<timestamp>/.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { read, exists, writeFile, sha256, walk, today, KIT_VERSION } from './fsutil.js';
import { globToRegExp } from './glob.js';

export async function loadMigrations(dir) {
  if (!exists(dir)) return [];
  const files = fs.readdirSync(dir).filter(f => /^v\d+-to-v\d+\.js$/.test(f)).sort();
  const out = [];
  for (const f of files) {
    const m = (await import(pathToFileURL(path.join(dir, f)).href)).default;
    if (!m || !m.from || !m.to || !Array.isArray(m.operations)) throw new Error(`${f}: must default-export { from, to, operations }`);
    out.push({ ...m, file: f });
  }
  return out;
}

const vnum = v => Number(String(v).replace(/^v/, ''));
export const latestVersion = migrations => migrations.reduce((best, m) => (vnum(m.to) > vnum(best) ? m.to : best), 'v1');

/** Ordered chain of migrations from `from` to `to`. Throws when there is a gap. */
export function chain(migrations, from, to) {
  const steps = [];
  let cur = from;
  while (vnum(cur) < vnum(to)) {
    const next = migrations.find(m => m.from === cur);
    if (!next) throw new Error(`no migration from template ${cur} (target ${to})`);
    steps.push(next);
    cur = next.to;
  }
  return steps;
}

/** Minimal unified-style line diff (LCS). Good enough to show the owner what changes. */
export function lineDiff(a, b, label = '') {
  const x = a.replace(/\r\n/g, '\n').split('\n');
  const y = b.replace(/\r\n/g, '\n').split('\n');
  if (x.length * y.length > 4_000_000) return `--- ${label} (before)\n+++ ${label} (after)\n(file too large for a line diff; ${x.length} → ${y.length} lines)`;
  const L = Array.from({ length: x.length + 1 }, () => new Int32Array(y.length + 1));
  for (let i = x.length - 1; i >= 0; i--) for (let j = y.length - 1; j >= 0; j--) L[i][j] = x[i] === y[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const lines = [`--- ${label} (before)`, `+++ ${label} (after)`];
  let i = 0, j = 0;
  while (i < x.length || j < y.length) {
    if (i < x.length && j < y.length && x[i] === y[j]) { i++; j++; continue; }
    if (j < y.length && (i >= x.length || L[i][j + 1] >= L[i + 1][j])) lines.push(`+ ${y[j++]}`);
    else lines.push(`- ${x[i++]}`);
  }
  return lines.join('\n');
}

function applyOp(op, text, ctx) {
  if (op.json) return JSON.stringify(op.json(JSON.parse(text), ctx), null, 2) + '\n';
  return op.transform(text, ctx);
}

/** Work out what a migration would do, without writing anything. */
export function planMigration(project, migrations, { to } = {}) {
  const manifestFile = path.join(project, '.pilot', 'manifest.json');
  const manifest = JSON.parse(read(manifestFile));
  const from = manifest.templateVersion;
  const target = to ?? latestVersion(migrations);
  if (vnum(from) >= vnum(target)) return { from, to: target, steps: [], files: [], upToDate: true };
  const steps = chain(migrations, from, target);
  const ctx = { project, manifest, today: today() };
  const projectFiles = walk(project);
  const files = new Map(); // path -> { before, after, ops[], created }

  for (const m of steps) {
    for (const op of m.operations) {
      if (op.create) {
        const rel = op.create;
        const entry = files.get(rel) ?? { before: read(path.join(project, rel)), ops: [] };
        if (entry.after === undefined) entry.after = entry.before;
        if (entry.after === null) {
          entry.after = typeof op.content === 'function' ? op.content(ctx) : op.content;
          entry.created = true;
          entry.ops.push(`${m.to}:${op.id}`);
        }
        files.set(rel, entry);
        continue;
      }
      const re = globToRegExp(op.file);
      const targets = new Set([...projectFiles.filter(f => re.test(f)), ...[...files.keys()].filter(f => re.test(f) && files.get(f).after !== null)]);
      for (const rel of targets) {
        const entry = files.get(rel) ?? { before: read(path.join(project, rel)), ops: [] };
        if (entry.after === undefined) entry.after = entry.before;
        if (entry.after === null) continue;
        const next = applyOp(op, entry.after, ctx);
        if (next !== entry.after) entry.ops.push(`${m.to}:${op.id}`);
        entry.after = next;
        files.set(rel, entry);
      }
    }
  }

  const out = [];
  for (const [rel, e] of [...files.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (e.after === e.before) { out.push({ path: rel, status: 'unchanged', ops: e.ops }); continue; }
    let status;
    let reason;
    if (e.created) { status = 'create'; reason = 'new file from the newer template'; }
    else {
      const recorded = manifest.files?.[rel]?.sha256;
      if (recorded && recorded === sha256(e.before)) { status = 'auto'; reason = 'unchanged since pilot wrote it'; }
      else { status = 'approval'; reason = recorded ? 'you edited this file since pilot wrote it' : 'pilot did not write this file'; }
    }
    out.push({ path: rel, status, reason, ops: e.ops, diff: lineDiff(e.before ?? '', e.after, rel), after: e.after });
  }
  return { from, to: target, steps: steps.map(s => ({ from: s.from, to: s.to, describe: s.describe })), files: out, upToDate: false };
}

/**
 * Apply a plan. `approve` is an array of paths (or ['all']) for files that need approval.
 * Returns { applied, declined, backups, to }.
 */
export function applyMigration(project, plan, { approve = [] } = {}) {
  const manifestFile = path.join(project, '.pilot', 'manifest.json');
  const manifest = JSON.parse(read(manifestFile));
  if (manifest.templateVersion !== plan.from) throw new Error(`the project is at template ${manifest.templateVersion}, but the plan was made for ${plan.from}; make a new plan`);
  const approved = new Set(approve.includes('all') ? plan.files.map(f => f.path) : approve);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(project, '.pilot', 'backups', stamp);
  const applied = [];
  const declined = [];
  for (const f of plan.files) {
    if (f.status === 'unchanged') continue;
    if (f.status === 'approval' && !approved.has(f.path)) { declined.push({ path: f.path, ops: f.ops }); continue; }
    const target = path.join(project, f.path);
    const current = read(target);
    if (current !== null) writeFile(path.join(backupDir, f.path), current);
    writeFile(target, f.after);
    manifest.files[f.path] = { template: manifest.files[f.path]?.template ?? `migration:${plan.to}`, sha256: sha256(f.after), writtenAt: today() };
    applied.push(f.path);
  }
  manifest.templateVersion = plan.to;
  manifest.kitVersion = KIT_VERSION;
  manifest.migrations = manifest.migrations ?? { history: [], declined: [] };
  manifest.migrations.history.push({ from: plan.from, to: plan.to, at: new Date().toISOString(), applied, declined: declined.map(d => d.path) });
  manifest.migrations.declined.push(...declined.map(d => ({ to: plan.to, ...d })));
  writeFile(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
  return { applied, declined, backups: applied.length ? path.relative(project, backupDir).split(path.sep).join('/') : null, to: plan.to };
}
