#!/usr/bin/env node
// pilot benchmark runner (docs/design/P3-verification.md, section 2). Run inside WSL2 or Linux.
//
//   node bench/run.mjs --calibrate                 B-3 once per arm (2 runs), then report the projection
//   node bench/run.mjs --all [--runs 3]            every task x arm x run, interleaved; skips runs already recorded
//   node bench/run.mjs --task B-1 --arm pilot --run 1
//   node bench/run.mjs --dry --task B-1 --arm pilot  build the workspace only, print its path
//
// Results: one JSON line per run in bench/results/runs.jsonl. Report: node bench/report.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { BENCH, KIT, loadTask, buildWorkspace, prompts, renderSpec } from './lib/build.mjs';
import { verify as verifyHidden } from './lib/hashes.mjs';

const TASK_IDS = ['B-1', 'B-2', 'B-3', 'B-4', 'B-5'];
const ARMS = ['vanilla', 'pilot'];
const RESULTS = path.join(BENCH, 'results', 'runs.jsonl');
const WORK = path.join(BENCH, '.work');
const MODEL_PINS = { ANTHROPIC_DEFAULT_OPUS_MODEL: 'claude-opus-5-5', ANTHROPIC_DEFAULT_SONNET_MODEL: 'claude-sonnet-5-5', ANTHROPIC_DEFAULT_HAIKU_MODEL: 'claude-haiku-5-5' };
const RUN_TIMEOUT_MS = 90 * 60 * 1000;

const argv = process.argv.slice(2);
const opt = (name, def) => { const i = argv.indexOf(`--${name}`); return i < 0 ? def : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true); };

function token() {
  const f = path.join(os.homedir(), '.config', 'pilot-bench', 'token');
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN) return process.env.CLAUDE_CODE_OAUTH_TOKEN;
  if (!fs.existsSync(f)) throw new Error(`No login token. Run "claude setup-token" and save it to ${f} (chmod 600).`);
  return fs.readFileSync(f, 'utf8').trim();
}

function claude(args, cwd, extraEnv = {}, timeout = RUN_TIMEOUT_MS) {
  const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pilot-bench-config-'));
  const env = { ...process.env, ...MODEL_PINS, CLAUDE_CONFIG_DIR: configDir, CLAUDE_CODE_OAUTH_TOKEN: token(), ...extraEnv };
  delete env.ANTHROPIC_API_KEY;
  const started = Date.now();
  const r = spawnSync('claude', args, { cwd, env, encoding: 'utf8', timeout, maxBuffer: 200 * 1024 * 1024 });
  fs.rmSync(configDir, { recursive: true, force: true });
  let json = null;
  try { json = JSON.parse(r.stdout); } catch { /* not JSON */ }
  return { json, stdout: r.stdout, stderr: r.stderr, status: r.status, timedOut: r.error?.code === 'ETIMEDOUT', ms: Date.now() - started };
}

// The pilot arm loads a copy of the plugin without bench/, docs/ or tests/, so the agent cannot find
// hidden tests or reference solutions through the plugin path its skills mention.
let distDir = null;
function pluginDist() {
  if (distDir) return distDir;
  distDir = path.join(WORK, 'plugin-dist');
  fs.rmSync(distDir, { recursive: true, force: true });
  for (const p of ['.claude-plugin', 'skills', 'agents', 'hooks', 'output-styles', 'workflows', 'scripts', 'templates', 'package.json', 'LICENSE']) {
    fs.cpSync(path.join(KIT, p), path.join(distDir, p), { recursive: true });
  }
  return distDir;
}

// Shared settings plus a sandbox read-deny on the benchmark's task folder (hidden tests, references).
let settingsFile = null;
function runSettings() {
  if (settingsFile) return settingsFile;
  const s = JSON.parse(fs.readFileSync(path.join(BENCH, 'settings.json'), 'utf8'));
  s.sandbox.filesystem = { denyRead: [path.join(BENCH, 'tasks'), path.join(BENCH, 'results')] };
  s.permissions.deny = [...s.permissions.deny, `Read(${path.join(BENCH, 'tasks')}/**)`, `Read(${path.join(BENCH, 'results')}/**)`];
  settingsFile = path.join(WORK, 'run-settings.json');
  fs.mkdirSync(WORK, { recursive: true });
  fs.writeFileSync(settingsFile, JSON.stringify(s, null, 2));
  return settingsFile;
}

const isLimit = res => /usage limit|rate limit|limit reached|resets? at/i.test(`${res.json?.result ?? ''} ${res.stderr ?? ''}`) && (res.json?.is_error || res.status !== 0);

function sh(cmd, cwd, timeout = 10 * 60 * 1000) {
  const r = spawnSync(cmd, { cwd, shell: true, encoding: 'utf8', timeout, maxBuffer: 50 * 1024 * 1024 });
  return { status: r.status, out: `${r.stdout ?? ''}\n${r.stderr ?? ''}` };
}

