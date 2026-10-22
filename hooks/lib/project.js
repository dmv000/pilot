// Shared helpers for pilot hooks. Zero dependencies, Node >= 20.
// Every hook calls start() first: outside a pilot project (no .pilot/manifest.json)
// it returns null and the hook exits 0 with no output (failure mode F08).
import fs from 'node:fs';
import path from 'node:path';

export function readStdin() {
  try {
    const raw = fs.readFileSync(0, 'utf8');
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function projectDir(input = {}) {
  return process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
}

export function loadManifest(dir) {
  const file = path.join(dir, '.pilot', 'manifest.json');
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    // A broken manifest still marks this as a pilot project: guards must stay on.
    return { schemaVersion: 0, broken: true };
  }
}

/** Returns { input, dir, manifest } inside a pilot project, otherwise null. */
export function start() {
  const input = readStdin();
  const dir = projectDir(input);
  const manifest = loadManifest(dir);
  if (!manifest) return null;
  return { input, dir, manifest };
}

/** Normalize a tool path to a project-relative POSIX path. Windows sends backslashes. */
export function relPath(dir, p) {
  if (!p) return '';
  const abs = path.isAbsolute(p) ? p : path.join(dir, p);
  let rel = path.relative(dir, abs);
  rel = rel.split(path.sep).join('/').replace(/\\/g, '/');
  return rel;
}

/** Minimal glob: **, *, ?, {a,b}. Matches against a POSIX relative path. */
export function globToRegExp(glob) {
  let re = '';
  let i = 0;
  while (i < glob.length) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        // "**/" matches zero or more directories; "**" at the end matches anything.
        if (glob[i + 2] === '/') { re += '(?:.*/)?'; i += 3; continue; }
        re += '.*'; i += 2; continue;
      }
      re += '[^/]*'; i += 1; continue;
    }
    if (c === '?') { re += '[^/]'; i += 1; continue; }
    if (c === '{') {
      const end = glob.indexOf('}', i);
      if (end > i) {
        const alts = glob.slice(i + 1, end).split(',').map(a => a.replace(/[.+^$()|[\]\\]/g, '\\$&'));
        re += '(?:' + alts.join('|') + ')';
        i = end + 1;
        continue;
      }
    }
    re += /[.+^$()|[\]\\]/.test(c) ? '\\' + c : c;
    i += 1;
  }
  return new RegExp('^' + re + '$');
}

export function matchesAny(rel, globs = []) {
  return globs.some(g => globToRegExp(g).test(rel));
}

export function readText(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return null; }
}

export function emit(obj) {
  process.stdout.write(JSON.stringify(obj));
}

/** PreToolUse decision helper. */
export function decide(decision, reason) {
  emit({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: decision, permissionDecisionReason: reason } });
}

export function isImplementer(agentType) {
  return typeof agentType === 'string' && /(^|:)implementer$/.test(agentType);
}
