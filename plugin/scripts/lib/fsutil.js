import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const KIT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const KIT_VERSION = JSON.parse(fs.readFileSync(path.join(KIT_ROOT, '.claude-plugin', 'plugin.json'), 'utf8')).version;

export const read = file => { try { return fs.readFileSync(file, 'utf8'); } catch { return null; } };
export const exists = file => fs.existsSync(file);
export const sha256 = text => crypto.createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex');
export const posix = p => p.split(path.sep).join('/');

export function writeFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

/** All files under dir (POSIX paths relative to dir), skipping heavy or generated folders. */
export function walk(dir, { skip = ['node_modules', '.git', '.venv', 'dist', 'build', 'coverage', '.pilot'] } = {}) {
  const out = [];
  const rec = sub => {
    let entries = [];
    try { entries = fs.readdirSync(path.join(dir, sub), { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (skip.includes(e.name)) continue;
      const rel = sub ? `${sub}/${e.name}` : e.name;
      if (e.isDirectory()) rec(rel); else out.push(rel);
    }
  };
  rec('');
  return out.sort();
}

// The owner's local calendar date. toISOString() gives the UTC date, which is a day off near midnight.
export function today(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
