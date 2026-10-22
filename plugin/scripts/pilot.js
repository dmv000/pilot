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
import { checkDesign } from './lib/design.js';
import { loadMigrations, latestVersion, planMigration, applyMigration } from './lib/migrate.js';

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

  // Start the design system from the kit templates. Never overwrites existing files.
  'design-init'() {
    const name = opts.name ?? (read(path.join(project, 'CLAUDE.md'))?.match(/^#\s+(.+)$/m)?.[1] ?? 'Project').trim();
    const created = [];
    for (const file of ['DESIGN.md', 'tokens.json']) {
      const target = path.join(project, 'docs', 'design', file);
      if (exists(target)) continue;
      writeFile(target, read(path.join(KIT_ROOT, 'templates', 'design', file)).replace(/\{\{project_name\}\}/g, name));
      created.push(`docs/design/${file}`);
    }
    if (created.length && exists(path.join(project, '.pilot/manifest.json'))) {
      const manifest = loadJson(path.join(project, '.pilot/manifest.json'));
      for (const rel of created) manifest.files[rel] = { template: `design/${path.basename(rel)}`, sha256: '0'.repeat(64), writtenAt: today() };
      writeFile(path.join(project, '.pilot/manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
      record(project, created);
    }
    out({ created, skipped: ['docs/design/DESIGN.md', 'docs/design/tokens.json'].filter(f => !created.includes(f)) });
  },

  // Token structure, WCAG contrast of the declared pairs, DESIGN.md sections, hard-coded colors.
  'design-check'() {
    const r = checkDesign(project);
    for (const e of r.errors) out(`ERROR [design] ${e}`);
    for (const w of r.warnings) out(`warn  [design] ${w}`);
    if (!exists(path.join(project, 'docs/design/tokens.json')) && !exists(path.join(project, 'docs/design/DESIGN.md'))) out('design-check: no design system yet (run /pilot:design).');
    else out(r.errors.length ? `design-check: ${r.errors.length} error(s).` : 'design-check: passed.');
    process.exit(r.errors.length ? 1 : 0);
  },

  // Upgrade project files to the kit's newest template version. --plan shows; --apply writes.
  async migrate() {
    const migrations = await loadMigrations(opts.migrations ? path.resolve(opts.migrations) : path.join(KIT_ROOT, 'migrations'));
    if (!exists(path.join(project, '.pilot/manifest.json'))) fail('no .pilot/manifest.json; this is not a pilot project');
    const plan = planMigration(project, migrations, { to: opts.to });
    const planFile = path.join(project, '.pilot', 'tmp', 'migration-plan.json');
    if (plan.upToDate) { out(`Templates are up to date (${plan.from}).`); return; }
    if (!opts.apply) {
      writeFile(planFile, JSON.stringify(plan, null, 2) + '\n');
      if (opts.json) { out(plan); return; }
      const headings = { auto: 'Updated automatically (you never edited these)', create: 'New files', approval: 'Need your approval (you edited these; diffs below)', unchanged: 'Already up to date' };
      out(`Template ${plan.from} → ${plan.to}`);
      for (const s of plan.steps) out(`  ${s.from} → ${s.to}: ${s.describe ?? ''}`);
      for (const kind of ['auto', 'create', 'approval', 'unchanged']) {
        const group = plan.files.filter(f => f.status === kind);
        if (!group.length) continue;
        out(`\n${headings[kind]}:`);
        for (const f of group) out(`  ${f.path}${f.reason ? `  (${f.reason})` : ''}`);
      }
      for (const f of plan.files.filter(f => f.status === 'approval')) out(`\n${f.diff}`);
      out('\nPlan saved to .pilot/tmp/migration-plan.json. Apply with: pilot.js migrate --apply [--approve <path,path|all>]');
      return;
    }
    const approve = typeof opts.approve === 'string' ? opts.approve.split(',').map(s => s.trim()).filter(Boolean) : [];
    out(applyMigration(project, plan, { approve }));
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

  async doctor() {
    const rows = [];
    const add = (name, ok, detail, fix = '') => rows.push({ name, ok, detail, fix });
    // One command string with a shell: finds .cmd shims on Windows without passing an args array to a shell.
    const ver = (bin, flag = '--version') => { const r = spawnSync(`${bin} ${flag}`, { encoding: 'utf8', shell: true }); return r.status === 0 ? (r.stdout || r.stderr).trim().split('\n')[0] : null; };
    const num = s => (s?.match(/(\d+)\.(\d+)\.(\d+)/) ?? []).slice(1).map(Number);
    const atLeast = (v, min) => { const a = num(v); if (!a.length) return false; for (let i = 0; i < 3; i++) { if (a[i] !== min[i]) return a[i] > min[i]; } return true; };

    const claude = ver('claude');
    add('Claude Code >= 2.1.295', atLeast(claude, [2, 1, 295]), claude ?? 'not found', 'claude update');
    add('Node >= 20', atLeast(process.version, [20, 0, 0]), process.version, 'install Node 20+ from nodejs.org');
    const git = ver('git');
    add('git >= 2.31', atLeast(git, [2, 31, 0]), git ?? 'not found', 'install git');
    const gh = ver('gh');
    const ghAuth = gh ? spawnSync('gh auth status', { encoding: 'utf8', shell: true }).status === 0 : false;
    add('gh installed and logged in', !!gh && ghAuth, gh ? (ghAuth ? gh : `${gh}, not logged in`) : 'not found', gh ? 'gh auth login' : 'install GitHub CLI: https://cli.github.com');

    const manifest = loadJson(path.join(project, '.pilot/manifest.json'));
    if (!manifest) add('.pilot/manifest.json', false, 'missing', 'run /pilot:new or /pilot:adopt');
    else {
      const errs = validate(schema('manifest'), manifest);
      add('manifest valid', errs.length === 0, errs[0] ?? `kit ${manifest.kitVersion}, template ${manifest.templateVersion}, profile ${manifest.profile}`, 'fix the field named, or rerun /pilot:doctor after /pilot:new');
      const missing = Object.keys(manifest.files ?? {}).filter(f => !exists(path.join(project, f)));
      add('generated files present', missing.length === 0, missing.length ? `missing: ${missing.slice(0, 5).join(', ')}` : `${Object.keys(manifest.files ?? {}).length} files`);
      add('kit version', manifest.kitVersion === KIT_VERSION, `project last updated with ${manifest.kitVersion}, installed ${KIT_VERSION}`, 'run /pilot:migrate to bring project files up to date');
      const latest = latestVersion(await loadMigrations(path.join(KIT_ROOT, 'migrations')));
      add('templates up to date', manifest.templateVersion === latest, `project ${manifest.templateVersion}, kit ${latest}`, 'run /pilot:migrate');
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
      for (const [bin, flag] of [['bwrap', '--version'], ['socat', '-V']]) add(`bench: ${bin}`, !!ver(bin, flag), ver(bin, flag) ?? 'not found', 'sudo apt-get install bubblewrap socat (inside WSL2)');
      const tokenFile = path.join(process.env.HOME ?? '', '.config/pilot-bench/token');
      add('bench: login token file', exists(tokenFile), tokenFile, 'claude setup-token, then save it to that file with chmod 600');
    }
    if (opts.json) out(rows);
    else out(rows.map(r => `${r.ok ? 'PASS' : 'FAIL'}  ${r.name}: ${r.detail}${!r.ok && r.fix ? `\n      fix: ${r.fix}` : ''}`).join('\n'));
    process.exit(rows.every(r => r.ok) ? 0 : 1);
  }
};

if (!cmd || !commands[cmd]) {
  out('usage: pilot.js <version|plan|scaffold|record|trace|check|sync|review|preview|design-init|design-check|migrate|profile|doctor> [--project <dir>] [options]');
  process.exit(cmd ? 1 : 0);
}
await commands[cmd]();
