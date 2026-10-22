// Test helpers: build throwaway projects and run hook scripts the way Claude Code does
// (JSON on stdin, CLAUDE_PROJECT_DIR in the environment).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const HOOK = name => path.join(ROOT, 'hooks', 'scripts', name);
export const PILOT = path.join(ROOT, 'scripts', 'pilot.js');

export function tmpProject({ manifest = {}, files = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pilot-test-'));
  if (manifest !== null) {
    write(dir, '.pilot/manifest.json', JSON.stringify({
      schemaVersion: 1, kitVersion: '0.1.0', templateVersion: 'v1', profile: 'pro',
      projectType: 'web-app', stack: 'web-ts', hasAI: false, design: 'pending',
      checks: { fast: 'node -e "process.exit(0)"' }, protectedPaths: [], files: {}, ...manifest
    }, null, 2));
  }
  for (const [rel, content] of Object.entries(files)) write(dir, rel, content);
  return dir;
}

export function write(dir, rel, content) {
  const file = path.join(dir, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

export function read(dir, rel) {
  try { return fs.readFileSync(path.join(dir, rel), 'utf8'); } catch { return null; }
}

export function runHook(name, dir, input, env = {}) {
  const r = spawnSync(process.execPath, [HOOK(name)], {
    input: JSON.stringify({ cwd: dir, session_id: 'test', ...input }),
    env: { ...process.env, CLAUDE_PROJECT_DIR: dir, ...env },
    encoding: 'utf8',
    timeout: 60000
  });
  let json = null;
  try { json = r.stdout.trim() ? JSON.parse(r.stdout) : null; } catch { /* plain text */ }
  return { code: r.status, stdout: r.stdout, stderr: r.stderr, json };
}

export function runPilot(args, opts = {}) {
  const r = spawnSync(process.execPath, [PILOT, ...args], { encoding: 'utf8', timeout: 60000, ...opts });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
}

export function decision(res) {
  return res.json?.hookSpecificOutput?.permissionDecision ?? (res.code === 2 ? 'deny' : 'allow');
}

export const abs = (dir, rel) => path.join(dir, ...rel.split('/'));
