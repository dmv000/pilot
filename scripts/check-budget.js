#!/usr/bin/env node
// MNT-02: fail when the plugin's always-on context cost exceeds the budget (F11, F18).
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PLUGIN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'plugin');

const BUDGET = Number(process.env.PILOT_ALWAYS_ON_BUDGET ?? 1500);
const r = spawnSync('claude', ['--plugin-dir', PLUGIN, 'plugin', 'details', 'pilot'], { encoding: 'utf8', shell: process.platform === 'win32', timeout: 120000 });
const text = `${r.stdout ?? ''}${r.stderr ?? ''}`;
const m = text.match(/Always-on:\s*~?([\d.,]+)\s*(k)?\s*tok/i);
if (!m) { console.log(`budget: could not read "Always-on" from claude plugin details (exit ${r.status}).\n${text.slice(0, 500)}`); process.exit(2); }
const tokens = Number(m[1].replace(/,/g, '')) * (m[2] ? 1000 : 1);
console.log(`budget: always-on ${tokens} tokens (budget ${BUDGET}).`);
process.exit(tokens <= BUDGET ? 0 : 1);
