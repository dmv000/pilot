// Copy pilot templates into a project. Never overwrites a file that already exists:
// for CLAUDE.md and .claude/settings.json it writes a *.pilot-proposed.* file instead.
import fs from 'node:fs';
import path from 'node:path';
import { KIT_ROOT, KIT_VERSION, read, exists, writeFile, sha256, today, walk } from './fsutil.js';

// Projects call the pilot-check Action from the kit repo. After the first tagged release, pin a full commit SHA instead of @main.
export const PILOT_ACTION_REF = 'dmv000/pilot/.github/actions/pilot-check@main';
const T = (...p) => path.join(KIT_ROOT, 'templates', ...p);

export const DEFAULT_CHECKS = {
  'web-ts': { fast: 'npm run check:fast', full: 'npm run check', acceptance: 'npm run test:acceptance' },
  generic: {}
};

export function mergeSettings(...layers) {
  const out = {};
  const merge = (a, b) => {
    for (const [k, v] of Object.entries(b)) {
      if (Array.isArray(v)) a[k] = [...new Set([...(a[k] ?? []), ...v])];
      else if (v && typeof v === 'object') a[k] = merge(a[k] ?? {}, v);
      else a[k] = v;
    }
    return a;
  };
  for (const l of layers) merge(out, l);
  return out;
}

export function fill(text, vars) {
  return text.replace(/\{\{([\w.]+)\}\}/g, (m, key) => (vars[key] !== undefined && vars[key] !== '' ? String(vars[key]) : m));
}

/** Returns the plan: [{ target, source, kind, action }] where action is create | skip | propose. */
export function plan(project, answers) {
  const pack = answers.stack === 'web-ts' ? 'web-ts' : 'generic';
  const items = [];
  const add = (target, source, kind, mergeable = false) => {
    const exist = exists(path.join(project, target));
    items.push({ target, source, kind, action: !exist ? 'create' : mergeable ? 'propose' : 'skip' });
  };
  for (const rel of walk(T('docs', 'v1'))) {
    if (rel.startsWith('ai/') && !answers.hasAI) continue;
    add(`docs/${rel}`, `docs/v1/${rel}`, 'doc');
  }
  add('CLAUDE.md', 'project/CLAUDE.md', 'project', true);
  add('.worktreeinclude', 'project/worktreeinclude', 'project');
  add('.claude/settings.json', `settings:${pack}:${answers.profile === 'max' ? 'max' : 'pro'}`, 'settings', true);
  for (const rel of walk(T('rules', 'common'))) add(`.claude/rules/common/${rel}`, `rules/common/${rel}`, 'rule');
  if (pack === 'web-ts') for (const rel of walk(T('rules', 'web-ts'))) add(`.claude/rules/web-ts/${rel}`, `rules/web-ts/${rel}`, 'rule');
  add('.github/workflows/ci.yml', `github/ci-${pack}.yml`, 'ci');
  add('.github/ISSUE_TEMPLATE/bug.yml', 'github/ISSUE_TEMPLATE/bug.yml', 'ci');
  add('.github/ISSUE_TEMPLATE/problem.yml', 'github/ISSUE_TEMPLATE/problem.yml', 'ci');
  items.push({ target: '.gitignore', source: 'project/gitignore-additions.txt', kind: 'project', action: 'append' });
  items.push({ target: '.pilot/manifest.json', source: 'generated', kind: 'manifest', action: exists(path.join(project, '.pilot/manifest.json')) ? 'skip' : 'create' });
  return items;
}

export function render(item, answers, vars) {
  if (item.source.startsWith('settings:')) {
    const [, pack, profile] = item.source.split(':');
    const settings = mergeSettings(
      JSON.parse(read(T('settings', 'base.json'))),
      JSON.parse(read(T('settings', `profile-${profile}.json`))),
      JSON.parse(read(T('settings', `pack-${pack}.json`)))
    );
    return JSON.stringify(settings, null, 2) + '\n';
  }
  return fill(read(T(...item.source.split('/'))), vars);
}

export function apply(project, answers) {
  const pack = answers.stack === 'web-ts' ? 'web-ts' : 'generic';
  const checks = { ...DEFAULT_CHECKS[pack], ...(answers.checks ?? {}) };
  const vars = {
    project_name: answers.project_name, date: today(), stack_summary: answers.stack_summary ?? answers.stack,
    'checks.fast': checks.fast, 'checks.full': checks.full, 'checks.acceptance': checks.acceptance,
    autonomy: answers.autonomy ?? 'ask before each phase', pilot_action_ref: PILOT_ACTION_REF
  };
  const items = plan(project, answers);
  const files = {};
  const result = { created: [], skipped: [], proposed: [], appended: [] };
  for (const item of items) {
    if (item.kind === 'manifest') continue;
    const target = path.join(project, item.target);
    if (item.action === 'skip') { result.skipped.push(item.target); continue; }
    if (item.action === 'append') {
      const add = read(T('project', 'gitignore-additions.txt'));
      const cur = read(target) ?? '';
      if (!cur.includes('.pilot/state.json')) { writeFile(target, cur.replace(/\s*$/, '\n') + add); result.appended.push(item.target); }
      continue;
    }
    const content = render(item, answers, vars);
    if (item.action === 'propose') {
      const ext = path.extname(item.target);
      const proposal = item.target.slice(0, -ext.length) + '.pilot-proposed' + ext;
      writeFile(path.join(project, proposal), content);
      result.proposed.push({ target: item.target, proposal });
      continue;
    }
    writeFile(target, content);
    files[item.target] = { template: item.source, sha256: sha256(content), writtenAt: today() };
    result.created.push(item.target);
  }
  const manifestFile = path.join(project, '.pilot', 'manifest.json');
  if (!exists(manifestFile)) {
    const manifest = {
      schemaVersion: 1, kitVersion: KIT_VERSION, templateVersion: 'v1',
      profile: answers.profile ?? 'pro', projectType: answers.projectType ?? 'web-app', stack: answers.stack ?? 'generic',
      hasAI: !!answers.hasAI, design: answers.design ?? 'pending', checks,
      protectedPaths: answers.protectedPaths ?? (pack === 'web-ts' ? ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'] : []),
      files
    };
    writeFile(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
    result.created.push('.pilot/manifest.json');
  }
  return result;
}

/** Re-hash files in the manifest (all, or the given ones). Call after the interview fills the docs. */
export function record(project, only = []) {
  const file = path.join(project, '.pilot', 'manifest.json');
  const manifest = JSON.parse(read(file));
  const targets = only.length ? only : Object.keys(manifest.files);
  const updated = [];
  for (const rel of targets) {
    const text = read(path.join(project, rel));
    if (text === null) continue;
    manifest.files[rel] = { ...(manifest.files[rel] ?? { template: 'manual' }), sha256: sha256(text), writtenAt: today() };
    updated.push(rel);
  }
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n');
  return updated;
}
