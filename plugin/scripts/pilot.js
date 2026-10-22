#!/usr/bin/env node
// pilot helper CLI. Skills call it as: node "${CLAUDE_PLUGIN_ROOT}/scripts/pilot.js" <command> [options]
// Deterministic work lives here so it does not depend on the model doing it correctly.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { KIT_ROOT, KIT_VERSION, read, exists, writeFile, today } from './lib/fsutil.js';
import { validate } from './lib/schema.js';
import { plan, apply, record } from './lib/scaffold.js';
import { collect, buildTraceability, runAll } from './lib/trace.js';
import { buildMirrors, prunePending } from './lib/sync.js';
import { renderPreview } from './lib/preview.js';

const [cmd, ...rest] = process.argv.slice(2);
const opts = { _: [] };
for (let i = 0; i < rest.length; i++) {
  const a = rest[i];
  if (a.startsWith('--')) {
    const key = a.slice(2);
    const next = rest[i + 1];
    if (next === undefined || next.startsWith('--')) opts[key] = true; else { opts[key] = next; i++; }
  } else opts._.push(a);
}
const project = path.resolve(opts.project ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
const out = obj => process.stdout.write((typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2)) + '\n');
const fail = (msg, code = 1) => { process.stderr.write(`pilot: ${msg}\n`); process.exit(code); };
const schema = name => JSON.parse(read(path.join(KIT_ROOT, 'templates', 'schemas', `${name}.schema.json`)));
const loadJson = file => { try { return JSON.parse(read(file)); } catch { return null; } };

