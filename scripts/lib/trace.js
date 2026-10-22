// Project checks shared by `pilot.js check`, `pilot.js trace` and the pilot-check GitHub Action.
// Each check returns { id, errors[], warnings[] }.
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { read, walk, exists } from './fsutil.js';

const OWNER = { US: 'docs/requirements/PRD.md', FR: 'docs/requirements/SRS.md', NFR: 'docs/requirements/SRS.md', A: 'docs/planning/ASSUMPTIONS.md', T: 'docs/quality/SECURITY.md' };
const DEF_RE = /^#{2,4}\s+(US|FR|NFR|A|T)-(\d{3,})\b/gm;
const REF_RE = /\b(US|FR|NFR)-(\d{3,})\b/g;
const TEST_FILE = /(^|\/)(tests?|__tests__|spec)\/|\.(test|spec)\.[cm]?[jt]sx?$|(^|\/)test_[^/]+\.py$|_test\.(py|go)$/;
const SOURCE_EXT = /\.(?:[cm]?[jt]sx?|py|go|rs|java|kt|rb|cs|php|swift)$/;
const HEADER = [/^Purpose:\s*\S/, /^Read this when:\s*\S/, /^Related files:\s*\S/];

export function collect(dir) {
  const files = walk(dir);
  const docs = files.filter(f => f.startsWith('docs/') && f.endsWith('.md'));
  const docText = Object.fromEntries(docs.map(f => [f, read(path.join(dir, f)) ?? '']));
  const defs = {};
  for (const [file, text] of Object.entries(docText)) {
    for (const m of text.matchAll(DEF_RE)) {
      const id = `${m[1]}-${m[2]}`;
      (defs[id] ??= []).push(file);
    }
  }
  const tests = {};
  for (const f of files.filter(f => TEST_FILE.test(f) && SOURCE_EXT.test(f))) {
    const lines = (read(path.join(dir, f)) ?? '').split('\n');
    lines.forEach((line, i) => {
      if (!/@req\b|\b(?:FR|NFR)-\d{3,}\b/.test(line)) return;
      for (const m of line.matchAll(/\b((?:FR|NFR)-\d{3,})\b/g)) (tests[m[1]] ??= []).push(`${f}:${i + 1}`);
    });
  }
  return { files, docs, docText, defs, tests };
}

