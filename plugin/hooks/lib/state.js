// .pilot/state.json: local, gitignored, written only by hooks.
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT = { dirty: false, lastEditAt: null, lastGreen: null, stopFailures: null };

export function statePath(dir) {
  return path.join(dir, '.pilot', 'state.json');
}

export function readState(dir) {
  try {
    return { ...DEFAULT, ...JSON.parse(fs.readFileSync(statePath(dir), 'utf8')) };
  } catch {
    return { ...DEFAULT };
  }
}

export function writeState(dir, state) {
  const file = statePath(dir);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, file);
}

export function updateState(dir, patch) {
  const next = { ...readState(dir), ...patch };
  writeState(dir, next);
  return next;
}