const commands = {
  version() { out(KIT_VERSION); },

  // Show what /pilot:new would create, without writing anything.
  plan() {
    const answers = loadJson(opts.answers) ?? fail('--answers <file.json> is required');
    out(plan(project, answers).map(i => `${i.action.padEnd(7)} ${i.target}`).join('\n'));
  },

  scaffold() {
    const answers = loadJson(opts.answers) ?? fail('--answers <file.json> is required');
    if (!answers.project_name) fail('answers.project_name is required');
    out(apply(project, answers));
  },

  record() { out({ updated: record(project, opts._) }); },

  trace() {
    const c = collect(project);
    const t = buildTraceability(c);
    if (opts.write) writeFile(path.join(project, 'docs/requirements/traceability.json'), JSON.stringify(t, null, 2) + '\n');
    const reqs = Object.entries(t.requirements);
    out(`${reqs.filter(([, v]) => v.status === 'covered').length}/${reqs.length} requirements have a tagged test.` +
      reqs.filter(([, v]) => v.status === 'uncovered').map(([k]) => `\n  uncovered: ${k}`).join(''));
  },

  // All project checks. Exit 1 on any error. Used locally and by the pilot-check Action.
  check() {
    const results = runAll(project, { base: opts.base });
    let errors = 0;
    for (const r of results) {
      for (const e of r.errors) { out(`ERROR [${r.id}] ${e}`); errors++; }
      for (const w of r.warnings) out(`warn  [${r.id}] ${w}`);
    }
    out(errors ? `pilot check: ${errors} error(s).` : 'pilot check: passed.');
    process.exit(errors ? 1 : 0);
  },

  // Regenerate issue mirrors. Reads GitHub through gh (read-only), or --from <file.json> for tests.
  sync() {
    let issues;
    if (opts.from) issues = loadJson(opts.from) ?? fail(`cannot read ${opts.from}`);
    else {
      const r = spawnSync('gh', ['issue', 'list', '--state', 'all', '--limit', '500', '--json', 'number,title,state,labels,body,createdAt,closedAt'], { cwd: project, encoding: 'utf8' });
      if (r.error || r.status !== 0) fail(`gh issue list failed: ${(r.stderr || r.error?.message || '').trim()}. Is gh installed and logged in (gh auth status)?`, 2);
      issues = JSON.parse(r.stdout);
    }
    const mirrors = buildMirrors(issues);
    for (const [rel, text] of Object.entries(mirrors)) writeFile(path.join(project, rel), text);
    const pendingFile = path.join(project, 'docs/issues/PENDING.md');
    const pending = read(pendingFile);
    if (pending) writeFile(pendingFile, prunePending(pending, issues));
    out({ synced: Object.keys(mirrors), issues: issues.length, at: today() });
  },

  // Run the acceptance command and write .pilot/reviews/step-<n>.json with the real exit code.
  // The guard-files hook only accepts "done" when this file says exitCode 0 and verdict pass.
  review() {
    const step = Number(opts.step);
    if (!Number.isInteger(step) || step < 1) fail('--step <n> is required');
    const manifest = loadJson(path.join(project, '.pilot/manifest.json')) ?? fail('no .pilot/manifest.json');
    const verdict = loadJson(opts.verdict) ?? fail('--verdict <file.json> with { verdict, findings } is required');
    const command = manifest.checks?.acceptance ?? fail('manifest.checks.acceptance is not set');
    const run = spawnSync(command, { cwd: project, shell: true, encoding: 'utf8', timeout: 900000, maxBuffer: 50 * 1024 * 1024 });
    const review = {
      step, requirements: verdict.requirements ?? [],
      acceptance: { command, exitCode: run.status ?? 1, at: new Date().toISOString() },
      verdict: verdict.verdict, findings: verdict.findings ?? []
    };
    const errs = validate(schema('review'), review);
    if (errs.length) fail('review verdict is invalid:\n' + errs.join('\n'));
    writeFile(path.join(project, '.pilot', 'reviews', `step-${step}.json`), JSON.stringify(review, null, 2) + '\n');
    out({ step, acceptanceExitCode: review.acceptance.exitCode, verdict: review.verdict, canMarkDone: review.acceptance.exitCode === 0 && review.verdict === 'pass' });
    if (review.acceptance.exitCode !== 0) out(String(run.stdout + '\n' + run.stderr).trim().split('\n').slice(-40).join('\n'));
  },

  preview() {
    const tokens = loadJson(path.join(project, 'docs/design/tokens.json')) ?? fail('docs/design/tokens.json is missing or invalid');
    const html = renderPreview(tokens, read(path.join(project, 'docs/design/DESIGN.md')) ?? '');
    writeFile(path.join(project, 'docs/design/preview.html'), html);
    out('wrote docs/design/preview.html');
  },

  // Switch the model profile in the manifest and project settings.
  profile() {
    const target = opts._[0];
    if (!['pro', 'max'].includes(target)) fail('usage: profile pro|max');
    const mf = path.join(project, '.pilot/manifest.json');
    const manifest = loadJson(mf) ?? fail('no .pilot/manifest.json');
    manifest.profile = target;
    writeFile(mf, JSON.stringify(manifest, null, 2) + '\n');
    const sf = path.join(project, '.claude/settings.json');
    const settings = loadJson(sf) ?? {};
    settings.model = target === 'max' ? 'opus' : 'opusplan';
    writeFile(sf, JSON.stringify(settings, null, 2) + '\n');
    out({ profile: target, model: settings.model });
  },

  doctor() {
    const rows = [];
    const add = (name, ok, detail, fix = '') => rows.push({ name, ok, detail, fix });
    const ver = (bin, args = ['--version']) => { const r = spawnSync(bin, args, { encoding: 'utf8', shell: process.platform === 'win32' }); return r.status === 0 ? (r.stdout || r.stderr).trim().split('\n')[0] : null; };
    const num = s => (s?.match(/(\d+)\.(\d+)\.(\d+)/) ?? []).slice(1).map(Number);
    const atLeast = (v, min) => { const a = num(v); if (!a.length) return false; for (let i = 0; i < 3; i++) { if (a[i] !== min[i]) return a[i] > min[i]; } return true; };

    const claude = ver('claude');
    add('Claude Code >= 2.1.295', atLeast(claude, [2, 1, 295]), claude ?? 'not found', 'claude update');
    add('Node >= 20', atLeast(process.version, [20, 0, 0]), process.version, 'install Node 20+ from nodejs.org');
    const git = ver('git');
    add('git >= 2.31', atLeast(git, [2, 31, 0]), git ?? 'not found', 'install git');
    const gh = ver('gh');
    const ghAuth = gh ? spawnSync('gh', ['auth', 'status'], { encoding: 'utf8', shell: process.platform === 'win32' }).status === 0 : false;
    add('gh installed and logged in', !!gh && ghAuth, gh ? (ghAuth ? gh : `${gh}, not logged in`) : 'not found', gh ? 'gh auth login' : 'install GitHub CLI: https://cli.github.com');

    const manifest = loadJson(path.join(project, '.pilot/manifest.json'));
    if (!manifest) add('.pilot/manifest.json', false, 'missing', 'run /pilot:new or /pilot:adopt');
    else {
      const errs = validate(schema('manifest'), manifest);
      add('manifest valid', errs.length === 0, errs[0] ?? `kit ${manifest.kitVersion}, template ${manifest.templateVersion}, profile ${manifest.profile}`, 'fix the field named, or rerun /pilot:doctor after /pilot:new');
      const missing = Object.keys(manifest.files ?? {}).filter(f => !exists(path.join(project, f)));
      add('generated files present', missing.length === 0, missing.length ? `missing: ${missing.slice(0, 5).join(', ')}` : `${Object.keys(manifest.files ?? {}).length} files`);
      add('kit version', manifest.kitVersion === KIT_VERSION, `project made with ${manifest.kitVersion}, installed ${KIT_VERSION}`, 'a newer kit may need /pilot:migrate (when available)');
      add('checks.fast configured', !!manifest.checks?.fast, manifest.checks?.fast ?? 'not set', 'set checks.fast in .pilot/manifest.json');
      // Hook smoke test: guard-files must deny an edit to .env in this project.
      const hook = spawnSync(process.execPath, [path.join(KIT_ROOT, 'hooks/scripts/guard-files.js')], {
        input: JSON.stringify({ tool_name: 'Write', tool_input: { file_path: path.join(project, '.env'), content: 'x' }, cwd: project }),
        env: { ...process.env, CLAUDE_PROJECT_DIR: project }, encoding: 'utf8'
      });
      add('hooks run', /"deny"/.test(hook.stdout), /"deny"/.test(hook.stdout) ? 'guard-files denied a test edit to .env' : (hook.stderr || hook.stdout || 'no output').trim().slice(0, 120), 'check Node is on PATH for Claude Code');
    }
    const claudeMd = read(path.join(project, 'CLAUDE.md'));
    if (claudeMd) add('CLAUDE.md <= 200 lines', claudeMd.split('\n').length <= 200, `${claudeMd.split('\n').length} lines`);
    const handoff = read(path.join(project, 'docs/planning/HANDOFF.md'));
    if (handoff) add('HANDOFF.md <= 8,000 chars', handoff.length <= 8000, `${handoff.length} chars`, 'run /pilot:handoff');
    const ci = read(path.join(project, '.github/workflows/ci.yml'));
    add('CI calls pilot-check', !!ci && /pilot-check/.test(ci), ci ? (/OWNER\//.test(ci) ? 'present, but the action owner is still the OWNER placeholder' : 'present') : 'no .github/workflows/ci.yml', 'replace OWNER in ci.yml with the GitHub owner of the pilot repo');
    if (opts.bench) {
      for (const bin of ['bwrap', 'socat']) add(`bench: ${bin}`, !!ver(bin, ['--version']), ver(bin, ['--version']) ?? 'not found', 'sudo apt-get install bubblewrap socat (inside WSL2)');
      const tokenFile = path.join(process.env.HOME ?? '', '.config/pilot-bench/token');
      add('bench: login token file', exists(tokenFile), tokenFile, 'claude setup-token, then save it to that file with chmod 600');
    }
    if (opts.json) out(rows);
    else out(rows.map(r => `${r.ok ? 'PASS' : 'FAIL'}  ${r.name}: ${r.detail}${!r.ok && r.fix ? `\n      fix: ${r.fix}` : ''}`).join('\n'));
    process.exit(rows.every(r => r.ok) ? 0 : 1);
  }
};

if (!cmd || !commands[cmd]) {
  out('usage: pilot.js <version|plan|scaffold|record|trace|check|sync|review|preview|profile|doctor> [--project <dir>] [options]');
  process.exit(cmd ? 1 : 0);
}
commands[cmd]();