/** Stories per roadmap step and which steps are done. */
function roadmap(docText) {
  const steps = {};
  const rm = docText['docs/planning/ROADMAP.md'] ?? '';
  let current = null;
  for (const line of rm.split('\n')) {
    const h = line.match(/^##\s+Step\s+(\d+)/i);
    if (h) { current = h[1]; steps[current] = []; continue; }
    if (current && /^\s*-\s*Stories:/i.test(line)) steps[current].push(...(line.match(/US-\d{3,}/g) ?? []));
  }
  const progress = docText['docs/planning/PROGRESS.md'] ?? '';
  const done = new Set([...progress.matchAll(/^\|\s*(\d+)\s*\|\s*done\s*\|/gim)].map(m => m[1]));
  return { steps, done };
}

/** requirement -> stories it traces to, from "Traces to:" lines under each FR/NFR heading in SRS. */
function traces(srs) {
  const map = {};
  let current = null;
  for (const line of srs.split('\n')) {
    const h = line.match(/^#{2,4}\s+((?:FR|NFR)-\d{3,})\b/);
    if (h) { current = h[1]; map[current] = []; continue; }
    if (/^#{1,4}\s/.test(line)) current = null;
    if (current && /Traces to:/i.test(line)) map[current].push(...(line.match(/US-\d{3,}/g) ?? []));
  }
  return map;
}

export function buildTraceability(c) {
  const srs = c.docText['docs/requirements/SRS.md'] ?? '';
  const tr = traces(srs);
  const stories = {};
  const requirements = {};
  for (const [req, us] of Object.entries(tr)) {
    for (const s of us) (stories[s] ??= { requirements: [] }).requirements.push(req);
    const tests = [...new Set(c.tests[req] ?? [])].sort();
    requirements[req] = { stories: us, tests, status: tests.length ? 'covered' : 'uncovered' };
  }
  const sortObj = o => Object.fromEntries(Object.keys(o).sort().map(k => [k, o[k]]));
  return { generated: 'by pilot (pilot.js trace / pilot-check); do not edit', stories: sortObj(stories), requirements: sortObj(requirements) };
}

export function checkIds(c) {
  const errors = [];
  for (const [id, where] of Object.entries(c.defs)) {
    const prefix = id.split('-')[0];
    if (where.length > 1) errors.push(`${id} is defined in ${where.length} places: ${where.join(', ')}. Define it once, in ${OWNER[prefix]}.`);
    for (const f of where) if (OWNER[prefix] && f !== OWNER[prefix]) errors.push(`${id} is defined in ${f}; it belongs in ${OWNER[prefix]}.`);
  }
  for (const [file, text] of Object.entries(c.docText)) {
    for (const m of text.matchAll(REF_RE)) {
      const id = `${m[1]}-${m[2]}`;
      if (!c.defs[id]) errors.push(`${file} refers to ${id}, which is not defined anywhere.`);
    }
  }
  return { id: 'ids', errors: [...new Set(errors)], warnings: [] };
}

export function checkCoverage(c) {
  const errors = [];
  const warnings = [];
  const tr = traces(c.docText['docs/requirements/SRS.md'] ?? '');
  const { steps, done } = roadmap(c.docText);
  const dueStories = new Set([...done].flatMap(s => steps[s] ?? []));
  for (const [req, us] of Object.entries(tr)) {
    if (c.tests[req]?.length) continue;
    const due = us.some(s => dueStories.has(s));
    const msg = `${req} has no test tagged with its ID (add "@req ${req}" to a test).`;
    if (due && req.startsWith('FR')) errors.push(msg + ' Its roadmap step is marked done.');
    else warnings.push(msg + (due ? '' : ' (step not done yet)'));
  }
  return { id: 'trace', errors, warnings };
}

export function checkRestatement(c, words = 30) {
  const docs = ['docs/requirements/PRD.md', 'docs/requirements/SRS.md', 'docs/requirements/TECH-SPEC.md'];
  const norm = t => t.replace(/^(Purpose|Read this when|Related files|Status):.*$/gm, '').replace(/[`*_#>|[\]()]/g, ' ').toLowerCase().split(/\s+/).filter(Boolean);
  const shingles = {};
  for (const d of docs) {
    const w = norm(c.docText[d] ?? '');
    const set = new Set();
    for (let i = 0; i + words <= w.length; i++) set.add(w.slice(i, i + words).join(' '));
    shingles[d] = set;
  }
  const errors = [];
  for (let i = 0; i < docs.length; i++) for (let j = i + 1; j < docs.length; j++) {
    const hit = [...shingles[docs[i]]].find(s => shingles[docs[j]].has(s));
    if (hit) errors.push(`${docs[i]} and ${docs[j]} share ${words}+ identical words ("${hit.split(' ').slice(0, 8).join(' ')}…"). Keep the fact in its owner doc and refer to it by ID.`);
  }
  return { id: 'restate', errors, warnings: [] };
}

export function checkHeaders(c) {
  const errors = [];
  for (const [file, text] of Object.entries(c.docText)) {
    if (file.startsWith('docs/ai/evals/') && !file.endsWith('RUBRIC.md')) continue;
    const lines = text.split('\n').slice(0, 12).filter(l => l.trim());
    let idx = 0;
    for (const l of lines) if (idx < 3 && HEADER[idx].test(l)) idx++;
    if (idx < 3) errors.push(`${file} is missing the three-line header (Purpose, Read this when, Related files).`);
  }
  return { id: 'header', errors, warnings: [] };
}

export function checkSizes(dir) {
  const errors = [];
  const claude = read(path.join(dir, 'CLAUDE.md'));
  if (claude && claude.split('\n').length > 200) errors.push(`CLAUDE.md has ${claude.split('\n').length} lines; the limit is 200. Move detail into docs, rules or skills.`);
  const handoff = read(path.join(dir, 'docs/planning/HANDOFF.md'));
  if (handoff && handoff.length > 8000) errors.push(`docs/planning/HANDOFF.md has ${handoff.length} characters; the limit is 8,000.`);
  return { id: 'size', errors, warnings: [] };
}

export function checkPlaceholders(c) {
  const errors = [];
  for (const [file, text] of Object.entries(c.docText)) {
    if (!/^Status:\s*Approved/m.test(text)) continue;
    const m = text.match(/\{\{[\w. |%-]+\}\}/);
    if (m) errors.push(`${file} is Approved but still contains the placeholder ${m[0]}.`);
  }
  return { id: 'placeholder', errors, warnings: [] };
}

export function checkTraceFile(dir, c) {
  const file = path.join(dir, 'docs/requirements/traceability.json');
  if (!exists(file)) return { id: 'trace-file', errors: [], warnings: ['docs/requirements/traceability.json does not exist yet (run pilot.js trace --write).'] };
  let current = null;
  try { current = JSON.parse(read(file)); } catch { return { id: 'trace-file', errors: ['traceability.json is not valid JSON.'], warnings: [] }; }
  const fresh = buildTraceability(c);
  const same = JSON.stringify(current) === JSON.stringify(fresh);
  return { id: 'trace-file', errors: same ? [] : ['docs/requirements/traceability.json is stale. Regenerate it with pilot.js trace --write; do not edit it by hand.'], warnings: [] };
}

export function checkTodos(dir, base) {
  if (!base) return { id: 'todo', errors: [], warnings: [] };
  const r = spawnSync('git', ['diff', '-U0', '--no-color', `${base}...HEAD`], { cwd: dir, encoding: 'utf8' });
  if (r.status !== 0) return { id: 'todo', errors: [], warnings: [`git diff against ${base} failed: ${r.stderr.trim()}`] };
  const errors = [];
  let file = '';
  for (const line of r.stdout.split('\n')) {
    if (line.startsWith('+++ ')) file = line.replace(/^\+\+\+ (b\/)?/, '');
    else if (line.startsWith('+') && /\b(TODO|FIXME|XXX|HACK)\b(?![^\n]*\(#\d+\))/.test(line)) errors.push(`${file}: new "${line.slice(1).trim().slice(0, 80)}" has no issue reference (#n).`);
  }
  return { id: 'todo', errors, warnings: [] };
}

export function runAll(dir, { base } = {}) {
  const c = collect(dir);
  return [checkIds(c), checkCoverage(c), checkRestatement(c), checkHeaders(c), checkSizes(dir), checkPlaceholders(c), checkTraceFile(dir, c), checkTodos(dir, base)];
}