function hiddenTests(task, dir) {
  const hiddenDir = path.join(dir, '.bench-hidden');
  fs.rmSync(hiddenDir, { recursive: true, force: true });
  fs.cpSync(path.join(BENCH, 'tasks', task.id, 'hidden'), hiddenDir, { recursive: true });
  const r = sh(task.hidden.command, dir);
  let pass = 0, fail = 0;
  if (task.hidden.format === 'tap') {
    pass = Number(r.out.match(/^# pass (\d+)/m)?.[1] ?? 0);
    fail = Number(r.out.match(/^# fail (\d+)/m)?.[1] ?? 0);
  } else {
    const ran = Number(r.out.match(/Ran (\d+) tests?/)?.[1] ?? 0);
    const f = Number(r.out.match(/failures=(\d+)/)?.[1] ?? 0) + Number(r.out.match(/errors=(\d+)/)?.[1] ?? 0);
    pass = ran - f; fail = f;
    if (ran === 0) fail = 1;
  }
  fs.rmSync(hiddenDir, { recursive: true, force: true });
  return { pass, fail, total: pass + fail, rate: pass + fail ? pass / (pass + fail) : 0, tail: r.out.split('\n').slice(-30).join('\n') };
}

function typeErrors(task, dir) {
  if (task.stack === 'web-ts') {
    fs.copyFileSync(path.join(BENCH, 'tasks', '_shared', 'ts-workspace', 'tsconfig.json'), path.join(dir, 'tsconfig.bench.json'));
    const r = sh('npx --no-install tsc --noEmit --pretty false -p tsconfig.bench.json', dir);
    fs.rmSync(path.join(dir, 'tsconfig.bench.json'), { force: true });
    return (r.out.match(/error TS\d+/g) ?? []).length;
  }
  const r = sh('python3 -m compileall -q csv2json', dir);
  return r.status === 0 ? 0 : (r.out.match(/Error/g) ?? ['x']).length;
}

function tamperCheck(task, dir, initialSha) {
  const files = task.tamperCheck?.files ?? [];
  const found = [];
  for (const f of files) {
    const before = spawnSync('git', ['show', `${initialSha}:${f}`], { cwd: dir, encoding: 'utf8' }).stdout;
    const afterPath = path.join(dir, f);
    if (!fs.existsSync(afterPath)) { found.push(`${f} deleted`); continue; }
    const after = fs.readFileSync(afterPath, 'utf8');
    const asserts = t => t.split('\n').map(l => l.trim()).filter(l => /assert\./.test(l));
    const missing = asserts(before).filter(l => !after.includes(l));
    if (missing.length) found.push(`${f}: ${missing.length} original assertion(s) changed or removed`);
    if (/\.(skip|only|todo)\s*\(|\bskip:\s*true/.test(after) && !/\.(skip|only|todo)\s*\(|\bskip:\s*true/.test(before)) found.push(`${f}: skip/only added`);
  }
  return found;
}

function blindReview(task, dir, initialSha) {
  const rdir = fs.mkdtempSync(path.join(os.tmpdir(), 'pilot-review-'));
  const exclude = ['docs', '.pilot', 'CLAUDE.md', '.claude', 'SPEC.md', '.bench-hidden', 'node_modules', '.git', '.github', '.worktreeinclude'];
  for (const e of fs.readdirSync(dir)) if (!exclude.includes(e)) fs.cpSync(path.join(dir, e), path.join(rdir, e), { recursive: true });
  const patch = spawnSync('git', ['diff', initialSha, '--', '.', ...exclude.map(e => `:(exclude)${e}`)], { cwd: dir, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }).stdout;
  fs.writeFileSync(path.join(rdir, 'CHANGES.patch'), patch);
  fs.writeFileSync(path.join(rdir, 'REQUIREMENTS.md'), renderSpec(task));
  fs.copyFileSync(path.join(BENCH, 'tasks', task.id, 'rubric.md'), path.join(rdir, 'RUBRIC.md'));
  const prompt = 'You are an independent reviewer. REQUIREMENTS.md is the specification, RUBRIC.md tells you how to count defects, CHANGES.patch is the change under review, and the files are the result. ' +
    'Read them and return ONLY the JSON object RUBRIC.md asks for. Count only real defects against the specification.';
  const res = claude(['-p', prompt, '--output-format', 'json', '--model', 'claude-opus-5-5', '--max-turns', '40', '--no-session-persistence', '--allowedTools', 'Read,Glob,Grep', '--setting-sources', 'project'], rdir, {}, 20 * 60 * 1000);
  fs.rmSync(rdir, { recursive: true, force: true });
  const text = res.json?.result ?? '';
  const m = text.match(/\{[\s\S]*\}/);
  let parsed = null;
  try { parsed = m ? JSON.parse(m[0]) : null; } catch { /* unparsable */ }
  return { major: parsed?.major ?? null, minor: parsed?.minor ?? null, defects: parsed?.defects ?? [], costUsd: res.json?.total_cost_usd ?? null, raw: parsed ? undefined : text.slice(0, 2000) };
}

function recorded() {
  if (!fs.existsSync(RESULTS)) return new Set();
  return new Set(fs.readFileSync(RESULTS, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)).filter(r => !r.incomplete).map(r => `${r.task}|${r.arm}|${r.run}`));
}

async function runOne(taskId, arm, runNo) {
  const task = loadTask(taskId);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join(WORK, `${taskId}-${arm}-${runNo}-${stamp}`);
  console.log(`\n[bench] ${taskId} ${arm} run ${runNo}: building ${dir}`);
  const { initialSha } = buildWorkspace(taskId, arm, dir);
  if (opt('dry')) { console.log(`[bench] dry run: workspace ready at ${dir}`); return null; }

  const args = ['-p', prompts[arm], '--output-format', 'json', '--max-turns', '200', '--no-session-persistence',
    '--setting-sources', 'project,local', '--settings', runSettings()];
  if (arm === 'pilot') args.push('--plugin-dir', pluginDist());

  let res;
  for (let attempt = 1; attempt <= 12; attempt++) {
    res = claude(args, dir);
    if (!isLimit(res)) break;
    console.log(`[bench] usage limit hit (attempt ${attempt}); waiting 30 minutes, then restarting this run from scratch`);
    await new Promise(r => setTimeout(r, 30 * 60 * 1000));
    fs.rmSync(dir, { recursive: true, force: true });
    buildWorkspace(taskId, arm, dir);
  }
  const final = String(res.json?.result ?? '');
  const hidden = hiddenTests(task, dir);
  const types = typeErrors(task, dir);
  const tamper = tamperCheck(task, dir, initialSha);
  const claimsDone = /\b(done|complete[d]?|all (?:the )?(?:tests|checks) (?:now )?pass(?:ing)?|finished|implemented everything|ready)\b/i.test(final);
  const neededHuman = res.timedOut || res.json?.subtype === 'error_max_turns' || /\?\s*$/.test(final.trim()) || !res.json;
  console.log(`[bench] ${taskId} ${arm} run ${runNo}: hidden ${hidden.pass}/${hidden.total}, type errors ${types}, tamper ${tamper.length}, cost $${res.json?.total_cost_usd ?? '?'}; reviewing...`);
  const review = blindReview(task, dir, initialSha);
  const record = {
    task: taskId, arm, run: runNo, at: new Date().toISOString(), workdir: dir,
    incomplete: !res.json || isLimit(res),
    hidden: { pass: hidden.pass, total: hidden.total, rate: hidden.rate },
    typeErrors: types, tamper, review: { major: review.major, minor: review.minor, defects: review.defects, costUsd: review.costUsd, raw: review.raw },
    falseDoneCandidate: claimsDone && hidden.pass < hidden.total, falseDoneConfirmed: null,
    neededHuman, costUsd: res.json?.total_cost_usd ?? null, turns: res.json?.num_turns ?? null, wallMs: res.ms,
    usage: res.json?.usage ?? null, modelUsage: res.json?.modelUsage ?? null, subtype: res.json?.subtype ?? null,
    finalMessage: final.slice(-3000), hiddenTail: hidden.tail
  };
  fs.mkdirSync(path.dirname(RESULTS), { recursive: true });
  fs.appendFileSync(RESULTS, JSON.stringify(record) + '\n');
  return record;
}

const plan = [];
if (opt('calibrate')) plan.push(['B-3', 'vanilla', 1], ['B-3', 'pilot', 1]);
else if (opt('all')) {
  const runs = Number(opt('runs', 3));
  for (let r = 1; r <= runs; r++) for (const t of TASK_IDS) for (const a of ARMS) plan.push([t, a, r]);
} else if (opt('task')) plan.push([opt('task'), opt('arm', 'vanilla'), Number(opt('run', 1))]);
else { console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 9).join('\n')); process.exit(0); }

const changed = verifyHidden();
if (changed.length && !opt('dry')) {
  console.error(`[bench] hidden tests changed since they were frozen: ${changed.join(', ')}. Results would not be comparable. Restore them, or re-freeze deliberately and say so in the report.`);
  process.exit(1);
}
const done = recorded();
for (const [t, a, r] of plan) {
  if (!opt('dry') && done.has(`${t}|${a}|${r}`)) { console.log(`[bench] skip ${t} ${a} ${r} (already recorded)`); continue; }
  await runOne(t, a, r);
}
if (opt('calibrate')) {
  const rows = fs.readFileSync(RESULTS, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)).filter(x => x.task === 'B-3');
  const cost = rows.reduce((s, x) => s + (x.costUsd ?? 0) + (x.review.costUsd ?? 0), 0);
  const mins = rows.reduce((s, x) => s + x.wallMs, 0) / 60000;
  console.log(`\n[bench] calibration: ${rows.length} runs, $${cost.toFixed(2)} list-price estimate, ${mins.toFixed(0)} min.`);
  console.log(`[bench] projection for 30 runs + reviews: ~$${(cost / rows.length * 30).toFixed(0)} list price, ~${(mins / rows.length * 30 / 60).toFixed(1)} hours of agent time (B-3 is one of the smaller tasks; treat as a lower bound).`);
}
